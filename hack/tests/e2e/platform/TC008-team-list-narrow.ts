// TC008：团队管理分栏宽度对齐 prototype.v4（左 2fr / 右 1fr）。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260831");

test("TC008 team list uses prototype 2-1 column widths", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "团队管理" }).click();
  await expect(page.getByRole("heading", { name: "团队管理" })).toBeVisible();
  await expect(page.locator("#team-mgmt-list-card .rp-list-item").first()).toBeVisible();

  const dims = await page.evaluate(() => {
    const list = document.querySelector("#team-mgmt-list-card")?.getBoundingClientRect();
    const detail = document.querySelector("#team-mgmt-detail")?.getBoundingClientRect();
    return {
      listWidth: list ? Math.round(list.width) : 0,
      detailWidth: detail ? Math.round(detail.width) : 0,
    };
  });
  expect(dims.listWidth).toBeGreaterThan(dims.detailWidth);
  const ratio = dims.listWidth / Math.max(dims.detailWidth, 1);
  expect(ratio).toBeGreaterThan(1.7);
  expect(ratio).toBeLessThan(2.3);
  expect(dims.listWidth).toBeGreaterThan(700);
  expect(dims.listWidth).toBeLessThan(820);

  await expect(page.locator("#team-mgmt-list-card .card-header")).toBeVisible();
  await expect(page.getByPlaceholder("搜索团队...")).toBeVisible();
  await page.screenshot({ path: path.join(shotDir, "163000-tc008-team-list-proto-width.png") });
});
