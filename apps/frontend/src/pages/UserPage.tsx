import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  addUsersFromLdap,
  listUsers,
  removeUsers,
  searchLdapDirectory,
  updateUserRole,
  updateUserStatus,
  type PlatformUser,
} from "@/api/user";
import { listRoles } from "@/api/role";
import { getLdapConfig } from "@/api/system";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { ListBody } from "@/components/ListLoading";
import { FieldError } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { firstZodMessage, focusField, zRequired } from "@/lib/form";
import { Pagination } from "@/components/Pagination";
import { formatTime } from "@/lib/format";
import { roleMenuLabel } from "@/lib/access";
import { toast } from "@/lib/toast";

type StatusFilter = "all" | "enabled" | "disabled";
type UserAction = "enable" | "disable" | "remove";

export function UserPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [roleCode, setRoleCode] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<number[]>([]);
  const [ldapOpen, setLdapOpen] = useState(false);
  const [ldapKeyword, setLdapKeyword] = useState("");
  const [ldapRole, setLdapRole] = useState("algo");
  const [ldapPicked, setLdapPicked] = useState<string[]>([]);
  const [ldapError, setLdapError] = useState("");
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleTargets, setRoleTargets] = useState<PlatformUser[]>([]);
  const [rolePick, setRolePick] = useState("algo");
  const [pending, setPending] = useState<{ action: UserAction; users: PlatformUser[] } | null>(null);

  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: listRoles });
  const roles = rolesQuery.data?.list ?? [];
  const listQuery = useQuery({
    queryKey: ["users", { keyword, roleCode, status, page, pageSize }],
    queryFn: () =>
      listUsers({
        pageNum: page,
        pageSize,
        keyword: keyword.trim() || undefined,
        roleCode: roleCode === "all" ? undefined : roleCode,
        enabled: status === "all" ? undefined : status === "enabled",
      }),
  });
  const ldapCfgQuery = useQuery({ queryKey: ["ldap-config"], queryFn: getLdapConfig, enabled: ldapOpen });
  const directoryQuery = useQuery({
    queryKey: ["ldap-directory", ldapKeyword],
    queryFn: () => searchLdapDirectory(ldapKeyword.trim()),
    enabled: ldapOpen,
  });

  const rows = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const pageIds = rows.map((row) => row.id);
  const pageAllSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const selectedUsers = useMemo(() => rows.filter((row) => selected.includes(row.id)), [rows, selected]);

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  function showError(error: unknown) {
    toast.error(error instanceof ApiError ? error.message : "操作失败");
  }

  const addMutation = useMutation({
    mutationFn: () => addUsersFromLdap(ldapPicked, ldapRole),
    onSuccess: async (data) => {
      const roleName = roles.find((item) => item.code === ldapRole)?.name || ldapRole;
      toast.success(data.added ? `已添加 ${data.added} 名平台用户（角色：${roleName}）` : "没有新用户被添加");
      setLdapOpen(false);
      setLdapPicked([]);
      await invalidate();
    },
    onError: (error) => {
      setLdapError(error instanceof ApiError ? error.message : "添加失败");
    },
  });
  const statusMutation = useMutation({
    mutationFn: () => updateUserStatus(pending!.users.map((item) => item.id), pending!.action === "enable"),
    onSuccess: async (data) => {
      const first = pending?.users[0];
      if (pending?.action === "enable") {
        toast.success(data.updated > 1 ? `已启用 ${data.updated} 名用户` : `已启用用户 ${first?.nickname}`);
      } else {
        toast.warning(data.updated > 1 ? `已停用 ${data.updated} 名用户` : `已停用用户 ${first?.nickname}`);
      }
      setPending(null);
      setSelected([]);
      await invalidate();
    },
    onError: showError,
  });
  const removeMutation = useMutation({
    mutationFn: () => removeUsers(pending!.users.map((item) => item.id)),
    onSuccess: async (data) => {
      toast.warning(data.removed > 1 ? `已从平台移除 ${data.removed} 名用户` : `已从平台移除用户 ${pending?.users[0]?.nickname}`);
      setPending(null);
      setSelected([]);
      await invalidate();
    },
    onError: showError,
  });
  const roleMutation = useMutation({
    mutationFn: () => updateUserRole(roleTargets.map((item) => item.id), rolePick),
    onSuccess: async (data) => {
      const roleName = roles.find((item) => item.code === rolePick)?.name || rolePick;
      toast.success(data.updated > 1 ? `已将 ${data.updated} 名用户授权为「${roleName}」` : `已将 ${roleTargets[0]?.nickname} 授权为「${roleName}」`);
      setRoleOpen(false);
      setSelected([]);
      await invalidate();
    },
    onError: showError,
  });

  function toggleAll() {
    if (pageAllSelected) {
      setSelected((curr) => curr.filter((id) => !pageIds.includes(id)));
      return;
    }
    setSelected((curr) => [...new Set([...curr, ...pageIds])]);
  }

  function openAction(action: UserAction, users: PlatformUser[]) {
    const applicable = users.filter((item) => {
      if (action === "enable") {
        return !item.enabled;
      }
      if (action === "disable") {
        return item.enabled;
      }
      return true;
    });
    if (!applicable.length) {
      toast.warning(action === "enable" ? "所选用户均已启用，无需再次启用" : action === "disable" ? "所选用户均已停用，无需再次停用" : "没有可移除的用户");
      return;
    }
    setPending({ action, users: applicable });
  }

  function openRole(users: PlatformUser[]) {
    if (!users.length) {
      toast.warning("请先选择用户");
      return;
    }
    const codes = [...new Set(users.map((item) => item.roleCode || "algo"))];
    setRoleTargets(users);
    setRolePick(codes.length === 1 ? codes[0] : "algo");
    setRoleOpen(true);
  }

  const cfg = ldapCfgQuery.data?.config;
  const directory = directoryQuery.data?.list ?? [];
  const ldapRoleHint = roles.find((item) => item.code === ldapRole)?.menus.map(roleMenuLabel).join("、");

  return (
    <section className="page active" id="page-user-mgmt">
      <div className="page-header">
        <div>
          <h1>用户管理</h1>
          <p className="desc">平台可用用户 · 从 LDAP 添加后可登录系统 · 可授权角色 · 支持批量启用 / 停用 / 移除 / 角色授权 · 团队归属在「团队管理」中维护</p>
        </div>
        <div className="page-actions">
          <Button
            onClick={() => {
              setLdapKeyword("");
              setLdapPicked([]);
              setLdapError("");
              setLdapRole(roles[0]?.code || "algo");
              setLdapOpen(true);
            }}
          >
            + 从 LDAP 添加
          </Button>
        </div>
      </div>
      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon">⌕</span>
          <input
            placeholder="搜索姓名 / 账号 / 邮箱 / 部门..."
            value={keyword}
            onChange={(event) => {
              setPage(1);
              setKeyword(event.target.value);
            }}
          />
        </div>
        <select
          className="filter-select"
          value={roleCode}
          onChange={(event) => {
            setPage(1);
            setRoleCode(event.target.value);
          }}
        >
          <option value="all">全部角色</option>
          {roles.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as StatusFilter);
          }}
        >
          <option value="all">全部状态</option>
          <option value="enabled">启用</option>
          <option value="disabled">停用</option>
        </select>
      </div>
      <div className="card">
        {selected.length ? (
          <div className="node-batch-bar">
            <span className="node-batch-count">已选 {selected.length} 人</span>
            <div className="node-batch-actions">
              <Button size="sm" onClick={() => openRole(selectedUsers.length ? selectedUsers : rows.filter((row) => selected.includes(row.id)))}>
                角色授权
              </Button>
              <Button size="sm" variant="secondary" onClick={() => openAction("enable", selectedUsers)}>
                启用
              </Button>
              <Button size="sm" variant="secondary" onClick={() => openAction("disable", selectedUsers)}>
                停用
              </Button>
              <Button size="sm" variant="danger" onClick={() => openAction("remove", selectedUsers)}>
                移除
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                取消选择
              </Button>
            </div>
          </div>
        ) : null}
        <div className="card-body flush">
          <ListBody
            loading={listQuery.isLoading}
            error={listQuery.isError}
            empty={rows.length === 0}
            loadingLabel="正在加载用户…"
            errorLabel="用户列表加载失败"
            emptyLabel="暂无平台用户，请点击「从 LDAP 添加」"
          >
            <>
              <div className="table-wrap">
                <table className="table">
                  <colgroup>
                    <col className="col-check" />
                    <col className="col-user" />
                    <col className="col-account" />
                    <col className="col-email" />
                    <col className="col-dept" />
                    <col className="col-role" />
                    <col className="col-teams" />
                    <col className="col-status" />
                    <col className="col-login" />
                    <col className="col-actions" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="th-check">
                        <input type="checkbox" checked={pageAllSelected} onChange={toggleAll} title="全选当前页" />
                      </th>
                      <th>用户</th>
                      <th>账号</th>
                      <th>邮箱</th>
                      <th>部门 / 职位</th>
                      <th>角色</th>
                      <th>所属团队</th>
                      <th>状态</th>
                      <th className="th-last-login">最近登录</th>
                      <th className="th-actions">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => {
                      const checked = selected.includes(item.id);
                      const lastLogin = item.lastLoginAt ? formatTime(item.lastLoginAt) : "";
                      return (
                        <tr key={item.id} className={checked ? "is-row-selected" : undefined}>
                          <td className="td-check">
                            <input
                              type="checkbox"
                              checked={checked}
                              aria-label={`选择 ${item.nickname}`}
                              onChange={(event) => {
                                setSelected((curr) => (event.target.checked ? [...curr, item.id] : curr.filter((id) => id !== item.id)));
                              }}
                            />
                          </td>
                          <td>
                            <strong>{item.nickname}</strong>
                          </td>
                          <td className="mono">{item.username}</td>
                          <td className="mono" style={{ fontSize: 12 }}>
                            {item.email || "—"}
                          </td>
                          <td>
                            <div style={{ fontSize: 12.5 }}>{item.department || "—"}</div>
                            <div className="text-muted" style={{ fontSize: 11.5 }}>
                              {item.title}
                            </div>
                          </td>
                          <td>
                            <span className={item.roleCode === "sre" ? "badge badge-info" : "badge badge-healthy"}>{item.roleName}</span>
                          </td>
                          <td>
                            {item.teams.length
                              ? item.teams.map((team) => (
                                  <span key={team.id} className="tag" style={{ margin: 2 }}>
                                    {team.name}
                                  </span>
                                ))
                              : <span className="text-muted">未加入团队</span>}
                          </td>
                          <td>{item.enabled ? <span className="badge badge-healthy">启用</span> : <span className="badge badge-cancelled">停用</span>}</td>
                          <td className="mono text-muted td-last-login">
                            {lastLogin ? (
                              <>
                                <div>{lastLogin.slice(0, 10)}</div>
                                <div>{lastLogin.slice(11, 16)}</div>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="td-actions">
                            <div className="job-actions job-actions-stack">
                              <div className="job-actions-row">
                                <Button size="sm" variant="secondary" onClick={() => openRole([item])}>
                                  角色授权
                                </Button>
                                {item.enabled ? (
                                  <Button size="sm" variant="secondary" onClick={() => openAction("disable", [item])}>
                                    停用
                                  </Button>
                                ) : (
                                  <Button size="sm" onClick={() => openAction("enable", [item])}>
                                    启用
                                  </Button>
                                )}
                              </div>
                              <div className="job-actions-row">
                                <Button size="sm" variant="danger" onClick={() => openAction("remove", [item])}>
                                  移除
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
            </>
          </ListBody>
        </div>
      </div>

      <Modal
        open={ldapOpen}
        title="从 LDAP 添加用户"
        maxWidth={640}
        confirmText="添加所选用户"
        confirmDisabled={!ldapPicked.length || addMutation.isPending}
        footerLeft={<span className="text-muted" style={{ fontSize: 12 }}>已选 {ldapPicked.length} 人</span>}
        onClose={() => setLdapOpen(false)}
        onConfirm={() => {
          setLdapError("");
          const picked = z.array(zRequired("请至少勾选一名 LDAP 用户")).min(1, "请至少勾选一名 LDAP 用户").safeParse(ldapPicked);
          if (!picked.success) {
            setLdapError(firstZodMessage(picked.error));
            focusField("ldap-user-search");
            return;
          }
          addMutation.mutate();
        }}
      >
        <p className="modal-lead">
          按当前 LDAP 配置检索公司目录，勾选后加入<strong>平台可用用户</strong>列表，并指定统一角色权限。已在列表中的用户不会重复添加。
        </p>
        <div className="ldap-add-cfg mb-16">
          <div className="ldap-add-cfg-inner">
            <span className="tag">{cfg?.useTls ? "LDAPS" : "LDAP"}</span>
            <span className="mono" style={{ fontSize: 12 }}>
              {cfg?.host}:{cfg?.port}
            </span>
            <span className="text-muted" style={{ fontSize: 12 }}>
              Base {cfg?.baseDn || "—"}
            </span>
            {cfg?.lastTestResult === "success" ? <span className="badge badge-healthy">最近测试成功</span> : <span className="badge badge-warning">建议先测试连接</span>}
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label htmlFor="ldap-user-role">
            角色权限 <span className="req">*</span>
          </label>
          <select id="ldap-user-role" className="filter-select" style={{ width: "100%", maxWidth: "none" }} value={ldapRole} onChange={(event) => setLdapRole(event.target.value)}>
            {roles.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
          <p className="text-muted" style={{ fontSize: 11.5, margin: "6px 0 0", lineHeight: 1.5 }}>
            {ldapRoleHint ? `可见菜单：${ldapRoleHint}` : ""}
          </p>
        </div>
        <div className={ldapError ? "form-group is-invalid" : "form-group"} style={{ marginBottom: 12 }}>
          <label htmlFor="ldap-user-search">检索 LDAP</label>
          <div className="search-box" style={{ maxWidth: "none" }}>
            <span className="search-icon">⌕</span>
            <input
              id="ldap-user-search"
              value={ldapKeyword}
              placeholder="姓名 / 账号 / 邮箱 / 部门..."
              aria-invalid={ldapError ? true : undefined}
              aria-describedby={ldapError ? "ldap-user-search-error" : undefined}
              onChange={(event) => {
                setLdapKeyword(event.target.value);
                setLdapError("");
              }}
            />
          </div>
        </div>
        <div className="ldap-user-results">
          {directory.length === 0 ? (
            <div className="empty-state" style={{ padding: 28 }}>
              未检索到匹配的 LDAP 用户
            </div>
          ) : (
            directory.map((item) => (
              <label key={item.username} className={`ldap-user-row${item.alreadyAdded ? " is-added" : ""}${ldapPicked.includes(item.username) ? " is-checked" : ""}`}>
                <input
                  type="checkbox"
                  disabled={item.alreadyAdded}
                  checked={!item.alreadyAdded && ldapPicked.includes(item.username)}
                  onChange={(event) => {
                    setLdapPicked((curr) => (event.target.checked ? [...curr, item.username] : curr.filter((name) => name !== item.username)));
                  }}
                />
                <span className="ldap-user-meta">
                  <strong>{item.name}</strong>
                  <span className="mono text-muted" style={{ fontSize: 11.5 }}>
                    {item.username}
                  </span>
                  <span className="text-muted" style={{ fontSize: 11.5 }}>
                    {item.email}
                  </span>
                  <span className="text-muted" style={{ fontSize: 11.5, display: "block" }}>
                    {item.department} · {item.title}
                  </span>
                </span>
                {item.alreadyAdded ? <span className="badge badge-info">已在平台</span> : null}
              </label>
            ))
          )}
        </div>
        <FieldError id="ldap-user-search-error">{ldapError}</FieldError>
      </Modal>

      <Modal open={roleOpen} title={roleTargets.length > 1 ? "批量角色授权" : "角色授权"} modalClassName="modal-user-role" confirmText={roleTargets.length > 1 ? `保存授权（${roleTargets.length} 人）` : "保存授权"} onClose={() => setRoleOpen(false)} onConfirm={() => roleMutation.mutate()}>
        <p className="modal-lead text-muted">为用户指定平台角色，决定登录后可见的侧栏菜单范围。</p>
        <div className="user-role-target">
          <div className="user-role-target-avatar">{roleTargets.length > 1 ? roleTargets.length : (roleTargets[0]?.nickname || "?").slice(0, 1)}</div>
          <div className="user-role-target-meta">
            <div className="user-role-target-name">{roleTargets.length > 1 ? `已选 ${roleTargets.length} 人` : roleTargets[0]?.nickname}</div>
            <div className="user-role-target-sub">{roleTargets.length === 1 ? `${roleTargets[0]?.username} · ${roleTargets[0]?.email}` : roleTargets.map((item) => item.nickname).slice(0, 6).join("、")}</div>
          </div>
        </div>
        <div className="form-group user-role-pick-group">
          <label className="user-role-pick-label">
            选择角色 <span className="req">*</span>
          </label>
          <div className="role-option-list" role="radiogroup">
            {roles.map((item) => (
              <label key={item.code} className={rolePick === item.code ? "role-option is-selected" : "role-option"}>
                <span className="role-option-radio" aria-hidden="true" />
                <input type="radio" name="user-role-pick" value={item.code} checked={rolePick === item.code} onChange={() => setRolePick(item.code)} />
                <span className="role-option-body">
                  <span className="role-option-head">
                    <span className="role-option-title">{item.name}</span>
                  </span>
                  <span className="role-option-desc">{item.description}</span>
                  <span className="role-option-menus">
                    <span className="role-option-menus-label">菜单权限</span>
                    <span className="role-option-menus-chips">
                      {item.menus.map((menu) => (
                        <span key={menu} className="role-menu-chip">
                          {roleMenuLabel(menu)}
                        </span>
                      ))}
                    </span>
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(pending)}
        title={pending?.action === "enable" ? (pending.users.length > 1 ? "确认批量启用" : "确认启用用户") : pending?.action === "disable" ? (pending.users.length > 1 ? "确认批量停用" : "确认停用用户") : pending && pending.users.length > 1 ? "确认批量移除" : "确认移除用户"}
        confirmVariant={pending?.action === "enable" ? "primary" : "danger"}
        confirmText={pending?.action === "enable" ? "确认启用" : pending?.action === "disable" ? "确认停用" : "确认移除"}
        modalClassName="modal-user-action"
        onClose={() => setPending(null)}
        onConfirm={() => (pending?.action === "remove" ? removeMutation.mutate() : statusMutation.mutate())}
      >
        <p className="user-action-msg">
          {pending?.action === "enable"
            ? pending.users.length > 1
              ? `确定要启用选中的 ${pending.users.length} 名用户吗？`
              : `确定要启用用户 ${pending?.users[0]?.nickname} 吗？`
            : pending?.action === "disable"
              ? pending.users.length > 1
                ? `确定要停用选中的 ${pending.users.length} 名用户吗？`
                : `确定要停用用户 ${pending?.users[0]?.nickname} 吗？`
              : pending && pending.users.length > 1
                ? `确定要从平台移除选中的 ${pending.users.length} 名用户吗？`
                : `确定要从平台移除用户 ${pending?.users[0]?.nickname} 吗？`}
        </p>
        <p className={`user-action-hint ${pending?.action === "enable" ? "is-success" : pending?.action === "remove" ? "is-danger" : "is-warning"}`}>
          {pending?.action === "enable"
            ? "启用后用户可使用 LDAP 账号登录，并继续使用已授权的团队资源。"
            : pending?.action === "disable"
              ? "停用后用户将无法登录训练平台，已加入的团队关系会保留。可随时重新启用。"
              : "移除后用户将从平台可用列表删除，并同步移出各团队成员。此操作可再次从 LDAP 添加。"}
        </p>
      </Modal>
    </section>
  );
}
