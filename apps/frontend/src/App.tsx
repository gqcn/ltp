import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { readSession, type SessionUser } from "@/api/auth";
import { canVisit, homePath, MENU_OPS, MENU_PLATFORM } from "@/lib/access";
import { AppShell } from "@/layout/AppShell";
import { DatacenterPage } from "@/pages/DatacenterPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { RolePage } from "@/pages/RolePage";
import { SystemConfigPage } from "@/pages/SystemConfigPage";
import { TeamPage } from "@/pages/TeamPage";
import { UserPage } from "@/pages/UserPage";

function Guard({ user, menu, children }: { user: SessionUser; menu: string; children: ReactNode }) {
  if (!canVisit(user, menu)) {
    return <Navigate to={homePath(user)} replace />;
  }
  return children;
}

export function App() {
  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: readSession,
    retry: false,
  });

  if (sessionQuery.isLoading) {
    return <div className="empty-state">加载中…</div>;
  }

  const user = sessionQuery.data?.user;
  const signedIn = Boolean(user);
  const landing = user ? homePath(user) : "/login";

  return (
    <Routes>
      <Route path="/login" element={signedIn && user ? <Navigate to={homePath(user)} replace /> : <LoginPage />} />
      <Route path="/" element={signedIn && user ? <AppShell user={user} /> : <Navigate to="/login" replace />}>
        <Route index element={<Navigate to={landing} replace />} />
        <Route path="home" element={<HomePage />} />
        <Route
          path="ops/datacenters"
          element={
            user ? (
              <Guard user={user} menu={MENU_OPS}>
                <DatacenterPage />
              </Guard>
            ) : null
          }
        />
        <Route
          path="platform/users"
          element={
            user ? (
              <Guard user={user} menu={MENU_PLATFORM}>
                <UserPage />
              </Guard>
            ) : null
          }
        />
        <Route
          path="platform/teams"
          element={
            user ? (
              <Guard user={user} menu={MENU_PLATFORM}>
                <TeamPage />
              </Guard>
            ) : null
          }
        />
        <Route
          path="platform/roles"
          element={
            user ? (
              <Guard user={user} menu={MENU_PLATFORM}>
                <RolePage />
              </Guard>
            ) : null
          }
        />
        <Route
          path="platform/system"
          element={
            user ? (
              <Guard user={user} menu={MENU_PLATFORM}>
                <SystemConfigPage />
              </Guard>
            ) : null
          }
        />
      </Route>
      <Route path="*" element={<Navigate to={signedIn ? landing : "/login"} replace />} />
    </Routes>
  );
}
