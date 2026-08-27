// TC006：登录与数据中心表单校验失败返回中文，并聚焦到首个无效输入域。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260826");
const englishError = /Please fill|The \w+ field is required/i;

test("TC006 login and datacenter validation shows Chinese field errors and focuses invalid input", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await page.goto("/login");
  await page.getByRole("tab", { name: "平台管理员" }).click();
  await page.getByRole("button", { name: "平台管理员登录" }).click();
  await expect(page.getByText("请填写平台管理员账号")).toBeVisible();
  await expect(page.getByText("请填写密码")).toBeVisible();
  await expect(page.locator("#login-username")).toBeFocused();
  await expect(page.getByText(englishError)).toHaveCount(0);
  await page.screenshot({ path: path.join(shotDir, "230000-tc006-login-empty.png") });

  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();
  await page.getByRole("button", { name: "+ 新建数据中心" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "创建数据中心" }).click();
  await expect(dialog.getByText("请填写数据中心标识")).toBeVisible();
  await expect(dialog.getByText("请填写显示名称")).toBeVisible();
  await expect(dialog.getByText("请填写简称")).toBeVisible();
  await expect(dialog.locator("#dc-form-id")).toBeFocused();
  await expect(dialog.getByText(englishError)).toHaveCount(0);
  await dialog.screenshot({ path: path.join(shotDir, "230100-tc006-datacenter-empty.png") });

  await dialog.getByLabel("数据中心标识").fill("Bad_Code");
  await dialog.getByRole("button", { name: "创建数据中心" }).click();
  await expect(dialog.getByText("数据中心标识仅支持小写字母、数字与连字符，且不能以连字符开头或结尾")).toBeVisible();
  await expect(dialog.locator("#dc-form-id")).toBeFocused();
});
