import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { login } from "@/api/auth";
import { ApiError } from "@/api/client";
import { toggleTheme } from "@/lib/theme";

type LoginMode = "ldap" | "admin";

const demoAccounts = [
  { mode: "admin" as const, username: "admin", password: "admin123", label: "平台管理员", entry: "管理员入口" },
  { mode: "ldap" as const, username: "algo", password: "algo123", label: "算法工程师", entry: "LDAP 入口" },
  { mode: "ldap" as const, username: "sre", password: "sre123", label: "SRE工程师", entry: "LDAP 入口" },
];

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<LoginMode>("ldap");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => login(username.trim(), password),
    onSuccess: async (data) => {
      queryClient.setQueryData(["session"], data);
      toast.success(`平台管理员登录成功，欢迎 ${data.user.nickname || data.user.username}`);
      navigate("/ops/datacenters", { replace: true });
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : "登录失败";
      setError(message);
    },
  });

  function applyMode(next: LoginMode) {
    setMode(next);
    setError("");
    setShowPassword(false);
  }

  function fillDemo(account: (typeof demoAccounts)[number]) {
    applyMode(account.mode);
    setUsername(account.username);
    setPassword(account.password);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (mode === "ldap") {
      setError("LDAP 身份认证将在后续模块接入，请使用平台管理员入口");
      return;
    }
    mutation.mutate();
  }

  const isAdmin = mode === "admin";

  useEffect(() => {
    document.getElementById("login-username")?.focus();
  }, [mode]);

  return (
    <div className="login-screen">
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg-grid" />
        <div className="login-bg-glow login-bg-glow-a" />
        <div className="login-bg-glow login-bg-glow-b" />
      </div>
      <button
        type="button"
        className="theme-toggle login-theme-toggle js-theme-toggle"
        aria-label="切换浅色/深色主题"
        title="切换浅色/深色主题"
        onClick={() => toggleTheme()}
      >
        <svg className="theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
        <svg className="theme-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5z" />
        </svg>
      </button>
      <div className="login-panel">
        <div className="login-brand">
          <div className="login-logo" aria-hidden="true">
            AI
          </div>
          <div className="login-brand-text">
            <h1 className="login-title">MAIP-大模型训练平台</h1>
            <div className="login-subtitle">{isAdmin ? "平台管理员登录" : "企业 LDAP 身份认证"}</div>
          </div>
        </div>
        <div className="login-mode-tabs" role="tablist" aria-label="登录方式">
          <button
            type="button"
            className={mode === "ldap" ? "login-mode-tab is-active" : "login-mode-tab"}
            role="tab"
            data-mode="ldap"
            aria-selected={mode === "ldap"}
            onClick={() => applyMode("ldap")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            LDAP 用户
          </button>
          <button
            type="button"
            className={isAdmin ? "login-mode-tab is-active" : "login-mode-tab"}
            role="tab"
            data-mode="admin"
            aria-selected={isAdmin}
            onClick={() => applyMode("admin")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
            平台管理员
          </button>
        </div>
        <form className="login-form" onSubmit={onSubmit} autoComplete="on">
          {error ? (
            <div className="login-error" role="alert">
              {error}
            </div>
          ) : null}
          <div className="form-group">
            <label htmlFor="login-username">{isAdmin ? "平台管理员账号" : "域账号"}</label>
            <div className="login-input-wrap">
              <span className="login-input-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="login-username"
                name="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={isAdmin ? "admin" : "algo 或 sre"}
                autoComplete="username"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="login-password">密码</label>
            <div className="login-input-wrap has-toggle">
              <span className="login-input-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isAdmin ? "admin123" : "对应演示密码"}
                autoComplete="current-password"
              />
              <button type="button" className="login-toggle-pwd" title="显示/隐藏密码" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? "隐藏" : "显示"}
              </button>
            </div>
          </div>
          <button type="submit" className={mutation.isPending ? "btn btn-primary login-submit is-loading" : "btn btn-primary login-submit"}>
            <span className="login-submit-text">{isAdmin ? "平台管理员登录" : "LDAP 登录"}</span>
          </button>
        </form>
        <div className={demoOpen ? "login-demo-tip" : "login-demo-tip is-collapsed"}>
          <button
            type="button"
            className="login-demo-tip-toggle"
            aria-expanded={demoOpen}
            onClick={() => setDemoOpen((open) => !open)}
          >
            <span className="login-demo-tip-title">演示账号</span>
            <span className="ui-chevron" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </button>
          <div className="login-demo-tip-body" hidden={!demoOpen}>
            <div className="login-demo-accounts">
              {demoAccounts.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  className={account.mode === mode ? "login-demo-account is-active" : "login-demo-account"}
                  onClick={() => fillDemo(account)}
                >
                  <span className="login-demo-account-label">{account.label}</span>
                  <span className="login-demo-account-cred mono">
                    <code>{account.username}</code> / <code>{account.password}</code>
                  </span>
                  <span className="login-demo-account-entry">{account.entry}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
