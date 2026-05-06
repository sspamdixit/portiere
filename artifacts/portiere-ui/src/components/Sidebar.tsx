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
    <aside
      className="w-[220px] flex-shrink-0 flex flex-col border-r border-sidebar-border"
      style={{
        background: "linear-gradient(180deg, hsl(240 22% 7%) 0%, hsl(240 21% 5%) 100%)",
      }}
    >
      {/* Brand */}
      <div className="px-5 py-6 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, hsl(246 89% 65%) 0%, hsl(258 75% 72%) 100%)",
              boxShadow: "0 2px 8px rgba(124,111,247,0.35)",
            }}
          >
            <span className="text-white text-[13px] font-bold leading-none select-none">◈</span>
          </div>
          <span className="text-[15px] font-semibold text-foreground tracking-tight">Portiere</span>
        </div>
        <p className="text-[11px] mt-2 pl-[37px] text-muted-foreground tracking-wide">AI Orchestrator</p>
      </div>

      {/* Divider */}
      <div className="mx-5 mb-2 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(240 24% 14%) 30%, hsl(240 24% 14%) 70%, transparent)" }} />

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = location === href || (href !== "/" && location.startsWith(href));
          return (
            <Link key={href} href={href}>
              <div
                className="group relative flex items-center gap-3 h-10 px-3 rounded-lg cursor-pointer text-[13.5px] font-medium transition-all duration-150"
                style={{
                  color: active ? "hsl(244 100% 97%)" : "hsl(242 18% 55%)",
                  backgroundColor: active ? "rgba(124,111,247,0.13)" : "transparent",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = "hsl(244 100% 92%)";
                    (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.04)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = "hsl(242 18% 55%)";
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }
                }}
              >
                {active && (
                  <div
                    className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full"
                    style={{ background: "linear-gradient(180deg, hsl(246 89% 72%) 0%, hsl(258 75% 70%) 100%)" }}
                  />
                )}
                <Icon
                  size={16}
                  className="flex-shrink-0 transition-opacity duration-150"
                  style={{ opacity: active ? 1 : 0.7 }}
                />
                <span>{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-5 py-4 flex-shrink-0"
        style={{ borderTop: "1px solid hsl(240 24% 11%)" }}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex h-1.5 w-1.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
          </div>
          <span className="text-[11px] text-muted-foreground tracking-wide">4 workers online</span>
        </div>
      </div>
    </aside>
  );
}
