import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { Auth0Provider } from "./auth";
import { ToastProvider } from "./contexts/ToastContext";
import { ToastContainer } from "./components/ui/Toast";
import { DemoProvider } from "./contexts/DemoContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
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
    </BrowserRouter>
  </React.StrictMode>,
);
