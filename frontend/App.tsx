import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./pages/Login";
import { LandingPage } from "./pages/LandingPage";
import { RequireAuth } from "./auth";
import { useAuth } from "./auth";

// Lazy-loaded pages - these are split into separate chunks
// Critical path (Login, LandingPage) remains in main bundle for instant load
const ManagerDashboard = lazy(() => import("./pages/ManagerDashboard"));
const PoolDetails = lazy(() => import("./pages/PoolDetails"));
const AcceptAdminInvitePage = lazy(() => import("./pages/AcceptAdminInvitePage"));
const VerifyInvitePage = lazy(() => import("./pages/VerifyInvitePage"));
const OptOutPage = lazy(() => import("./pages/OptOutPage"));
const ClaimByTokenPage = lazy(() => import("./pages/ClaimByTokenPage"));

// Loading fallback for lazy-loaded routes
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
      Loading...
    </div>
  );
}

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  // Detect Auth0 callback in progress (has code/state params)
  // Don't auto-redirect during callback - let onRedirectCallback handle navigation
  const isAuth0Callback =
    window.location.search.includes("code=") && window.location.search.includes("state=");

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/"
          element={
            isLoading || isAuth0Callback ? (
              <PageLoader />
            ) : isAuthenticated ? (
              <Navigate to="/manager" replace />
            ) : (
              <Login />
            )
          }
        />
        <Route path="/landing" element={<LandingPage />} />

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
    </Suspense>
  );
}

export default App;
