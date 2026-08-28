// TC001：运维中心菜单（除集群概览外）对管理员可见。

import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

test("TC001 ops menus except cluster overview", async ({ page }) => {
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();
  await expect(page.getByRole("link", { name: "集群管理" })).toBeVisible();
  await expect(page.getByRole("link", { name: "节点管理" })).toBeVisible();
  await expect(page.getByRole("link", { name: "队列管理" })).toBeVisible();
  await expect(page.getByRole("link", { name: "告警中心" })).toBeVisible();
  await expect(page.getByText("集群概览")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "任务列表" })).toBeVisible();
  await expect(page.getByText("实验分析")).toHaveCount(0);

  await page.getByRole("link", { name: "集群管理" }).click();
  await expect(page.getByRole("heading", { name: "集群管理" })).toBeVisible();
  await expect(page.getByRole("button", { name: "+ 接入集群" })).toBeVisible();

  await page.getByRole("link", { name: "队列管理" }).click();
  await expect(page.getByRole("heading", { name: "队列管理" })).toBeVisible();

  await page.getByRole("link", { name: "告警中心" }).click();
  await expect(page.getByRole("heading", { name: "告警中心" })).toBeVisible();
});
