import { useForm, type FieldErrors, type FieldValues, type UseFormProps, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "./cn";

const dns1123 = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const dns1123Subdomain = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;
const k8sQualifiedName = /^[A-Za-z0-9]([-A-Za-z0-9_.]*[A-Za-z0-9])?$/;

export const LINE_MAX = 64;
export const TEXT_MAX = 256;
export const K8S_DNS1123_SUBDOMAIN_MAX = 253;
export const K8S_QNAME_MAX = 63;
export const K8S_LABEL_VALUE_MAX = 63;
export const K8S_QUALIFIED_NAME_MAX = K8S_DNS1123_SUBDOMAIN_MAX + 1 + K8S_QNAME_MAX;
export const K8S_TAINT_EFFECTS = ["NoSchedule", "PreferNoSchedule", "NoExecute"] as const;

const lineTooLong = `最长 ${LINE_MAX} 个字符`;
const textTooLong = `最长 ${TEXT_MAX} 个字符`;

export function zRequired(message: string) {
  return z.string().trim().min(1, message);
}

export function zLine(requiredMessage: string) {
  return z.string().trim().min(1, requiredMessage).max(LINE_MAX, lineTooLong);
}

export function zLineOpt() {
  return z.string().trim().max(LINE_MAX, lineTooLong);
}

export function zText(requiredMessage: string) {
  return z.string().trim().min(1, requiredMessage).max(TEXT_MAX, textTooLong);
}

export function zTextOpt() {
  return z.string().trim().max(TEXT_MAX, textTooLong);
}

export function zDns1123(blank: string, format: string) {
  return z.string().trim().min(1, blank).max(63, format).regex(dns1123, format);
}

export function zVolcanoQueueName() {
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const message = volcanoK8sNameError(value, "请填写队列标识", "队列标识", ["root", "default"]);
      if (message) {
        ctx.addIssue({ code: "custom", message });
      }
    });
}

export function zVolcanoJobName() {
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const message = volcanoK8sNameError(value, "请填写任务名称", "任务名称");
      if (message) {
        ctx.addIssue({ code: "custom", message });
      }
    });
}

export function volcanoK8sNameError(raw: string, blank: string, field: string, reserved: string[] = []) {
  const value = raw.trim();
  if (!value) {
    return blank;
  }
  if (value !== value.toLowerCase()) {
    return `${field}须符合 Kubernetes DNS-1123 子域：小写字母、数字、连字符与点，且不能以连字符或点开头或结尾`;
  }
  if (reserved.includes(value)) {
    return `${field}不能使用 ${reserved.join(" 或 ")}`;
  }
  if (value.length > K8S_QNAME_MAX) {
    return `${field}最长 ${K8S_QNAME_MAX} 个字符`;
  }
  if (!dns1123Subdomain.test(value)) {
    return `${field}须符合 Kubernetes DNS-1123 子域：小写字母、数字、连字符与点，且不能以连字符或点开头或结尾`;
  }
  return undefined;
}

export function zK8sQualifiedName(blank: string, field: string) {
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const message = k8sQualifiedNameError(value, blank, field);
      if (message) {
        ctx.addIssue({ code: "custom", message });
      }
    });
}

export function zK8sLabelValue(field: string) {
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const message = k8sLabelValueError(value, field);
      if (message) {
        ctx.addIssue({ code: "custom", message });
      }
    });
}

export function zK8sTaintEffect() {
  return z.string().trim().refine((value) => (K8S_TAINT_EFFECTS as readonly string[]).includes(value), "污点 effect 仅支持 NoSchedule、PreferNoSchedule、NoExecute");
}

export function k8sQualifiedNameError(raw: string, blank: string, field: string) {
  const value = raw.trim();
  if (!value) {
    return blank;
  }
  const parts = value.split("/");
  if (parts.length > 2) {
    return `${field} 最多包含一个斜杠（可选 DNS 子域前缀/名称）`;
  }
  if (parts.length === 2) {
    const prefix = parts[0];
    const name = parts[1];
    if (!prefix) {
      return `${field} 前缀不能为空`;
    }
    if (prefix.length > K8S_DNS1123_SUBDOMAIN_MAX) {
      return `${field} 前缀最长 ${K8S_DNS1123_SUBDOMAIN_MAX} 个字符`;
    }
    if (!dns1123Subdomain.test(prefix)) {
      return `${field} 前缀必须是小写 DNS 子域（字母、数字、连字符与点）`;
    }
    return k8sQnamePartError(name, `${field} 名称`);
  }
  return k8sQnamePartError(value, `${field} 名称`);
}

export function k8sLabelValueError(raw: string, field: string) {
  const value = raw.trim();
  if (value.length > K8S_LABEL_VALUE_MAX) {
    return `${field} 最长 ${K8S_LABEL_VALUE_MAX} 个字符`;
  }
  if (value && !k8sQualifiedName.test(value)) {
    return `${field} 须为空，或由字母、数字开头和结尾，中间可含 -、_ 或 .`;
  }
  return undefined;
}

function k8sQnamePartError(name: string, part: string) {
  if (!name) {
    return `${part}不能为空`;
  }
  if (name.length > K8S_QNAME_MAX) {
    return `${part}最长 ${K8S_QNAME_MAX} 个字符`;
  }
  if (!k8sQualifiedName.test(name)) {
    return `${part}须由字母或数字开头和结尾，中间可含 -、_ 或 .`;
  }
  return undefined;
}

export function zNonNegative(message: string) {
  return z.coerce.number({ error: message }).min(0, message);
}

export function useZodForm<TValues extends FieldValues>(schema: z.ZodType, options?: Omit<UseFormProps<TValues>, "resolver">): UseFormReturn<TValues> {
  return useForm<TValues>({
    resolver: zodResolver(schema as never) as never,
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
    ...options,
  });
}

export function errText(errors: FieldErrors, name: string) {
  const message = errors[name]?.message;
  return typeof message === "string" ? message : undefined;
}

export function groupClass(error?: string, extra?: string) {
  return cn("form-group", extra, error && "is-invalid");
}

export function invalidProps(id: string, error?: string) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
}

export function firstZodMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "";
}

export function focusField(id: string) {
  const run = () => {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLElement)) {
      return;
    }
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const target = isTextControl(el)
      ? el
      : el.querySelector<HTMLElement>(
          "input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled]), .cm-content[contenteditable='true']",
        );
    if (!(target instanceof HTMLElement) || isDisabledControl(target)) {
      return;
    }
    target.focus({ preventScroll: true });
  };
  window.requestAnimationFrame(run);
}

function isTextControl(el: HTMLElement) {
  return el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement || el.isContentEditable;
}

function isDisabledControl(el: HTMLElement) {
  return "disabled" in el && Boolean((el as HTMLInputElement).disabled);
}
