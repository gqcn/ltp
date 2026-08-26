// TC001：管理员可管理平台用户与角色。

import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

test("TC001 admin can manage users and rename roles", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "用户管理" }).click();
  await expect(page.getByRole("heading", { name: "用户管理" })).toBeVisible();
  await page.getByPlaceholder("搜索姓名 / 账号 / 邮箱 / 部门...").fill("algo");
  await expect(page.getByRole("cell", { name: "algo", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "admin", exact: true })).toHaveCount(0);
  await page.getByPlaceholder("搜索姓名 / 账号 / 邮箱 / 部门...").fill("");

  await page.getByRole("button", { name: "+ 从 LDAP 添加" }).click();
  const addDialog = page.getByRole("dialog");
  await expect(addDialog.getByRole("heading", { name: "从 LDAP 添加用户" })).toBeVisible();
  await addDialog.getByPlaceholder("姓名 / 账号 / 邮箱 / 部门...").fill("sunlei");
  await expect(addDialog.getByText("孙磊")).toBeVisible();
  const ldapRow = addDialog.locator("label.ldap-user-row", { hasText: "sunlei" });
  const checkbox = ldapRow.locator("input[type=checkbox]");
  if (await checkbox.isEnabled()) {
    await checkbox.check();
    await addDialog.getByRole("button", { name: "添加所选用户" }).click();
  } else {
    await addDialog.getByRole("button", { name: "取消" }).click();
  }
  await page.getByPlaceholder("搜索姓名 / 账号 / 邮箱 / 部门...").fill("sunlei");
  const row = page.locator("tbody tr", { hasText: "sunlei" });
  await expect(row).toBeVisible();
  await expect(row.getByRole("button", { name: "角色授权" })).toBeVisible();
  await expect(row.getByRole("button", { name: "移除" })).toBeVisible();

  await page.getByRole("link", { name: "角色管理" }).click();
  await expect(page.getByRole("heading", { name: "角色管理" })).toBeVisible();
  const algoRow = page.locator("tr", { hasText: "算法工程师" }).first();
  await algoRow.getByRole("button", { name: "编辑" }).click();
  const rename = page.getByRole("dialog");
  await rename.getByLabel("角色名称").fill("算法工程师");
  await rename.getByRole("button", { name: "保存" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("table").getByText("算法工程师", { exact: true })).toBeVisible();
});
