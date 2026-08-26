// TC002：团队维护、LDAP 配置测试，以及角色菜单裁剪。

import { expect, test } from "@playwright/test";
import { loginAsAdmin, loginAsLdap } from "../login";

test("TC002 teams ldap config and role menus", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "团队管理" }).click();
  await expect(page.getByRole("heading", { name: "团队管理" })).toBeVisible();
  await expect(page.getByRole("button", { name: "管理队列" })).toHaveCount(0);

  await page.getByRole("button", { name: "+ 新建团队" }).click();
  const dialog = page.getByRole("dialog");
  const name = `E2E团队${Date.now()}`;
  await dialog.getByLabel("团队名称").fill(name);
  await dialog.getByPlaceholder("搜索姓名 / 账号 / 邮箱...").fill("algo");
  await dialog.getByRole("button", { name: /算法工程师/ }).first().click();
  await dialog.getByRole("button", { name: "创建团队" }).click();
  await expect(page.locator(".rp-list-title", { hasText: name })).toBeVisible();
  await expect(page.getByText("关联队列")).toHaveCount(0);

  await page.getByRole("link", { name: "系统配置" }).click();
  await expect(page.getByRole("heading", { name: "系统配置" })).toBeVisible();
  await page.getByRole("button", { name: "测试连接" }).click();
  await expect(page.getByText("连接成功")).toBeVisible();

  await page.getByRole("button", { name: "账户菜单" }).click();
  await page.getByTestId("logout-button").click();

  await loginAsLdap(page, "sre", "sre123");
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();
  await expect(page.getByText("用户管理")).toHaveCount(0);

  await page.getByRole("button", { name: "账户菜单" }).click();
  await page.getByTestId("logout-button").click();
  await loginAsLdap(page, "algo", "algo123");
  await expect(page.getByRole("heading", { name: "暂无可用模块" })).toBeVisible();
  await expect(page.getByText("数据中心")).toHaveCount(0);
});
