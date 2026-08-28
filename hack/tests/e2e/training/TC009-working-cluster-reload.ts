// TC009：确认切换工作集群后刷新页面，仍保持所选集群，不回退为列表第一项。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260828");
const clusterA = { id: 101, name: "ltp-a", displayName: "E2E 集群甲", status: "healthy" };
const clusterB = { id: 102, name: "ltp-b", displayName: "E2E 集群乙", status: "healthy" };
const jobA = "job-cluster-a";
const jobB = "job-cluster-b";

test("TC009 working cluster survives full page reload", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  let delayClusters = false;
  await stubTrainingClustersAndJobs(page, () => delayClusters);
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();
  await page.getByRole("complementary").getByRole("link", { name: "任务列表" }).click();
  await expect(page.getByRole("heading", { name: "任务列表" })).toBeVisible();

  const clusterSelect = page.getByLabel("工作集群");
  await clusterSelect.selectOption(String(clusterB.id));
  await confirmClusterSwitch(page);
  await expect(clusterSelect).toHaveValue(String(clusterB.id));
  await expect(page.locator(".link-cell")).toHaveText(jobB);
  await page.screenshot({ path: path.join(shotDir, "150000-tc009-cluster-b-before-reload.png") });

  delayClusters = true;
  await page.reload();
  await expect(page.getByRole("heading", { name: "任务列表" })).toBeVisible();
  await expect(page.getByLabel("工作集群")).toHaveValue(String(clusterB.id));
  await expect(page.locator(".link-cell")).toHaveText(jobB);
  await expect(page.getByText(jobA, { exact: true })).toHaveCount(0);
  await page.screenshot({ path: path.join(shotDir, "150010-tc009-cluster-b-after-reload.png") });
});

async function confirmClusterSwitch(page: Page) {
  const confirm = page.getByRole("button", { name: "确认切换并刷新" });
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click();
  }
}

async function stubTrainingClustersAndJobs(page: Page, shouldDelay: () => boolean) {
  await page.route(/\/api\/training\/clusters(\?|$)/, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    if (shouldDelay()) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "OK", data: { list: [clusterA, clusterB] } }),
    });
  });
  await page.route(/\/api\/training\/jobs(\?|$)/, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    const url = new URL(route.request().url());
    const clusterId = Number(url.searchParams.get("clusterId"));
    const name = clusterId === clusterB.id ? jobB : jobA;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        message: "OK",
        data: { list: [jobRow(clusterId || clusterA.id, name)], total: 1 },
      }),
    });
  });
}

function jobRow(clusterId: number, name: string) {
  const now = Date.now();
  return {
    id: clusterId,
    clusterId,
    name,
    status: "queued",
    priority: "P2",
    teamId: 1,
    teamName: "SLM预训练",
    queueId: 1,
    queueName: "lab-default",
    queueDisplayName: "实验默认队列",
    datacenterCode: "cq-lj",
    gpuType: "NVIDIA-H200",
    requireIb: false,
    nodes: 1,
    gpusPerNode: 1,
    gpuCount: 1,
    cpuPerNode: 16,
    memGiPerNode: 128,
    ownerUsername: "algo",
    ownerNickname: "算法工程师",
    submittedByUsername: "algo",
    submittedByNickname: "算法工程师",
    durationMs: 0,
    gpuHours: 0,
    syncError: "",
    failReason: "",
    rerunFromId: 0,
    createdAt: now,
    startedAt: 0,
    endedAt: 0,
  };
}
