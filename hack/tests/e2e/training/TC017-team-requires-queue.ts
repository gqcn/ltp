// TC017：新建任务所属团队下拉不展示未绑定可用队列的团队，问号说明该规则。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";
import { listSelectOptions } from "../select";

const shotDir = path.resolve(process.cwd(), "../../temp/20260901");

test("TC017 create job hides teams without usable queues and explains in field help", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();

  const usersRes = await page.request.get("/api/users?pageNum=1&pageSize=20&enabled=true");
  expect(usersRes.ok()).toBeTruthy();
  const ownerId = ((await usersRes.json()).data.list ?? [])[0]?.id as number | undefined;
  expect(ownerId).toBeTruthy();

  const teamName = `E2E无队列团队${Date.now()}`;
  const teamRes = await page.request.post("/api/teams", {
    data: { name: teamName, description: "e2e team without queues", ownerUserId: ownerId },
  });
  const teamBody = await teamRes.json();
  expect(teamRes.ok() && teamBody.code === 0, JSON.stringify(teamBody)).toBeTruthy();

  await page.getByRole("complementary").getByRole("link", { name: "新建任务" }).click();
  await expect(page.getByRole("heading", { name: "创建训练任务" })).toBeVisible();
  await page.getByRole("button", { name: "资源规格" }).click();

  const help = page.getByRole("button", { name: "所属团队说明" });
  await help.scrollIntoViewIfNeeded();
  await help.hover();
  const tip = page.locator(".field-help-floating-tip.is-visible");
  await expect(tip).toBeVisible({ timeout: 400 });
  await expect(tip).toContainText("未绑定队列的团队不出现");
  await page.screenshot({ path: path.join(shotDir, "222000-tc017-team-help.png") });

  const options = await listSelectOptions(page.locator("#create-team"));
  expect(options.some((item) => item.text === teamName)).toBeFalsy();
  await page.screenshot({ path: path.join(shotDir, "222010-tc017-team-options.png") });

  const clusterRes = await page.request.get("/api/training/clusters");
  if (!clusterRes.ok()) {
    return;
  }
  const clusters = ((await clusterRes.json()).data.list ?? []) as { id: number }[];
  const clusterId = clusters[0]?.id;
  if (!clusterId) {
    return;
  }
  const queueRes = await page.request.get(`/api/training/queues?clusterId=${clusterId}`);
  if (!queueRes.ok()) {
    return;
  }
  const queues = ((await queueRes.json()).data.list ?? []) as { enabled: boolean; syncError: string; teams: { name: string }[] }[];
  const queuedTeam = queues.find((q) => q.enabled && !q.syncError && q.teams?.length)?.teams[0]?.name;
  if (!queuedTeam) {
    return;
  }
  expect(options.some((item) => item.text === queuedTeam)).toBeTruthy();
});
