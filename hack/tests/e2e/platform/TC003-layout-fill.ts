// TC003：控制台主栏铺满视口，用户表不在右侧裁切「最近登录」。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

test("TC003 shell fills viewport and user table is not clipped on the right", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();

  const shell = await page.evaluate(() => {
    const app = document.querySelector(".app")?.getBoundingClientRect();
    const main = document.querySelector(".main")?.getBoundingClientRect();
    return {
      innerWidth: window.innerWidth,
      appWidth: app ? Math.round(app.width) : 0,
      mainRight: main ? Math.round(main.right) : 0,
      pageScrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(shell.appWidth).toBe(shell.innerWidth);
  expect(shell.mainRight).toBe(shell.innerWidth);
  expect(shell.pageScrollWidth).toBeLessThanOrEqual(shell.innerWidth);

  await page.getByRole("link", { name: "用户管理" }).click();
  await expect(page.getByRole("heading", { name: "用户管理" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "最近登录" })).toBeVisible();

  const table = await page.evaluate(() => {
    const wrap = document.querySelector("#page-user-mgmt .table-wrap");
    const headers = [...document.querySelectorAll("#page-user-mgmt thead th")];
    const lastLogin = headers.find((th) => (th.textContent || "").includes("最近登录"));
    const actions = document.querySelector("#page-user-mgmt thead th.th-actions");
    if (!wrap || !lastLogin || !actions) {
      return { ok: false };
    }
    const last = lastLogin.getBoundingClientRect();
    const act = actions.getBoundingClientRect();
    const sampleCell = document.querySelector("#page-user-mgmt tbody td.td-last-login");
    return {
      ok: true,
      lastLoginLeft: last.left,
      lastLoginRight: last.right,
      actionsLeft: act.left,
      lastLoginWidth: last.width,
      lastLoginScrollWidth: lastLogin.scrollWidth,
      lastLoginClientWidth: lastLogin.clientWidth,
      headerAlign: getComputedStyle(lastLogin).textAlign,
      cellAlign: sampleCell ? getComputedStyle(sampleCell).textAlign : "",
      clippedHeaders: headers
        .map((th) => ({ text: (th.textContent || "").trim(), scroll: th.scrollWidth, client: th.clientWidth }))
        .filter((h) => h.scroll > h.client + 1)
        .map((h) => h.text),
    };
  });
  expect(table.ok).toBe(true);
  expect(table.clippedHeaders).toEqual([]);
  expect(table.headerAlign).toBe("center");
  expect(table.cellAlign).toBe("center");
  expect(table.lastLoginWidth ?? 0).toBeGreaterThan(96);
  expect(table.lastLoginWidth ?? 0).toBeLessThan(120);
  expect(table.lastLoginScrollWidth ?? 0).toBeLessThanOrEqual((table.lastLoginClientWidth ?? 0) + 1);
  expect(Math.min(table.lastLoginRight ?? 0, table.actionsLeft ?? 0) - (table.lastLoginLeft ?? 0)).toBeGreaterThan(70);

  const lastLoginCells = await page.evaluate(() => {
    return [...document.querySelectorAll("#page-user-mgmt tbody td.td-last-login")].map((td) => ({
      text: (td.textContent || "").replace(/\s+/g, " ").trim(),
      scroll: td.scrollWidth,
      client: td.clientWidth,
    }));
  });
  const clippedTimes = lastLoginCells.filter((cell) => /\d{4}-\d{2}-\d{2}/.test(cell.text) && cell.scroll > cell.client + 1);
  expect(clippedTimes).toEqual([]);

  const shotDir = path.resolve(process.cwd(), "../../temp/20260828");
  mkdirSync(shotDir, { recursive: true });
  await page.screenshot({ path: path.join(shotDir, "140000-tc003-user-table-1440.png") });
});
