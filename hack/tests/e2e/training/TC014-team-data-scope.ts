// TC014：算法工程师只看所属团队数据；SRE 与管理员可看全部团队。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin, loginAsLdap, logoutFromShell } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260901");

test("TC014 algo is team-scoped while sre and admin see all training data", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();

  const usersRes = await page.request.get("/api/users?pageNum=1&pageSize=20&enabled=true");
  expect(usersRes.ok()).toBeTruthy();
  const users = ((await usersRes.json()).data.list ?? []) as { id: number; username: string }[];
  const owner = users.find((item) => item.username !== "algo") ?? users[0];
  expect(owner?.id).toBeTruthy();

  const teamName = `E2E范围团队${Date.now()}`;
  const teamRes = await page.request.post("/api/teams", {
    data: { name: teamName, description: "e2e team data scope", ownerUserId: owner!.id },
  });
  const teamBody = await teamRes.json();
  expect(teamRes.ok() && teamBody.code === 0, JSON.stringify(teamBody)).toBeTruthy();
  const teamId = teamBody.data.id as number;

  const cfgName = `e2e-scope-cfg-${Date.now()}`;
  const cfgRes = await page.request.post("/api/training/configs", {
    data: {
      displayName: cfgName,
      teamId,
      framework: "custom",
      visibility: "team",
      files: [{ path: "a.yaml", content: "x: 1" }],
    },
  });
  const cfgBody = await cfgRes.json();
  expect(cfgRes.ok() && cfgBody.code === 0, JSON.stringify(cfgBody)).toBeTruthy();

  const adminCfgs = await listConfigNames(page);
  expect(adminCfgs).toContain(cfgName);

  await logoutFromShell(page);
  await loginAsLdap(page, "algo", "algo123");
  await page.getByRole("link", { name: "配置管理" }).click();
  await expect(page.getByRole("heading", { name: "配置管理" })).toBeVisible();
  const algoCfgs = await listConfigNames(page);
  expect(algoCfgs).not.toContain(cfgName);
  await page.screenshot({ path: path.join(shotDir, "210000-tc014-algo-configs.png") });

  await logoutFromShell(page);
  await loginAsLdap(page, "sre", "sre123");
  await page.getByRole("link", { name: "配置管理" }).click();
  await expect(page.getByRole("heading", { name: "配置管理" })).toBeVisible();
  const sreCfgs = await listConfigNames(page);
  expect(sreCfgs).toContain(cfgName);
  await expect(page.getByText(cfgName)).toBeVisible();
  await page.screenshot({ path: path.join(shotDir, "210010-tc014-sre-configs.png") });
});

async function listConfigNames(page: { request: { get: (url: string) => Promise<{ ok: () => boolean; json: () => Promise<unknown> }> } }) {
  const res = await page.request.get("/api/training/configs?pageNum=1&pageSize=100");
  expect(res.ok()).toBeTruthy();
  const payload = (await res.json()) as { data: { list: { displayName: string }[] } };
  return (payload.data.list ?? []).map((item) => item.displayName);
}
