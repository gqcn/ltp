import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "@/lib/toast";
import {
  createDatacenter,
  deleteDatacenter,
  listDatacenters,
  updateDatacenter,
  type Datacenter,
  type DatacenterUsage,
  type DatacenterWriteInput,
} from "@/api/datacenter";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { ListBody } from "@/components/ListLoading";
import { ColorField } from "@/components/ColorField";
import { FieldError } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { errText, groupClass, invalidProps, LINE_MAX, useZodForm, zDns1123, zLine, zLineOpt, zTextOpt } from "@/lib/form";

type FormState = DatacenterWriteInput & { code: string };
type PendingAction = { type: "delete" | "blocked"; item: Datacenter };

function usageTotal(usage: DatacenterUsage) {
  return usage.nodes + usage.queues + usage.clusters;
}

function formatActionMeta(item: Datacenter) {
  const region = item.region && item.region !== "—" ? item.region : "";
  const usage = `${item.usage.nodes}\u00a0节点 · ${item.usage.queues}\u00a0队列 · ${item.usage.clusters}\u00a0集群`;
  return [item.code, region, usage].filter(Boolean).join(" · ");
}

function deleteBlockedHint(usage: DatacenterUsage) {
  const bits: string[] = [];
  const steps: string[] = [];
  if (usage.nodes) {
    bits.push(`${usage.nodes} 节点`);
    steps.push("解除节点的数据中心标记");
  }
  if (usage.queues) {
    bits.push(`${usage.queues} 队列`);
    steps.push("删除或改挂队列");
  }
  if (usage.clusters) {
    bits.push(`${usage.clusters} 集群`);
    steps.push("从集群覆盖中移除");
  }
  return `当前关联 ${bits.join("、") || "相关资源"}。请先${steps.join("，") || "解除关联"}后再删除。`;
}

const emptyForm: FormState = {
  code: "",
  name: "",
  shortName: "",
  region: "",
  color: "#3b82f6",
  description: "",
};

const dcCodeFormat = "数据中心标识仅支持小写字母、数字与连字符，且不能以连字符开头或结尾";

function datacenterSchema(editing: boolean) {
  return z.object({
    code: editing ? z.string() : zDns1123("请填写数据中心标识", dcCodeFormat),
    name: zLine("请填写显示名称"),
    shortName: zLine("请填写简称"),
    region: zLineOpt(),
    color: z.string(),
    description: zTextOpt(),
  });
}

export function DatacenterPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Datacenter | null>(null);
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const schema = useMemo(() => datacenterSchema(Boolean(editing)), [editing]);
  const form = useZodForm(schema, { defaultValues: emptyForm });
  const values = form.watch();
  const codeError = errText(form.formState.errors, "code");
  const nameError = errText(form.formState.errors, "name");
  const shortError = errText(form.formState.errors, "shortName");
  const regionError = errText(form.formState.errors, "region");
  const descError = errText(form.formState.errors, "description");

  const listQuery = useQuery({
    queryKey: ["datacenters", { page, pageSize }],
    queryFn: () =>
      listDatacenters({
        pageNum: page,
        pageSize,
      }),
  });

  const rows = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ["datacenters"] });
  }

  const createMutation = useMutation({
    mutationFn: (input: FormState) => createDatacenter(input),
    onSuccess: async (_, input) => {
      toast.success(`已创建数据中心 ${input.name}（${input.code}）`);
      setFormOpen(false);
      await invalidate();
    },
    onError: showError,
  });
  const updateMutation = useMutation({
    mutationFn: (input: FormState) => updateDatacenter(editing!.id, input),
    onSuccess: async (_, input) => {
      toast.success(`已保存数据中心 ${input.name}`);
      setFormOpen(false);
      await invalidate();
    },
    onError: showError,
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteDatacenter(pending!.item.id),
    onSuccess: async () => {
      toast.warning(`已删除数据中心 ${pending?.item.name}`);
      setPending(null);
      await invalidate();
    },
    onError: (error) => {
      if (pending?.type === "delete" && error instanceof ApiError && error.errorCode === "DATACENTER_IN_USE") {
        toast.warning("该数据中心仍有关联资源，无法删除");
        setPending({ type: "blocked", item: pending.item });
        return;
      }
      showError(error);
    },
  });

  function showError(error: unknown) {
    const message = error instanceof ApiError ? error.message : "操作失败";
    setFormError(message);
    toast.error(message);
  }

  function openCreate() {
    setEditing(null);
    form.reset(emptyForm);
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(item: Datacenter) {
    setEditing(item);
    form.reset({
      code: item.code,
      name: item.name,
      shortName: item.shortName,
      region: item.region === "—" ? "" : item.region,
      color: item.color,
      description: item.description,
    });
    setFormError("");
    setFormOpen(true);
  }

  const submitForm = form.handleSubmit((input) => {
    setFormError("");
    if (editing) {
      updateMutation.mutate(input);
      return;
    }
    createMutation.mutate(input);
  });

  function confirmPending() {
    if (!pending || pending.type === "blocked") {
      setPending(null);
      return;
    }
    if (pending.type === "delete") {
      deleteMutation.mutate();
    }
  }

  function openDelete(item: Datacenter) {
    setPending({ type: usageTotal(item.usage) > 0 ? "blocked" : "delete", item });
  }

  return (
    <section className="page active">
      <div className="page-header">
        <div>
          <h1>数据中心管理</h1>
          <p className="desc">
            维护数据中心标识与元数据 · 供节点 label、队列额度、集群覆盖等业务关联 · 节点未配置时保持未分配 · 节点 label 约定{" "}
            <span className="mono">maip.io/datacenter</span>
          </p>
        </div>
        <div className="page-actions">
          <Button onClick={openCreate}>+ 新建数据中心</Button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>数据中心列表</h3>
        </div>
        <div className="card-body flush">
          <ListBody
            loading={listQuery.isLoading}
            error={listQuery.isError}
            empty={rows.length === 0}
            loadingLabel="正在加载数据中心…"
            errorLabel="数据中心列表加载失败"
            emptyLabel="暂无数据中心，点击「新建数据中心」添加"
          >
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>数据中心</th>
                      <th>标识</th>
                      <th>区域</th>
                      <th>Label</th>
                      <th>关联</th>
                      <th className="th-actions">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="dc-badge" style={{ ["--dc-color" as string]: item.color }}>
                              {item.shortName}
                            </span>
                            <div>
                              <strong>{item.name}</strong>{" "}
                              {item.description ? (
                                <div className="text-muted" style={{ fontSize: 11.5, marginTop: 2, maxWidth: 220, lineHeight: 1.4 }}>
                                  {item.description}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="mono" style={{ fontWeight: 600, color: "var(--text-0)" }}>
                          {item.code}
                        </td>
                        <td>{item.region || "—"}</td>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {item.label}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          <span title="节点">{item.usage.nodes} 节点</span>
                          <span className="text-muted"> · </span>
                          <span title="队列">{item.usage.queues} 队列</span>
                          <span className="text-muted"> · </span>
                          <span title="集群">{item.usage.clusters} 集群</span>
                        </td>
                        <td className="td-actions">
                          <div className="job-actions">
                            <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>
                              编辑
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              title={usageTotal(item.usage) > 0 ? "已关联节点 / 队列 / 集群，无法删除" : "删除数据中心"}
                              onClick={() => openDelete(item)}
                            >
                              删除
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </>
          </ListBody>
        </div>
      </div>

      <Modal
        open={formOpen}
        title={editing ? "编辑数据中心" : "新建数据中心"}
        confirmText={editing ? "保存" : "创建数据中心"}
        maxWidth={560}
        onClose={() => setFormOpen(false)}
        onConfirm={submitForm}
        confirmDisabled={createMutation.isPending || updateMutation.isPending}
      >
        <p className="modal-lead">
          数据中心标识将作为节点 Label 值（<span className="mono">maip.io/datacenter=&lt;标识&gt;</span>
          ），并被队列、节点、集群等模块引用。创建后标识不可修改。节点未设置数据中心时保持未分配，不会自动归属任何数据中心。
        </p>
        <div className="form-grid">
          <div className={groupClass(codeError)}>
            <div className="field-label-row">
              <label htmlFor="dc-form-id">
                数据中心标识 <span className="req">*</span>
              </label>
              {editing ? <span className="field-lock-hint">创建后不可改</span> : null}
            </div>
            <input
              id="dc-form-id"
              className="mono"
              placeholder="例如 cq-lj、xj-js"
              autoComplete="off"
              maxLength={63}
              readOnly={Boolean(editing)}
              {...form.register("code")}
              {...invalidProps("dc-form-id", codeError)}
            />
            <FieldError id="dc-form-id-error">{codeError}</FieldError>
          </div>
          <div className={groupClass(nameError)}>
            <label htmlFor="dc-form-name">
              显示名称 <span className="req">*</span>
            </label>
            <input
              id="dc-form-name"
              placeholder="例如 重庆两江"
              autoComplete="off"
              maxLength={LINE_MAX}
              {...form.register("name")}
              {...invalidProps("dc-form-name", nameError)}
            />
            <FieldError id="dc-form-name-error">{nameError}</FieldError>
          </div>
          <div className={groupClass(shortError)}>
            <label htmlFor="dc-form-short">
              简称 <span className="req">*</span>
            </label>
            <input
              id="dc-form-short"
              placeholder="例如 两江（列表角标）"
              autoComplete="off"
              maxLength={LINE_MAX}
              {...form.register("shortName")}
              {...invalidProps("dc-form-short", shortError)}
            />
            <FieldError id="dc-form-short-error">{shortError}</FieldError>
          </div>
          <div className={groupClass(regionError)}>
            <label htmlFor="dc-form-region">区域</label>
            <input id="dc-form-region" placeholder="例如 重庆 / 新疆" autoComplete="off" maxLength={LINE_MAX} {...form.register("region")} {...invalidProps("dc-form-region", regionError)} />
            <FieldError id="dc-form-region-error">{regionError}</FieldError>
          </div>
          <div className="form-group">
            <div className="field-label-row">
              <label htmlFor="dc-form-label-key">Label Key</label>
              <span className="field-lock-hint">平台固定，不可修改</span>
            </div>
            <input id="dc-form-label-key" className="mono" value="maip.io/datacenter" readOnly tabIndex={-1} autoComplete="off" />
          </div>
          <div className="form-group">
            <label htmlFor="dc-form-color">展示色</label>
            <ColorField
              key={formOpen ? (editing ? `edit-${editing.id}` : "create") : "closed"}
              id="dc-form-color"
              value={values.color}
              onChange={(color) => form.setValue("color", color, { shouldDirty: true })}
            />
          </div>
          <div className="form-group full">
            <label>Label 预览</label>
            <div
              className="mono text-muted"
              style={{ fontSize: 12.5, padding: "8px 10px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 8 }}
            >
              maip.io/datacenter={values.code || "<标识>"}
            </div>
          </div>
          <div className={groupClass(descError, "full")}>
            <label htmlFor="dc-form-desc">说明</label>
            <textarea
              id="dc-form-desc"
              rows={2}
              placeholder="数据中心用途、网络与存储说明（可选）"
              style={{ minHeight: 64, width: "100%", resize: "vertical" }}
              {...form.register("description")}
              {...invalidProps("dc-form-desc", descError)}
            />
            <FieldError id="dc-form-desc-error">{descError}</FieldError>
          </div>
          {formError ? (
            <div className="form-group full">
              <p className="text-muted" style={{ fontSize: 12.5, color: "var(--danger)", margin: 0 }}>
                {formError}
              </p>
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(pending)}
        title={pending?.type === "blocked" ? "无法删除数据中心" : "确认删除数据中心"}
        confirmText="确认删除"
        confirmVariant="danger"
        confirmHidden={pending?.type === "blocked"}
        cancelText={pending?.type === "blocked" ? "知道了" : "取消"}
        confirmDisabled={deleteMutation.isPending}
        modalClassName="modal-confirm"
        onClose={() => setPending(null)}
        onConfirm={pending?.type === "blocked" ? undefined : confirmPending}
      >
        {pending ? (
          <>
            <p className="modal-msg">
              {pending.type === "blocked" ? (
                <>
                  数据中心 <strong>{pending.item.name}</strong> 仍有关联资源，暂不可删除。
                </>
              ) : (
                <>
                  确定要删除数据中心 <strong>{pending.item.name}</strong> 吗？
                </>
              )}
            </p>
            <p className="modal-meta">{formatActionMeta(pending.item)}</p>
            <p className="modal-hint is-danger">
              {pending.type === "blocked"
                ? deleteBlockedHint(pending.item.usage)
                : "当前无节点、队列或集群引用该数据中心。删除后不可恢复。"}
            </p>
          </>
        ) : null}
      </Modal>
    </section>
  );
}
