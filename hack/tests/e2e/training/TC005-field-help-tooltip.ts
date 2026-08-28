// TC005：问号帮助图标悬停后立即出现原型浮层，而不是浏览器原生延迟 title。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsLdap } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260827");

test("TC005 job create field-help shows floating tip immediately", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsLdap(page, "algo", "algo123");
  await page.getByRole("link", { name: "新建任务" }).click();
  await expect(page.getByRole("heading", { name: "创建训练任务" })).toBeVisible();

  const helps = page.locator(".field-help");
  await expect(helps.first()).toBeVisible();
  expect(await helps.count()).toBeGreaterThan(1);
  for (const help of await helps.all()) {
    await expect(help).not.toHaveAttribute("title");
  }

  await assertImmediateTip(page, page.getByRole("button", { name: "任务名称说明" }), "Kubernetes DNS-1123");
  await page.screenshot({ path: path.join(shotDir, "190000-tc005-job-create-field-help.png") });

  await page.getByRole("button", { name: "资源规格" }).click();
  await assertImmediateTip(page, page.getByRole("button", { name: "所属团队说明" }), "普通用户仅见自己加入的团队");

  await page.getByRole("button", { name: "镜像与启动" }).click();
  await assertImmediateTip(page, page.getByRole("button", { name: "启动命令说明" }), "$MASTER_ADDR");
});

async function assertImmediateTip(page: Page, help: Locator, text: string) {
  await help.scrollIntoViewIfNeeded();
  await help.hover();
  const tip = page.locator(".field-help-floating-tip.is-visible");
  await expect(tip).toBeVisible({ timeout: 400 });
  await expect(tip).toContainText(text);
  await expect.poll(async () => tip.evaluate((el) => el.parentElement?.tagName)).toBe("BODY");
}
