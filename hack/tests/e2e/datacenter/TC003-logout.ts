// TC003：校验退出登录后回到登录页。

import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

test("TC003 logout returns to login page", async ({ page }) => {
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();

  await page.getByRole("button", { name: "账户菜单" }).click();
  await page.getByTestId("logout-button").click();
  await expect(page.getByRole("button", { name: "LDAP 登录" })).toBeVisible();
  await page.goto("/ops/datacenters");
  await expect(page.getByRole("button", { name: "LDAP 登录" })).toBeVisible();
});
