// TC016：配置管理新建 / 编辑页章节 Tab 滚动后仍吸顶，对齐 prototype.v4。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsLdap } from "../login";
import { chooseSelect, listSelectOptions } from "../select";

const shotDir = path.resolve(process.cwd(), "../../temp/20260901");

test("TC016 config create and edit form tabs stay pinned while scrolling", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsLdap(page, "algo", "algo123");
  await page.locator(".sidebar-nav").getByRole("link", { name: "配置管理" }).click();
  await expect(page.getByRole("heading", { name: "配置管理" })).toBeVisible();
  await page.getByRole("button", { name: "+ 新建配置集" }).click();
  await expect(page.getByRole("heading", { name: "新建配置集" })).toBeVisible();

  const tabs = page.locator("#cfg-edit-tabs");
  await expect(tabs).toBeVisible();
  await expect(tabs).toHaveCSS("position", "sticky");
  const topbar = page.locator(".topbar");
  await expect(topbar).toBeVisible();

  await page.locator("#cfg-edit-section-files").scrollIntoViewIfNeeded();
  await expect.poll(async () => {
    const tabBox = await tabs.boundingBox();
    const barBox = await topbar.boundingBox();
    if (!tabBox || !barBox) {
      return Number.POSITIVE_INFINITY;
    }
    return Math.abs(tabBox.y - (barBox.y + barBox.height));
  }).toBeLessThan(2);
  await expect(tabs.getByRole("button", { name: /文件/ })).toBeVisible();
  await page.screenshot({ path: path.join(shotDir, "221000-tc016-config-create-tabs-stuck.png") });

  await page.locator("#cfg-edit-section-basic").scrollIntoViewIfNeeded();
  const name = `e2e-cfg-sticky-${Date.now()}`;
  await page.getByPlaceholder("例如 SLM 7B Phase4 预训练").fill(name);
  const team = page.locator("#cfg-edit-team");
  const options = await listSelectOptions(team);
  if (options.filter((item) => item.value && item.value !== "0").length < 1) {
    return;
  }
  await chooseSelect(team, { index: 1 });
  await page.getByRole("button", { name: "保存草稿" }).click();
  await expect(page.getByText("草稿已保存")).toBeVisible();
  await expect(page.getByRole("heading", { name: /发布新版本/ })).toBeVisible();

  const editTabs = page.locator("#cfg-edit-tabs");
  await expect(editTabs).toHaveCSS("position", "sticky");
  await page.locator("#cfg-edit-section-publish").scrollIntoViewIfNeeded();
  await expect.poll(async () => {
    const tabBox = await editTabs.boundingBox();
    const barBox = await topbar.boundingBox();
    if (!tabBox || !barBox) {
      return Number.POSITIVE_INFINITY;
    }
    return Math.abs(tabBox.y - (barBox.y + barBox.height));
  }).toBeLessThan(2);
  await page.screenshot({ path: path.join(shotDir, "221010-tc016-config-edit-tabs-stuck.png") });
});
