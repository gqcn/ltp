// TC005：团队与 LDAP 配置表单校验失败返回中文，并聚焦到首个无效输入域。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260826");
const englishError = /Please fill|The \w+ field is required/i;

test("TC005 team and ldap config validation shows Chinese field errors and focuses invalid input", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);

  await page.getByRole("link", { name: "团队管理" }).click();
  await expect(page.getByRole("heading", { name: "团队管理" })).toBeVisible();
  await page.getByRole("button", { name: "+ 新建团队" }).click();
  const team = page.getByRole("dialog");
  await team.getByRole("button", { name: "创建团队" }).click();
  await expect(team.getByText("请填写团队名称")).toBeVisible();
  await expect(team.getByText("请从用户列表中选择负责人")).toBeVisible();
  await expect(team.locator("#team-form-name")).toBeFocused();
  await expect(team.getByText(englishError)).toHaveCount(0);
  await team.screenshot({ path: path.join(shotDir, "232000-tc005-team-empty.png") });
  await team.getByRole("button", { name: "取消" }).click();

  await page.getByRole("link", { name: "系统配置" }).click();
  await expect(page.getByRole("heading", { name: "系统配置" })).toBeVisible();
  await page.locator("#ldap-host").fill("");
  await page.getByRole("button", { name: "保存配置" }).click();
  await expect(page.getByText("请填写主机")).toBeVisible();
  await expect(page.locator("#ldap-host")).toBeFocused();
  await expect(page.getByText(englishError)).toHaveCount(0);
  await page.screenshot({ path: path.join(shotDir, "232100-tc005-ldap-host-empty.png") });
});
