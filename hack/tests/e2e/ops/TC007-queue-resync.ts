// TC007：Volcano Queue CR 丢失后，列表提示中文并可通过「重新同步」写回。

import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260827");

test("TC007 resync restores missing volcano queue", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();

  const clusterRes = await page.request.get("/api/clusters?pageNum=1&pageSize=10");
  expect(clusterRes.ok()).toBeTruthy();
  const clusterPayload = await clusterRes.json();
  expect(clusterPayload.code, JSON.stringify(clusterPayload)).toBe(0);
  const clusterId = clusterPayload.data.list[0]?.id as number | undefined;
  expect(clusterId).toBeTruthy();

  const teamRes = await page.request.get("/api/teams?pageNum=1&pageSize=10");
  expect(teamRes.ok()).toBeTruthy();
  const teamId = (await teamRes.json()).data.list[0]?.id as number | undefined;
  expect(teamId).toBeTruthy();

  const name = `e2e-sync-${Date.now()}`;
  const created = await page.request.post("/api/queues", {
    data: {
      clusterId,
      name,
      displayName: "E2E同步队列",
      datacenterCode: "cq-lj",
      gpuType: "NVIDIA-H200",
      gpuQuota: 1,
      cpuQuota: 1,
      memQuotaGi: 1,
      teamIds: [teamId],
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const queueId = (await created.json()).data.id as number;

  execSync(`kubectl --context kind-ltp delete queue ${name} --wait=false`, { stdio: "pipe" });

  await page.getByRole("link", { name: "队列管理" }).click();
  await expect(page.getByRole("heading", { name: "队列管理" })).toBeVisible();
  const row = page.locator("tr", { hasText: name });
  await expect(row).toBeVisible();
  await expect(row.getByText("找不到对应的 Volcano Queue")).toBeVisible();
  await row.screenshot({ path: path.join(shotDir, "121000-tc007-queue-missing.png") });
  await row.getByRole("button", { name: "重新同步" }).click();
  await expect(row.getByText("找不到对应的 Volcano Queue")).toHaveCount(0);
  await expect(row.getByRole("button", { name: "重新同步" })).toHaveCount(0);
  await row.screenshot({ path: path.join(shotDir, "121010-tc007-queue-resynced.png") });

  const deleted = await page.request.delete(`/api/queues/${queueId}`);
  expect(deleted.ok(), await deleted.text()).toBeTruthy();
});
