import React from "react";

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // Surface errors that would otherwise blank the screen (e.g., mobile Safari).
    console.error("App crashed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 space-y-3">
            <h1 className="text-lg font-bold">Something went wrong</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              The app failed to render. Open the console for details.
            </p>
            {this.state.error && (
              <pre className="text-xs bg-slate-100 dark:bg-slate-900 p-3 rounded-lg overflow-auto">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
