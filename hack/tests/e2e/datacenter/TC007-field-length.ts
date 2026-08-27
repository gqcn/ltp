// TC007：单行默认最长 64、多行默认最长 256，超限提交显示中文字段错误。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Locator } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260827");

async function fillOverLimit(field: Locator, length: number) {
  const value = "a".repeat(length);
  await field.evaluate((el) => {
    const input = el as HTMLInputElement;
    input.removeAttribute("maxlength");
    input.maxLength = 10000;
  });
  await field.fill(value);
}

test("TC007 datacenter single-line and multiline length limits", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();
  await page.getByRole("button", { name: "+ 新建数据中心" }).click();
  const dialog = page.getByRole("dialog");

  await expect(dialog.locator("#dc-form-name")).toHaveAttribute("maxLength", "64");

  await dialog.getByLabel("数据中心标识").fill(`lenlim${Date.now().toString().slice(-8)}`);
  await fillOverLimit(dialog.locator("#dc-form-name"), 65);
  await dialog.getByLabel("简称").fill("超长");
  await dialog.getByRole("button", { name: "创建数据中心" }).click();
  await expect(dialog.getByText("最长 64 个字符")).toBeVisible();
  await expect(dialog.locator("#dc-form-name")).toBeFocused();
  await dialog.screenshot({ path: path.join(shotDir, "130000-tc007-line-max.png") });

  await dialog.getByRole("button", { name: "取消" }).click();
  await page.getByRole("button", { name: "+ 新建数据中心" }).click();
  const dialog2 = page.getByRole("dialog");
  await dialog2.getByLabel("数据中心标识").fill(`lenlim${Date.now().toString().slice(-8)}`);
  await dialog2.getByLabel("显示名称").fill("长度校验数据中心");
  await dialog2.getByLabel("简称").fill("超长");
  await fillOverLimit(dialog2.locator("#dc-form-desc"), 257);
  await dialog2.getByRole("button", { name: "创建数据中心" }).click();
  await expect(dialog2.getByText("最长 256 个字符")).toBeVisible();
  await expect(dialog2.locator("#dc-form-desc")).toBeFocused();
  await dialog2.screenshot({ path: path.join(shotDir, "130100-tc007-text-max.png") });
});
