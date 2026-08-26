// 以平台管理员账号登录控制台。

import type { Page } from "@playwright/test";

export async function loginAsAdmin(page: Page, password = "admin123") {
  await page.goto("/login");
  await page.getByRole("tab", { name: "平台管理员" }).click();
  await page.getByPlaceholder("admin", { exact: true }).fill("admin");
  await page.getByPlaceholder("admin123").fill(password);
  await page.getByRole("button", { name: "平台管理员登录" }).click();
}

export async function loginAsLdap(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByRole("tab", { name: "LDAP 用户" }).click();
  await page.locator("#login-username").fill(username);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "LDAP 登录" }).click();
}
