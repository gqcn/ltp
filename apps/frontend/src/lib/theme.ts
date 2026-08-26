export type Theme = "dark" | "light";

const THEME_KEY = "ltp_theme";
const SIDEBAR_KEY = "ltp_sidebar";

export function readTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  return "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}

export function toggleTheme() {
  const next: Theme = readTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

export function readSidebarCollapsed() {
  return localStorage.getItem(SIDEBAR_KEY) === "collapsed";
}

export function applySidebarCollapsed(collapsed: boolean) {
  if (collapsed) {
    document.documentElement.setAttribute("data-sidebar", "collapsed");
    localStorage.setItem(SIDEBAR_KEY, "collapsed");
  } else {
    document.documentElement.removeAttribute("data-sidebar");
    localStorage.setItem(SIDEBAR_KEY, "expanded");
  }
}
