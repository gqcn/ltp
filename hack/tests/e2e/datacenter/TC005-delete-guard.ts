// TC005：有关联资源时删除数据中心弹出拦截说明，不提供确认删除；无关联时仍可二次确认删除。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin } from "../login";

test("TC005 datacenter delete is blocked when related resources exist", async ({ page }) => {
  const code = `e2edel${Date.now()}`;
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();

  await page.getByRole("button", { name: "+ 新建数据中心" }).click();
  const form = page.getByRole("dialog");
  await form.getByLabel("数据中心标识").fill(code);
  await form.getByLabel("显示名称").fill("E2E 占用中心");
  await form.getByLabel("简称").fill("占用");
  await form.getByLabel("区域").fill("重庆");
  await page.getByRole("button", { name: "创建数据中心" }).click();
  await expect(page.getByRole("cell", { name: code, exact: true })).toBeVisible();

  await stubDatacenterUsage(page, code, { nodes: 5, queues: 2, clusters: 1 });
  await page.reload();
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();

  const row = page.locator("tr", { hasText: code });
  await expect(row.getByText("5 节点")).toBeVisible();
  await row.getByRole("button", { name: "删除" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "无法删除数据中心" })).toBeVisible();
  await expect(dialog.getByText("仍有关联资源，暂不可删除")).toBeVisible();
  await expect(
    dialog.getByText("当前关联 5 节点、2 队列、1 集群。请先解除节点的数据中心标记，删除或改挂队列，从集群覆盖中移除后再删除。"),
  ).toBeVisible();
  await expect(dialog.getByRole("button", { name: "确认删除" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "知道了" })).toBeVisible();

  const shotDir = path.resolve(process.cwd(), "../../temp/20260826");
  mkdirSync(shotDir, { recursive: true });
  await page.screenshot({ path: path.join(shotDir, "210000-tc005-dc-delete-blocked.png") });

  await dialog.getByRole("button", { name: "知道了" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("cell", { name: code, exact: true })).toBeVisible();

  await page.unroute("**/api/datacenters*");
  await page.reload();
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();
  const cleanRow = page.locator("tr", { hasText: code });
  await cleanRow.getByRole("button", { name: "删除" }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "确认删除数据中心" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByRole("cell", { name: code, exact: true })).toHaveCount(0);
});

type Usage = { nodes: number; queues: number; clusters: number };

async function stubDatacenterUsage(page: Page, code: string, usage: Usage) {
  await page.route("**/api/datacenters*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET" || /\/datacenters\/\d+(?:[/?]|$)/.test(request.url())) {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const payload = (await response.json()) as {
      data?: { list?: Array<{ code: string; usage?: Usage }> };
    };
    const list = payload.data?.list;
    if (list) {
      for (const item of list) {
        if (item.code === code) {
          item.usage = usage;
        }
      }
    }
    await route.fulfill({
      status: response.status(),
      headers: response.headers(),
      body: JSON.stringify(payload),
    });
  });
}
