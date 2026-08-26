// TC004：系统配置页在 1440×900 下与原型一致，不出现窗口右侧滚动条。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

test("TC004 system config does not grow a window scrollbar at 1440x900", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "系统配置" }).click();
  await expect(page.getByRole("heading", { name: "系统配置" })).toBeVisible();
  await expect(page.locator("#page-system-config")).toHaveCSS("opacity", "1");
  await expect(page.getByRole("button", { name: "保存配置" })).toBeVisible();
  await expect(page.getByRole("button", { name: "测试连接" })).toBeVisible();

  const layout = await page.evaluate(() => {
    const html = document.documentElement;
    const save = document.querySelector(".sys-config-tab-actions");
    const saveBox = save?.getBoundingClientRect();
    return {
      overflowY: html.scrollHeight - html.clientHeight,
      saveBottom: saveBox ? Math.round(saveBox.bottom) : 0,
      innerHeight: window.innerHeight,
    };
  });
  expect(layout.overflowY).toBeLessThanOrEqual(1);
  expect(layout.saveBottom).toBeGreaterThan(0);
  expect(layout.saveBottom).toBeLessThanOrEqual(layout.innerHeight);

  const shotDir = path.resolve(process.cwd(), "../../temp/20260826");
  mkdirSync(shotDir, { recursive: true });
  await page.screenshot({ path: path.join(shotDir, "182600-tc004-system-config.png") });
});
