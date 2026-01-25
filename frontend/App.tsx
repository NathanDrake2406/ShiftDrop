import { Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./pages/Login";
import { ManagerDashboard } from "./pages/ManagerDashboard";
import { PoolDetails } from "./pages/PoolDetails";
import { AcceptAdminInvitePage } from "./pages/AcceptAdminInvitePage";
import { VerifyInvitePage } from "./pages/VerifyInvitePage";
import { OptOutPage } from "./pages/OptOutPage";
import { ClaimByTokenPage } from "./pages/ClaimByTokenPage";
import { RequireAuth } from "./auth";
import { useAuth } from "./auth";

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          isLoading ? (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
              Loading...
            </div>
          ) : isAuthenticated ? (
            <Navigate to="/manager" replace />
          ) : (
            <Login />
          )
        }
      />

      {/* Manager Routes - Protected by Auth0 */}
      <Route
        path="/manager"
        element={
          <RequireAuth>
            <ManagerDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/manager/pool/:id"
        element={
          <RequireAuth>
            <PoolDetails />
          </RequireAuth>
        }
      />

      {/* Admin invite acceptance - requires auth */}
      <Route
        path="/admin/accept/:token"
        element={
          <RequireAuth>
            <AcceptAdminInvitePage />
          </RequireAuth>
        }
      />

      {/* SMS Token Landing Pages (anonymous, no auth required) */}
      <Route path="/casual/verify/:token" element={<VerifyInvitePage />} />
      <Route path="/casual/opt-out/:token" element={<OptOutPage />} />
      <Route path="/casual/claim/:token" element={<ClaimByTokenPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
