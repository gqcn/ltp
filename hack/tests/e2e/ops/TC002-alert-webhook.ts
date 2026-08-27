// TC002：FastX Webhook 入库后告警中心可见。

import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

test("TC002 fastx webhook appears in alert center", async ({ page, request }) => {
  const title = `e2e-alert-${Date.now()}`;
  const res = await request.post("http://127.0.0.1:8000/api/webhooks/fastx/alerts", {
    data: {
      originalBody: { faultName: "E2E故障", faultEnv: null, cluster: null, handlingStrategy: "manual" },
      alarmInfo: {
        ruleId: null,
        alarmCount: 1,
        level: 2,
        name: title,
        alarmData: [
          ["告警条件", "当前值", "标签"],
          ["> 0", "1", "Hostname:kind-control-plane,__name__:up,"],
        ],
        firstAlarmTime: "2026-08-26 12:00:00.0",
        createUser: "e2e",
      },
    },
  });
  expect(res.ok()).toBeTruthy();

  await loginAsAdmin(page);
  await page.getByRole("link", { name: "告警中心" }).click();
  await expect(page.getByRole("heading", { name: "告警中心" })).toBeVisible();
  await page.getByPlaceholder("按标题 / 节点 / 指标搜索...").fill(title);
  await expect(page.getByText(title)).toBeVisible();
});
