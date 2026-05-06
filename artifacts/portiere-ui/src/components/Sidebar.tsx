import { Link, useLocation } from "wouter";
import { Terminal, Settings, Cpu, Activity } from "lucide-react";

const nav = [
  { href: "/", icon: Terminal, label: "Console", desc: "Orchestration" },
  { href: "/models", icon: Cpu, label: "Models", desc: "Local AI" },
  { href: "/settings", icon: Settings, label: "Vault", desc: "API Keys" },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-[200px] flex-shrink-0 flex flex-col border-r border-border bg-sidebar">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="font-mono text-sm font-semibold text-foreground tracking-wide">PORTIERE</p>
            <p className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">Orchestrator</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {nav.map(({ href, icon: Icon, label, desc }) => {
          const active = location === href || (href !== "/" && location.startsWith(href));
          return (
            <Link key={href} href={href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded cursor-pointer transition-all duration-150 group ${
                  active
                    ? "bg-primary/10 border-l-2 border-primary ml-0 pl-[10px]"
                    : "border-l-2 border-transparent hover:bg-sidebar-accent"
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"}`} />
                <div>
                  <p className={`text-xs font-medium ${active ? "text-primary" : "text-sidebar-foreground"}`}>{label}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-sidebar-border">
        <p className="font-mono text-[10px] text-muted-foreground">v0.1.0 · local-first</p>
      </div>
    </aside>
  );
}
