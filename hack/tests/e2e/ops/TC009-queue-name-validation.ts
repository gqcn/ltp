// TC009：队列标识按 Volcano Queue / Kubernetes DNS-1123 子域校验，中文错误写在输入域旁并聚焦。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260827");
const englishError = /Please fill|The \w+ field is required/i;
const queueNameFormat = "队列标识须符合 Kubernetes DNS-1123 子域：小写字母、数字、连字符与点，且不能以连字符或点开头或结尾";

test("TC009 queue name rejects values that are invalid for Volcano Queue", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "队列管理" }).click();
  await expect(page.getByRole("heading", { name: "队列管理" })).toBeVisible();
  await page.getByRole("button", { name: "+ 新建队列" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "新建队列" })).toBeVisible();
  await expect(dialog.locator("#q-form-name")).toHaveAttribute("maxLength", "63");

  await dialog.locator("#q-form-name").fill("Lab_GPU");
  await dialog.getByRole("button", { name: "创建队列" }).click();
  await expect(dialog.getByText(queueNameFormat)).toBeVisible();
  await expect(dialog.locator("#q-form-name")).toBeFocused();
  await expect(dialog.getByText(englishError)).toHaveCount(0);
  await dialog.screenshot({ path: path.join(shotDir, "150000-tc009-queue-invalid-name.png") });

  await dialog.locator("#q-form-name").fill("default");
  await dialog.getByRole("button", { name: "创建队列" }).click();
  await expect(dialog.getByText("队列标识不能使用 root 或 default")).toBeVisible();
  await expect(dialog.locator("#q-form-name")).toBeFocused();

  await dialog.locator("#q-form-name").fill("-lab");
  await dialog.getByRole("button", { name: "创建队列" }).click();
  await expect(dialog.getByText(queueNameFormat)).toBeVisible();

  await dialog.locator("#q-form-name").fill("lab.gpu");
  await dialog.getByRole("button", { name: "创建队列" }).click();
  await expect(dialog.getByText(queueNameFormat)).toHaveCount(0);
  await expect(dialog.getByText("队列标识不能使用 root 或 default")).toHaveCount(0);
  await expect(dialog.getByText("请填写显示名称")).toBeVisible();
  await dialog.screenshot({ path: path.join(shotDir, "150010-tc009-queue-dotted-name.png") });
  await dialog.getByRole("button", { name: "取消" }).click();
});
