// TC014：禁用队列确认框提示运行中不受影响、排队任务需手动终止。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260828");

test("TC014 disable queue dialog distinguishes running and queued jobs", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();

  const clusterRes = await page.request.get("/api/clusters?pageNum=1&pageSize=100");
  expect(clusterRes.ok()).toBeTruthy();
  const clusterPayload = await clusterRes.json();
  expect(clusterPayload.code, JSON.stringify(clusterPayload)).toBe(0);
  const clusters = (clusterPayload.data.list ?? []) as { id: number; name?: string; displayName?: string; status?: string }[];
  const cluster =
    clusters.find((item) => `${item.displayName || ""} ${item.name || ""}`.includes("kind-ltp")) ||
    clusters.find((item) => item.status === "healthy") ||
    clusters[0];
  const clusterId = cluster?.id;
  expect(clusterId).toBeTruthy();

  const teamRes = await page.request.get("/api/teams?pageNum=1&pageSize=10");
  expect(teamRes.ok()).toBeTruthy();
  const teamId = (await teamRes.json()).data.list[0]?.id as number | undefined;
  expect(teamId).toBeTruthy();

  const stamp = Date.now();
  const queueName = `e2e-dsb-${stamp}`;
  const created = await page.request.post("/api/queues", {
    data: {
      clusterId,
      name: queueName,
      displayName: "E2E禁用提示",
      datacenterCode: "cq-lj",
      gpuType: "NVIDIA-H200",
      gpuQuota: 1,
      cpuQuota: 1,
      memQuotaGi: 1,
      teamIds: [teamId],
    },
  });
  const payload = await created.json();
  expect(created.ok() && payload.code === 0, JSON.stringify(payload)).toBeTruthy();
  const queueId = payload.data.id as number;

  try {
    await page.getByRole("link", { name: "队列管理" }).click();
    await expect(page.getByRole("heading", { name: "队列管理" })).toBeVisible();
    const clusterSelect = page.getByLabel("工作集群");
    if (await clusterSelect.count()) {
      if ((await clusterSelect.inputValue()) !== String(clusterId)) {
        await clusterSelect.selectOption(String(clusterId));
        const confirm = page.getByRole("button", { name: "确认切换并刷新" });
        if (await confirm.isVisible().catch(() => false)) await confirm.click();
      }
    }
    await expect(page.getByText("平台管理员登录成功")).toHaveCount(0, { timeout: 10000 });
    await page.locator(".search-box input").fill(queueName);
    const row = page.locator("tr", { hasText: queueName });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "禁用" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "确认禁用队列" })).toBeVisible();
    await expect(dialog.locator(".modal-msg")).toContainText("确定要禁用队列");
    const hint = dialog.locator(".modal-hint.is-warning");
    await expect(hint).toContainText("运行中的任务不受影响");
    await expect(hint).toContainText("排队中的任务将无法被调度，需要手动终止");
    await expect(hint).not.toContainText("已在运行 / 排队的任务不受影响");
    await dialog.screenshot({ path: path.join(shotDir, "150000-tc014-queue-disable-hint.png") });
    await dialog.getByRole("button", { name: "取消" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(row.locator(".badge")).toHaveText("启用");
  } finally {
    await page.request.delete(`/api/queues/${queueId}`);
  }
});
