import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { getLdapConfig, saveLdapConfig, testLdapConfig, type LdapForm } from "@/api/system";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { FieldError, FieldHelp } from "@/components/Field";
import { errText, groupClass, invalidProps, LINE_MAX, useZodForm, zLine, zLineOpt } from "@/lib/form";
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

const portMessage = "请填写 1–65535 之间的端口";

const ldapSchema = z.object({
  name: zLineOpt(),
  host: zLine("请填写主机"),
  port: z.coerce.number({ error: portMessage }).int({ error: portMessage }).min(1, portMessage).max(65535, portMessage),
  useTls: z.boolean(),
  baseDn: zLine("请填写 Base DN"),
  bindDn: zLine("请填写 Bind DN"),
  bindPassword: zLineOpt(),
  userFilter: zLineOpt(),
  searchFilter: zLineOpt(),
  attrUsername: zLineOpt(),
  attrName: zLineOpt(),
  attrEmail: zLineOpt(),
  attrDepartment: zLineOpt(),
  attrTitle: zLineOpt(),
  timeoutSec: z.coerce.number(),
});

export function SystemConfigPage() {
  const queryClient = useQueryClient();
  const form = useZodForm(ldapSchema, { defaultValues: emptyForm });
  const query = useQuery({ queryKey: ["ldap-config"], queryFn: getLdapConfig });
  const hostError = errText(form.formState.errors, "host");
  const portError = errText(form.formState.errors, "port");
  const baseDnError = errText(form.formState.errors, "baseDn");
  const bindDnError = errText(form.formState.errors, "bindDn");
  const nameError = errText(form.formState.errors, "name");
  const bindPwdError = errText(form.formState.errors, "bindPassword");
  const userFilterError = errText(form.formState.errors, "userFilter");
  const searchFilterError = errText(form.formState.errors, "searchFilter");
  const attrUserError = errText(form.formState.errors, "attrUsername");
  const attrNameError = errText(form.formState.errors, "attrName");
  const attrEmailError = errText(form.formState.errors, "attrEmail");
  const attrDeptError = errText(form.formState.errors, "attrDepartment");
  const attrTitleError = errText(form.formState.errors, "attrTitle");

  useEffect(() => {
    const cfg = query.data?.config;
    if (!cfg) {
      return;
    }
    form.reset({
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

  const saveMutation = useMutation({
    mutationFn: (input: LdapForm) => saveLdapConfig(input),
    onSuccess: async () => {
      toast.success("LDAP 配置已保存");
      await queryClient.invalidateQueries({ queryKey: ["ldap-config"] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "保存失败");
    },
  });
  const testMutation = useMutation({
    mutationFn: (input: LdapForm) => testLdapConfig(input),
    onSuccess: async (data) => {
      toast[data.ok ? "success" : "error"](data.message || (data.ok ? "LDAP 连接测试成功" : "LDAP 连接测试失败"));
      await queryClient.invalidateQueries({ queryKey: ["ldap-config"] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "测试失败");
    },
  });

  const submitSave = form.handleSubmit((values) => saveMutation.mutate(values));
  const submitTest = form.handleSubmit((values) => testMutation.mutate(values));

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
                  <div className={groupClass(nameError, "full")}>
                    <label htmlFor="ldap-name">配置名称</label>
                    <input id="ldap-name" maxLength={LINE_MAX} {...form.register("name")} {...invalidProps("ldap-name", nameError)} />
                    <FieldError id="ldap-name-error">{nameError}</FieldError>
                  </div>
                  <div className={groupClass(hostError)}>
                    <label htmlFor="ldap-host">
                      主机 <span className="req">*</span>
                    </label>
                    <input id="ldap-host" placeholder="ldap.example.com" maxLength={LINE_MAX} {...form.register("host")} {...invalidProps("ldap-host", hostError)} />
                    <FieldError id="ldap-host-error">{hostError}</FieldError>
                  </div>
                  <div className={groupClass(portError)}>
                    <label htmlFor="ldap-port">
                      端口 <span className="req">*</span>
                    </label>
                    <input id="ldap-port" type="number" min={1} max={65535} {...form.register("port", { valueAsNumber: true })} {...invalidProps("ldap-port", portError)} />
                    <FieldError id="ldap-port-error">{portError}</FieldError>
                  </div>
                  <div className="form-group full">
                    <label className="checkbox-inline">
                      <input type="checkbox" {...form.register("useTls")} /> 使用 TLS / LDAPS
                    </label>
                  </div>
                  <div className={groupClass(baseDnError, "full")}>
                    <label htmlFor="ldap-base-dn">
                      Base DN <span className="req">*</span>
                    </label>
                    <input id="ldap-base-dn" className="mono" maxLength={LINE_MAX} {...form.register("baseDn")} {...invalidProps("ldap-base-dn", baseDnError)} />
                    <FieldError id="ldap-base-dn-error">{baseDnError}</FieldError>
                  </div>
                  <div className={groupClass(bindDnError, "full")}>
                    <label htmlFor="ldap-bind-dn">
                      Bind DN <span className="req">*</span>
                    </label>
                    <input id="ldap-bind-dn" className="mono" maxLength={LINE_MAX} {...form.register("bindDn")} {...invalidProps("ldap-bind-dn", bindDnError)} />
                    <FieldError id="ldap-bind-dn-error">{bindDnError}</FieldError>
                  </div>
                  <div className={groupClass(bindPwdError, "full")}>
                    <div className="field-label-row">
                      <label htmlFor="ldap-bind-pwd">Bind 密码</label>
                      <FieldHelp tip="留空则不修改已保存密码。密码加密存储。" label="Bind 密码说明" />
                    </div>
                    <input id="ldap-bind-pwd" type="password" maxLength={LINE_MAX} {...form.register("bindPassword")} {...invalidProps("ldap-bind-pwd", bindPwdError)} />
                    <FieldError id="ldap-bind-pwd-error">{bindPwdError}</FieldError>
                  </div>
                  <div className="form-group">
                    <label htmlFor="ldap-timeout">超时（秒）</label>
                    <input id="ldap-timeout" type="number" min={1} max={120} {...form.register("timeoutSec", { valueAsNumber: true })} />
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
                  <div className={groupClass(userFilterError, "full")}>
                    <div className="field-label-row">
                      <label htmlFor="ldap-user-filter">用户认证 Filter</label>
                      <FieldHelp tip="{username} 将替换为登录账号" label="用户认证 Filter 说明" />
                    </div>
                    <input id="ldap-user-filter" className="mono" maxLength={LINE_MAX} {...form.register("userFilter")} {...invalidProps("ldap-user-filter", userFilterError)} />
                    <FieldError id="ldap-user-filter-error">{userFilterError}</FieldError>
                  </div>
                  <div className={groupClass(searchFilterError, "full")}>
                    <div className="field-label-row">
                      <label htmlFor="ldap-search-filter">目录搜索 Filter</label>
                      <FieldHelp tip="{q} 将替换为搜索关键词" label="目录搜索 Filter 说明" />
                    </div>
                    <input id="ldap-search-filter" className="mono" maxLength={LINE_MAX} {...form.register("searchFilter")} {...invalidProps("ldap-search-filter", searchFilterError)} />
                    <FieldError id="ldap-search-filter-error">{searchFilterError}</FieldError>
                  </div>
                  <div className={groupClass(attrUserError)}>
                    <label htmlFor="ldap-attr-user">账号属性</label>
                    <input id="ldap-attr-user" className="mono" maxLength={LINE_MAX} {...form.register("attrUsername")} {...invalidProps("ldap-attr-user", attrUserError)} />
                    <FieldError id="ldap-attr-user-error">{attrUserError}</FieldError>
                  </div>
                  <div className={groupClass(attrNameError)}>
                    <label htmlFor="ldap-attr-name">姓名属性</label>
                    <input id="ldap-attr-name" className="mono" maxLength={LINE_MAX} {...form.register("attrName")} {...invalidProps("ldap-attr-name", attrNameError)} />
                    <FieldError id="ldap-attr-name-error">{attrNameError}</FieldError>
                  </div>
                  <div className={groupClass(attrEmailError)}>
                    <label htmlFor="ldap-attr-email">邮箱属性</label>
                    <input id="ldap-attr-email" className="mono" maxLength={LINE_MAX} {...form.register("attrEmail")} {...invalidProps("ldap-attr-email", attrEmailError)} />
                    <FieldError id="ldap-attr-email-error">{attrEmailError}</FieldError>
                  </div>
                  <div className={groupClass(attrDeptError)}>
                    <label htmlFor="ldap-attr-dept">部门属性</label>
                    <input id="ldap-attr-dept" className="mono" maxLength={LINE_MAX} {...form.register("attrDepartment")} {...invalidProps("ldap-attr-dept", attrDeptError)} />
                    <FieldError id="ldap-attr-dept-error">{attrDeptError}</FieldError>
                  </div>
                  <div className={groupClass(attrTitleError, "full")}>
                    <label htmlFor="ldap-attr-title">职位属性</label>
                    <input id="ldap-attr-title" className="mono" maxLength={LINE_MAX} {...form.register("attrTitle")} {...invalidProps("ldap-attr-title", attrTitleError)} />
                    <FieldError id="ldap-attr-title-error">{attrTitleError}</FieldError>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="sys-config-tab-actions">
            <Button variant="secondary" onClick={submitTest} disabled={testMutation.isPending}>
              测试连接
            </Button>
            <Button onClick={submitSave} disabled={saveMutation.isPending}>
              保存配置
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
