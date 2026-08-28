// TC012：节点管理列表露出状态/Pods/隔离信息，维护记录用徽章，详情展示 Ready=True。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260828");

test("TC012 node list columns, record badges, and detail conditions match prototype", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "节点管理" }).click();
  await expect(page.getByRole("heading", { name: "节点管理" })).toBeVisible();
  const clusterSelect = page.getByLabel("工作集群");
  if (await clusterSelect.count()) {
    const values = await clusterSelect.locator("option").evaluateAll((els) =>
      els.map((el) => ({ value: (el as HTMLOptionElement).value, text: el.textContent || "" })),
    );
    const kind = values.find((item) => item.text.includes("kind-ltp"));
    if (kind && (await clusterSelect.inputValue()) !== kind.value) {
      await clusterSelect.selectOption(kind.value);
      const confirm = page.getByRole("button", { name: "确认切换并刷新" });
      if (await confirm.isVisible().catch(() => false)) await confirm.click();
    }
  }
  await expect(page.locator("#page-node-mgmt")).toBeVisible();

  const table = page.locator(".node-mgmt-table").first();
  await expect(table.getByRole("columnheader", { name: "状态" })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Pods" })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "隔离信息" })).toBeVisible();
  await expect(page.locator(".node-k8s-status").first()).toBeVisible();
  await expect(page.locator(".node-k8s-status").first()).toContainText("Ready");
  await page.screenshot({ path: path.join(shotDir, "161000-tc012-node-list.png") });

  await page.locator("#node-mgmt-tabs .tab").nth(1).click();
  const records = page.locator("#node-mgmt-records-list");
  await expect(records.getByRole("columnheader", { name: "操作", exact: true })).toBeVisible();
  await expect(records.getByRole("columnheader", { name: "结果" })).toBeVisible();
  const actionBadge = records.locator("tbody .badge").first();
  await expect(actionBadge).toBeVisible();
  await expect(records.getByText("成功").first()).toBeVisible();
  await page.screenshot({ path: path.join(shotDir, "161010-tc012-node-records.png") });

  await page.locator("#node-mgmt-tabs .tab").first().click();
  await page.locator(".node-name-link").first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Ready=True")).toBeVisible();
  await expect(dialog.getByText("MemoryPressure=False")).toBeVisible();
  await expect(dialog.getByText("DiskPressure=False")).toBeVisible();
  await dialog.screenshot({ path: path.join(shotDir, "161020-tc012-node-detail.png") });
});
