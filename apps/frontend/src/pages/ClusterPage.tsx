import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { createCluster, deleteCluster, listClusters, probeCluster, updateCluster, type Cluster } from "@/api/cluster";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { ListBody } from "@/components/ListLoading";
import { FieldError } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { errText, groupClass, invalidProps, LINE_MAX, useZodForm, zLine, zRequired, zTextOpt } from "@/lib/form";
import { DcBadge, UsageCell } from "@/components/UsageCell";
import { formatTime } from "@/lib/format";
import { bytesToGi, milliToCores, shortGpuType } from "@/lib/resources";
import { toast } from "@/lib/toast";
import { useWorkingCluster } from "@/lib/useWorkingCluster";

type FormState = { displayName: string; description: string; kubeconfig: string };

const emptyForm: FormState = { displayName: "", description: "", kubeconfig: "" };

function clusterSchema(editing: boolean) {
  return z.object({
    displayName: zLine("请填写显示名称"),
    description: zTextOpt(),
    kubeconfig: editing ? z.string() : zRequired("请填写 Kubeconfig"),
  });
}

export function ClusterPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { clusterId: workingClusterId } = useWorkingCluster();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Cluster | null>(null);
  const [formError, setFormError] = useState("");
  const schema = useMemo(() => clusterSchema(Boolean(editing)), [editing]);
  const form = useZodForm(schema, { defaultValues: emptyForm });
  const displayError = errText(form.formState.errors, "displayName");
  const descError = errText(form.formState.errors, "description");
  const kubeError = errText(form.formState.errors, "kubeconfig");
  const [detail, setDetail] = useState<Cluster | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Cluster | null>(null);

  const listQuery = useQuery({
    queryKey: ["clusters", { page, pageSize }],
    queryFn: () => listClusters({ pageNum: page, pageSize }),
  });
  const rows = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const kpis = listQuery.data?.summary ?? { total: 0, healthy: 0, readyNodes: 0, totalNodes: 0, gpuTotal: 0 };

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ["clusters"] });
  }
  function showError(error: unknown) {
    const message = error instanceof ApiError ? error.message : "操作失败";
    setFormError(message);
    toast.error(message);
  }

  const createMutation = useMutation({
    mutationFn: (input: FormState) => createCluster(input),
    onSuccess: async (_, input) => {
      toast.success(`已接入集群 ${input.displayName}`);
      setFormOpen(false);
      await invalidate();
    },
    onError: showError,
  });
  const updateMutation = useMutation({
    mutationFn: (input: FormState) => updateCluster(editing!.id, input),
    onSuccess: async (_, input) => {
      toast.success(`已保存集群 ${input.displayName}`);
      setFormOpen(false);
      await invalidate();
    },
    onError: showError,
  });
  const probeMutation = useMutation({
    mutationFn: (id: number) => probeCluster(id),
    onSuccess: async (data, id) => {
      const row = rows.find((item) => item.id === id);
      toast.success(`连通正常：${row?.displayName ?? ""} · ${data.version}`);
      await invalidate();
    },
    onError: showError,
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteCluster(pendingDelete!.id),
    onSuccess: async () => {
      toast.warning(`已删除集群 ${pendingDelete?.displayName}`);
      setPendingDelete(null);
      await invalidate();
    },
    onError: showError,
  });

  function openCreate() {
    setEditing(null);
    form.reset(emptyForm);
    setFormError("");
    setFormOpen(true);
  }
  function openEdit(item: Cluster) {
    setEditing(item);
    form.reset({ displayName: item.displayName, description: item.description, kubeconfig: "" });
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

  return (
    <section className="page active">
      <div className="page-header">
        <div>
          <h1>集群管理</h1>
          <p className="desc">接入与管理 Kubernetes 训练集群 · 多集群对等接入 · 优先单集群多数据中心</p>
        </div>
        <div className="page-actions">
          <Button onClick={openCreate}>+ 接入集群</Button>
        </div>
      </div>

      <div className="stats-grid stats-grid-4 fault-kpi-row">
        <div className="stat-card" style={{ ["--stat-color" as string]: "var(--primary)" }}>
          <div className="stat-label">接入集群</div>
          <div className="stat-value">{kpis.total}</div>
        </div>
        <div className="stat-card" style={{ ["--stat-color" as string]: "var(--success)" }}>
          <div className="stat-label">健康</div>
          <div className="stat-value text-success">{kpis.healthy}</div>
        </div>
        <div className="stat-card" style={{ ["--stat-color" as string]: "var(--accent)" }}>
          <div className="stat-label">Ready / 节点</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {kpis.readyNodes}
            <span className="stat-value-unit"> / {kpis.totalNodes}</span>
          </div>
        </div>
        <div className="stat-card" style={{ ["--stat-color" as string]: "var(--purple)" }}>
          <div className="stat-label">GPU 总量</div>
          <div className="stat-value">{kpis.gpuTotal}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>集群列表</h3>
          <span className="text-muted cluster-list-hint" style={{ fontSize: 12 }}>
            {rows.length ? `${total} 个集群 · GPU / CPU / 内存为当前实际使用量，非队列已分配额度` : "Kubeconfig 接入"}
          </span>
        </div>
        <div className="card-body flush">
          <ListBody
            loading={listQuery.isLoading}
            error={listQuery.isError}
            empty={rows.length === 0}
            loadingLabel="正在加载集群…"
            errorLabel="集群列表加载失败"
            emptyLabel="暂无接入集群，点击「接入集群」添加"
          >
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>集群</th>
                      <th>状态</th>
                      <th>版本</th>
                      <th>数据中心</th>
                      <th>Ready / 节点</th>
                      <th title="当前实际使用量 / 物理总量，非队列已分配额度">GPU</th>
                      <th title="当前实际使用量 / 物理总量，非队列已分配额度">CPU</th>
                      <th title="当前实际使用量 / 物理总量，非队列已分配额度">内存</th>
                      <th className="th-actions">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <button type="button" className="cluster-name-link" onClick={() => setDetail(item)}>
                            {item.displayName}
                          </button>
                          {item.description ? (
                            <div className="text-muted" style={{ fontSize: 11.5, marginTop: 4, maxWidth: 280, lineHeight: 1.4 }}>
                              {item.description}
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <span className={item.status === "healthy" ? "badge badge-healthy" : item.status === "offline" ? "badge badge-danger" : "badge badge-muted"}>
                            {item.status === "healthy" ? "健康" : item.status === "offline" ? "离线" : "未知"}
                          </span>
                        </td>
                        <td className="mono">{item.version || "—"}</td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {item.datacenters.length
                              ? item.datacenters.map((dc) => <DcBadge key={dc.code} code={dc.code} name={dc.name} shortName={dc.shortName} color={dc.color} />)
                              : "—"}
                          </div>
                        </td>
                        <td className="mono">
                          {item.nodesReady} / {item.nodesTotal}
                        </td>
                        <td className="td-cls-gpu">
                          <ClusterGpuCell item={item} />
                        </td>
                        <td className="td-cls-res">
                          <UsageCell used={item.cpu.total ? milliToCores(item.cpu.used) : null} total={milliToCores(item.cpu.total)} unit="核" label="CPU" />
                        </td>
                        <td className="td-cls-res">
                          <ClusterMemCell item={item} />
                        </td>
                        <td className="td-actions">
                          <div className="job-actions job-actions-stack">
                            <div className="job-actions-row">
                              <Button size="sm" variant="secondary" onClick={() => probeMutation.mutate(item.id)}>
                                连通测试
                              </Button>
                            </div>
                            <div className="job-actions-row">
                              <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>
                                编辑
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => setPendingDelete(item)}>
                                删除
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
            </>
          </ListBody>
        </div>
      </div>

      <Modal
        open={formOpen}
        title={editing ? "编辑集群" : "接入集群"}
        confirmText={editing ? "保存" : "接入集群"}
        maxWidth={560}
        onClose={() => setFormOpen(false)}
        onConfirm={submitForm}
        confirmDisabled={createMutation.isPending || updateMutation.isPending}
      >
        <p className="modal-lead">
          通过 Kubeconfig 接入 Kubernetes 集群。API Server 地址与 Kubernetes 版本在连通后自动识别。多集群对等接入，无主/次角色；优先以单集群覆盖多数据中心。
        </p>
        <div className="form-grid">
          <div className={groupClass(displayError, "full")}>
            <label htmlFor="cls-form-display">
              显示名称 <span className="req">*</span>
            </label>
            <input
              id="cls-form-display"
              placeholder="例如 训练集群 · 重庆"
              maxLength={LINE_MAX}
              {...form.register("displayName")}
              {...invalidProps("cls-form-display", displayError)}
            />
            <FieldError id="cls-form-display-error">{displayError}</FieldError>
          </div>
          <div className={groupClass(descError, "full")}>
            <label htmlFor="cls-form-desc">说明</label>
            <textarea id="cls-form-desc" rows={2} placeholder="集群用途、数据中心覆盖等（可选）" style={{ minHeight: 64, width: "100%", resize: "vertical" }} {...form.register("description")} {...invalidProps("cls-form-desc", descError)} />
            <FieldError id="cls-form-desc-error">{descError}</FieldError>
          </div>
          <div className={groupClass(kubeError, "full")}>
            <label htmlFor="cls-form-kubeconfig">
              Kubeconfig {editing ? "" : <span className="req">*</span>}
            </label>
            <textarea
              id="cls-form-kubeconfig"
              rows={8}
              className="mono cls-form-kubeconfig"
              placeholder={editing ? "留空沿用已保存凭证，或粘贴新的 kubeconfig YAML 覆盖" : "粘贴完整 kubeconfig YAML…"}
              {...form.register("kubeconfig")}
              {...invalidProps("cls-form-kubeconfig", kubeError)}
            />
            <FieldError id="cls-form-kubeconfig-error">{kubeError}</FieldError>
            <p className="hint" id="cls-form-kubeconfig-hint">
              {editing
                ? "留空则沿用已保存的 Kubeconfig；重新粘贴将覆盖。连通后自动识别 API Server 与 Kubernetes 版本。"
                : "仅支持 Kubeconfig 接入。连通成功后自动识别 API Server 与 Kubernetes 版本。"}
            </p>
          </div>
          {formError ? (
            <div className="form-group full">
              <p role="alert" style={{ fontSize: 12.5, color: "var(--danger)", margin: 0 }}>
                {formError}
              </p>
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(detail)}
        title={detail?.displayName || "集群详情"}
        maxWidth={640}
        confirmText="查看节点"
        cancelText="关闭"
        onClose={() => setDetail(null)}
        onConfirm={() => {
          setDetail(null);
          navigate("/ops/nodes");
        }}
      >
        {detail ? (
          <div className="kv-grid">
            <div className="kv-item">
              <span className="k">状态</span>
              <span className="v">
                <span className={detail.status === "healthy" ? "badge badge-healthy" : detail.status === "offline" ? "badge badge-danger" : "badge badge-muted"}>
                  {detail.status === "healthy" ? "健康" : detail.status === "offline" ? "离线" : "未知"}
                </span>
              </span>
            </div>
            <div className="kv-item">
              <span className="k">K8s 版本</span>
              <span className="v mono">{detail.version || "—"}</span>
            </div>
            <div className="kv-item full">
              <span className="k">API Server</span>
              <span className="v mono" style={{ wordBreak: "break-all" }}>
                {detail.apiServer || "—"}
              </span>
            </div>
            <div className="kv-item">
              <span className="k">数据中心</span>
              <span className="v" style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {detail.datacenters.length
                  ? detail.datacenters.map((dc) => <DcBadge key={dc.code} code={dc.code} name={dc.name} shortName={dc.shortName} color={dc.color} />)
                  : "—"}
              </span>
            </div>
            <div className="kv-item">
              <span className="k">Ready / 节点</span>
              <span className="v mono">
                {detail.nodesReady} / {detail.nodesTotal}
              </span>
            </div>
            <div className="kv-item">
              <span className="k">创建时间</span>
              <span className="v mono">{formatTime(detail.createdAt)}</span>
            </div>
            <div className="kv-item full">
              <span className="k">GPU</span>
              <span className="v">
                <ClusterGpuCell item={detail} />
              </span>
            </div>
            <div className="kv-item">
              <span className="k">CPU</span>
              <span className="v">
                <UsageCell used={detail.cpu.total ? milliToCores(detail.cpu.used) : null} total={milliToCores(detail.cpu.total)} unit="核" label="CPU" />
              </span>
            </div>
            <div className="kv-item">
              <span className="k">内存</span>
              <span className="v">
                <ClusterMemCell item={detail} />
              </span>
            </div>
            {detail.description ? (
              <div className="kv-item full">
                <span className="k">说明</span>
                <span className="v">{detail.description}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(pendingDelete)}
        title="确认删除集群"
        confirmText="确认删除"
        confirmVariant="danger"
        modalClassName="modal-confirm"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => deleteMutation.mutate()}
      >
        <p className="modal-msg">
          确定要删除集群 <strong>{pendingDelete?.displayName}</strong> 吗？
        </p>
        <p className="modal-hint is-danger">
          {clusterDeleteHint(pendingDelete, workingClusterId)}
        </p>
      </Modal>
    </section>
  );
}

function clusterDeleteHint(item: Cluster | null, workingClusterId: number | null) {
  const bits = ["删除后将断开与该 Kubernetes 集群的连接，此操作不可撤销。"];
  if (item?.nodesTotal) {
    bits.push(`所属 ${item.nodesTotal} 台节点将从节点管理中移除。`);
  }
  if (item && workingClusterId === item.id) {
    bits.push("该集群为当前工作集群，删除后将自动切换到其余接入集群。");
  }
  return bits.join("");
}

function ClusterGpuCell({ item }: { item: Cluster }) {
  const types = (item.gpuByType || []).filter((g) => g.total && g.type);
  if (!types.length) {
    return <UsageCell used={item.gpu.total ? item.gpu.used : null} total={item.gpu.total} label="GPU" />;
  }
  return (
    <div className="cls-gpu-type-list">
      {types.map((g) => (
        <div key={g.type} className="cls-gpu-type-row" title={`${g.type} ${g.used}/${g.total}`}>
          <span className="cls-gpu-type-name">{shortGpuType(g.type)}</span>
          <UsageCell used={g.used} total={g.total} label={shortGpuType(g.type)} />
        </div>
      ))}
    </div>
  );
}

function ClusterMemCell({ item }: { item: Cluster }) {
  const usedGi = bytesToGi(item.memory.used);
  const totalGi = bytesToGi(item.memory.total);
  if (!totalGi) {
    return <UsageCell used={null} total={0} label="内存" />;
  }
  if (totalGi >= 1024) {
    return <UsageCell used={Math.round((usedGi / 1024) * 10) / 10} total={Math.round((totalGi / 1024) * 10) / 10} unit="TiB" label="内存" />;
  }
  const used = totalGi >= 10 ? Math.round(usedGi) : Math.round(usedGi * 10) / 10;
  const total = totalGi >= 10 ? Math.round(totalGi) : Math.round(totalGi * 10) / 10;
  return <UsageCell used={used} total={total} unit="GiB" label="内存" />;
}
