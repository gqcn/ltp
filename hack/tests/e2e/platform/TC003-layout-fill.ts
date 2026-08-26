// TC003：控制台主栏铺满视口，用户表不在右侧裁切「最近登录」。

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
    const lastLogin = [...document.querySelectorAll("#page-user-mgmt thead th")].find((th) =>
      (th.textContent || "").includes("最近登录"),
    );
    const actions = document.querySelector("#page-user-mgmt thead th.th-actions");
    if (!wrap || !lastLogin || !actions) {
      return { ok: false };
    }
    const last = lastLogin.getBoundingClientRect();
    const act = actions.getBoundingClientRect();
    return {
      ok: true,
      wrapScrollWidth: wrap.scrollWidth,
      wrapClientWidth: wrap.clientWidth,
      lastLoginRight: last.right,
      actionsLeft: act.left,
      lastLoginWidth: last.width,
    };
  });
  expect(table.ok).toBe(true);
  expect(table.wrapScrollWidth).toBeLessThanOrEqual((table.wrapClientWidth ?? 0) + 1);
  expect(table.lastLoginWidth ?? 0).toBeGreaterThan(48);
  expect(table.lastLoginRight ?? 0).toBeLessThanOrEqual((table.actionsLeft ?? 0) + 1);
});
