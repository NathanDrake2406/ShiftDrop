import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Layout } from "../components/ui/Layout";
import { useAuth } from "../auth";
import { useDemo } from "../contexts/DemoContext";

export const Login: React.FC = () => {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const { demoMode, setDemoMode, demoManagerSignedIn, setDemoManagerSignedIn } = useDemo();
  const navigate = useNavigate();

  const handleManagerLogin = () => {
    if (demoMode) {
      setDemoManagerSignedIn(true);
      navigate("/manager");
      return;
    }
    login({
      appState: { returnTo: "/manager" },
    });
  };

  const isManagerSignedIn = demoMode ? demoManagerSignedIn : isAuthenticated;
  const managerLoading = demoMode ? false : authLoading;

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-orange-500 dark:text-orange-400 tracking-tight mb-2 font-display">
            ShiftDrop
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Fast shift filling for busy teams.</p>
        </div>

        <div className="ui-surface p-6 rounded-2xl shadow-lg space-y-6">
          {/* Manager Entry */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">I'm a Manager</h2>
            <Button
              variant="primary"
              className="w-full"
              onClick={handleManagerLogin}
              isLoading={managerLoading}
              disabled={isManagerSignedIn}
            >
              {isManagerSignedIn ? "Already signed in" : "Sign In as Manager"}
            </Button>
          </div>

          <div className="ui-divider"></div>

          <button
            type="button"
            onClick={() => setDemoMode(!demoMode)}
            className="w-full ui-surface-muted rounded-xl p-3 flex items-center justify-between text-left"
            role="switch"
            aria-checked={demoMode}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Demo mode</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
                  Demo
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Use seeded data and skip Auth0 to preview manager features.
              </p>
            </div>
            <span
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                demoMode ? "bg-orange-500" : "bg-slate-300 dark:bg-slate-600"
              }`}
              aria-hidden="true"
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${
                  demoMode ? "right-1" : "left-1"
                }`}
              />
            </span>
          </button>
        </div>
      </div>
    </Layout>
  );
};
