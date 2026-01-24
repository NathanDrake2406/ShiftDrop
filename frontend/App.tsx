import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./pages/Login";
import { ManagerDashboard } from "./pages/ManagerDashboard";
import { PoolDetails } from "./pages/PoolDetails";
import { CasualFeed } from "./pages/CasualFeed";
import { VerifyInvitePage } from "./pages/VerifyInvitePage";
import { OptOutPage } from "./pages/OptOutPage";
import { ClaimByTokenPage } from "./pages/ClaimByTokenPage";
import { RequireAuth } from "./auth";
import type { Casual } from "./types";

function App() {
  const [currentUser, setCurrentUser] = useState<Casual | null>(null);

  return (
    <Routes>
      <Route
        path="/"
        element={
          currentUser ? (
            <Navigate to="/casual/feed" replace />
          ) : (
            <Login onCasualLogin={(casual) => setCurrentUser(casual)} />
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

      {/* Casual Routes */}
      <Route
        path="/casual/feed"
        element={
          currentUser ? (
            <CasualFeed currentUser={currentUser} onLogout={() => setCurrentUser(null)} />
          ) : (
            <Navigate to="/" replace />
          )
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
