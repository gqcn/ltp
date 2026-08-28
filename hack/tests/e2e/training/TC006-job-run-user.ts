// TC006：管理员创建/重跑页运行用户选择对齐原型——焦点出候选、选中后锁定、重跑回填。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260827");

test("TC006 admin run-user picker locks on select and prefills on rerun", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();
  await page.getByRole("link", { name: "新建任务" }).click();
  await expect(page.getByRole("heading", { name: "创建训练任务" })).toBeVisible();

  const search = page.locator("#create-run-user-search");
  const workdir = page.locator("#create-workdir");
  await expect(search).toBeVisible();
  await expect(search).not.toHaveAttribute("readonly");
  await expect(workdir).toHaveValue("");
  await expect(workdir).toHaveAttribute("placeholder", "/data/hpc/home/<运行用户>");

  await search.click();
  const dropdown = page.locator("#create-run-user-results");
  await expect(dropdown).toBeVisible();
  await expect(page.locator(".user-picker-item").first()).toBeVisible();
  await page.screenshot({ path: path.join(shotDir, "220000-tc006-run-user-dropdown.png") });

  const first = page.locator(".user-picker-item").first();
  const nickname = (await first.locator("strong").innerText()).trim();
  const username = (await first.locator(".mono").innerText()).trim();
  await first.click();

  await expect(search).toHaveValue(`${nickname}（${username}）`);
  await expect(search).toHaveClass(/is-locked/);
  await expect(search).toHaveAttribute("readonly", "");
  await expect(page.locator("#create-run-user-clear")).toBeVisible();
  await expect(page.locator(".user-picker-chip")).toContainText(nickname);
  await expect(page.locator(".user-picker-chip")).toContainText(username);
  await expect(dropdown).toHaveCount(0);
  await expect(page.locator("#create-run-user-hint")).toBeVisible();
  await expect(workdir).toHaveValue(`/data/hpc/home/${username}`);
  await page.screenshot({ path: path.join(shotDir, "220010-tc006-run-user-selected.png") });

  await page.locator("#create-run-user-clear").click();
  await expect(search).not.toHaveClass(/is-locked/);
  await expect(search).toHaveValue("");
  await expect(page.locator(".user-picker-chip")).toHaveCount(0);
  await expect(dropdown).toBeVisible();

  await page.getByRole("complementary").getByRole("link", { name: "任务列表" }).click();
  await expect(page.getByRole("heading", { name: "任务列表" })).toBeVisible();
  const jobLink = page.locator(".link-cell").first();
  if (!(await jobLink.count())) {
    return;
  }
  const sourceName = (await jobLink.innerText()).trim();
  await jobLink.click();
  await page.waitForURL(/\/training\/jobs\/\d+/);
  const jobId = page.url().split("/").pop();
  await page.goto(`/training/jobs/new?rerun=${jobId}`);
  await expect(page.getByRole("heading", { name: "重跑训练任务" })).toBeVisible();
  await expect(page.locator(".breadcrumb .current")).toHaveText("重跑任务");
  await expect(page.locator("#create-name")).toHaveValue(sourceName.endsWith("-rerun") ? sourceName : `${sourceName}-rerun`);
  await expect(page.locator(".rerun-banner")).toContainText(sourceName);
  await expect(page.locator("#create-run-user-search")).toHaveClass(/is-locked/);
  await expect(page.locator(".user-picker-chip")).toBeVisible();
  await expect(page.locator("#create-run-user-clear")).toBeVisible();
  await page.screenshot({ path: path.join(shotDir, "220020-tc006-rerun-run-user.png") });
});
