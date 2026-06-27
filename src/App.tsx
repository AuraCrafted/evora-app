import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "./pages/Home.tsx";
import Roll from "./pages/Index.tsx";
import History from "./pages/History.tsx";
import Plans from "./pages/Plans.tsx";
import Feedback from "./pages/Feedback.tsx";
import Coach from "./pages/Coach.tsx";
import Auth from "./pages/Auth.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import Refunds from "./pages/Refunds.tsx";
import Settings from "./pages/Settings.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import NotFound from "./pages/NotFound.tsx";
import { WelcomeTutorial } from "./components/WelcomeTutorial";
import { PrivacyConsent } from "./components/PrivacyConsent";
import { AuthProvider } from "./hooks/useAuth";
import { PaymentTestModeBanner } from "./components/PaymentTestModeBanner";
import { readPreferences, usePreferences } from "./hooks/usePreferences";

const queryClient = new QueryClient();

const OnboardingGate = ({ children }: { children: React.ReactNode }) => {
  const { isComplete } = usePreferences();
  const location = useLocation();
  const completedAt = readPreferences().completedAt;
  const exempt = ["/onboarding", "/auth", "/privacy", "/terms", "/refunds"].some((p) =>
    location.pathname.startsWith(p),
  );

  if (isComplete || completedAt) {
    console.log("[ONBOARDING DEBUG] Gate detected completion", {
      pathname: location.pathname,
      completedAt,
    });
  }

  if (!isComplete && !completedAt && !exempt) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <AuthProvider>
          <PaymentTestModeBanner />
          <PrivacyConsent />
          <WelcomeTutorial />
          <OnboardingGate>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/roll" element={<Roll />} />
              <Route path="/history" element={<History />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/coach" element={<Coach />} />
              <Route path="/coach/:threadId" element={<Coach />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/refunds" element={<Refunds />} />
              <Route path="/settings" element={<Settings />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </OnboardingGate>
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
