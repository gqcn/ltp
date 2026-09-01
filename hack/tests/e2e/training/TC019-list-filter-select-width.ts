// TC019：列表页顶部筛选下拉使用统一舒适宽度，打开后长选项单行完整可见。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260901");
const filterWidth = 160;

const listPages = [
  { link: "任务列表", heading: "任务列表", shot: "092000-jobs-toolbar.png" },
  { link: "配置管理", heading: "配置管理", shot: "092010-configs-toolbar.png" },
  { link: "实验分析", heading: "实验分析", shot: "092020-experiments-toolbar.png" },
  { link: "节点管理", heading: "节点管理", shot: "092030-nodes-toolbar.png" },
  { link: "队列管理", heading: "队列管理", shot: "092040-queues-toolbar.png" },
  { link: "用户管理", heading: "用户管理", shot: "092050-users-toolbar.png" },
];

test("TC019 list filter selects use a comfortable width and keep long options readable", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();
  const longTeamName = await createLongNamedTeam(page);

  for (const item of listPages) {
    await page.getByRole("complementary").getByRole("link", { name: item.link, exact: true }).click();
    await expect(page.getByRole("heading", { name: item.heading })).toBeVisible();
    const filters = page.locator(".toolbar .ltp-select--filter");
    await expect(filters.first()).toBeVisible();
    const metrics = await closedFilterMetrics(page);
    expect(metrics.length, item.heading).toBeGreaterThan(0);
    for (const filter of metrics) {
      expect(filter.width, `${item.heading} ${filter.label}`).toBeGreaterThanOrEqual(filterWidth - 2);
      expect(filter.width, `${item.heading} ${filter.label}`).toBeLessThanOrEqual(filterWidth + 2);
      expect(filter.valueClipped, `${item.heading} ${filter.label} ${filter.text}`).toBe(false);
    }
    await page.locator(".toolbar").first().screenshot({ path: path.join(shotDir, item.shot) });
  }

  await expect(page.getByRole("heading", { name: "用户管理" })).toBeVisible();
  const teamMenu = await openMenuMetrics(page, "按团队筛选");
  expect(teamMenu.menuWidth).toBeGreaterThanOrEqual(teamMenu.controlWidth);
  const longTeam = teamMenu.options.find((item) => item.text === longTeamName);
  expect(longTeam, longTeamName).toBeTruthy();
  expect(longTeam?.clipped).toBe(false);
  expect(longTeam?.whiteSpace).toBe("nowrap");
  expect(teamMenu.menuWidth).toBeGreaterThan(teamMenu.controlWidth);
  await page.screenshot({ path: path.join(shotDir, "092060-users-team-menu.png") });
  await page.keyboard.press("Escape");

  await page.getByRole("complementary").getByRole("link", { name: "节点管理", exact: true }).click();
  await expect(page.getByRole("heading", { name: "节点管理" })).toBeVisible();
  const statusMenu = await openMenuMetrics(page, "按状态筛选");
  const disabled = statusMenu.options.find((item) => item.text === "SchedulingDisabled");
  expect(disabled).toBeTruthy();
  expect(disabled?.clipped).toBe(false);
  expect(disabled?.whiteSpace).toBe("nowrap");
  await page.screenshot({ path: path.join(shotDir, "092070-nodes-status-menu.png") });
});

type ClosedFilter = { label: string; text: string; width: number; valueClipped: boolean };

async function createLongNamedTeam(page: Page) {
  const usersRes = await page.request.get("/api/users?pageNum=1&pageSize=5&enabled=true");
  expect(usersRes.ok()).toBeTruthy();
  const usersBody = await usersRes.json();
  const users = (usersBody.data?.list ?? []) as { id: number }[];
  expect(users.length, JSON.stringify(usersBody)).toBeGreaterThan(0);
  const name = `E2E列表筛宽团队${Date.now()}`;
  const teamRes = await page.request.post("/api/teams", {
    data: { name, description: "e2e list filter select width", ownerUserId: users[0].id },
  });
  const teamBody = await teamRes.json();
  expect(teamRes.ok() && teamBody.code === 0, JSON.stringify(teamBody)).toBeTruthy();
  return name;
}

async function closedFilterMetrics(page: Page): Promise<ClosedFilter[]> {
  return page.locator(".toolbar .ltp-select--filter").evaluateAll((els) =>
    els.map((el) => {
      const value = el.querySelector(".ltp-select__single-value");
      return {
        label: el.querySelector("input")?.getAttribute("aria-label") || "",
        text: (value?.textContent || "").trim(),
        width: Math.round(el.getBoundingClientRect().width),
        valueClipped: value ? value.scrollWidth > value.clientWidth + 1 : false,
      };
    }),
  );
}

async function openMenuMetrics(page: Page, label: string) {
  await page.getByLabel(label).click();
  await expect(page.getByRole("listbox")).toBeVisible();
  return page.evaluate(() => {
    const menu = document.querySelector(".ltp-select__menu");
    const control = document.querySelector(".ltp-select__control--menu-is-open");
    const options = [...document.querySelectorAll(".ltp-select__option")].map((el) => ({
      text: (el.textContent || "").trim(),
      clipped: el.scrollWidth > el.clientWidth + 1,
      whiteSpace: getComputedStyle(el).whiteSpace,
    }));
    return {
      controlWidth: control ? Math.round(control.getBoundingClientRect().width) : 0,
      menuWidth: menu ? Math.round(menu.getBoundingClientRect().width) : 0,
      options,
    };
  });
}
