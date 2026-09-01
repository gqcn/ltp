// TC011：系统配置与团队表单的问号帮助对齐 prototype.v4，悬停立即出现挂到 body 的浮层。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260901");

test("TC011 system config and team form field-help match prototype", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);

  await page.getByRole("link", { name: "系统配置" }).click();
  await expect(page.getByRole("heading", { name: "系统配置" })).toBeVisible();
  await expect(page.locator("#ldap-bind-pwd")).toHaveAttribute("type", "password");
  await expect(page.locator("#ldap-bind-pwd")).not.toHaveAttribute("placeholder");

  const ldapHelps = page.locator("#page-system-config .field-help");
  await expect(ldapHelps).toHaveCount(3);
  for (const help of await ldapHelps.all()) {
    await expect(help).not.toHaveAttribute("title");
    await expect(help).toHaveText("?");
  }

  await assertImmediateTip(page, page.getByRole("button", { name: "Bind 密码说明" }), "留空则不修改已保存密码");
  await page.screenshot({ path: path.join(shotDir, "190000-tc011-ldap-bind-help.png") });
  await assertImmediateTip(page, page.getByRole("button", { name: "用户认证 Filter 说明" }), "{username} 将替换为登录账号");
  await page.screenshot({ path: path.join(shotDir, "190010-tc011-ldap-user-filter-help.png") });
  await assertImmediateTip(page, page.getByRole("button", { name: "目录搜索 Filter 说明" }), "{q} 将替换为搜索关键词");
  await page.screenshot({ path: path.join(shotDir, "190020-tc011-ldap-search-filter-help.png") });

  await page.getByRole("link", { name: "团队管理" }).click();
  await expect(page.getByRole("heading", { name: "团队管理" })).toBeVisible();
  await expect(page.getByText("通过关联队列管理额度")).toBeVisible();
  await page.getByRole("button", { name: "+ 新建团队" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "新建团队" })).toBeVisible();
  await expect(dialog.locator("strong", { hasText: "平台可用用户" })).toBeVisible();
  await expect(dialog.getByText("关联资源队列")).toBeVisible();
  await assertImmediateTip(page, dialog.getByRole("button", { name: "负责人说明" }), "仅可选择状态为「启用」的平台用户");
  await dialog.screenshot({ path: path.join(shotDir, "190030-tc011-team-owner-help.png") });
});

async function assertImmediateTip(page: Page, help: Locator, text: string) {
  await help.scrollIntoViewIfNeeded();
  await expect(help).toBeVisible();
  await expect(help).not.toHaveAttribute("title");
  await help.hover();
  const tip = page.locator(".field-help-floating-tip.is-visible");
  await expect(tip).toBeVisible({ timeout: 400 });
  await expect(tip).toContainText(text);
  await expect.poll(async () => tip.evaluate((el) => el.parentElement?.tagName)).toBe("BODY");
}
