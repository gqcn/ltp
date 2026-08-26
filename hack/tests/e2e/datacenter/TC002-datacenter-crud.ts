// TC002：校验数据中心创建、编辑、停用、删除，且不再出现内置默认数据中心。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

test("TC002 datacenter create edit disable delete without builtin default", async ({ page }) => {
  const code = `e2e${Date.now()}`;
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();
  await expect(page.getByText("节点未配置时保持未分配")).toBeVisible();
  await expect(page.getByText("默认数据中心", { exact: true })).toHaveCount(0);
  await expect(page.locator("table").getByText("默认数据中心", { exact: true })).toHaveCount(0);

  const shotDir = path.resolve(process.cwd(), "../../temp/20260826");
  mkdirSync(shotDir, { recursive: true });
  await page.screenshot({ path: path.join(shotDir, "190000-tc002-datacenter-no-default.png") });

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
