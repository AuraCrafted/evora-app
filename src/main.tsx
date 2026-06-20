import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initNativeChrome } from "./lib/native";

// Initialize native iOS chrome (status bar + hide splash). No-op on web.
initNativeChrome();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
