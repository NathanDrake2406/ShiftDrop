import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { useAuth } from "../auth";
import { useDemo } from "../contexts/DemoContext";
import { useDarkMode } from "../hooks";
import { Zap, MessageSquare, CheckCircle, Clock, Users, Shield, Moon, Sun } from "lucide-react";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useAuth();
  const { demoMode, demoManagerSignedIn, setDemoMode, setDemoManagerSignedIn } = useDemo();
  const { isDark, toggle: toggleDark } = useDarkMode();

  // Redirect authenticated users to dashboard
  if (isAuthenticated || (demoMode && demoManagerSignedIn)) {
    return <Navigate to="/manager" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-slate-500 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  const handleTryDemo = () => {
    setDemoMode(true);
    setDemoManagerSignedIn(true);
    navigate("/manager");
  };

  const handleManagerLogin = () => {
    login({ appState: { returnTo: "/manager" } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-slate-900 dark:text-white">ShiftDrop</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDark}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <Button variant="ghost" size="sm" onClick={handleManagerLogin}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="px-6 pt-16 pb-24 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight">
            Fill last-minute shifts
            <br />
            <span className="text-blue-600">without the chaos.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Post a shift, your team gets an SMS, first to respond claims it. Simple, fair, and no one gets left on read.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleTryDemo} className="text-lg px-8 py-6">
              Try Demo
            </Button>
            <Button size="lg" variant="secondary" onClick={handleManagerLogin} className="text-lg px-8 py-6">
              Sign in as Manager
            </Button>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-32">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-16">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-3">1. Post a shift</h3>
              <p className="text-slate-600 dark:text-slate-400">Pick a time, set how many people you need</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-3">2. Team gets notified</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Everyone on your roster gets an SMS with a link to claim
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-3">3. Shift gets filled</h3>
              <p className="text-slate-600 dark:text-slate-400">
                First to respond gets the spot — fair and transparent
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-32">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-16">
            Built for real operations
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Clock className="w-6 h-6" />}
              title="No app needed"
              description="Staff just tap the link in their SMS. No downloads, no sign-ups."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Add team leads"
              description="Invite others to help manage shifts while you stay in control."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="No double-booking"
              description="If two people try to claim the last spot, only one gets it. Clean and fair."
            />
            <FeatureCard
              icon={<MessageSquare className="w-6 h-6" />}
              title="Reliable delivery"
              description="Messages are queued and retried automatically — nothing gets lost."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Instant notifications"
              description="Your team gets notified the moment you post a shift."
            />
            <FeatureCard
              icon={<CheckCircle className="w-6 h-6" />}
              title="Clear history"
              description="See who claimed what and when. Everything is tracked."
            />
          </div>
        </div>

        {/* CTA */}
        <div className="mt-32 text-center">
          <div className="bg-blue-600 dark:bg-blue-700 rounded-3xl p-12 max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">See how it works</h2>
            <p className="text-blue-100 mb-8">Try the demo — no account needed</p>
            <Button
              size="lg"
              variant="secondary"
              onClick={handleTryDemo}
              className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-blue-50"
            >
              Try Demo Now
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto text-center text-sm text-slate-500 dark:text-slate-400">
          <span>Built by Nathan Nguyen</span>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon,
  title,
  description,
}) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
    <div className="text-blue-600 dark:text-blue-400 mb-4">{icon}</div>
    <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-2">{title}</h3>
    <p className="text-slate-600 dark:text-slate-400 text-sm">{description}</p>
  </div>
);
