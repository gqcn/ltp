// TC021：实验分析页创建带描述的项目后，侧栏不展示描述，选中后主区域展示描述。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsLdap } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260901");

test("TC021 experiment project description is visible in main not sidebar", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsLdap(page, "algo", "algo123");
  await page.getByRole("link", { name: "实验分析" }).click();
  await expect(page.getByRole("heading", { name: "实验分析" })).toBeVisible();

  const name = `e2e-desc-${Date.now()}`;
  const desc = "7B 预训练主线，用于对照学习率";
  await page.getByRole("button", { name: "+ 新建" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "新建项目" })).toBeVisible();
  await dialog.locator("#proj-form-name").fill(name);
  await dialog.locator("#proj-form-desc").fill(desc);
  await dialog.getByRole("button", { name: "创建项目" }).click();

  const item = page.locator(".exp-project-item", { hasText: name });
  await expect(item).toBeVisible();
  await expect(item.locator(".exp-proj-desc")).toHaveCount(0);
  await expect(item.locator(".exp-proj-name")).toHaveText(name);
  await expect(page.locator(".exp-selected-desc")).toHaveCount(0);
  await page.screenshot({ path: path.join(shotDir, "100000-tc021-project-desc-sidebar.png") });

  await item.click();
  await expect(page.locator(".exp-selected-name")).toHaveText(name);
  await expect(page.locator(".exp-selected-desc")).toHaveText(desc);
  await page.screenshot({ path: path.join(shotDir, "100010-tc021-project-desc-main.png") });

  await page.locator(".exp-selected-actions").getByRole("button", { name: "删除" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByText(name)).toHaveCount(0);
});
