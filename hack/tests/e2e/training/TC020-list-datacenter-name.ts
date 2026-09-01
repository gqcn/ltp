// TC020：任务列表与我的队列数据中心列展示简称，不把全称或英文标识当作主文案。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { loginAsLdap } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260901");
const jobName = "slm-7b-pretrain-phase4";
const dcName = "重庆两江";
const dcShort = "两江";
const dcCode = "cq-lj";

test("TC020 job list and my queues show datacenter short name not full name or code", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await stubTrainingLists(page);
  await loginAsLdap(page, "algo", "algo123");
  await expect(page.getByRole("heading", { name: "任务列表" })).toBeVisible();
  const jobBadge = page.locator("tbody .dc-badge").first();
  await expect(jobBadge).toHaveText(dcShort);
  await expect(jobBadge).not.toHaveText(dcCode);
  await page.screenshot({ path: path.join(shotDir, "095000-jobs-datacenter-short.png") });

  await page.getByRole("link", { name: "我的队列" }).click();
  await expect(page.getByRole("heading", { name: "我的队列" })).toBeVisible();
  const queueBadge = page.locator("tbody .dc-badge").first();
  await expect(queueBadge).toHaveText(dcShort);
  await expect(queueBadge).not.toHaveText(dcCode);
  await page.screenshot({ path: path.join(shotDir, "095010-my-queues-datacenter-short.png") });
});

async function stubTrainingLists(page: Page) {
  const now = Date.now();
  await page.route(/\/api\/training\/clusters(\?|$)/, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        message: "OK",
        data: { list: [{ id: 1, name: "ltp", displayName: "E2E 集群", status: "healthy" }] },
      }),
    });
  });
  await page.route(/\/api\/training\/teams(\?|$)/, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "OK", data: { list: [{ id: 1, name: "SLM预训练" }] } }),
    });
  });
  await page.route(/\/api\/training\/jobs(\?|$)/, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        message: "OK",
        data: {
          list: [
            {
              id: 42,
              clusterId: 1,
              name: jobName,
              status: "running",
              priority: "P2",
              teamId: 1,
              teamName: "SLM预训练",
              queueId: 1,
              queueName: "lab-default",
              queueDisplayName: "实验默认队列",
              datacenterCode: dcCode,
              datacenterName: dcName,
              datacenterShortName: "两江",
              datacenterColor: "#3b82f6",
              gpuType: "NVIDIA-H200",
              requireIb: false,
              nodes: 1,
              gpusPerNode: 8,
              gpuCount: 8,
              cpuPerNode: 16,
              memGiPerNode: 128,
              ownerUsername: "algo",
              ownerNickname: "算法工程师",
              submittedByUsername: "algo",
              submittedByNickname: "算法工程师",
              durationMs: 3600000,
              gpuHours: 8,
              syncError: "",
              failReason: "",
              rerunFromId: 0,
              createdAt: now,
              startedAt: now,
              endedAt: 0,
            },
          ],
          total: 1,
        },
      }),
    });
  });
  await page.route(/\/api\/training\/queues(\?|$)/, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        message: "OK",
        data: {
          summary: {
            gpuQuota: 8,
            gpuUsed: 2,
            cpuQuota: 32,
            cpuUsed: 8,
            memQuotaGi: 64,
            memUsedGi: 16,
            gpuHoursMonth: 8,
            gpuHoursRunning: 8,
            running: 1,
            pending: 0,
          },
          list: [
            {
              id: 1,
              name: "lab-default",
              displayName: "实验默认队列",
              datacenterCode: dcCode,
              datacenterName: dcName,
              datacenterShortName: "两江",
              datacenterColor: "#3b82f6",
              gpuType: "NVIDIA-H200",
              gpuQuota: 8,
              gpuUsed: 2,
              cpuQuota: 32,
              cpuUsed: 8,
              memQuotaGi: 64,
              memUsedGi: 16,
              features: [],
              enabled: true,
              state: "Open",
              syncError: "",
              teams: [{ id: 1, name: "SLM预训练" }],
              gpuHoursMonth: 8,
              running: 1,
              pending: 0,
              activeJobs: [],
            },
          ],
        },
      }),
    });
  });
}
