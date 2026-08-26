import { Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { readSession } from "@/api/auth";
import { AppShell } from "@/layout/AppShell";
import { DatacenterPage } from "@/pages/DatacenterPage";
import { LoginPage } from "@/pages/LoginPage";

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

  return (
    <Routes>
      <Route path="/login" element={signedIn ? <Navigate to="/ops/datacenters" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={signedIn && user ? <AppShell user={user} /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Navigate to="/ops/datacenters" replace />} />
        <Route path="ops/datacenters" element={<DatacenterPage />} />
      </Route>
      <Route path="*" element={<Navigate to={signedIn ? "/ops/datacenters" : "/login"} replace />} />
    </Routes>
  );
}
