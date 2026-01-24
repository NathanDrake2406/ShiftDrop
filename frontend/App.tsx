import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./pages/Login";
import { ManagerDashboard } from "./pages/ManagerDashboard";
import { PoolDetails } from "./pages/PoolDetails";
import { CasualFeed } from "./pages/CasualFeed";
import { Casual } from "./types";

function App() {
  const [currentUser, setCurrentUser] = useState<Casual | null>(null);

  return (
    <BrowserRouter>
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

        {/* Manager Routes */}
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/manager/pool/:id" element={<PoolDetails />} />

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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
