// TC015：新建 / 重跑任务页章节 Tab 滚动后仍吸顶，对齐 prototype.v4。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsLdap } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260901");

test("TC015 create and rerun form tabs stay pinned while scrolling", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsLdap(page, "algo", "algo123");
  await page.getByRole("link", { name: "新建任务" }).click();
  await expect(page.getByRole("heading", { name: "创建训练任务" })).toBeVisible();

  const tabs = page.locator("#create-form-tabs");
  await expect(tabs).toBeVisible();
  await expect(tabs).toHaveCSS("position", "sticky");
  const topbar = page.locator(".topbar");
  await expect(topbar).toBeVisible();

  await page.locator("#create-section-launch").scrollIntoViewIfNeeded();
  await expect.poll(async () => {
    const tabBox = await tabs.boundingBox();
    const barBox = await topbar.boundingBox();
    if (!tabBox || !barBox) {
      return Number.POSITIVE_INFINITY;
    }
    return Math.abs(tabBox.y - (barBox.y + barBox.height));
  }).toBeLessThan(2);
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole("button", { name: /镜像与启动/ })).toBeVisible();
  await page.screenshot({ path: path.join(shotDir, "220000-tc015-create-tabs-stuck.png") });

  const clusterRes = await page.request.get("/api/training/clusters");
  const clusters = clusterRes.ok() ? (((await clusterRes.json()).data.list ?? []) as { id: number }[]) : [];
  const clusterId = clusters[0]?.id;
  const jobsRes = clusterId ? await page.request.get(`/api/training/jobs?pageNum=1&pageSize=1&clusterId=${clusterId}`) : null;
  const jobId = jobsRes && jobsRes.ok() ? (((await jobsRes.json()).data.list ?? [])[0]?.id as number | undefined) : undefined;
  if (!jobId) {
    return;
  }
  await page.goto(`/training/jobs/new?rerun=${jobId}`);
  await expect(page.getByRole("heading", { name: "重跑训练任务" })).toBeVisible();
  const rerunTabs = page.locator("#create-form-tabs");
  await expect(rerunTabs).toHaveCSS("position", "sticky");
  await page.locator("#create-section-configs").scrollIntoViewIfNeeded();
  await expect.poll(async () => {
    const tabBox = await rerunTabs.boundingBox();
    const barBox = await topbar.boundingBox();
    if (!tabBox || !barBox) {
      return Number.POSITIVE_INFINITY;
    }
    return Math.abs(tabBox.y - (barBox.y + barBox.height));
  }).toBeLessThan(2);
  await page.screenshot({ path: path.join(shotDir, "220010-tc015-rerun-tabs-stuck.png") });
});
