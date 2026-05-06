import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ConsolePage from "@/pages/ConsolePage";
import SettingsPage from "@/pages/SettingsPage";
import ModelsPage from "@/pages/ModelsPage";
import Sidebar from "@/components/Sidebar";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Switch>
          <Route path="/" component={ConsolePage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/models" component={ModelsPage} />
          <Route>
            <div className="flex-1 flex items-center justify-center text-muted-foreground font-mono text-sm">
              404 — route not found
            </div>
          </Route>
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AppShell />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
