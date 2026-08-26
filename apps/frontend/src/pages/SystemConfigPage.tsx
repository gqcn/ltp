import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLdapConfig, saveLdapConfig, testLdapConfig, type LdapForm } from "@/api/system";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { toast } from "@/lib/toast";

const emptyForm: LdapForm = {
  name: "",
  host: "",
  port: 1389,
  useTls: false,
  baseDn: "",
  bindDn: "",
  bindPassword: "",
  userFilter: "",
  searchFilter: "",
  attrUsername: "uid",
  attrName: "cn",
  attrEmail: "mail",
  attrDepartment: "ou",
  attrTitle: "title",
  timeoutSec: 10,
};

export function SystemConfigPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<LdapForm>(emptyForm);
  const query = useQuery({ queryKey: ["ldap-config"], queryFn: getLdapConfig });

  useEffect(() => {
    const cfg = query.data?.config;
    if (!cfg) {
      return;
    }
    setForm({
      name: cfg.name,
      host: cfg.host,
      port: cfg.port,
      useTls: cfg.useTls,
      baseDn: cfg.baseDn,
      bindDn: cfg.bindDn,
      bindPassword: "",
      userFilter: cfg.userFilter,
      searchFilter: cfg.searchFilter,
      attrUsername: cfg.attrUsername,
      attrName: cfg.attrName,
      attrEmail: cfg.attrEmail,
      attrDepartment: cfg.attrDepartment,
      attrTitle: cfg.attrTitle,
      timeoutSec: cfg.timeoutSec,
    });
  }, [query.data]);

  function patch<K extends keyof LdapForm>(key: K, value: LdapForm[K]) {
    setForm((curr) => ({ ...curr, [key]: value }));
  }

  const saveMutation = useMutation({
    mutationFn: () => saveLdapConfig(form),
    onSuccess: async () => {
      toast.success("LDAP 配置已保存");
      await queryClient.invalidateQueries({ queryKey: ["ldap-config"] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "保存失败");
    },
  });
  const testMutation = useMutation({
    mutationFn: () => testLdapConfig(form),
    onSuccess: async (data) => {
      toast[data.ok ? "success" : "error"](data.message || (data.ok ? "LDAP 连接测试成功" : "LDAP 连接测试失败"));
      await queryClient.invalidateQueries({ queryKey: ["ldap-config"] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "测试失败");
    },
  });

  return (
    <section className="page active" id="page-system-config">
      <div className="page-header">
        <div>
          <h1>系统配置</h1>
          <p className="desc">平台级配置项（身份认证、后续可扩展通知 / 存储等）</p>
        </div>
      </div>
      <div className="card">
        <div className="tabs">
          <div className="tab active" data-tab="ldap">
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            LDAP
          </div>
        </div>
        <div className="sys-config-panel-body">
          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <h3>连接参数</h3>
              </div>
              <div className="card-body">
                <div className="form-grid">
                  <div className="form-group full">
                    <label htmlFor="ldap-name">配置名称</label>
                    <input id="ldap-name" value={form.name} onChange={(event) => patch("name", event.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ldap-host">
                      主机 <span className="req">*</span>
                    </label>
                    <input id="ldap-host" value={form.host} placeholder="ldap.example.com" onChange={(event) => patch("host", event.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ldap-port">
                      端口 <span className="req">*</span>
                    </label>
                    <input id="ldap-port" type="number" min={1} max={65535} value={form.port} onChange={(event) => patch("port", Number(event.target.value) || 0)} />
                  </div>
                  <div className="form-group full">
                    <label className="checkbox-inline">
                      <input type="checkbox" checked={form.useTls} onChange={(event) => patch("useTls", event.target.checked)} /> 使用 TLS / LDAPS
                    </label>
                  </div>
                  <div className="form-group full">
                    <label htmlFor="ldap-base-dn">
                      Base DN <span className="req">*</span>
                    </label>
                    <input id="ldap-base-dn" className="mono" value={form.baseDn} onChange={(event) => patch("baseDn", event.target.value)} />
                  </div>
                  <div className="form-group full">
                    <label htmlFor="ldap-bind-dn">
                      Bind DN <span className="req">*</span>
                    </label>
                    <input id="ldap-bind-dn" className="mono" value={form.bindDn} onChange={(event) => patch("bindDn", event.target.value)} />
                  </div>
                  <div className="form-group full">
                    <label htmlFor="ldap-bind-pwd">Bind 密码</label>
                    <input id="ldap-bind-pwd" type="password" value={form.bindPassword} placeholder="留空则不修改" onChange={(event) => patch("bindPassword", event.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ldap-timeout">超时（秒）</label>
                    <input id="ldap-timeout" type="number" min={1} max={120} value={form.timeoutSec} onChange={(event) => patch("timeoutSec", Number(event.target.value) || 10)} />
                  </div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <h3>检索与属性映射</h3>
              </div>
              <div className="card-body">
                <div className="form-grid">
                  <div className="form-group full">
                    <label htmlFor="ldap-user-filter">用户认证 Filter</label>
                    <input id="ldap-user-filter" className="mono" value={form.userFilter} onChange={(event) => patch("userFilter", event.target.value)} />
                  </div>
                  <div className="form-group full">
                    <label htmlFor="ldap-search-filter">目录搜索 Filter</label>
                    <input id="ldap-search-filter" className="mono" value={form.searchFilter} onChange={(event) => patch("searchFilter", event.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ldap-attr-user">账号属性</label>
                    <input id="ldap-attr-user" className="mono" value={form.attrUsername} onChange={(event) => patch("attrUsername", event.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ldap-attr-name">姓名属性</label>
                    <input id="ldap-attr-name" className="mono" value={form.attrName} onChange={(event) => patch("attrName", event.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ldap-attr-email">邮箱属性</label>
                    <input id="ldap-attr-email" className="mono" value={form.attrEmail} onChange={(event) => patch("attrEmail", event.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ldap-attr-dept">部门属性</label>
                    <input id="ldap-attr-dept" className="mono" value={form.attrDepartment} onChange={(event) => patch("attrDepartment", event.target.value)} />
                  </div>
                  <div className="form-group full">
                    <label htmlFor="ldap-attr-title">职位属性</label>
                    <input id="ldap-attr-title" className="mono" value={form.attrTitle} onChange={(event) => patch("attrTitle", event.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="sys-config-tab-actions">
            <Button variant="secondary" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
              测试连接
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              保存配置
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
