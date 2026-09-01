// TC018：队列管理关联团队为选填，不选团队即可创建，列表显示空占位。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";
import { ensureWorkingCluster } from "../select";

const shotDir = path.resolve(process.cwd(), "../../temp/20260831");

test("TC018 queue can be created without associating a team", async ({ page }) => {
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

  await page.getByRole("link", { name: "队列管理" }).click();
  await expect(page.getByRole("heading", { name: "队列管理" })).toBeVisible();
  await ensureWorkingCluster(page, clusterId!);
  await expect(page.getByText("平台管理员登录成功")).toHaveCount(0, { timeout: 10000 });

  await page.getByRole("button", { name: "+ 新建队列" }).click();
  const form = page.getByRole("dialog");
  await expect(form.getByRole("heading", { name: "新建队列" })).toBeVisible();
  await expect(form.locator("label[for='q-form-team-search'] .req")).toHaveCount(0);
  await expect(form.locator("#q-form-gpu")).not.toBeDisabled({ timeout: 15000 });

  const stamp = Date.now();
  const name = `e2e-noteam-${stamp}`;
  await form.locator("#q-form-name").fill(name);
  await form.locator("#q-form-display").fill("E2E无团队队列");
  await form.screenshot({ path: path.join(shotDir, "150000-tc018-queue-team-optional-form.png") });
  await form.getByRole("button", { name: "创建队列" }).click();
  await expect(form).toHaveCount(0);
  await expect(page.getByText("请至少关联一个团队")).toHaveCount(0);

  await page.locator(".search-box input").fill(name);
  const row = page.locator("tr", { hasText: name });
  await expect(row).toBeVisible();
  await expect(row.locator(".td-queue-teams")).toHaveText("—");
  await page.screenshot({ path: path.join(shotDir, "150010-tc018-queue-team-optional-list.png") });

  const listRes = await page.request.get(`/api/queues?clusterId=${clusterId}&pageNum=1&pageSize=10&keyword=${name}`);
  const listBody = await listRes.json();
  expect(listBody.code, JSON.stringify(listBody)).toBe(0);
  const created = (listBody.data.list ?? []).find((item: { name: string }) => item.name === name);
  expect(created?.teams ?? []).toEqual([]);
  const queueId = created?.id as number | undefined;

  try {
    await row.getByRole("button", { name: "删除" }).click();
    const confirmDel = page.getByRole("dialog");
    await expect(confirmDel.getByRole("heading", { name: "确认删除队列" })).toBeVisible();
    await confirmDel.getByRole("button", { name: "确认删除" }).click();
    await expect(row).toHaveCount(0);
  } finally {
    if (queueId) {
      await page.request.delete(`/api/queues/${queueId}`);
    }
  }
});
