import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ConsolePage from "@/pages/ConsolePage";
import SettingsPage from "@/pages/SettingsPage";
import ModelsPage from "@/pages/ModelsPage";
import ReceiverPage from "@/pages/ReceiverPage";
import Sidebar from "@/components/Sidebar";
import OnboardingModal from "@/components/OnboardingModal";
import { SessionProvider } from "@/lib/SessionContext";
import { fetchSettings } from "@/lib/api";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function AppShell() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    fetchSettings()
      .then(data => setShowOnboarding(data.first_launch === true))
      .catch(() => setShowOnboarding(false));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Switch>
          <Route path="/" component={ReceiverPage} />
          <Route path="/console" component={ConsolePage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/capabilities" component={ModelsPage} />
          <Route path="/models" component={ModelsPage} />
          <Route>
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              404: page not found
            </div>
          </Route>
        </Switch>
      </main>
      {showOnboarding === true && (
        <OnboardingModal onDone={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppShell />
        </WouterRouter>
      </SessionProvider>
    </QueryClientProvider>
  );
}
