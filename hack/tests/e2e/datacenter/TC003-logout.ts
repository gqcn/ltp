// TC003：退出登录需二次确认；取消留在当前页，确认后回到登录页。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { confirmLogout, loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260901");

test("TC003 logout returns to login page", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();

  await page.getByRole("button", { name: "账户菜单" }).click();
  await page.getByTestId("logout-button").click();
  await expect(page.getByRole("heading", { name: "确认退出登录" })).toBeVisible();
  await expect(page.getByText("未保存的页面状态将丢失")).toBeVisible();
  await page.screenshot({ path: path.join(shotDir, "224000-tc003-logout-confirm.png") });
  await page.getByRole("button", { name: "取消" }).click();
  await expect(page.getByRole("heading", { name: "确认退出登录" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();

  await page.getByRole("button", { name: "账户菜单" }).click();
  await page.getByTestId("logout-button").click();
  await confirmLogout(page);
  await expect(page.getByRole("button", { name: "LDAP 登录" })).toBeVisible();
  await page.goto("/ops/datacenters");
  await expect(page.getByRole("button", { name: "LDAP 登录" })).toBeVisible();
});
