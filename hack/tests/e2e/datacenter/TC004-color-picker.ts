// TC004：数据中心展示色支持图标切换、色板点选与手填 hex。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

test("TC004 datacenter color cycles from swatch, palette, and hex input", async ({ page }) => {
  const code = `e2ecolor${Date.now()}`;
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();

  await page.getByRole("button", { name: "+ 新建数据中心" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "新建数据中心" })).toBeVisible();

  const hex = dialog.getByLabel("展示色");
  await expect(hex).toHaveValue("#3b82f6");
  await dialog.getByRole("button", { name: "换一个颜色" }).click();
  await expect(hex).toHaveValue("#b60205");
  await expect(page.locator("input[type='color']")).toHaveCount(0);

  await hex.click();
  const palette = dialog.getByRole("listbox", { name: "常用颜色" });
  await expect(palette).toBeVisible();

  const shotDir = path.resolve(process.cwd(), "../../temp/20260826");
  mkdirSync(shotDir, { recursive: true });
  await page.screenshot({ path: path.join(shotDir, "193000-tc004-color-palette.png") });

  await dialog.getByRole("option", { name: "#0e8a16" }).click();
  await expect(hex).toHaveValue("#0e8a16");
  await expect(palette).toHaveCount(0);

  await hex.fill("#22d3ee");
  await expect(hex).toHaveValue("#22d3ee");

  await dialog.getByLabel("数据中心标识").fill(code);
  await dialog.getByLabel("显示名称").fill("选色数据中心");
  await dialog.getByLabel("简称").fill("选色");
  await page.getByRole("button", { name: "创建数据中心" }).click();
  await expect(page.getByRole("cell", { name: code, exact: true })).toBeVisible();

  const created = page.locator("tr", { hasText: code });
  await created.getByRole("button", { name: "编辑" }).click();
  await expect(page.getByRole("dialog").getByLabel("展示色")).toHaveValue("#22d3ee");
  await page.getByRole("button", { name: "取消" }).click();

  await created.getByRole("button", { name: "删除" }).click();
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByRole("cell", { name: code, exact: true })).toHaveCount(0);
});
