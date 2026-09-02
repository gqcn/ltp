// TC024：演示训练写入 tfevents 后，实验分析展示 Loss / 进度 / 吞吐，并可打开 TensorBoard。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { loginAsLdap } from "../login";
import { ensureWorkingCluster } from "../select";

const shotDir = path.resolve(process.cwd(), "../../temp/20260901");
const demoImage = "ltp/experiment-agent:dev";
const demoCommand = "python /opt/agent/agent.py demo";

test("TC024 demo experiment writes metrics and opens tensorboard", async ({ page }) => {
  test.setTimeout(180_000);
  mkdirSync(shotDir, { recursive: true });
  await loginAsLdap(page, "algo", "algo123");

  await page.getByRole("link", { name: "新建任务" }).click();
  await expect(page.getByRole("heading", { name: "创建训练任务" })).toBeVisible();
  await page.getByRole("button", { name: "填入本地演示训练" }).click();
  await expect(page.locator("#create-image")).toHaveValue(demoImage);
  await expect(page.locator("#create-section-launch")).toContainText(demoCommand);
  await page.screenshot({ path: path.join(shotDir, "160000-tc024-demo-fill.png") });

  const clusterRes = await page.request.get("/api/training/clusters");
  expect(clusterRes.ok()).toBeTruthy();
  const clusters = (await clusterRes.json()).data.list as { id: number; status: string }[];
  expect(clusters.length, "need a training cluster").toBeGreaterThan(0);
  let cluster = clusters.find((item) => item.status === "healthy") ?? clusters[0]!;
  let queue: { id: number; teams: { id: number }[] } | undefined;
  for (const item of clusters.filter((c) => c.status === "healthy")) {
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
  await page.goto("/training/experiments");
  await expect(page.getByRole("heading", { name: "实验分析" })).toBeVisible();
  await expect(page.getByLabel("工作集群")).toBeVisible();
  await ensureWorkingCluster(page, cluster.id);

  const name = `demo-exp-${Date.now()}`;
  const created = await page.request.post("/api/training/jobs", {
    data: {
      clusterId: cluster.id,
      name,
      workdir: "/data/hpc/home/algo",
      priority: "P2",
      teamId: queue!.teams[0].id,
      queueId: queue!.id,
      nodes: 1,
      gpusPerNode: 1,
      cpuPerNode: 1,
      memGiPerNode: 1,
      image: demoImage,
      command: demoCommand,
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const jobId = (await created.json()).data.id as number;

  const job = await waitForJobSuccess(page.request, jobId);
  expect(job.experimentId, "job should link a run").toBeGreaterThan(0);
  const run = await waitForMetrics(page.request, job.experimentId);

  await page.goto("/training/experiments");
  await expect(page.getByRole("heading", { name: "实验分析" })).toBeVisible();
  await expect(page.getByLabel("工作集群")).toBeVisible();
  await ensureWorkingCluster(page, cluster.id);
  await page.getByPlaceholder("搜索实验名 / 创建人...").fill(name);
  const runRow = page.locator("tr", { hasText: name });
  await expect(runRow).toBeVisible({ timeout: 20_000 });
  const cells = runRow.locator("td");
  await expect(cells.nth(3)).not.toHaveText("—");
  expect(Number(await cells.nth(3).innerText())).toBeGreaterThan(1);
  await expect(cells.nth(4)).toContainText(`step ${Number(run.step).toLocaleString()}`);
  await expect(cells.nth(4)).toContainText(`${Number(run.maxSteps).toLocaleString()}`);
  await expect(cells.nth(5)).not.toHaveText("—");
  expect(Number(await cells.nth(5).innerText())).toBeGreaterThan(0);
  await page.screenshot({ path: path.join(shotDir, "160100-tc024-run-metrics.png") });

  await runRow.locator(".exp-run-name").click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.locator(".meta-item").filter({ hasText: "Loss" }).locator(".value")).not.toHaveText("—");
  await expect(page.locator(".meta-item").filter({ hasText: "Step" }).locator(".value")).toContainText("/");
  await expect(page.locator(".meta-item").filter({ hasText: "吞吐" }).locator(".value")).not.toHaveText("—");
  await page.getByRole("button", { name: "打开 TensorBoard" }).click();
  const frame = page.locator("iframe[title='TensorBoard']");
  await expect(frame).toBeVisible({ timeout: 60_000 });
  await expect(frame).toHaveAttribute("src", /\/api\/training\/experiments\/\d+\/board\//);
  const tb = page.frameLocator("iframe[title='TensorBoard']");
  await expect.poll(async () => {
    const html = await tb.locator("html").innerHTML().catch(() => "");
    if (/proxy pod failed|KUBE_UNREACHABLE|Pretty-print|Data could not be loaded/i.test(html)) return "error";
    if (/tb-relative-root|timeseries|scalars/i.test(html) && /tensorboard/i.test(html)) return "ok";
    return "loading";
  }, { timeout: 45_000 }).toBe("ok");
  await expect(tb.getByText("TensorBoard", { exact: true })).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: path.join(shotDir, "160200-tc024-tensorboard.png") });
});

async function waitForJobSuccess(request: APIRequestContext, jobId: number) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const res = await request.get(`/api/training/jobs/${jobId}`);
    expect(res.ok(), await res.text()).toBeTruthy();
    const job = (await res.json()).data as { status: string; experimentId: number; failReason?: string };
    if (job.status === "success") return job;
    if (job.status === "failed" || job.status === "cancelled") {
      throw new Error(`demo job ended as ${job.status}: ${job.failReason || ""}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("demo job did not succeed in time");
}

async function waitForMetrics(request: APIRequestContext, runId: number) {
  const deadline = Date.now() + 90_000;
  let lastError = "";
  while (Date.now() < deadline) {
    const res = await request.get(`/api/training/experiments/${runId}`);
    expect(res.ok(), await res.text()).toBeTruthy();
    const run = (await res.json()).data as {
      loss: number | null;
      step: number | null;
      maxSteps: number | null;
      tokensPerSec: number | null;
      metricsError: string;
    };
    lastError = run.metricsError;
    if (run.loss != null && run.step != null && run.maxSteps != null && run.tokensPerSec != null) {
      return run;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`experiment metrics were empty: ${lastError || "no snapshot"}`);
}
