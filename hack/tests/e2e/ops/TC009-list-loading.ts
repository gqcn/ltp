// TC009：列表初始化未返回数据时展示加载进度，而不是空态。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260827");

async function delayListGets(page: Page) {
  await page.route(/\/api\/(datacenters|clusters|queues|nodes|alerts|users|teams|roles)(\?|$)/, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1800));
    await route.continue();
  });
}

test("TC009 list pages show loading instead of empty while fetching", async ({ page }) => {
  test.setTimeout(90000);
  mkdirSync(shotDir, { recursive: true });
  await delayListGets(page);
  await loginAsAdmin(page);

  await expect(page.getByText("正在加载数据中心…")).toBeVisible();
  await expect(page.getByText("暂无数据中心，点击「新建数据中心」添加")).toHaveCount(0);
  await page.screenshot({ path: path.join(shotDir, "123000-tc009-datacenter-loading.png") });

  await page.getByRole("link", { name: "集群管理" }).click();
  await expect(page.getByText("正在加载集群…")).toBeVisible();
  await expect(page.getByText("暂无接入集群，点击「接入集群」添加")).toHaveCount(0);

  await page.getByRole("link", { name: "节点管理" }).click();
  await expect(page.getByText("正在加载节点…")).toBeVisible();
  await expect(page.getByText("当前集群下没有匹配的节点")).toHaveCount(0);

  await page.getByRole("link", { name: "队列管理" }).click();
  await expect(page.getByText("正在加载队列…")).toBeVisible();
  await expect(page.getByText("没有匹配的队列")).toHaveCount(0);

  await page.getByRole("link", { name: "告警中心" }).click();
  await expect(page.getByText("正在加载告警…")).toBeVisible();
  await expect(page.getByText("没有匹配的告警")).toHaveCount(0);

  await page.getByRole("link", { name: "用户管理" }).click();
  await expect(page.getByText("正在加载用户…")).toBeVisible();
  await expect(page.getByText("暂无平台用户，请点击「从 LDAP 添加」")).toHaveCount(0);

  await page.getByRole("link", { name: "团队管理" }).click();
  await expect(page.getByText("正在加载团队…")).toBeVisible();
  await expect(page.getByText("暂无团队")).toHaveCount(0);

  await page.getByRole("link", { name: "角色管理" }).click();
  await expect(page.getByText("正在加载角色…")).toBeVisible();
});
