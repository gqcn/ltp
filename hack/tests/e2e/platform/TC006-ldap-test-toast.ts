// TC006：系统配置「测试连接」成功 Toast 对齐原型左色条卡片，无默认图标。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260827");

test("TC006 ldap test connection toast matches prototype card style", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);
  const loginToast = page.locator("[data-sonner-toast]").filter({ hasText: "登录成功" });
  await expect(loginToast).toBeVisible();
  await expect(loginToast).toBeHidden({ timeout: 5000 });

  await page.getByRole("link", { name: "系统配置" }).click();
  await expect(page.getByRole("heading", { name: "系统配置" })).toBeVisible();
  await page.getByRole("button", { name: "测试连接" }).click();

  const toast = page.locator("[data-sonner-toast]").filter({ hasText: /连接成功/ }).first();
  await expect(toast).toBeVisible();
  await expect(toast).toHaveClass(/toast/);
  await expect(toast).toHaveClass(/success/);
  await expect(toast.locator("[data-icon]")).toBeHidden();

  const style = await toast.evaluate((el) => {
    const cs = getComputedStyle(el);
    const success = getComputedStyle(document.documentElement).getPropertyValue("--success").trim();
    return {
      borderLeftColor: cs.borderLeftColor,
      borderLeftWidth: cs.borderLeftWidth,
      position: cs.position,
      minWidth: cs.minWidth,
      success,
    };
  });
  expect(style.borderLeftWidth).toBe("3px");
  expect(style.position).toBe("relative");
  expect(parseFloat(style.minWidth)).toBeGreaterThanOrEqual(280);
  expect(style.borderLeftColor.replace(/\s/g, "")).toBe("rgb(34,197,94)");
  const box = await toast.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.y).toBeGreaterThan(56);
  expect(box!.y).toBeLessThan(280);
  expect(box!.x + box!.width).toBeGreaterThan(page.viewportSize()!.width - 80);

  await page.screenshot({ path: path.join(shotDir, "120000-tc006-ldap-test-toast.png") });
  await toast.screenshot({ path: path.join(shotDir, "120010-tc006-ldap-test-toast-card.png") });
});
