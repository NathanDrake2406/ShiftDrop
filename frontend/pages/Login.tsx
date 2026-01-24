import { useState } from "react";
import { api } from "../services/mockApi";
import type { Casual } from "../types";
import { Button } from "../components/ui/Button";
import { Layout } from "../components/ui/Layout";
import { useAuth } from "../auth";
import { useToast } from "../contexts/ToastContext";

interface LoginProps {
  onCasualLogin: (casual: Casual) => void;
}

export const Login: React.FC<LoginProps> = ({ onCasualLogin }) => {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("555-0101"); // Default for demo
  const [loading, setLoading] = useState(false);

  const handleCasualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const casual = await api.casual.login(phoneNumber);
      if (casual) {
        onCasualLogin(casual);
      } else {
        showToast("Phone number not found in any pool.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManagerLogin = () => {
    login({
      appState: { returnTo: "/manager" },
    });
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-blue-600 dark:text-blue-500 tracking-tight mb-2">ShiftDrop</h1>
          <p className="text-slate-500 dark:text-slate-400">Fast shift filling for busy teams.</p>
        </div>

        <div className="ui-surface p-6 rounded-2xl shadow-lg space-y-6">
          {/* Casual Login Flow - Demo Mode */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">I'm a Casual Worker</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
                Demo
              </span>
            </div>
            <form onSubmit={handleCasualLogin} className="space-y-3">
              <input
                type="tel"
                placeholder="Phone Number (e.g. 555-0101)"
                className="ui-input rounded-xl focus:bg-white dark:focus:bg-slate-600 transition-colors"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <Button
                type="submit"
                className="w-full bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600"
                isLoading={loading}
              >
                Sign In with Phone
              </Button>
            </form>
            <p className="text-xs text-center mt-3 text-slate-400 dark:text-slate-500">
              Use <span className="font-mono">555-0101</span> for demo.
              <br />
              <span className="text-slate-300 dark:text-slate-600">In production, casuals access via SMS links.</span>
            </p>
          </div>

          <div className="ui-divider"></div>

          {/* Manager Entry */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">I'm a Manager</h2>
            <Button
              variant="primary"
              className="w-full"
              onClick={handleManagerLogin}
              isLoading={authLoading}
              disabled={isAuthenticated}
            >
              {isAuthenticated ? "Already signed in" : "Sign In as Manager"}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};
