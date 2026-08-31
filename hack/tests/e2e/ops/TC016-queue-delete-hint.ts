// TC016：删除队列确认框对齐 prototype.v4：空闲删除用原型问句与后果条；占用时数量写在正文，提示条只保留处理建议。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260831");

const idleQueue = fixtureQueue({
  id: 9101,
  name: "e2e-del-idle",
  displayName: "E2E删除提示",
  running: 0,
  pending: 0,
});
const busyQueue = fixtureQueue({
  id: 9102,
  name: "e2e-del-busy",
  displayName: "E2E占用提示",
  running: 2,
  pending: 1,
});

test("TC016 delete queue dialog matches prototype copy", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await stubQueueList(page, [idleQueue, busyQueue]);
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();

  await page.getByRole("link", { name: "队列管理" }).click();
  await expect(page.getByRole("heading", { name: "队列管理" })).toBeVisible();
  await expect(page.getByText("平台管理员登录成功")).toHaveCount(0, { timeout: 10000 });

  const idleRow = page.locator("tr", { hasText: idleQueue.name });
  await expect(idleRow).toBeVisible();
  await idleRow.getByRole("button", { name: "删除" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "确认删除队列" })).toBeVisible();
  const msg = dialog.locator(".modal-msg");
  await expect(msg).toContainText(`确定要删除队列 ${idleQueue.displayName} 吗？`);
  const hint = dialog.locator(".modal-hint.is-danger");
  await expect(hint).toHaveText("团队关联将解除。已结束任务的历史记录会保留。此操作不可撤销。");
  await expect(hint).not.toContainText("新任务不可再选择");
  await dialog.screenshot({ path: path.join(shotDir, "095000-tc016-queue-delete-confirm.png") });
  await dialog.getByRole("button", { name: "取消" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(idleRow).toBeVisible();

  const busyRow = page.locator("tr", { hasText: busyQueue.name });
  await busyRow.getByRole("button", { name: "删除" }).click();
  const blocked = page.getByRole("dialog");
  await expect(blocked.getByRole("heading", { name: "无法删除队列" })).toBeVisible();
  await expect(blocked.locator(".modal-msg")).toContainText(`队列 ${busyQueue.displayName} 仍有 2 个运行中、1 个排队中的任务，暂不可删除`);
  const blockedHint = blocked.locator(".modal-hint.is-danger");
  await expect(blockedHint).toHaveText("请等待任务结束，或先停止相关任务后再删除。");
  await expect(blockedHint).not.toContainText("当前运行中");
  await expect(blocked.getByRole("button", { name: "确认删除" })).toHaveCount(0);
  await expect(blocked.getByRole("button", { name: "知道了" })).toBeVisible();
  await blocked.screenshot({ path: path.join(shotDir, "095100-tc016-queue-delete-blocked.png") });
  await blocked.getByRole("button", { name: "知道了" }).click();
  await expect(blocked).toHaveCount(0);
  await expect(busyRow).toBeVisible();
});

function fixtureQueue(input: { id: number; name: string; displayName: string; running: number; pending: number }) {
  return {
    id: input.id,
    clusterId: 1,
    name: input.name,
    displayName: input.displayName,
    description: "",
    datacenterCode: "cq-lj",
    gpuType: "NVIDIA-H200",
    gpuQuota: 1,
    gpuUsed: 0,
    cpuQuota: 1,
    cpuUsed: 0,
    memQuotaGi: 1,
    memUsedGi: 0,
    weight: 1,
    reclaimable: true,
    features: [] as string[],
    enabled: true,
    gpuHoursMonth: 0,
    state: "Open",
    pending: input.pending,
    running: input.running,
    syncError: "",
    teams: [{ id: 1, name: "E2E团队" }],
    createdAt: 0,
    updatedAt: 0,
  };
}

async function stubQueueList(page: Page, list: ReturnType<typeof fixtureQueue>[]) {
  await page.route(/\/api\/queues(\?|$)/, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "OK", data: { list, total: list.length } }),
    });
  });
}
