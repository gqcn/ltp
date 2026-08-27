import { useSyncExternalStore } from "react";
import { Toaster } from "sonner";

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function readTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function ToastContainer() {
  const theme = useSyncExternalStore<"light" | "dark">(subscribeTheme, readTheme, () => "dark");
  return (
    <Toaster
      theme={theme}
      position="top-right"
      duration={2800}
      gap={8}
      expand
      visibleToasts={6}
      offset={{ top: "calc(var(--topbar-h) + 72px)", right: 24 }}
      className="toast-container"
      icons={{ success: null, error: null, warning: null, info: null, loading: null, close: null }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "toast",
          success: "success",
          error: "error",
          warning: "warning",
          info: "info",
        },
      }}
    />
  );
}
