// TC007：节点标签/污点表单按 Kubernetes 语法校验，中文错误写在输入域旁并聚焦。

import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../login";

const shotDir = path.resolve(process.cwd(), "../../temp/20260827");
const englishError = /Please fill|The \w+ field is required/i;
const longPrefixedKey = "this.is.a.very.long.dns.subdomain.example.com/gpu-scheduling-pool-name-for-e2e";
const labelKeyFormat = "标签 key 名称须由字母或数字开头和结尾，中间可含 -、_ 或 .";
const labelValueFormat = "标签 value 须为空，或由字母、数字开头和结尾，中间可含 -、_ 或 .";
const taintValueFormat = "污点 value 须为空，或由字母、数字开头和结尾，中间可含 -、_ 或 .";

test("TC007 node label and taint forms reject invalid Kubernetes names", async ({ page }) => {
  mkdirSync(shotDir, { recursive: true });
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "节点管理" }).click();
  await expect(page.getByRole("heading", { name: "节点管理" })).toBeVisible();

  const row = page.locator("tbody tr").filter({ has: page.getByRole("button", { name: "标签" }) }).first();
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "标签" }).click();
  const labels = page.getByRole("dialog");
  await expect(labels.getByRole("heading", { name: /标签管理/ })).toBeVisible();
  await expect(labels.locator("#node-label-add-key")).toHaveAttribute("maxLength", "317");
  await expect(labels.locator("#node-label-add-value")).toHaveAttribute("maxLength", "63");

  await labels.getByRole("button", { name: "添加" }).click();
  await expect(labels.getByText("请输入标签 key")).toBeVisible();
  await expect(labels.locator("#node-label-add-key")).toBeFocused();
  await expect(labels.getByText(englishError)).toHaveCount(0);
  await labels.screenshot({ path: path.join(shotDir, "140000-tc007-label-empty-key.png") });

  await labels.locator("#node-label-add-key").fill("-bad");
  await labels.getByRole("button", { name: "添加" }).click();
  await expect(labels.getByText(labelKeyFormat)).toBeVisible();
  await expect(labels.locator("#node-label-add-key")).toBeFocused();
  await labels.screenshot({ path: path.join(shotDir, "140010-tc007-label-invalid-key.png") });

  await labels.locator("#node-label-add-key").fill("foo/");
  await labels.getByRole("button", { name: "添加" }).click();
  await expect(labels.getByText("标签 key 名称不能为空")).toBeVisible();

  await labels.locator("#node-label-add-key").fill("Example.COM/gpu");
  await labels.getByRole("button", { name: "添加" }).click();
  await expect(labels.getByText("标签 key 前缀必须是小写 DNS 子域（字母、数字、连字符与点）")).toBeVisible();

  await labels.locator("#node-label-add-key").fill("a".repeat(64));
  await labels.getByRole("button", { name: "添加" }).click();
  await expect(labels.getByText("标签 key 名称最长 63 个字符")).toBeVisible();

  await labels.locator("#node-label-add-key").fill("e2e-pool");
  await labels.locator("#node-label-add-value").fill("-bad");
  await labels.getByRole("button", { name: "添加" }).click();
  await expect(labels.getByText(labelValueFormat)).toBeVisible();
  await expect(labels.locator("#node-label-add-value")).toBeFocused();

  await labels.locator("#node-label-add-value").fill("ok");
  await labels.locator("#node-label-add-key").fill(longPrefixedKey);
  await labels.getByRole("button", { name: "添加" }).click();
  await expect(labels.locator("input.node-label-k").last()).toHaveValue(longPrefixedKey);
  await expect(labels.locator("input.node-label-v").last()).toHaveValue("ok");

  const firstKey = labels.locator("#node-label-row-0-key");
  await firstKey.fill("-bad");
  await labels.getByRole("button", { name: "保存标签" }).click();
  await expect(labels.getByText(labelKeyFormat)).toBeVisible();
  await expect(firstKey).toBeFocused();
  await labels.screenshot({ path: path.join(shotDir, "140020-tc007-label-save-invalid.png") });
  await labels.getByRole("button", { name: "取消" }).click();

  await row.getByRole("button", { name: "污点" }).click();
  const taints = page.getByRole("dialog");
  await expect(taints.getByRole("heading", { name: /污点管理/ })).toBeVisible();
  await expect(taints.locator("#node-taint-add-key")).toHaveAttribute("maxLength", "317");
  await expect(taints.locator("#node-taint-add-value")).toHaveAttribute("maxLength", "63");

  await taints.getByRole("button", { name: "添加" }).click();
  await expect(taints.getByText("请输入污点 key")).toBeVisible();
  await expect(taints.locator("#node-taint-add-key")).toBeFocused();
  await expect(taints.getByText(englishError)).toHaveCount(0);

  await taints.locator("#node-taint-add-key").fill("-bad");
  await taints.getByRole("button", { name: "添加" }).click();
  await expect(taints.getByText("污点 key 名称须由字母或数字开头和结尾，中间可含 -、_ 或 .")).toBeVisible();
  await expect(taints.locator("#node-taint-add-key")).toBeFocused();

  await taints.locator("#node-taint-add-key").fill("dedicated");
  await taints.locator("#node-taint-add-value").fill("-bad");
  await taints.getByRole("button", { name: "添加" }).click();
  await expect(taints.getByText(taintValueFormat)).toBeVisible();
  await expect(taints.locator("#node-taint-add-value")).toBeFocused();
  await taints.screenshot({ path: path.join(shotDir, "140030-tc007-taint-invalid-value.png") });

  await taints.locator("#node-taint-add-value").fill("gpu");
  await taints.getByRole("button", { name: "添加" }).click();
  await expect(taints.locator(".k8s-taint-tag")).toContainText("dedicated=gpu:NoSchedule");
  await taints.getByRole("button", { name: "取消" }).click();
});
