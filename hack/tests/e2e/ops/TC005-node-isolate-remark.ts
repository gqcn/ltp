// TC005：隔离时填写备注后，节点列表「隔离信息」必须展示该备注。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260827");

test("TC005 isolate remark appears in isolation info column", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "节点管理" }).click();
  await expect(page.getByRole("heading", { name: "节点管理" })).toBeVisible();

  const row = page.locator("tbody tr").filter({ has: page.getByRole("button", { name: "隔离" }) }).first();
  await expect(row).toBeVisible();
  const nodeName = (await row.locator(".node-name-text").innerText()).trim();
  const remark = `e2e隔离备注-${Date.now()}`;

  await row.getByRole("button", { name: "隔离" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: /确认.*隔离/ })).toBeVisible();
  await dialog.locator("#modal-maint-remark").fill(remark);
  await dialog.screenshot({ path: path.join(shotDir, "113000-tc005-isolate-remark-modal.png") });
  await dialog.getByRole("button", { name: "确认隔离" }).click();

  const isolatedRow = page.locator("tr", { hasText: nodeName }).first();
  await expect(isolatedRow.locator(".td-node-iso")).toContainText("已隔离");
  await expect(isolatedRow.locator(".td-node-iso")).toContainText(remark);
  await isolatedRow.screenshot({ path: path.join(shotDir, "113010-tc005-isolate-remark-row.png") });

  await isolatedRow.getByRole("button", { name: "入池" }).click();
  const recover = page.getByRole("dialog");
  await expect(recover.getByRole("heading", { name: /确认.*入池/ })).toBeVisible();
  await recover.getByRole("button", { name: "确认入池" }).click();
  await expect(isolatedRow.locator(".td-node-iso")).toHaveText("—");
});
