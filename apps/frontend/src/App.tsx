import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { readSession, type SessionUser } from "@/api/auth";
import { canVisit, homePath, MENU_OPS, MENU_PLATFORM, MENU_TRAINING } from "@/lib/access";
import { AppShell } from "@/layout/AppShell";
import { ListLoading } from "@/components/ListLoading";
import { AlertPage } from "@/pages/AlertPage";
import { ClusterPage } from "@/pages/ClusterPage";
import { DatacenterPage } from "@/pages/DatacenterPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { NodePage } from "@/pages/NodePage";
import { QueuePage } from "@/pages/QueuePage";
import { RolePage } from "@/pages/RolePage";
import { SystemConfigPage } from "@/pages/SystemConfigPage";
import { TeamPage } from "@/pages/TeamPage";
import { UserPage } from "@/pages/UserPage";
import { JobListPage } from "@/pages/JobListPage";
import { JobCreatePage } from "@/pages/JobCreatePage";
import { JobDetailPage } from "@/pages/JobDetailPage";
import { MyQueuesPage } from "@/pages/MyQueuesPage";
import { ConfigListPage } from "@/pages/ConfigListPage";
import { ConfigEditPage } from "@/pages/ConfigEditPage";
import { ConfigDetailPage } from "@/pages/ConfigDetailPage";
import { ExperimentListPage } from "@/pages/ExperimentListPage";
import { ExperimentDetailPage } from "@/pages/ExperimentDetailPage";
import { ExperimentComparePage } from "@/pages/ExperimentComparePage";

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
    return (
      <div className="card" style={{ margin: 48 }}>
        <ListLoading label="正在进入控制台…" />
      </div>
    );
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
          path="training/jobs"
          element={
            user ? (
              <Guard user={user} menu={MENU_TRAINING}>
                <JobListPage />
              </Guard>
            ) : null
          }
        />
        <Route
          path="training/jobs/new"
          element={
            user ? (
              <Guard user={user} menu={MENU_TRAINING}>
                <JobCreatePage />
              </Guard>
            ) : null
          }
        />
        <Route
          path="training/jobs/:id"
          element={
            user ? (
              <Guard user={user} menu={MENU_TRAINING}>
                <JobDetailPage />
              </Guard>
            ) : null
          }
        />
        <Route
          path="training/experiments"
          element={
            user ? (
              <Guard user={user} menu={MENU_TRAINING}>
                <ExperimentListPage />
              </Guard>
            ) : null
          }
        />
        <Route
          path="training/experiments/compare"
          element={
            user ? (
              <Guard user={user} menu={MENU_TRAINING}>
                <ExperimentComparePage />
              </Guard>
            ) : null
          }
        />
        <Route
          path="training/experiments/:id"
          element={
            user ? (
              <Guard user={user} menu={MENU_TRAINING}>
                <ExperimentDetailPage />
              </Guard>
            ) : null
          }
        />
        <Route
          path="training/queues"
          element={
            user ? (
              <Guard user={user} menu={MENU_TRAINING}>
                <MyQueuesPage />
              </Guard>
            ) : null
          }
        />
        <Route
          path="training/configs"
          element={
            user ? (
              <Guard user={user} menu={MENU_TRAINING}>
                <ConfigListPage />
              </Guard>
            ) : null
          }
        />
        <Route
          path="training/configs/new"
          element={
            user ? (
              <Guard user={user} menu={MENU_TRAINING}>
                <ConfigEditPage />
              </Guard>
            ) : null
          }
        />
        <Route
          path="training/configs/:id/edit"
          element={
            user ? (
              <Guard user={user} menu={MENU_TRAINING}>
                <ConfigEditPage />
              </Guard>
            ) : null
          }
        />
        <Route
          path="training/configs/:id"
          element={
            user ? (
              <Guard user={user} menu={MENU_TRAINING}>
                <ConfigDetailPage />
              </Guard>
            ) : null
          }
        />
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
          path="ops/clusters"
          element={
            user ? (
              <Guard user={user} menu={MENU_OPS}>
                <ClusterPage />
              </Guard>
            ) : null
          }
        />
        <Route
          path="ops/nodes"
          element={
            user ? (
              <Guard user={user} menu={MENU_OPS}>
                <NodePage />
              </Guard>
            ) : null
          }
        />
        <Route
          path="ops/queues"
          element={
            user ? (
              <Guard user={user} menu={MENU_OPS}>
                <QueuePage />
              </Guard>
            ) : null
          }
        />
        <Route
          path="ops/alerts"
          element={
            user ? (
              <Guard user={user} menu={MENU_OPS}>
                <AlertPage />
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
