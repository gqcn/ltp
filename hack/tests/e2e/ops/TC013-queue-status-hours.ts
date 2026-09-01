// TC013：队列管理支持按启用状态筛选，并展示本月卡时列。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";
import { chooseSelect, ensureWorkingCluster } from "../select";

const shotDir = path.resolve(process.cwd(), "../../temp/20260828");

test("TC013 queue list status filter and gpu hours column", async ({ page }) => {
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
  const openName = `e2e-stf-${stamp}-on`;
  const closedName = `e2e-stf-${stamp}-off`;
  const queueBody = {
    clusterId,
    datacenterCode: "cq-lj",
    gpuType: "NVIDIA-H200",
    gpuQuota: 1,
    cpuQuota: 1,
    memQuotaGi: 1,
    teamIds: [teamId],
  };
  const createdOpen = await page.request.post("/api/queues", {
    data: { ...queueBody, name: openName, displayName: "E2E开筛选" },
  });
  const openPayload = await createdOpen.json();
  expect(createdOpen.ok() && openPayload.code === 0, JSON.stringify(openPayload)).toBeTruthy();
  const openId = openPayload.data.id as number;
  const createdClosed = await page.request.post("/api/queues", {
    data: { ...queueBody, name: closedName, displayName: "E2E关筛选" },
  });
  const closedPayload = await createdClosed.json();
  expect(createdClosed.ok() && closedPayload.code === 0, JSON.stringify(closedPayload)).toBeTruthy();
  const closedId = closedPayload.data.id as number;
  const disabled = await page.request.put(`/api/queues/${closedId}/status`, { data: { enabled: false } });
  expect(disabled.ok(), await disabled.text()).toBeTruthy();

  try {
    await page.getByRole("link", { name: "队列管理" }).click();
    await expect(page.getByRole("heading", { name: "队列管理" })).toBeVisible();
    await ensureWorkingCluster(page, clusterId!);
    await expect(page.getByText("平台管理员登录成功")).toHaveCount(0, { timeout: 10000 });
    await expect(page.getByRole("columnheader", { name: "本月卡时" })).toBeVisible();
    const statusFilter = page.getByLabel("按状态筛选");
    await expect(statusFilter).toBeVisible();
    await page.locator(".search-box input").fill(`e2e-stf-${stamp}`);
    await expect(page.locator("tr", { hasText: openName })).toBeVisible();
    await expect(page.locator("tr", { hasText: closedName })).toBeVisible();
    await expect(page.locator("tr", { hasText: openName }).locator(".td-queue-hours")).toContainText("卡时");
    await page.screenshot({ path: path.join(shotDir, "140000-tc013-queue-status-all.png") });

    await chooseSelect(statusFilter, "disabled");
    await expect(page.locator("tr", { hasText: closedName })).toBeVisible();
    await expect(page.locator("tr", { hasText: openName })).toHaveCount(0);
    await expect(page.locator("tr", { hasText: closedName }).locator(".badge")).toHaveText("禁用");
    await page.screenshot({ path: path.join(shotDir, "140010-tc013-queue-status-disabled.png") });

    await chooseSelect(statusFilter, "enabled");
    await expect(page.locator("tr", { hasText: openName })).toBeVisible();
    await expect(page.locator("tr", { hasText: closedName })).toHaveCount(0);
    await expect(page.locator("tr", { hasText: openName }).locator(".badge")).toHaveText("启用");
    await page.screenshot({ path: path.join(shotDir, "140020-tc013-queue-status-enabled.png") });

    const filtered = await page.request.get(
      `/api/queues?clusterId=${clusterId}&pageNum=1&pageSize=10&keyword=${closedName}&enabled=false`,
    );
    expect(filtered.ok()).toBeTruthy();
    const body = await filtered.json();
    expect(body.code).toBe(0);
    expect(body.data.total).toBe(1);
    expect(body.data.list[0].name).toBe(closedName);
    expect(body.data.list[0].gpuHoursMonth).toBe(0);
  } finally {
    await page.request.delete(`/api/queues/${openId}`);
    await page.request.delete(`/api/queues/${closedId}`);
  }
});
