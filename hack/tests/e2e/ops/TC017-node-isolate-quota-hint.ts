// TC017：隔离确认框在额度将下降或将超额时醒目提示，不计入额度时不提示。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260831");

test("TC017 isolate dialog warns when quota would be over-allocated", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await stubQuotaImpact(page, {
    changed: true,
    overAllocated: true,
    datacenters: [
      {
        datacenterCode: "cq-lj",
        cpuCurrent: 16,
        cpuAfter: 8,
        cpuAllocated: 8,
        memCurrentGi: 32,
        memAfterGi: 16,
        memAllocated: 16,
        gpuTypes: [{ type: "NVIDIA-H200", current: 16, after: 8, allocated: 16 }],
      },
    ],
  });
  const dialog = await openIsolateDialog(page);
  const quota = dialog.locator(".modal-maint-quota.is-danger");
  await expect(quota).toBeVisible();
  await expect(quota.locator(".modal-maint-quota-title")).toHaveText("隔离后可调度容量将低于已划分给队列的额度");
  await expect(quota).toContainText("NVIDIA-H200");
  await expect(quota).toContainText("GPU 16 卡 → 8 卡");
  await expect(quota).toContainText("队列已划分 16 卡");
  await expect(quota).toContainText("隔离后将超额 8 卡");
  await dialog.screenshot({ path: path.join(shotDir, "110000-tc017-isolate-quota-over.png") });
  await dialog.getByRole("button", { name: "取消" }).click();
  await expect(dialog).toHaveCount(0);
});

test("TC017 isolate dialog warns when schedulable quota would drop", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await stubQuotaImpact(page, {
    changed: true,
    overAllocated: false,
    datacenters: [
      {
        datacenterCode: "cq-lj",
        cpuCurrent: 16,
        cpuAfter: 8,
        cpuAllocated: 4,
        memCurrentGi: 32,
        memAfterGi: 16,
        memAllocated: 8,
        gpuTypes: [{ type: "NVIDIA-H200", current: 16, after: 8, allocated: 8 }],
      },
    ],
  });
  const dialog = await openIsolateDialog(page);
  const quota = dialog.locator(".modal-maint-quota.is-warning");
  await expect(quota).toBeVisible();
  await expect(quota.locator(".modal-maint-quota-title")).toHaveText("隔离后队列可调度额度将下降");
  await expect(quota).toContainText("GPU 16 卡 → 8 卡，队列已划分 8 卡");
  await expect(quota).not.toContainText("将超额");
  await dialog.screenshot({ path: path.join(shotDir, "110050-tc017-isolate-quota-drop.png") });
  await dialog.getByRole("button", { name: "取消" }).click();
});

test("TC017 isolate dialog hides quota hint when capacity would not change", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await stubQuotaImpact(page, { changed: false, overAllocated: false, datacenters: [] });
  const dialog = await openIsolateDialog(page);
  await expect(dialog.getByRole("heading", { name: /确认.*隔离/ })).toBeVisible();
  await expect(dialog.locator(".modal-maint-quota")).toHaveCount(0);
  await expect(dialog.locator(".modal-maint-hint")).toContainText("cordon");
  await dialog.screenshot({ path: path.join(shotDir, "110100-tc017-isolate-quota-unchanged.png") });
  await dialog.getByRole("button", { name: "取消" }).click();
});

async function openIsolateDialog(page: Page) {
  await stubNodeList(page);
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "节点管理" }).click();
  await expect(page.getByRole("heading", { name: "节点管理" })).toBeVisible();
  const row = page.locator("tbody tr").filter({ has: page.getByRole("button", { name: "隔离" }) }).first();
  await expect(row).toBeVisible();
  const impactWait = page.waitForResponse((res) => res.url().includes("/nodes/quota-impact") && res.request().method() === "GET");
  await row.getByRole("button", { name: "隔离" }).click();
  await impactWait;
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: /确认.*隔离/ })).toBeVisible();
  await expect(dialog.getByText("正在核算隔离对队列额度的影响…")).toHaveCount(0);
  return dialog;
}

function fixtureNode() {
  return {
    name: "gpu-node-h200",
    ip: "172.18.0.10",
    roles: ["worker"],
    ready: true,
    schedulable: true,
    status: "Ready",
    datacenter: "cq-lj",
    gpuType: "NVIDIA-H200",
    hasIB: false,
    ibDomain: "",
    isolated: false,
    isolateRemark: "",
    podCount: 0,
    podCapacity: 110,
    gpuUsed: 0,
    gpuTotal: 8,
    cpuUsedMilli: 0,
    cpuTotalMilli: 8000,
    memUsedBytes: 0,
    memTotalBytes: 8 * 1024 * 1024 * 1024,
    conditions: [] as string[],
    labels: { "maip.io/datacenter": "cq-lj", "maip.io/gpu-type": "NVIDIA-H200" },
    taints: [] as { key: string; value: string; effect: string }[],
  };
}

async function stubNodeList(page: Page) {
  await page.route(/\/api\/nodes(\?|$)/, async (route) => {
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
          list: [fixtureNode()],
          total: 1,
          summary: { total: 1, ready: 1, notReady: 0, unschedulable: 0, unsetDc: 0 },
          gpuTypes: ["NVIDIA-H200"],
        },
      }),
    });
  });
}

async function stubQuotaImpact(
  page: Page,
  data: {
    changed: boolean;
    overAllocated: boolean;
    datacenters: Array<{
      datacenterCode: string;
      cpuCurrent: number;
      cpuAfter: number;
      cpuAllocated: number;
      memCurrentGi: number;
      memAfterGi: number;
      memAllocated: number;
      gpuTypes: Array<{ type: string; current: number; after: number; allocated: number }>;
    }>;
  },
) {
  await page.route(/\/api\/nodes\/quota-impact/, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "OK", data }),
    });
  });
}
