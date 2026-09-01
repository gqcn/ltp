// TC006：队列新建/编辑的 GPU 型号下拉不得出现 cpu 占位型号。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";
import { listSelectOptions } from "../select";

const shotDir = path.resolve(process.cwd(), "../../temp/20260827");

test("TC006 queue gpu type dropdown omits cpu placeholder", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "队列管理" }).click();
  await expect(page.getByRole("heading", { name: "队列管理" })).toBeVisible();
  await expect(page.getByRole("button", { name: "+ 新建队列" })).toBeVisible();
  await page.getByRole("button", { name: "+ 新建队列" }).click();
  const form = page.getByRole("dialog");
  await expect(form.getByRole("heading", { name: "新建队列" })).toBeVisible();
  const gpu = form.locator("#q-form-gpu");
  await expect(form.locator("label[for='q-form-gpu']")).toBeVisible();
  if (await gpu.isDisabled()) {
    await expect(form.getByText("请选择 GPU 型号", { exact: true })).toBeVisible();
  } else {
    const options = await listSelectOptions(gpu);
    expect(options.length).toBeGreaterThan(0);
    expect(options.map((item) => item.value)).not.toContain("cpu");
    expect(options.some((item) => item.text === "cpu" || item.text.startsWith("cpu（"))).toBeFalsy();
  }
  await form.screenshot({ path: path.join(shotDir, "120000-tc006-queue-gpu-type.png") });
  await form.getByRole("button", { name: "取消" }).click();
});
