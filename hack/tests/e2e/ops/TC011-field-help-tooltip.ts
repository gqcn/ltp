// TC011：队列弹窗内问号帮助图标悬停后立即出现挂到 body 的原型浮层，不被 modal overflow 裁切。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260827");

test("TC011 queue modal field-help shows floating tip immediately", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "队列管理" }).click();
  await expect(page.getByRole("heading", { name: "队列管理" })).toBeVisible();
  await page.getByRole("button", { name: "+ 新建队列" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "新建队列" })).toBeVisible();

  const teamHelp = dialog.getByRole("button", { name: "关联团队说明" });
  await expect(teamHelp).toBeVisible();
  await expect(teamHelp).not.toHaveAttribute("title");
  await teamHelp.hover();
  const tip = page.locator(".field-help-floating-tip.is-visible");
  await expect(tip).toBeVisible({ timeout: 400 });
  await expect(tip).toContainText("一个队列可关联多个团队");
  await expect.poll(async () => tip.evaluate((el) => el.parentElement?.tagName)).toBe("BODY");
  await page.screenshot({ path: path.join(shotDir, "190100-tc011-queue-field-help.png") });

  const featureHelp = dialog.getByRole("button", { name: "功能特性说明" });
  await featureHelp.scrollIntoViewIfNeeded();
  await featureHelp.hover();
  await expect(tip).toBeVisible({ timeout: 400 });
  await expect(tip).toContainText("前置过滤 GPU 型号");
});
