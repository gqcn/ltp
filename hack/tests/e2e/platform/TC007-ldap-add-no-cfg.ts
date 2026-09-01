// TC007：从 LDAP 添加用户弹窗不展示连接信息，检索与勾选仍可用。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260831");

test("TC007 LDAP add dialog does not show connection info", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "用户管理" }).click();
  await expect(page.getByRole("heading", { name: "用户管理" })).toBeVisible();
  await page.getByRole("button", { name: "+ 从 LDAP 添加" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "从 LDAP 添加用户" })).toBeVisible();
  await expect(dialog.locator(".ldap-add-cfg")).toHaveCount(0);
  await expect(dialog.getByText("最近测试成功")).toHaveCount(0);
  await expect(dialog.getByText("建议先测试连接")).toHaveCount(0);
  await expect(dialog.getByText(/^Base /)).toHaveCount(0);
  await expect(dialog.getByLabel("角色权限")).toBeVisible();
  await dialog.getByPlaceholder("姓名 / 账号 / 邮箱 / 部门...").fill("sunlei");
  await expect(dialog.getByText("孙磊")).toBeVisible();
  await dialog.screenshot({ path: path.join(shotDir, "160000-tc007-ldap-add-no-cfg.png") });
  await dialog.getByRole("button", { name: "取消" }).click();
  await expect(dialog).toHaveCount(0);
});
