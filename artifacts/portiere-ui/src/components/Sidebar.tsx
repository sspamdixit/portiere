import { Link, useLocation } from "wouter";
import { MessageSquare, Cpu, Settings } from "lucide-react";

const nav = [
  { href: "/",         icon: MessageSquare, label: "Chat"     },
  { href: "/models",   icon: Cpu,           label: "Workers"  },
  { href: "/settings", icon: Settings,      label: "Settings" },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className="px-6 py-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[18px] text-primary leading-none select-none">◈</span>
          <span className="text-[16px] font-semibold text-foreground tracking-tight">Portiere</span>
        </div>
        <p className="text-[12px] mt-1 text-muted-foreground">AI Orchestrator</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = location === href || (href !== "/" && location.startsWith(href));
          return (
            <Link key={href} href={href}>
              <div
                className="relative flex items-center gap-3 h-10 px-3 rounded-md cursor-pointer transition-colors text-[14px]"
                style={{
                  color: active ? "hsl(244 100% 97%)" : "hsl(242 18% 61%)",
                  backgroundColor: active ? "rgba(124,111,247,0.12)" : "transparent",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "hsl(244 100% 97%)"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "hsl(242 18% 61%)"; }}
              >
                {active && (
                  <div
                    className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full"
                    style={{ backgroundColor: "hsl(246 89% 70%)" }}
                  />
                )}
                <Icon size={17} className="flex-shrink-0" />
                <span>{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Workers online indicator */}
      <div className="px-6 py-4 border-t border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex h-1.5 w-1.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
          </div>
          <span className="text-[11px] text-muted-foreground">4 workers online</span>
        </div>
      </div>
    </aside>
  );
}
