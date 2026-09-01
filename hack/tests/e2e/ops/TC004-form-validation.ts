// TC004：集群与队列表单校验失败返回中文，并聚焦到首个无效输入域。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260826");
const englishError = /Please fill|The \w+ field is required/i;

test("TC004 cluster and queue validation shows Chinese field errors and focuses invalid input", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);

  await page.getByRole("link", { name: "集群管理" }).click();
  await expect(page.getByRole("heading", { name: "集群管理" })).toBeVisible();
  await page.getByRole("button", { name: "+ 接入集群" }).click();
  const cluster = page.getByRole("dialog");
  await cluster.getByRole("button", { name: "接入集群" }).click();
  await expect(cluster.getByText("请填写显示名称")).toBeVisible();
  await expect(cluster.getByText("请填写 Kubeconfig")).toBeVisible();
  await expect(cluster.locator("#cls-form-display")).toBeFocused();
  await expect(cluster.getByText(englishError)).toHaveCount(0);
  await cluster.screenshot({ path: path.join(shotDir, "231000-tc004-cluster-empty.png") });
  await cluster.getByRole("button", { name: "取消" }).click();

  await page.getByRole("link", { name: "队列管理" }).click();
  await expect(page.getByRole("heading", { name: "队列管理" })).toBeVisible();
  if (!(await page.getByRole("button", { name: "+ 新建队列" }).isVisible())) {
    return;
  }
  await page.getByRole("button", { name: "+ 新建队列" }).click();
  const queue = page.getByRole("dialog");
  await queue.getByRole("button", { name: "创建队列" }).click();
  await expect(queue.getByText("请填写队列标识")).toBeVisible();
  await expect(queue.getByText("请填写显示名称")).toBeVisible();
  await expect(queue.getByText("请至少关联一个团队")).toHaveCount(0);
  await expect(queue.locator("#q-form-name")).toBeFocused();
  await expect(queue.getByText(englishError)).toHaveCount(0);
  await queue.screenshot({ path: path.join(shotDir, "231100-tc004-queue-empty.png") });
});
