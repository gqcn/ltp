// TC013：实验分析菜单、项目创建/重名/删除、历史任务补建、Run 移动与删除。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsLdap } from "../login";
import { ensureWorkingCluster } from "../select";

const shotDir = path.resolve(process.cwd(), "../../temp/20260901");

test("TC013 experiment analysis menus projects and job link", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsLdap(page, "algo", "algo123");
  await expect(page.getByRole("link", { name: "实验分析" })).toBeVisible();
  await page.getByRole("link", { name: "实验分析" }).click();
  await expect(page.getByRole("heading", { name: "实验分析" })).toBeVisible();
  await expect(page.getByRole("button", { name: "查看已归档项目" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "归档" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "新建训练任务并关联实验" })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "实验名称" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "更新时间" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "实验 Run" })).toHaveCount(0);
  await page.screenshot({ path: path.join(shotDir, "150000-tc013-experiments.png") });

  const clusterRes = await page.request.get("/api/training/clusters");
  expect(clusterRes.ok()).toBeTruthy();
  const clusters = (await clusterRes.json()).data.list as { id: number; status: string }[];
  expect(clusters.length, "need a training cluster").toBeGreaterThan(0);
  let cluster = clusters.find((item) => item.status === "healthy") ?? clusters[0]!;
  let queue: { id: number; teams: { id: number }[] } | undefined;
  for (const item of clusters) {
    const queueRes = await page.request.get(`/api/training/queues?clusterId=${item.id}`);
    if (!queueRes.ok()) continue;
    const queues = (await queueRes.json()).data.list as { id: number; enabled: boolean; syncError: string; teams: { id: number }[] }[];
    const hit = queues.find((q) => q.enabled && !q.syncError && q.teams?.length);
    if (hit) {
      cluster = item;
      queue = hit;
      break;
    }
  }
  expect(queue, "need an enabled queue with a team").toBeTruthy();
  await ensureWorkingCluster(page, cluster.id);
  await expect(page.getByRole("heading", { name: "实验分析" })).toBeVisible();

  const defaultItem = page.locator(".exp-project-item", { hasText: "默认项目" });
  await expect(defaultItem).toBeVisible();
  await expect(page.locator(".exp-project-item").getByRole("button", { name: "删除" })).toHaveCount(0);
  await defaultItem.click();
  await expect(page.locator(".exp-selected-actions").getByRole("button", { name: "编辑" })).toBeVisible();
  await expect(page.locator(".exp-selected-actions").getByRole("button", { name: "删除" })).toHaveCount(0);

  await page.getByRole("button", { name: "+ 新建" }).click();
  await page.locator("#proj-form-name").fill("default");
  await page.getByRole("button", { name: "创建项目" }).click();
  await expect(page.getByRole("alert")).toContainText("同名");

  const unique = `e2e-proj-${Date.now()}`;
  await page.locator("#proj-form-name").fill(unique);
  await page.getByRole("button", { name: "创建项目" }).click();
  const createdName = page.locator(".exp-project-item .exp-proj-name", { hasText: unique });
  await expect(createdName).toBeVisible();
  await expect(createdName).toHaveText(unique);
  expect(await createdName.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe("normal");
  expect(await createdName.evaluate((el) => getComputedStyle(el).textOverflow)).not.toBe("ellipsis");
  await page.screenshot({ path: path.join(shotDir, "150100-tc013-project-created.png") });

  const createdItem = page.locator(".exp-project-item", { hasText: unique });
  await createdItem.click();
  await page.locator(".exp-selected-actions").getByRole("button", { name: "删除" }).click();
  const deleteDialog = page.getByRole("dialog");
  await expect(deleteDialog.getByRole("heading", { name: "确认删除项目" })).toBeVisible();
  await expect(deleteDialog.locator(".modal-msg")).toContainText(unique);
  await expect(deleteDialog.locator(".modal-hint.is-danger")).toContainText("默认项目");
  await deleteDialog.screenshot({ path: path.join(shotDir, "150200-tc013-project-delete.png") });
  await deleteDialog.getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByText(unique)).toHaveCount(0);

  const name = `e2e-exp-${Date.now()}`;
  const created = await page.request.post("/api/training/jobs", {
    data: {
      clusterId: cluster.id,
      name,
      workdir: "/tmp",
      priority: "P2",
      teamId: queue!.teams[0].id,
      queueId: queue!.id,
      nodes: 1,
      gpusPerNode: 1,
      cpuPerNode: 1,
      memGiPerNode: 1,
      image: "docker.io/library/busybox:1.36",
      command: "sleep 1",
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const jobId = (await created.json()).data.id as number;
  const job = await page.request.get(`/api/training/jobs/${jobId}`);
  const jobBody = await job.json();
  expect(jobBody.data.experimentId, "job should link a run").toBeGreaterThan(0);

  await page.goto("/training/experiments");
  await expect(page.getByRole("heading", { name: "实验分析" })).toBeVisible();
  await expect(page.getByText(name).first()).toBeVisible();
  const checkTh = page.locator("th.exp-col-check");
  await expect(checkTh).toBeVisible();
  expect(await checkTh.evaluate((el) => getComputedStyle(el).textOverflow)).not.toBe("ellipsis");
  await expect(page.getByLabel("每页条数")).toBeVisible();
  await page.locator(".alert-pagination .ltp-select").click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(page.getByRole("option", { name: "10", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "20", exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(shotDir, "150300-tc013-run-list.png") });
  await page.keyboard.press("Escape");

  await page.goto(`/training/jobs/${jobId}`);
  await expect(page.getByText("关联实验")).toBeVisible();
  await page.locator(".job-exp-banner .link-cell").click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText("TensorBoard / 曲线")).toBeVisible();
  await page.screenshot({ path: path.join(shotDir, "150250-tc013-run-detail.png") });

  await page.goto("/training/experiments");
  await expect(page.getByRole("heading", { name: "实验分析" })).toBeVisible();
  await expect(page.getByText(name).first()).toBeVisible();

  const moveName = `e2e-move-${Date.now()}`;
  await page.getByRole("button", { name: "+ 新建" }).click();
  await page.locator("#proj-form-name").fill(moveName);
  await page.getByRole("button", { name: "创建项目" }).click();
  await expect(page.getByText(moveName).first()).toBeVisible();

  const runRow = page.locator("tr", { hasText: name });
  await runRow.getByRole("button", { name: "移动" }).click();
  const moveDialog = page.getByRole("dialog");
  await expect(moveDialog.getByRole("heading", { name: "移动实验" })).toBeVisible();
  await moveDialog.getByRole("button", { name: moveName }).click();
  await moveDialog.getByRole("button", { name: "移动" }).click();
  await expect(page.getByText("已移动实验")).toBeVisible();
  await page.locator(".exp-project-item", { hasText: moveName }).click();
  await expect(page.getByText(name).first()).toBeVisible();
  await page.screenshot({ path: path.join(shotDir, "150400-tc013-run-moved.png") });

  await page.locator("tr", { hasText: name }).getByRole("button", { name: "删除" }).click();
  const runDelete = page.getByRole("dialog");
  await expect(runDelete.getByRole("heading", { name: "确认删除实验" })).toBeVisible();
  await runDelete.screenshot({ path: path.join(shotDir, "150500-tc013-run-delete.png") });
  await runDelete.getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByText("已删除实验")).toBeVisible();
  await expect(page.locator("tr", { hasText: name })).toHaveCount(0);

  await page.goto(`/training/jobs/${jobId}`);
  await expect(page.getByText("关联实验")).toHaveCount(0);
});
