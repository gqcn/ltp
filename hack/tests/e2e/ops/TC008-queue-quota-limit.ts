// TC008：队列额度超过数据中心剩余容量时，表单展示中文错误且不创建。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260827");

test("TC008 queue create rejects quota over remaining capacity", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();
  await page.getByRole("link", { name: "队列管理" }).click();
  await expect(page.getByRole("heading", { name: "队列管理" })).toBeVisible();
  await page.getByRole("button", { name: "+ 新建队列" }).click();
  const form = page.getByRole("dialog");
  await expect(form.getByRole("heading", { name: "新建队列" })).toBeVisible();
  await form.locator("#q-form-name").fill(`e2e-over-${Date.now()}`);
  await form.locator("#q-form-display").fill("超额队列");
  await form.locator("#q-form-team-search").click();
  await form.locator(".user-picker-item").first().click();
  await form.locator("#q-form-gpu-quota").fill("9999");
  await form.getByRole("button", { name: "创建队列" }).click();
  await expect(form.getByText(/GPU 额度超过剩余容量/)).toBeVisible();
  await expect(form.locator("#q-form-gpu-quota")).toBeFocused();
  await form.screenshot({ path: path.join(shotDir, "122000-tc008-queue-over-quota.png") });
  await form.getByRole("button", { name: "取消" }).click();
  await expect(page.getByText("超额队列")).toHaveCount(0);
});
