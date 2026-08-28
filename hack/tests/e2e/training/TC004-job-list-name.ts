// TC004：任务列表名称列只展示 Kubernetes 对象名，不在名称下展示数字 ID。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { loginAsLdap } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260827");
const jobName = "slm-7b-pretrain-phase4";
const jobId = 42;

test("TC004 job list shows k8s name without numeric id", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await stubJobList(page);
  await loginAsLdap(page, "algo", "algo123");
  await expect(page.getByRole("heading", { name: "任务列表" })).toBeVisible();
  const nameCell = page.locator("tbody tr").first().locator("td").first();
  await expect(nameCell.getByText(jobName, { exact: true })).toBeVisible();
  await expect(nameCell).toHaveText(jobName);
  await expect(nameCell.getByText(String(jobId), { exact: true })).toHaveCount(0);
  await page.screenshot({ path: path.join(shotDir, "161000-tc004-job-list-name.png") });
});

async function stubJobList(page: Page) {
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
      body: JSON.stringify({
        code: 0,
        message: "OK",
        data: { list: [{ id: 1, name: "SLM预训练" }] },
      }),
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
              id: jobId,
              clusterId: 1,
              name: jobName,
              status: "running",
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
}
