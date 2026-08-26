// TC002：校验数据中心创建、编辑、停用、删除与默认中心保护。

import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

test("TC002 datacenter create edit disable delete and default protection", async ({ page }) => {
  const code = `e2e${Date.now()}`;
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();

  const defaultRow = page.locator("tr", { hasText: "default" }).first();
  await expect(defaultRow.locator("strong")).toHaveText("默认数据中心");
  await expect(defaultRow.getByRole("button", { name: "停用" })).toBeDisabled();
  await expect(defaultRow.getByRole("button", { name: "删除" })).toBeDisabled();

  await page.getByRole("button", { name: "+ 新建数据中心" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("数据中心标识").fill(code);
  await dialog.getByLabel("显示名称").fill("E2E 数据中心");
  await dialog.getByLabel("简称").fill("E2E");
  await dialog.getByLabel("区域").fill("重庆");
  await page.getByRole("button", { name: "创建数据中心" }).click();
  await expect(page.getByRole("cell", { name: code, exact: true })).toBeVisible();

  const created = page.locator("tr", { hasText: code });
  await created.getByRole("button", { name: "编辑" }).click();
  await page.getByRole("dialog").getByLabel("显示名称").fill("E2E 数据中心-改");
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.locator("table").getByText("E2E 数据中心-改", { exact: true })).toBeVisible();

  await created.getByRole("button", { name: "停用" }).click();
  await page.getByRole("button", { name: "确认停用" }).click();
  await expect(created.getByText("停用", { exact: true })).toBeVisible();

  await created.getByRole("button", { name: "删除" }).click();
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByRole("cell", { name: code, exact: true })).toHaveCount(0);
});
