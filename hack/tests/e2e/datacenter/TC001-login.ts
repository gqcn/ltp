// TC001：校验管理员登录成功与错误密码失败。

import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

test("TC001 login success and failed password", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "MAIP-大模型训练平台" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "LDAP 用户" })).toBeVisible();
  await expect(page.getByRole("button", { name: "LDAP 登录" })).toBeVisible();

  await page.getByRole("tab", { name: "平台管理员" }).click();
  await page.getByPlaceholder("admin", { exact: true }).fill("admin");
  await page.getByPlaceholder("admin123").fill("wrong-password");
  await page.getByRole("button", { name: "平台管理员登录" }).click();
  await expect(page.getByRole("alert")).toBeVisible();

  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();
  await expect(page.getByText("任务列表")).toHaveCount(0);
  await expect(page.getByText("用户管理").first()).toBeVisible();
});
