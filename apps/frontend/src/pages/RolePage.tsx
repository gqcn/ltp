import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listRoles, renameRole } from "@/api/role";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { formatTime } from "@/lib/format";
import { roleMenuLabel } from "@/lib/access";
import { toast } from "@/lib/toast";

export function RolePage() {
  const queryClient = useQueryClient();
  const [renameId, setRenameId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const query = useQuery({ queryKey: ["roles"], queryFn: listRoles });
  const roles = query.data?.list ?? [];
  const current = roles.find((item) => item.id === renameId);

  const mutation = useMutation({
    mutationFn: () => renameRole(renameId!, name.trim()),
    onSuccess: async () => {
      toast.success(current && current.name !== name.trim() ? `角色已改名：${current.name} → ${name.trim()}` : "角色名称未变更");
      setRenameId(null);
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "保存失败");
    },
  });

  return (
    <section className="page active">
      <div className="page-header">
        <div>
          <h1>角色管理</h1>
          <p className="desc">平台内置角色 · 可改名 · 权限范围决定用户侧栏可见菜单</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body flush">
          {query.isError ? (
            <div className="empty-state">角色列表加载失败</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>角色名称</th>
                    <th>说明</th>
                    <th>菜单权限</th>
                    <th>用户数</th>
                    <th>最近更新</th>
                    <th className="th-actions">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        {item.builtin ? <span className="badge badge-info" style={{ marginLeft: 6 }}>内置</span> : null}
                      </td>
                      <td className="text-muted" style={{ fontSize: 12.5 }}>
                        {item.description || "—"}
                      </td>
                      <td>
                        {item.menus.map((menu) => (
                          <span key={menu} className="tag" style={{ margin: 2 }}>
                            {roleMenuLabel(menu)}
                          </span>
                        ))}
                      </td>
                      <td className="mono">{item.userCount}</td>
                      <td>
                        <div className="mono text-muted" style={{ fontSize: 12 }}>
                          {item.updatedAt ? formatTime(item.updatedAt) : "—"}
                        </div>
                        <div className="text-muted" style={{ fontSize: 11.5 }}>
                          {item.updatedBy}
                        </div>
                      </td>
                      <td className="td-actions">
                        <div className="job-actions">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setRenameId(item.id);
                              setName(item.name);
                              setError("");
                            }}
                          >
                            编辑
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="text-muted" style={{ padding: "10px 16px", fontSize: 12, lineHeight: 1.55 }}>
            共 {roles.length} 个角色 · 算法工程师仅可见「训练中心」；SRE工程师可见「训练中心」与「运维中心」· 平台中心仅平台管理员可访问 · 角色权限范围固定，支持改名
          </div>
        </div>
      </div>
      <Modal
        open={renameId !== null}
        title="角色改名"
        maxWidth={440}
        confirmText="保存"
        onClose={() => setRenameId(null)}
        onConfirm={() => {
          setError("");
          if (!name.trim()) {
            setError("请输入角色名称");
            return;
          }
          mutation.mutate();
        }}
      >
        <p className="modal-lead">修改角色显示名称，不影响已分配用户的权限范围。</p>
        <div className="form-group">
          <label htmlFor="role-rename-name">
            角色名称 <span className="req">*</span>
          </label>
          <input id="role-rename-name" maxLength={32} value={name} placeholder="例如 算法工程师" onChange={(event) => setName(event.target.value)} />
        </div>
        {error ? (
          <div className="login-error" style={{ marginTop: 4 }} role="alert">
            {error}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
