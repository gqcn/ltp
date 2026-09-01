// TC010：用户管理可按所属团队筛选列表，下拉支持关键字过滤。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";
import { chooseSelect, filterSelect } from "../select";

const shotDir = path.resolve(process.cwd(), "../../temp/20260831");

test("TC010 user list can filter by team", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();

  const usersRes = await page.request.get("/api/users?pageNum=1&pageSize=20&enabled=true");
  expect(usersRes.ok()).toBeTruthy();
  const users = ((await usersRes.json()).data.list ?? []) as { id: number; username: string; nickname: string }[];
  expect(users.length).toBeGreaterThanOrEqual(2);
  const member = users[0];
  const outsider = users.find((item) => item.id !== member.id);
  expect(outsider).toBeTruthy();

  const teamName = `E2E用户筛团队${Date.now()}`;
  const teamRes = await page.request.post("/api/teams", {
    data: { name: teamName, description: "e2e user team filter", ownerUserId: member.id },
  });
  const teamBody = await teamRes.json();
  expect(teamRes.ok() && teamBody.code === 0, JSON.stringify(teamBody)).toBeTruthy();

  await page.getByRole("link", { name: "用户管理" }).click();
  await expect(page.getByRole("heading", { name: "用户管理" })).toBeVisible();
  const teamFilter = page.getByLabel("按团队筛选");
  await expect(teamFilter).toBeVisible();
  await page.screenshot({ path: path.join(shotDir, "171000-tc010-user-team-filter-all.png") });

  await filterSelect(teamFilter, teamName);
  await expect(page.getByRole("option", { name: teamName, exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "全部团队", exact: true })).toHaveCount(0);
  await page.getByRole("option", { name: teamName, exact: true }).click();
  await expect(page.locator("#page-user-mgmt tbody tr")).toHaveCount(1);
  await expect(page.getByRole("cell", { name: member.username, exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: outsider!.username, exact: true })).toHaveCount(0);
  await expect(page.locator("#page-user-mgmt tbody tr").getByText(teamName)).toBeVisible();
  await page.screenshot({ path: path.join(shotDir, "171010-tc010-user-team-filter-one.png") });

  await filterSelect(teamFilter, "___nomatch___");
  await expect(page.getByText("无匹配选项")).toBeVisible();
  await page.keyboard.press("Escape");

  await chooseSelect(teamFilter, "all");
  await page.getByPlaceholder("搜索姓名 / 账号 / 邮箱 / 部门...").fill(outsider!.username);
  await expect(page.getByRole("cell", { name: outsider!.username, exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(shotDir, "171020-tc010-user-team-filter-reset.png") });
});
