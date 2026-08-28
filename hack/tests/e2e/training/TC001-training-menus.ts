// TC001：算法工程师看到训练中心四菜单，看不到实验分析与运维中心。

import { expect, test } from "@playwright/test";
import { loginAsAdmin, loginAsLdap } from "../login";

test("TC001 training menus for algo and admin", async ({ page }) => {
  await loginAsLdap(page, "algo", "algo123");
  await expect(page.getByRole("heading", { name: "任务列表" })).toBeVisible();
  await expect(page.getByRole("link", { name: "新建任务" })).toBeVisible();
  await expect(page.getByRole("link", { name: "我的队列" })).toBeVisible();
  await expect(page.getByRole("link", { name: "配置管理" })).toBeVisible();
  await expect(page.getByText("实验分析")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "数据中心" })).toHaveCount(0);
  await expect(page.getByText("用户管理")).toHaveCount(0);

  await page.getByRole("button", { name: "账户菜单" }).click();
  await page.getByTestId("logout-button").click();
  await loginAsAdmin(page);
  await expect(page.getByRole("link", { name: "任务列表" })).toBeVisible();
  await expect(page.getByRole("link", { name: "数据中心" })).toBeVisible();
  await expect(page.getByText("实验分析")).toHaveCount(0);
  await expect(page.getByText("集群概览")).toHaveCount(0);
});
