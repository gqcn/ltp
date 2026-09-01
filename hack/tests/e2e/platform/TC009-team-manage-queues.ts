// TC009：团队详情可通过「管理队列」绑定与解绑资源队列。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260831");

test("TC009 team detail can bind and unbind queues", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();

  const clusterRes = await page.request.get("/api/clusters?pageNum=1&pageSize=100");
  expect(clusterRes.ok()).toBeTruthy();
  const clusters = ((await clusterRes.json()).data.list ?? []) as { id: number; name?: string; displayName?: string; status?: string }[];
  const cluster =
    clusters.find((item) => `${item.displayName || ""} ${item.name || ""}`.includes("kind-ltp")) ||
    clusters.find((item) => item.status === "healthy") ||
    clusters[0];
  expect(cluster?.id).toBeTruthy();

  const userRes = await page.request.get("/api/users?pageNum=1&pageSize=1&enabled=true");
  expect(userRes.ok()).toBeTruthy();
  const ownerId = ((await userRes.json()).data.list ?? [])[0]?.id as number | undefined;
  expect(ownerId).toBeTruthy();
  const teamName = `E2E队列团队${Date.now()}`;
  const teamRes = await page.request.post("/api/teams", {
    data: { name: teamName, description: "e2e manage queues", ownerUserId: ownerId },
  });
  const teamBody = await teamRes.json();
  expect(teamRes.ok() && teamBody.code === 0, JSON.stringify(teamBody)).toBeTruthy();

  const queueName = `e2e-tq-${Date.now()}`;
  const created = await page.request.post("/api/queues", {
    data: {
      clusterId: cluster!.id,
      name: queueName,
      displayName: "E2E团队绑定队列",
      datacenterCode: "cq-lj",
      gpuType: "NVIDIA-H200",
      gpuQuota: 1,
      cpuQuota: 1,
      memQuotaGi: 1,
      teamIds: [],
    },
  });
  const createdBody = await created.json();
  expect(created.ok() && createdBody.code === 0, JSON.stringify(createdBody)).toBeTruthy();
  const queueId = createdBody.data.id as number;

  try {
    await page.getByRole("link", { name: "团队管理" }).click();
    await expect(page.getByRole("heading", { name: "团队管理" })).toBeVisible();
    await page.locator(".search-box input").fill(teamName);
    await page.locator(".rp-list-item", { hasText: teamName }).click();
    await expect(page.getByRole("button", { name: "管理队列" })).toBeVisible();
    await page.getByRole("button", { name: "管理队列" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "管理队列" })).toBeVisible();
    await dialog.getByPlaceholder("搜索队列标识 / 显示名...").fill(queueName);
    const row = dialog.locator("label.rp-check-row", { hasText: queueName });
    await expect(row).toBeVisible();
    await row.locator("input[type=checkbox]").check();
    await dialog.screenshot({ path: path.join(shotDir, "164000-tc009-manage-queues-modal.png") });
    await dialog.getByRole("button", { name: "保存绑定" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(".rp-queue-card", { hasText: "E2E团队绑定队列" })).toBeVisible();
    await page.screenshot({ path: path.join(shotDir, "164010-tc009-team-queue-bound.png") });

    await page.getByRole("button", { name: "管理队列" }).click();
    const again = page.getByRole("dialog");
    await again.getByPlaceholder("搜索队列标识 / 显示名...").fill(queueName);
    await again.locator("label.rp-check-row", { hasText: queueName }).locator("input[type=checkbox]").uncheck();
    await again.getByRole("button", { name: "保存绑定" }).click();
    await expect(again).toHaveCount(0);
    await expect(page.getByText("尚未关联资源队列")).toBeVisible();
  } finally {
    await page.request.delete(`/api/queues/${queueId}`);
  }
});
