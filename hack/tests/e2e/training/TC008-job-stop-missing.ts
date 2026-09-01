// TC008：Volcano Job CR 已不存在时，停止任务视为成功并写成已取消。

import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsLdap } from "../login";
import { ensureWorkingCluster } from "../select";

const shotDir = path.resolve(process.cwd(), "../../temp/20260828");

test("TC008 stop missing volcano job marks cancelled", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsLdap(page, "algo", "algo123");
  await expect(page.getByRole("heading", { name: "任务列表" })).toBeVisible();

  const clusterRes = await page.request.get("/api/training/clusters");
  expect(clusterRes.ok()).toBeTruthy();
  const clusters = (await clusterRes.json()).data.list as { id: number; displayName: string; status: string }[];
  const cluster = clusters.find((item) => item.displayName === "kind-ltp") ?? clusters.find((item) => item.status === "healthy");
  expect(cluster, "need a healthy training cluster").toBeTruthy();
  const clusterId = cluster!.id;

  const queueRes = await page.request.get(`/api/training/queues?clusterId=${clusterId}`);
  expect(queueRes.ok()).toBeTruthy();
  const queues = (await queueRes.json()).data.list as {
    id: number;
    enabled: boolean;
    syncError: string;
    teams: { id: number }[];
  }[];
  const queue = queues.find((item) => item.enabled && !item.syncError && item.teams?.length);
  expect(queue, "need an enabled queue for algo").toBeTruthy();

  const name = `e2e-stop-${Date.now()}`;
  const created = await page.request.post("/api/training/jobs", {
    data: {
      clusterId,
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
      command: "sleep 5",
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();

  execSync(`kubectl --context kind-ltp -n maip delete jobs.batch.volcano.sh ${name} --ignore-not-found=true --wait=true`, { stdio: "pipe" });
  let gone = false;
  try {
    execSync(`kubectl --context kind-ltp -n maip get jobs.batch.volcano.sh ${name}`, { stdio: "pipe" });
  } catch {
    gone = true;
  }
  expect(gone, "volcano job should be absent before stop").toBeTruthy();

  await ensureWorkingCluster(page, clusterId);

  await page.locator(".search-box input").fill(name);
  const row = page.locator("tr", { hasText: name });
  await expect(row).toBeVisible();
  await expect(row.getByRole("button", { name: "停止" })).toBeVisible();
  await page.screenshot({ path: path.join(shotDir, "140000-tc008-stop-missing-before.png") });

  await row.getByRole("button", { name: "停止" }).click();
  await expect(page.getByRole("heading", { name: "停止任务" })).toBeVisible();
  await page.locator(".modal-footer").getByRole("button", { name: "停止" }).click();

  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "已停止任务" })).toBeVisible();
  await expect(page.getByText("Volcano job does not exist")).toHaveCount(0);
  await expect(row.getByText("已取消")).toBeVisible();
  await expect(row.getByRole("button", { name: "重跑" })).toBeVisible();
  await page.screenshot({ path: path.join(shotDir, "140010-tc008-stop-missing-after.png") });
});
