// TC010：集群列表 GPU 列卡型号不得换行，且各行进度条上下对齐；不得靠缩短卡型号名称腾空间。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260827");

test("TC010 cluster GPU type names stay on one line and meters align", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await stubClusterGpuTypes(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "集群管理" }).click();
  await expect(page.getByRole("heading", { name: "集群管理" })).toBeVisible();
  await expect(page.getByRole("button", { name: "E2E 训练集群" })).toBeVisible();

  const listNames = page.locator(".td-cls-gpu .cls-gpu-type-name");
  await expect(listNames).toHaveCount(3);
  await expect.poll(async () => gpuNameMetrics(listNames)).toEqual([
    { text: "NVIDIA-GeForce-RTX-4090", lineCount: 1, whiteSpace: "nowrap" },
    { text: "NVIDIA-H200", lineCount: 1, whiteSpace: "nowrap" },
    { text: "NVIDIA-H800", lineCount: 1, whiteSpace: "nowrap" },
  ]);
  await expect.poll(async () => gpuMeterAlignment(page.locator(".td-cls-gpu .cls-gpu-type-list"))).toMatchObject({
    uniqueNameLefts: 1,
    uniqueMeterLefts: 1,
    uniqueBarLefts: 1,
  });
  await page.screenshot({ path: path.join(shotDir, "154000-tc010-cluster-gpu-align.png") });

  await page.getByRole("button", { name: "E2E 训练集群" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "E2E 训练集群" })).toBeVisible();
  const detailNames = dialog.locator(".cls-gpu-type-name");
  await expect(detailNames).toHaveCount(3);
  await expect.poll(async () => gpuNameMetrics(detailNames)).toEqual([
    { text: "NVIDIA-GeForce-RTX-4090", lineCount: 1, whiteSpace: "nowrap" },
    { text: "NVIDIA-H200", lineCount: 1, whiteSpace: "nowrap" },
    { text: "NVIDIA-H800", lineCount: 1, whiteSpace: "nowrap" },
  ]);
  await expect.poll(async () => gpuMeterAlignment(dialog.locator(".cls-gpu-type-list"))).toMatchObject({
    uniqueNameLefts: 1,
    uniqueMeterLefts: 1,
    uniqueBarLefts: 1,
  });
  await dialog.screenshot({ path: path.join(shotDir, "154010-tc010-cluster-gpu-detail-align.png") });
});

type GpuNameMetric = { text: string; lineCount: number; whiteSpace: string };

async function gpuNameMetrics(locator: Locator): Promise<GpuNameMetric[]> {
  return locator.evaluateAll((els) =>
    els.map((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return {
        text: (el.textContent || "").trim(),
        lineCount: range.getClientRects().length,
        whiteSpace: getComputedStyle(el).whiteSpace,
      };
    }),
  );
}

async function gpuMeterAlignment(root: Locator) {
  return root.evaluate((el) => {
    const unique = (values: number[]) => new Set(values).size;
    const names = [...el.querySelectorAll(".cls-gpu-type-name")].map((node) => Math.round(node.getBoundingClientRect().left));
    const meters = [...el.querySelectorAll(".node-usage-cell")].map((node) => Math.round(node.getBoundingClientRect().left));
    const bars = [...el.querySelectorAll(".node-usage-bar")].map((node) => Math.round(node.getBoundingClientRect().left));
    return {
      uniqueNameLefts: unique(names),
      uniqueMeterLefts: unique(meters),
      uniqueBarLefts: unique(bars),
    };
  });
}

async function stubClusterGpuTypes(page: Page) {
  const now = Date.now();
  await page.route(/\/api\/clusters(\?|$)/, async (route) => {
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
              id: 91001,
              name: "e2e-gpu-nowrap",
              displayName: "E2E 训练集群",
              description: "GPU 列名称换行回归",
              apiServer: "https://127.0.0.1:6443",
              version: "v1.27.16",
              status: "healthy",
              datacenters: [{ code: "cq-lj", name: "重庆两江", shortName: "两江", color: "#3b82f6" }],
              nodesReady: 3,
              nodesTotal: 3,
              gpu: { used: 6, total: 24, unit: "gpu" },
              cpu: { used: 12000, total: 48000, unit: "milliCPU" },
              memory: { used: 34359738368, total: 137438953472, unit: "bytes" },
              gpuByType: [
                { type: "NVIDIA-GeForce-RTX-4090", used: 3, total: 8 },
                { type: "NVIDIA-H200", used: 2, total: 8 },
                { type: "NVIDIA-H800", used: 1, total: 8 },
              ],
              kubeconfigSet: true,
              lastSyncAt: now,
              createdAt: now,
              updatedAt: now,
            },
          ],
          total: 1,
          summary: { total: 1, healthy: 1, readyNodes: 3, totalNodes: 3, gpuTotal: 24 },
        },
      }),
    });
  });
}
