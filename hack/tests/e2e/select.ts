import { expect, type Locator, type Page } from "@playwright/test";

function selectRoot(control: Locator) {
  return control.locator("xpath=ancestor-or-self::div[contains(concat(' ', normalize-space(@class), ' '), ' ltp-select ')][1]");
}

export async function selectedSelectValue(control: Locator) {
  const hosted = control.locator("xpath=ancestor-or-self::*[@data-value][1]");
  if (await hosted.count()) {
    return (await hosted.getAttribute("data-value")) ?? "";
  }
  const nested = control.locator("[data-value]").first();
  if (await nested.count()) {
    return (await nested.getAttribute("data-value")) ?? "";
  }
  return "";
}

export async function chooseSelect(control: Locator, choice: string | { label?: string; value?: string; index?: number }) {
  const page = control.page();
  await selectRoot(control).click();
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();
  if (typeof choice === "string") {
    const byValue = listbox.locator(`[data-value="${choice}"]`);
    if (await byValue.count()) {
      await byValue.click();
      return;
    }
    await listbox.getByRole("option", { name: choice, exact: true }).click();
    return;
  }
  if (choice.value !== undefined) {
    await listbox.locator(`[data-value="${choice.value}"]`).click();
    return;
  }
  if (choice.label) {
    await listbox.getByRole("option", { name: choice.label, exact: true }).click();
    return;
  }
  await listbox.getByRole("option").nth(choice.index ?? 0).click();
}

export async function listSelectOptions(control: Locator) {
  const page = control.page();
  await selectRoot(control).click();
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();
  const options = await listbox.getByRole("option").evaluateAll((els) =>
    els.map((el) => ({
      value: el.querySelector("[data-value]")?.getAttribute("data-value") || el.getAttribute("data-value") || "",
      text: (el.textContent || "").trim(),
    })),
  );
  await page.keyboard.press("Escape");
  return options;
}

export async function filterSelect(control: Locator, keyword: string) {
  const root = selectRoot(control);
  await root.click();
  await root.locator("input").fill(keyword);
}

export async function ensureWorkingCluster(page: Page, clusterId: string | number) {
  const control = page.getByLabel("工作集群");
  if (!(await control.count())) {
    return;
  }
  if ((await selectedSelectValue(control)) === String(clusterId)) {
    return;
  }
  await chooseSelect(control, String(clusterId));
  const confirm = page.getByRole("button", { name: "确认切换并刷新" });
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click();
  }
}

export async function ensureWorkingClusterByText(page: Page, includes: string) {
  const control = page.getByLabel("工作集群");
  if (!(await control.count())) {
    return;
  }
  const options = await listSelectOptions(control);
  const match = options.find((item) => item.text.includes(includes)) ?? options.find((item) => item.value && item.value !== "0");
  if (!match?.value) {
    return;
  }
  await ensureWorkingCluster(page, match.value);
}
