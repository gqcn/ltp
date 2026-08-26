import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout, type SessionUser } from "@/api/auth";
import { canVisit, MENU_OPS, MENU_PLATFORM } from "@/lib/access";
import { applySidebarCollapsed, readSidebarCollapsed, toggleTheme, readTheme } from "@/lib/theme";
import { adminShellMeta } from "@/lib/format";
import { toast } from "@/lib/toast";

type Props = {
  user: SessionUser;
};

const breadcrumbs: Record<string, string> = {
  "/home": "工作台",
  "/ops/datacenters": "数据中心",
  "/platform/users": "用户管理",
  "/platform/teams": "团队管理",
  "/platform/roles": "角色管理",
  "/platform/system": "系统配置",
};

export function AppShell({ user }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed);
  const [menuOpen, setMenuOpen] = useState(false);
  const [, setTheme] = useState(readTheme);

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      queryClient.setQueryData(["session"], null);
      queryClient.clear();
      toast.info("已退出登录");
      navigate("/login", { replace: true });
    },
  });

  function onToggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    applySidebarCollapsed(next);
  }

  const shellUser = adminShellMeta(user);
  const showOps = canVisit(user, MENU_OPS);
  const showPlatform = canVisit(user, MENU_PLATFORM);
  const current = breadcrumbs[location.pathname] || "控制台";
  const fillViewport = location.pathname === "/platform/system";

  return (
    <div className={fillViewport ? "app is-viewport-page" : "app"}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo">AI</div>
          <div className="brand-text">
            <span className="brand-name">MAIP-大模型训练平台</span>
            <span className="brand-sub">LLM Training Platform</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {showOps ? (
            <div className="nav-section" data-nav-section="ops">
              <div className="nav-section-title">运维中心</div>
              <NavLink to="/ops/datacenters" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l7-4 7 4v14" />
                  <path d="M9 21v-6h6v6" />
                  <path d="M9 10h.01M15 10h.01" />
                </svg>
                <span className="nav-item-label">数据中心</span>
              </NavLink>
            </div>
          ) : null}
          {showPlatform ? (
            <div className="nav-section" data-nav-section="platform">
              <div className="nav-section-title">平台中心</div>
              <NavLink to="/platform/users" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span className="nav-item-label">用户管理</span>
              </NavLink>
              <NavLink to="/platform/teams" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span className="nav-item-label">团队管理</span>
              </NavLink>
              <NavLink to="/platform/roles" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <span className="nav-item-label">角色管理</span>
              </NavLink>
              <NavLink to="/platform/system" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                  <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
                </svg>
                <span className="nav-item-label">系统配置</span>
              </NavLink>
            </div>
          ) : null}
        </nav>
        <div className="sidebar-footer">
          <button
            type="button"
            className="theme-toggle sidebar-theme-toggle js-theme-toggle"
            aria-label="切换浅色/深色主题"
            title="切换浅色/深色主题"
            onClick={() => setTheme(toggleTheme())}
          >
            <svg className="theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
            <svg className="theme-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5z" />
            </svg>
            <span className="theme-toggle-label theme-label-to-light">浅色主题</span>
            <span className="theme-toggle-label theme-label-to-dark">深色主题</span>
          </button>
          <div className={menuOpen ? "sidebar-user-wrap is-open" : "sidebar-user-wrap"}>
            <button
              type="button"
              className="user-chip sidebar-user"
              aria-label="账户菜单"
              title="账户菜单"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <div className="user-avatar">{shellUser.avatar}</div>
              <div className="sidebar-user-meta">
                <span className="sidebar-user-name">{shellUser.displayName}</span>
                <span className="sidebar-user-role">{shellUser.roleName}</span>
              </div>
              <span className="ui-chevron sidebar-user-chevron" aria-hidden="true" title="账户菜单">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 15l6-6 6 6" />
                </svg>
              </span>
            </button>
            <div className={menuOpen ? "sidebar-user-menu" : "sidebar-user-menu hidden"} role="menu">
              <div className="sidebar-user-menu-head">
                <div className="sidebar-user-menu-name">{shellUser.displayName}</div>
                <div className="sidebar-user-menu-sub mono">{shellUser.menuSub}</div>
              </div>
              <button
                type="button"
                className="sidebar-user-menu-item is-danger"
                data-testid="logout-button"
                role="menuitem"
                onClick={() => logoutMutation.mutate()}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5M21 12H9" />
                </svg>
                退出登录
              </button>
            </div>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="sidebar-toggle js-sidebar-toggle"
              aria-label={collapsed ? "展开侧栏" : "折叠侧栏"}
              title={collapsed ? "展开侧栏" : "折叠侧栏"}
              onClick={onToggleSidebar}
            >
              <svg className="sidebar-toggle-icon-collapse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
                <path d="M16 15l-3-3 3-3" />
              </svg>
              <svg className="sidebar-toggle-icon-expand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
                <path d="M14 9l3 3-3 3" />
              </svg>
            </button>
            <div className="breadcrumb">
              <span className="current">{current}</span>
              <span className="sep">·</span>
              <span className="text-muted" style={{ fontSize: 12 }}>
                全局视图
              </span>
            </div>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
