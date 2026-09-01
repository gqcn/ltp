// TC019：队列管理列表数据中心列展示简称，不把全称或英文标识当作主文案。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";
import { ensureWorkingCluster } from "../select";

const shotDir = path.resolve(process.cwd(), "../../temp/20260901");

test("TC019 queue list shows datacenter short name not full name or code", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();

  const clusterRes = await page.request.get("/api/clusters?pageNum=1&pageSize=100");
  expect(clusterRes.ok()).toBeTruthy();
  const clusters = ((await clusterRes.json()).data.list ?? []) as { id: number; status?: string }[];
  const clusterId = (clusters.find((item) => item.status === "healthy") || clusters[0])?.id;
  expect(clusterId).toBeTruthy();

  const dcRes = await page.request.get("/api/datacenters?pageNum=1&pageSize=100");
  expect(dcRes.ok()).toBeTruthy();
  const dcs = ((await dcRes.json()).data.list ?? []) as { code: string; name: string; shortName: string }[];
  const dc = dcs.find((item) => item.shortName && item.shortName !== item.code) || dcs[0];
  expect(dc?.code).toBeTruthy();
  const label = dc.shortName || dc.name;

  const teamRes = await page.request.get("/api/teams?pageNum=1&pageSize=10");
  expect(teamRes.ok()).toBeTruthy();
  const teamId = (await teamRes.json()).data.list[0]?.id as number | undefined;
  expect(teamId).toBeTruthy();

  const stamp = Date.now();
  const queueName = `e2e-dcn-${stamp}`;
  const created = await page.request.post("/api/queues", {
    data: {
      clusterId,
      name: queueName,
      displayName: "E2E数据中心名称",
      datacenterCode: dc.code,
      gpuType: "NVIDIA-H200",
      gpuQuota: 1,
      cpuQuota: 1,
      memQuotaGi: 1,
      teamIds: [teamId],
    },
  });
  const createdBody = await created.json();
  expect(created.ok() && createdBody.code === 0, JSON.stringify(createdBody)).toBeTruthy();
  const queueId = createdBody.data.id as number;

  try {
    await page.getByRole("link", { name: "队列管理" }).click();
    await expect(page.getByRole("heading", { name: "队列管理" })).toBeVisible();
    await ensureWorkingCluster(page, clusterId!);
    await page.locator(".search-box input").fill(queueName);
    const row = page.locator("tr", { hasText: queueName });
    await expect(row).toBeVisible();
    const badge = row.locator(".dc-badge");
    await expect(badge).toHaveText(label);
    if (label !== dc.code) {
      await expect(badge).not.toHaveText(dc.code);
    }
    if (dc.name && dc.name !== label) {
      await expect(badge).not.toHaveText(dc.name);
    }
    await page.screenshot({ path: path.join(shotDir, "095100-queues-datacenter-short.png") });
  } finally {
    await page.request.delete(`/api/queues/${queueId}`);
  }
});
