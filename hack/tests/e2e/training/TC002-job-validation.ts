// TC002：新建任务空提交与非法 Kubernetes 对象名展示中文校验并聚焦。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsLdap } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260827");
const englishError = /Please fill|The \w+ field is required/i;
const jobNameFormat = "任务名称须符合 Kubernetes DNS-1123 子域：小写字母、数字、连字符与点，且不能以连字符或点开头或结尾";

test("TC002 create job validation shows Chinese field errors", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsLdap(page, "algo", "algo123");
  await page.getByRole("link", { name: "新建任务" }).click();
  await expect(page.getByRole("heading", { name: "创建训练任务" })).toBeVisible();
  await expect(page.locator("#create-name")).toHaveAttribute("maxLength", "63");
  await page.getByRole("button", { name: "提交训练任务" }).click();
  await expect(page.getByText("请填写任务名称")).toBeVisible();
  await expect(page.locator("#create-name")).toBeFocused();
  await expect(page.getByText(englishError)).toHaveCount(0);
  await page.screenshot({ path: path.join(shotDir, "160000-tc002-job-empty.png") });

  await page.locator("#create-name").fill("SLM_Job");
  await page.getByRole("button", { name: "提交训练任务" }).click();
  await expect(page.getByText(jobNameFormat)).toBeVisible();
  await expect(page.locator("#create-name")).toBeFocused();
  await expect(page.getByText(englishError)).toHaveCount(0);
  await page.screenshot({ path: path.join(shotDir, "160100-tc002-job-invalid-name.png") });
});
