// TC022：项目编辑/删除在选中后出现在右侧；允许改名；侧栏不再有操作按钮。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsLdap } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260901");

test("TC022 project actions sit on the right and name can be renamed", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsLdap(page, "algo", "algo123");
  await page.getByRole("link", { name: "实验分析" }).click();
  await expect(page.getByRole("heading", { name: "实验分析" })).toBeVisible();
  await expect(page.locator(".exp-project-item").getByRole("button", { name: "编辑" })).toHaveCount(0);
  await expect(page.locator(".exp-project-item").getByRole("button", { name: "删除" })).toHaveCount(0);

  const name = `e2e-ren-${Date.now()}`;
  const renamed = `${name}-b`;
  await page.getByRole("button", { name: "+ 新建" }).click();
  const create = page.getByRole("dialog");
  await create.locator("#proj-form-name").fill(name);
  await create.getByRole("button", { name: "创建项目" }).click();
  const item = page.locator(".exp-project-item", { hasText: name });
  await expect(item).toBeVisible();
  await expect(page.locator(".exp-selected-actions")).toHaveCount(0);
  await item.click();
  await expect(page.locator(".exp-selected-actions").getByRole("button", { name: "编辑" })).toBeVisible();
  await expect(page.locator(".exp-selected-actions").getByRole("button", { name: "删除" })).toBeVisible();
  await page.screenshot({ path: path.join(shotDir, "101000-tc022-project-actions.png") });

  await page.locator(".exp-selected-actions").getByRole("button", { name: "编辑" }).click();
  const edit = page.getByRole("dialog");
  await expect(edit.getByRole("heading", { name: "编辑项目" })).toBeVisible();
  await expect(edit.locator("#proj-form-name")).not.toHaveAttribute("readonly");
  await edit.locator("#proj-form-name").fill(renamed);
  await edit.getByRole("button", { name: "保存" }).click();
  await expect(page.locator(".exp-project-item .exp-proj-name", { hasText: renamed })).toBeVisible();
  await expect(page.locator(".exp-selected-name")).toHaveText(renamed);
  await page.screenshot({ path: path.join(shotDir, "101010-tc022-project-renamed.png") });

  await page.locator(".exp-selected-actions").getByRole("button", { name: "删除" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByText(renamed)).toHaveCount(0);
});
