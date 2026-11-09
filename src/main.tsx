import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initNativeChrome } from "./lib/native";
import { isPublicDocRoute } from "./lib/legalRoutes";

// The app routes inside the URL hash, so a policy link pasted as /privacy would
// otherwise open the home screen. Send known document paths to their hash form.
if (!window.location.hash && isPublicDocRoute(window.location.pathname)) {
  window.location.replace(
    `${window.location.origin}/#${window.location.pathname}${window.location.search}`,
  );
}

// Initialize native iOS chrome (status bar + hide splash). No-op on web.
initNativeChrome();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
