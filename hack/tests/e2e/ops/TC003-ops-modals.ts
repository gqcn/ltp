// TC003：运维中心各菜单按钮弹出框的标题、结构与关键文案对齐 prototype.v4。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260826");

test("TC003 ops center button modals match prototype copy and structure", async ({ page, request }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "数据中心管理" })).toBeVisible();

  await page.getByRole("button", { name: "+ 新建数据中心" }).click();
  const dcForm = page.getByRole("dialog");
  await expect(dcForm.getByRole("heading", { name: "新建数据中心" })).toBeVisible();
  await expect(dcForm.locator(".modal-lead")).toContainText("不会自动归属任何数据中心");
  await expect(dcForm.getByLabel("数据中心标识")).toBeVisible();
  await expect(dcForm.getByLabel("显示名称")).toBeVisible();
  await expect(dcForm.getByLabel("简称")).toBeVisible();
  await expect(dcForm.getByRole("button", { name: "创建数据中心" })).toBeVisible();
  await dcForm.screenshot({ path: path.join(shotDir, "220000-tc003-dc-create-modal.png") });
  await dcForm.getByRole("button", { name: "取消" }).click();

  const code = `e2emodal${Date.now()}`;
  await page.getByRole("button", { name: "+ 新建数据中心" }).click();
  await dcForm.getByLabel("数据中心标识").fill(code);
  await dcForm.getByLabel("显示名称").fill("弹窗校对中心");
  await dcForm.getByLabel("简称").fill("弹窗");
  await page.getByRole("button", { name: "创建数据中心" }).click();
  const created = page.locator("tr", { hasText: code });
  await expect(created).toBeVisible();
  await created.getByRole("button", { name: "删除" }).click();
  const dcDelete = page.getByRole("dialog");
  await expect(dcDelete.getByRole("heading", { name: "确认删除数据中心" })).toBeVisible();
  await expect(dcDelete.locator(".modal-msg")).toContainText("确定要删除数据中心");
  await expect(dcDelete.locator(".modal-hint.is-danger")).toContainText("当前无节点、队列或集群引用该数据中心");
  await dcDelete.screenshot({ path: path.join(shotDir, "220100-tc003-dc-delete-modal.png") });
  await dcDelete.getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByRole("cell", { name: code, exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "集群管理" }).click();
  await expect(page.getByRole("heading", { name: "集群管理" })).toBeVisible();
  await page.getByRole("button", { name: "+ 接入集群" }).click();
  const clusterForm = page.getByRole("dialog");
  await expect(clusterForm.getByRole("heading", { name: "接入集群" })).toBeVisible();
  await expect(clusterForm.locator(".modal-lead")).toContainText("通过 Kubeconfig 接入 Kubernetes 集群");
  await expect(clusterForm.getByLabel("显示名称")).toBeVisible();
  await expect(clusterForm.getByLabel("Kubeconfig")).toBeVisible();
  await expect(clusterForm.getByRole("button", { name: "接入集群" })).toBeVisible();
  await clusterForm.screenshot({ path: path.join(shotDir, "220200-tc003-cluster-create-modal.png") });
  await clusterForm.getByRole("button", { name: "取消" }).click();

  await page.getByRole("link", { name: "节点管理" }).click();
  await expect(page.getByRole("heading", { name: "节点管理" })).toBeVisible();
  const nodeDcBtn = page.getByRole("button", { name: "数据中心" }).first();
  const hasNodeActions = await nodeDcBtn.waitFor({ state: "visible", timeout: 4000 }).then(() => true).catch(() => false);
  if (hasNodeActions) {
    await nodeDcBtn.click();
    const nodeDc = page.getByRole("dialog");
    await expect(nodeDc.getByRole("heading", { name: /设置数据中心/ })).toBeVisible();
    await expect(nodeDc.locator(".modal-lead")).toContainText("maip.io/datacenter");
    await expect(nodeDc.getByRole("button", { name: "确认设置" })).toBeVisible();
    await nodeDc.screenshot({ path: path.join(shotDir, "220300-tc003-node-dc-modal.png") });
    await nodeDc.getByRole("button", { name: "取消" }).click();

    await page.getByRole("button", { name: "隔离" }).first().click();
    const isolate = page.getByRole("dialog");
    await expect(isolate.getByRole("heading", { name: /确认.*隔离/ })).toBeVisible();
    await expect(isolate.locator(".modal-maint-hint")).toContainText("cordon");
    await expect(isolate.getByRole("button", { name: "确认隔离" })).toBeVisible();
    await isolate.screenshot({ path: path.join(shotDir, "220310-tc003-node-isolate-modal.png") });
    await isolate.getByRole("button", { name: "取消" }).click();
  }

  await page.getByRole("link", { name: "队列管理" }).click();
  await expect(page.getByRole("heading", { name: "队列管理" })).toBeVisible();
  if (await page.getByRole("button", { name: "+ 新建队列" }).isVisible()) {
    await page.getByRole("button", { name: "+ 新建队列" }).click();
    const queueForm = page.getByRole("dialog");
    await expect(queueForm.getByRole("heading", { name: "新建队列" })).toBeVisible();
    await expect(queueForm.locator(".modal-lead")).toContainText("逻辑队列将同步创建底层 Volcano Queue");
    await expect(queueForm.getByLabel("队列标识")).toBeVisible();
    await expect(queueForm.getByRole("textbox", { name: /关联团队/ })).toBeVisible();
    await expect(queueForm.getByText("资源筛选")).toBeVisible();
    await expect(queueForm.getByText("额度配置")).toBeVisible();
    await expect(queueForm.getByRole("button", { name: "创建队列" })).toBeVisible();
    await expect(queueForm.locator('#q-form-dc option[value]:not([value=""])').first()).toHaveCount(1);
    await queueForm.screenshot({ path: path.join(shotDir, "220400-tc003-queue-create-modal.png") });
    await queueForm.getByRole("button", { name: "取消" }).click();
  }

  const title = `e2e-modal-alert-${Date.now()}`;
  const res = await request.post("http://127.0.0.1:8000/api/webhooks/fastx/alerts", {
    data: {
      originalBody: { faultName: "弹窗校对故障", faultEnv: null, cluster: null, handlingStrategy: "manual" },
      alarmInfo: {
        ruleId: null,
        alarmCount: 1,
        level: 2,
        name: title,
        alarmData: [["告警条件", "当前值", "标签"], ["> 0", "1", "Hostname:kind-control-plane,__name__:up,"]],
        firstAlarmTime: "2026-08-26 12:00:00.0",
        createUser: "e2e",
      },
    },
  });
  expect(res.ok()).toBeTruthy();

  await page.getByRole("link", { name: "告警中心" }).click();
  await expect(page.getByRole("heading", { name: "告警中心" })).toBeVisible();
  await page.getByPlaceholder("按标题 / 节点 / 指标搜索...").fill(title);
  const alertItem = page.locator(".alert-item", { hasText: title });
  await expect(alertItem).toBeVisible();
  await alertItem.getByRole("button", { name: "处理告警" }).click();
  const handle = page.getByRole("dialog");
  await expect(handle.getByRole("heading", { name: "处理告警" })).toBeVisible();
  await expect(handle.locator(".modal-msg")).toContainText("处理告警");
  await expect(handle.getByText("处理中")).toBeVisible();
  await expect(handle.getByText("已完成")).toBeVisible();
  await expect(handle.getByLabel("处理备注")).toBeVisible();
  await expect(handle.getByRole("button", { name: "确认处理" })).toBeVisible();
  await handle.screenshot({ path: path.join(shotDir, "220500-tc003-alert-handle-modal.png") });
  await handle.getByRole("button", { name: "取消" }).click();

  await alertItem.getByRole("button", { name: "查看详情" }).click();
  const detail = page.getByRole("dialog");
  await expect(detail.getByRole("heading", { name: "告警详情" })).toBeVisible();
  await expect(detail.locator(".alert-detail-name")).toHaveText(title);
  await expect(detail.getByText("原始告警内容")).toBeVisible();
  await expect(detail.getByText("FastX 通过 Webhook 提交到平台的原始 JSON")).toBeVisible();
  await detail.screenshot({ path: path.join(shotDir, "220600-tc003-alert-detail-modal.png") });
  await detail.locator(".modal-footer").getByRole("button", { name: "关闭" }).click();
});
