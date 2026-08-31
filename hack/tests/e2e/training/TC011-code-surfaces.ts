// TC011：配置文件与新建任务启动命令使用共享语法编辑表面。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsLdap } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260828");

test("TC011 config and job command editors use shared code surfaces", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsLdap(page, "algo", "algo123");

  await page.locator(".sidebar-nav").getByRole("link", { name: "配置管理" }).click();
  await expect(page.getByRole("heading", { name: "配置管理" })).toBeVisible();
  await page.getByRole("button", { name: "+ 新建配置集" }).click();
  await expect(page.getByRole("heading", { name: "新建配置集" })).toBeVisible();
  await page.locator(".create-form-tabs .tab", { hasText: "文件" }).click();
  const fileEditor = page.locator('[data-code-surface="editor"][data-lang="yaml"]');
  await expect(fileEditor).toBeVisible();
  await expect(fileEditor.locator(".cm-editor")).toBeVisible();
  await expect(fileEditor).toContainText("seq_len");
  await expect(fileEditor.locator("[class*='tok-']").first()).toBeVisible();
  await expect(fileEditor.locator("textarea")).toHaveCount(0);
  await page.screenshot({ path: path.join(shotDir, "173000-tc011-config-editor.png"), fullPage: true });

  await page.locator(".sidebar-nav").getByRole("link", { name: "新建任务" }).click();
  await expect(page.getByRole("heading", { name: "创建训练任务" })).toBeVisible();
  await page.locator(".create-form-tabs .tab", { hasText: "镜像与启动" }).click();
  const command = page.locator('[data-code-surface="editor"][data-lang="shell"]');
  await expect(command).toBeVisible();
  await expect(page.locator("#create-command")).toBeVisible();
  await page.locator("#create-command").fill("torchrun --nproc_per_node=$GPU_NUM train.py");
  await expect(command).toContainText("torchrun");
  await expect(command).toContainText("$GPU_NUM");
  await expect(command.locator("[class*='tok-']").first()).toBeVisible();
  const env = page.locator('[data-code-surface="editor"][data-lang="env"]');
  await expect(env).toBeVisible();
  await page.screenshot({ path: path.join(shotDir, "173100-tc011-job-command-editor.png"), fullPage: true });
});
