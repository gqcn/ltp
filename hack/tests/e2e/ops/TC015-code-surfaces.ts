// TC015：集群 Kubeconfig 编辑表面与告警 JSON 展示表面使用共享语法组件。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260828");

test("TC015 cluster kubeconfig editor and alert JSON viewer use shared code surfaces", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await stubAlerts(page);
  await loginAsAdmin(page);

  await page.getByRole("link", { name: "集群管理" }).click();
  await expect(page.getByRole("heading", { name: "集群管理" })).toBeVisible();
  await page.getByRole("button", { name: "+ 接入集群" }).click();
  const cluster = page.getByRole("dialog");
  await expect(cluster.getByRole("heading", { name: "接入集群" })).toBeVisible();
  const kube = cluster.locator('[data-code-surface="editor"][data-lang="yaml"]');
  await expect(kube).toBeVisible();
  await expect(cluster.locator("#cls-form-kubeconfig")).toBeVisible();
  await cluster.locator("#cls-form-kubeconfig").fill("apiVersion: v1\nkind: Config\nclusters: []\n");
  await expect(kube).toContainText("apiVersion");
  await expect(kube).toContainText("kind");
  await expect(kube.locator("[class*='tok-']").first()).toBeVisible();
  await cluster.screenshot({ path: path.join(shotDir, "173200-tc015-cluster-kubeconfig.png") });
  await cluster.getByRole("button", { name: "取消" }).click();

  await page.getByRole("link", { name: "告警中心" }).click();
  await expect(page.getByRole("heading", { name: "告警中心" })).toBeVisible();
  await page.getByRole("button", { name: "查看详情" }).click();
  const detail = page.getByRole("dialog");
  await expect(detail.getByRole("heading", { name: "告警详情" })).toBeVisible();
  const json = detail.locator('[data-code-surface="viewer"][data-lang="json"]');
  await expect(json).toBeVisible();
  await expect(json.locator(".cm-editor")).toBeVisible();
  await expect(json).toContainText("faultName");
  await expect(json.locator("[class*='tok-']").first()).toBeVisible();
  await expect(detail.locator("#modal-alert-handle-remark")).toHaveCount(0);
  await detail.screenshot({ path: path.join(shotDir, "173300-tc015-alert-json.png") });
  await detail.locator(".modal-footer").getByRole("button", { name: "关闭" }).click();

  await page.getByRole("link", { name: "节点管理" }).click();
  await expect(page.getByRole("heading", { name: "节点管理" })).toBeVisible();
  const clusterSelect = page.getByLabel("工作集群");
  if (await clusterSelect.count()) {
    const values = await clusterSelect.locator("option").evaluateAll((els) =>
      els.map((el) => ({ value: (el as HTMLOptionElement).value, text: el.textContent || "" })),
    );
    const kind = values.find((item) => item.text.includes("kind-ltp")) ?? values.find((item) => item.value && item.value !== "0");
    if (kind && (await clusterSelect.inputValue()) !== kind.value) {
      await clusterSelect.selectOption(kind.value);
      const confirm = page.getByRole("button", { name: "确认切换并刷新" });
      if (await confirm.isVisible().catch(() => false)) await confirm.click();
    }
  }
  const nodeLink = page.locator(".node-name-link").first();
  await expect(nodeLink).toBeVisible({ timeout: 8000 });
  await nodeLink.click();
  const node = page.getByRole("dialog");
  await node.getByRole("tab", { name: "YAML" }).click();
  const yaml = node.locator('[data-code-surface="viewer"][data-lang="yaml"]');
  await expect(yaml).toBeVisible();
  await expect(yaml.locator(".cm-editor")).toBeVisible();
  await expect(yaml).toContainText("apiVersion");
  await expect(yaml.locator("[class*='tok-']").first()).toBeVisible();
  await node.screenshot({ path: path.join(shotDir, "173500-tc015-node-yaml.png") });
});

async function stubAlerts(page: Page) {
  const alert = {
    id: 901,
    displayId: "ALT-901",
    clusterId: 1,
    severity: "warning",
    title: "e2e-code-surface-alert",
    alertInfo: "GPU 温度偏高",
    faultInfo: "",
    source: "FastX",
    nodeNames: "gpu-node-1",
    status: "open",
    handleRemark: "",
    handledAt: 0,
    handledBy: "",
    firstAlarmAt: Date.now(),
    createdAt: Date.now(),
    alarmCount: 1,
    alarmLevel: 2,
    createUser: "e2e",
    webhookPayload: JSON.stringify({ originalBody: { faultName: "E2E故障" }, alarmInfo: { name: "e2e-code-surface-alert" } }),
  };
  await page.route(/\/api\/alerts(\?|$)/, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        message: "OK",
        data: {
          list: [alert],
          total: 1,
          summary: { total: 1, open: 1, following: 0, handled: 0, critical: 0, warning: 1, info: 0, unfinished: 1 },
        },
      }),
    });
  });
  await page.route(/\/api\/alerts\/901(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "OK", data: alert }),
    });
  });
}
