// TC010：任务详情页对齐原型：面包屑为任务名、不展示数字 ID、数据中心徽章、命令高亮与 Pod 日志跟随。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { loginAsLdap } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260828");
const jobName = "slm-13b-pretrain-scale";
const jobId = 42;
const podName = `${jobName}-worker-0`;

test("TC010 job detail matches prototype layout", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await stubJobDetail(page);
  await loginAsLdap(page, "algo", "algo123");
  await expect(page.getByRole("heading", { name: "任务列表" })).toBeVisible();
  await page.goto(`/training/jobs/${jobId}`);
  await expect(page.locator(".job-detail-title")).toHaveText(jobName);
  await expect(page.locator(".breadcrumb .current")).toHaveText(jobName);
  await expect(page.locator(".job-detail-heading")).not.toContainText(String(jobId));
  await expect(page.locator(".job-cfg-fact .dc-badge")).toHaveText("cq-lj");
  await expect(page.locator(".job-cfg-cmd")).toHaveAttribute("data-lang", "shell");
  await expect(page.locator(".job-cfg-cmd .hl-cmd")).toHaveText("torchrun");
  await expect(page.locator(".job-cfg-cmd .hl-var").first()).toContainText("$GPU_NUM");
  await expect(page.locator(".job-cfg-env .hl-key")).toHaveText("EPOCHS");
  await expect(page.locator(".job-cfg-mount-title strong")).toHaveText("SLM 7B Phase3 预训练");
  await expect(page.locator(".job-cfg-mount")).not.toContainText("展开");
  await expect(page.locator(".cfg-snapshot-card h4")).toContainText("SLM 7B Phase3 预训练");
  await expect(page.locator(".cfg-snapshot-meta .badge-info")).toHaveText("configmap");
  await expect(page.locator(".cfg-snapshot-files thead")).toHaveText(/路径.*大小.*操作/);
  await expect(page.locator(".cfg-snapshot-files tbody")).toContainText("7b_phase3.yaml");
  await page.locator(".cfg-snapshot-files").getByRole("button", { name: "展开" }).click();
  await expect(page.locator(".cfg-snapshot-files .code-block")).toContainText("seq_len: 8192");
  await page.screenshot({ path: path.join(shotDir, "160000-tc010-job-detail-config.png"), fullPage: true });

  await page.locator("#job-detail-tabs .tab", { hasText: "Pod 列表" }).click();
  await expect(page.getByText("共 1 · Running 0 · 节点 1")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "跟随" })).toBeChecked();
  await expect(page.locator(".log-level.info")).toHaveText("INFO");
  await expect(page.locator(".pod-log-pane-sub.is-mono")).toContainText(`${podName} · Master · rank 0`);
  await page.screenshot({ path: path.join(shotDir, "160010-tc010-job-detail-pods.png") });
});

async function stubJobDetail(page: Page) {
  const now = Date.now();
  const job = {
    id: jobId,
    clusterId: 1,
    name: jobName,
    status: "queued",
    priority: "P0",
    teamId: 1,
    teamName: "SLM预训练",
    queueId: 1,
    queueName: "lab-default",
    queueDisplayName: "SLM · 疆算 H100",
    datacenterCode: "cq-lj",
    gpuType: "H100-80G",
    requireIb: true,
    nodes: 32,
    gpusPerNode: 8,
    gpuCount: 256,
    cpuPerNode: 128,
    memGiPerNode: 1024,
    ownerUsername: "linhaili",
    ownerNickname: "林海立",
    submittedByUsername: "linhaili",
    submittedByNickname: "林海立",
    durationMs: 0,
    gpuHours: 0,
    syncError: "",
    failReason: "",
    rerunFromId: 0,
    createdAt: now,
    startedAt: 0,
    endedAt: 0,
    namespace: "maip",
    image: "harbor.msxf.com/ai/megatron:24.07-cuda12.4",
    command: "torchrun --nproc_per_node=$GPU_NUM --nnodes=$WORLD_SIZE train.py",
    workdir: "/data/hpc/home/linhaili",
    env: [{ key: "EPOCHS", value: "1000" }],
    mounts: [
      {
        setId: 1,
        setName: "slm-7b-phase3",
        displayName: "SLM 7B Phase3 预训练",
        version: 12,
        mountPath: "/data/hpc/home/guoqiang/experiments/slm-7b-pretrain-phase3/configs",
        digest: "a3f8c1d2e4b56a90",
        files: [
          {
            path: "7b_phase3.yaml",
            content: "seq_len: 8192\nhidden_size: 4096\n",
            size: 34,
          },
        ],
      },
    ],
  };
  await page.route(/\/api\/training\/clusters(\?|$)/, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "OK", data: { list: [{ id: 1, name: "ltp", displayName: "训练集群", status: "healthy" }] } }),
    });
  });
  await page.route(/\/api\/training\/jobs\/42\/pods\/.+\/logs/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        message: "OK",
        data: { content: "14:52:49  r0   INFO  [Megatron] iteration 18930/50000\n" },
      }),
    });
  });
  await page.route(/\/api\/training\/jobs\/42\/pods(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        message: "OK",
        data: {
          list: [{ name: podName, task: "worker", index: 0, node: "gpu-node-h200", phase: "Unknown", restarts: 0, role: "Master" }],
        },
      }),
    });
  });
  await page.route(/\/api\/training\/jobs\/42\/alerts/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "OK", data: { list: [] } }),
    });
  });
  await page.route(/\/api\/training\/jobs\/42(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "OK", data: job }),
    });
  });
  await page.route(/\/api\/training\/jobs(\?|$)/, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "OK", data: { list: [job], total: 1 } }),
    });
  });
  await page.route(/\/api\/training\/teams(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "OK", data: { list: [{ id: 1, name: "SLM预训练" }] } }),
    });
  });
  await page.route(/\/api\/training\/queues(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "OK", data: { summary: {}, list: [] } }),
    });
  });
}
