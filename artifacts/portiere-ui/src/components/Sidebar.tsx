import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { MessageSquare, Cpu, Settings, Plus, Trash2 } from "lucide-react";
import { getSessions, deleteSession, relativeTime, type Session } from "@/lib/sessions";
import { useSession } from "@/lib/SessionContext";

const nav = [
  { href: "/",             icon: MessageSquare, label: "Chat"         },
  { href: "/capabilities", icon: Cpu,           label: "Capabilities" },
  { href: "/settings",     icon: Settings,      label: "Settings"     },
];

const dim = "hsl(242 17% 32%)";

export default function Sidebar() {
  const [location, navigate] = useLocation();
  const { setLoadedSession, sidebarKey, notifySessionSaved } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    setSessions(getSessions());
  }, [sidebarKey]);

  const handleSessionClick = (s: Session) => {
    setLoadedSession(s);
    navigate("/");
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteSession(id);
    setSessions(getSessions());
  };

  const handleNewChat = () => {
    setLoadedSession(null);
    navigate("/");
  };

  return (
    <aside
      className="w-[220px] flex-shrink-0 flex flex-col border-r border-sidebar-border"
      style={{ background: "linear-gradient(180deg, hsl(240 22% 7%) 0%, hsl(240 21% 5%) 100%)" }}
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
        <p className="text-[11px] mt-2 pl-[37px] text-muted-foreground tracking-wide">AI Concierge</p>
      </div>

      {/* Divider */}
      <div
        className="mx-5 mb-3 h-px"
        style={{ background: "linear-gradient(90deg, transparent, hsl(240 24% 14%) 30%, hsl(240 24% 14%) 70%, transparent)" }}
      />

      {/* Nav */}
      <nav className="px-3 flex flex-col gap-0.5 flex-shrink-0">
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
                <Icon size={16} className="flex-shrink-0" style={{ opacity: active ? 1 : 0.7 }} />
                <span>{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* New chat button */}
      <div className="px-3 mt-2 flex-shrink-0">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-[13px] font-medium transition-all duration-150 hover:bg-white/[0.04]"
          style={{ color: "hsl(242 18% 50%)" }}
        >
          <Plus size={14} style={{ opacity: 0.7 }} />
          New chat
        </button>
      </div>

      {/* Session history */}
      {sessions.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0 mt-3">
          <div
            className="mx-5 mb-2 h-px"
            style={{ background: "linear-gradient(90deg, transparent, hsl(240 24% 12%) 30%, hsl(240 24% 12%) 70%, transparent)" }}
          />
          <p
            className="text-[10px] uppercase tracking-widest font-semibold px-6 pb-1.5"
            style={{ color: dim }}
          >
            Recent
          </p>
          <div className="flex-1 overflow-y-auto feed-scroll px-3 pb-2 flex flex-col gap-0.5">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => handleSessionClick(s)}
                className="group relative flex flex-col text-left gap-0.5 px-3 py-2 rounded-lg w-full transition-all duration-150 hover:bg-white/[0.04]"
              >
                <span
                  className="text-[12px] truncate w-full pr-5"
                  style={{ color: "hsl(244 100% 90% / 0.7)" }}
                >
                  {s.title}
                </span>
                <span className="text-[10px]" style={{ color: dim }}>
                  {relativeTime(s.timestamp)}
                </span>
                <button
                  onClick={e => handleDelete(e, s.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                  style={{ color: dim }}
                >
                  <Trash2 size={11} />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

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
          <span className="text-[11px] text-muted-foreground tracking-wide">8 capabilities online</span>
        </div>
      </div>
    </aside>
  );
}
