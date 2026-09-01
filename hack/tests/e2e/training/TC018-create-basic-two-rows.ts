// TC018：新建任务基本信息中任务名称/运行用户、工作路径/实验项目各占一行两列。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Locator } from "@playwright/test";
import { loginAsAdmin, loginAsLdap, logoutFromShell } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260901");

test("TC018 create job basic fields share two rows", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();
  await page.getByRole("complementary").getByRole("link", { name: "新建任务" }).click();
  await expect(page.getByRole("heading", { name: "创建训练任务" })).toBeVisible();

  await assertSameRow(page.locator("#create-name"), page.locator("#create-run-user-search"));
  await assertSameRow(page.locator("#create-workdir"), page.locator("#create-project"));
  await page.screenshot({ path: path.join(shotDir, "223000-tc018-create-basic-admin.png") });

  await logoutFromShell(page);
  await loginAsLdap(page, "algo", "algo123");
  await page.getByRole("complementary").getByRole("link", { name: "新建任务" }).click();
  await expect(page.getByRole("heading", { name: "创建训练任务" })).toBeVisible();
  await expect(page.locator("#create-run-user-search")).toHaveCount(0);
  await assertSameRow(page.locator("#create-name"), page.locator("#create-workdir"));
  await page.screenshot({ path: path.join(shotDir, "223010-tc018-create-basic-algo.png") });
});

async function assertSameRow(left: Locator, right: Locator) {
  await expect(left).toBeVisible();
  await expect(right).toBeVisible();
  const a = await left.boundingBox();
  const b = await right.boundingBox();
  expect(a).toBeTruthy();
  expect(b).toBeTruthy();
  expect(Math.abs((a?.y ?? 0) - (b?.y ?? 0))).toBeLessThan(12);
  expect(b!.x).toBeGreaterThan(a!.x + 40);
}
