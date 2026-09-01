// TC003：新建配置集可保存草稿，列表出现草稿标记。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsLdap } from "../login";
import { chooseSelect, listSelectOptions } from "../select";

const shotDir = path.resolve(process.cwd(), "../../temp/20260827");

test("TC003 config draft save appears in list", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsLdap(page, "algo", "algo123");
  await page.locator(".sidebar-nav").getByRole("link", { name: "配置管理" }).click();
  await expect(page.getByRole("heading", { name: "配置管理" })).toBeVisible();
  await page.getByRole("button", { name: "+ 新建配置集" }).click();
  await expect(page.getByRole("heading", { name: "新建配置集" })).toBeVisible();
  const name = `e2e-cfg-${Date.now()}`;
  await page.getByPlaceholder("例如 SLM 7B Phase4 预训练").fill(name);
  const team = page.locator("#cfg-edit-team");
  const options = await listSelectOptions(team);
  if (options.filter((item) => item.value && item.value !== "0").length < 1) {
    await expect(page.getByText("请选择")).toBeVisible();
    return;
  }
  await chooseSelect(team, { index: 1 });
  await page.getByRole("button", { name: "保存草稿" }).click();
  await expect(page.getByText("草稿已保存")).toBeVisible();
  await page.locator(".sidebar-nav").getByRole("link", { name: "配置管理" }).click();
  await page.getByPlaceholder("搜索配置名称...").fill(name);
  await expect(page.getByText(name).first()).toBeVisible();
  await expect(page.getByText("草稿", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "编辑新版本" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "归档" }).first()).toBeVisible();
  await page.screenshot({ path: path.join(shotDir, "181100-tc003-config-list-actions.png") });
});
