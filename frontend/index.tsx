import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { Auth0Provider } from "./auth";
import { ToastProvider } from "./contexts/ToastContext";
import { ToastContainer } from "./components/ui/Toast";
import { DemoProvider } from "./contexts/DemoContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Configure React Query with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Show stale data while refetching in background
      staleTime: 30_000, // 30 seconds
      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Don't refetch on window focus in development
      refetchOnWindowFocus: import.meta.env.PROD,
      // Retry failed requests once
      retry: 1,
    },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <Auth0Provider>
          <DemoProvider>
            <ToastProvider>
              <ErrorBoundary>
                <App />
                <ToastContainer />
              </ErrorBoundary>
            </ToastProvider>
          </DemoProvider>
        </Auth0Provider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
