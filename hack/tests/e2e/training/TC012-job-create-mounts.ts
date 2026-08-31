// TC012：新建任务配置挂载卡片字段与原型一致（配置集、版本、挂载方式、容器路径）。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsLdap } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260828");

test("TC012 create job config mount card matches prototype fields", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsLdap(page, "algo", "algo123");
  await page.getByRole("link", { name: "新建任务" }).click();
  await expect(page.getByRole("heading", { name: "创建训练任务" })).toBeVisible();

  await page.getByRole("button", { name: /资源规格/ }).click();
  const team = page.locator("#create-team");
  if ((await team.locator("option").count()) > 1) {
    await team.selectOption({ index: 1 });
  }

  await page.getByRole("button", { name: /配置挂载/ }).click();
  const section = page.locator("#create-section-configs");
  const addBtn = page.locator("#btn-add-config-mount");
  await expect(addBtn).toBeVisible();
  await expect(addBtn.locator(".cfg-add-mount-title")).toHaveText("添加配置集");
  await expect(addBtn.locator(".cfg-add-mount-desc")).toContainText("/data/hpc/home/<username>/experiments/<任务名称>/configs/");
  await section.scrollIntoViewIfNeeded();
  await section.screenshot({ path: path.join(shotDir, "170000-tc012-mount-empty.png") });

  await addBtn.click();
  const card = page.locator(".cfg-mount-card").first();
  await expect(card.getByText("配置集挂载", { exact: true })).toBeVisible();
  await expect(card.getByText("配置集", { exact: true })).toBeVisible();
  await expect(card.locator("label", { hasText: "版本" })).toBeVisible();
  await expect(card.locator("label", { hasText: "挂载方式" })).toBeVisible();
  await expect(card.locator("label", { hasText: "容器路径" })).toBeVisible();
  await expect(card.locator(".cfg-mount-path-hint")).toHaveText("挂载的配置将会覆盖同目录下的同名文件");
  await expect(card.getByRole("combobox").nth(2)).toHaveValue("dir");
  await expect(addBtn.locator(".cfg-add-mount-title")).toHaveText("继续添加配置集");
  await expect(addBtn).toHaveClass(/is-compact/);
  const setSelect = card.locator("select").first();
  if ((await setSelect.locator("option").count()) > 1) {
    await setSelect.selectOption({ index: 1 });
    await expect(card.locator("select").nth(1)).toContainText("提交时最新");
    await expect(card.getByRole("button", { name: "预览文件" })).toBeVisible();
    await card.locator("select").nth(2).selectOption("files");
    await expect(card.locator(".cfg-mount-file-row").first()).toBeVisible({ timeout: 8000 });
    await card.getByRole("button", { name: "预览文件" }).click();
    await expect(card.locator("[data-code-surface='viewer']")).toBeVisible();
  }
  await section.screenshot({ path: path.join(shotDir, "170010-tc012-mount-card.png") });

  await card.getByRole("button", { name: "删除" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "确认删除挂载" })).toBeVisible();
  await expect(dialog.locator(".modal-hint")).toContainText("删除后提交任务将不再挂载该配置集");
  await dialog.screenshot({ path: path.join(shotDir, "170020-tc012-mount-delete.png") });
  await dialog.getByRole("button", { name: "取消" }).click();
  await expect(card).toBeVisible();

  await page.locator(".sidebar-nav").getByRole("link", { name: "任务列表" }).click();
  await expect(page.getByRole("heading", { name: "任务列表" })).toBeVisible();
  const rerun = page.getByRole("button", { name: "重跑" }).first();
  if (await rerun.isVisible().catch(() => false)) {
    await rerun.click();
    await expect(page.getByRole("heading", { name: "重跑训练任务" })).toBeVisible();
    await page.getByRole("button", { name: /配置挂载/ }).click();
    await expect(page.locator("#btn-add-config-mount")).toBeVisible();
    const rerunCard = page.locator(".cfg-mount-card").first();
    if (await rerunCard.count()) {
      await expect(rerunCard.locator("label", { hasText: "容器路径" })).toBeVisible();
      await expect(rerunCard.locator("label", { hasText: "版本" })).toBeVisible();
    }
    await page.screenshot({ path: path.join(shotDir, "170030-tc012-rerun-mount.png") });
  }
});
