// TC023：实验分析侧栏项目列表分页；每页不超过 10 个项目；全部项目固定在顶部。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsLdap } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260901");
const PAGE_SIZE = 10;

test("TC023 experiment project sidebar is paginated", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsLdap(page, "algo", "algo123");
  await page.getByRole("link", { name: "实验分析" }).click();
  await expect(page.getByRole("heading", { name: "实验分析" })).toBeVisible();

  const clusterRes = await page.request.get("/api/training/clusters");
  expect(clusterRes.ok()).toBeTruthy();
  const clusters = (await clusterRes.json()).data.list as { id: number }[];
  expect(clusters.length, "need a training cluster").toBeGreaterThan(0);
  const clusterId = clusters[0]!.id;

  const listRes = await page.request.get(`/api/training/experiments/projects?clusterId=${clusterId}`);
  expect(listRes.ok()).toBeTruthy();
  const existing = ((await listRes.json()).data.list ?? []) as { id: number }[];
  const createdIds: number[] = [];
  const stamp = Date.now();
  const need = Math.max(0, PAGE_SIZE + 1 - existing.length);
  for (let i = 0; i < need; i++) {
    const res = await page.request.post("/api/training/experiments/projects", {
      data: { name: `e2e-page-${stamp}-${i}`, description: "侧栏不应展示这段描述" },
    });
    const body = await res.json();
    expect(res.ok() && body.code === 0, JSON.stringify(body)).toBeTruthy();
    createdIds.push(body.data.id as number);
  }

  try {
    await page.reload();
    await expect(page.getByRole("heading", { name: "实验分析" })).toBeVisible();

    const sidebar = page.locator(".exp-projects");
    const items = sidebar.locator(".exp-project-item");
    await expect(items.filter({ hasText: "全部项目" })).toBeVisible();
    expect(await items.count()).toBeLessThanOrEqual(PAGE_SIZE + 1);
    await expect(sidebar.locator(".exp-proj-desc")).toHaveCount(0);
    const pager = sidebar.getByRole("navigation", { name: "项目分页" });
    await expect(pager).toBeVisible();
    await expect(pager.getByText(/共\s+\d+\s+条/)).toBeVisible();
    await expect(sidebar.getByLabel("每页条数")).toHaveCount(0);
    await expect(pager.getByRole("button", { name: "下一页" })).toBeEnabled();
    const listBox = await sidebar.locator(".exp-project-list").boundingBox();
    const pagerBox = await pager.boundingBox();
    expect(listBox, "project list box").toBeTruthy();
    expect(pagerBox, "project pager box").toBeTruthy();
    expect(pagerBox!.y).toBeGreaterThanOrEqual(listBox!.y + listBox!.height - 1);
    await page.screenshot({ path: path.join(shotDir, "102000-tc023-project-page1.png") });

    const page1Names = await items.locator(".exp-proj-name").allTextContents();
    await pager.getByRole("button", { name: "下一页" }).click();
    await expect(pager.getByRole("button", { name: "2" })).toBeVisible();
    const page2Names = await items.locator(".exp-proj-name").allTextContents();
    expect(page2Names[0]).toBe("全部项目");
    expect(page2Names.some((name) => name !== "全部项目" && !page1Names.includes(name))).toBeTruthy();
    await expect(sidebar.locator(".exp-proj-desc")).toHaveCount(0);
    await page.screenshot({ path: path.join(shotDir, "102010-tc023-project-page2.png") });
  } finally {
    for (const id of createdIds) {
      await page.request.delete(`/api/training/experiments/projects/${id}`);
    }
  }
});
