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

export default function Sidebar() {
  const [location, navigate] = useLocation();
  const { setLoadedSession, sidebarKey, notifySessionSaved } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    setSessions(getSessions());
  }, [sidebarKey, notifySessionSaved]);

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
      className="w-[212px] flex-shrink-0 flex flex-col"
      style={{
        background: "hsl(240 22% 5%)",
        borderRight: "1px solid hsl(240 20% 9%)",
      }}
    >
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2.5 px-1">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, hsl(246 89% 63%) 0%, hsl(258 72% 68%) 100%)",
              boxShadow: "0 2px 10px rgba(124,111,247,0.42), 0 0 0 1px rgba(255,255,255,0.06) inset",
            }}
          >
            <span className="text-white text-[13px] font-bold leading-none select-none">◈</span>
          </div>
          <div>
            <span
              className="text-[15px] font-semibold tracking-tight"
              style={{ color: "hsl(244 30% 96%)", letterSpacing: "-0.02em" }}
            >
              Portiere
            </span>
            <p className="text-[10px] leading-none mt-0.5" style={{ color: "hsl(242 18% 40%)", letterSpacing: "0.04em" }}>
              AI CONCIERGE
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 mb-2 h-px" style={{ background: "hsl(240 20% 9%)" }} />

      {/* Nav */}
      <nav className="px-2.5 flex flex-col gap-0.5 flex-shrink-0 mt-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = location === href || (href !== "/" && location.startsWith(href));
          return (
            <Link key={href} href={href}>
              <div
                className="group relative flex items-center gap-2.5 h-9 px-3 rounded-xl cursor-pointer text-[13px] font-medium transition-all duration-150"
                style={{
                  color: active ? "hsl(244 30% 97%)" : "hsl(242 18% 50%)",
                  backgroundColor: active ? "rgba(124,111,247,0.14)" : "transparent",
                  letterSpacing: "-0.01em",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = "hsl(244 30% 88%)";
                    (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.04)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = "hsl(242 18% 50%)";
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }
                }}
              >
                {active && (
                  <div
                    className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-full"
                    style={{ background: "linear-gradient(180deg, hsl(246 89% 72%) 0%, hsl(258 72% 70%) 100%)" }}
                  />
                )}
                <Icon
                  size={15}
                  className="flex-shrink-0"
                  style={{ color: active ? "hsl(246 89% 74%)" : "currentColor", opacity: active ? 1 : 0.65 }}
                />
                <span>{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* New chat */}
      <div className="px-2.5 mt-1 flex-shrink-0">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2.5 h-9 px-3 rounded-xl text-[13px] font-medium transition-all duration-150 hover:bg-white/[0.04]"
          style={{ color: "hsl(242 18% 44%)", letterSpacing: "-0.01em" }}
        >
          <Plus size={14} style={{ opacity: 0.6 }} />
          New chat
        </button>
      </div>

      {/* Session history */}
      {sessions.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0 mt-3">
          <div className="mx-4 mb-2 h-px" style={{ background: "hsl(240 20% 9%)" }} />
          <p
            className="text-[10px] font-semibold px-5 pb-1.5"
            style={{ color: "hsl(242 17% 32%)", letterSpacing: "0.06em", textTransform: "uppercase" }}
          >
            Recent
          </p>
          <div className="flex-1 overflow-y-auto feed-scroll px-2.5 pb-2 flex flex-col gap-px">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => handleSessionClick(s)}
                className="group relative flex flex-col text-left gap-0.5 px-3 py-2 rounded-xl w-full transition-all duration-150 hover:bg-white/[0.035]"
              >
                <span
                  className="text-[12px] truncate w-full pr-5 leading-snug"
                  style={{ color: "hsl(244 30% 85% / 0.65)", letterSpacing: "-0.01em" }}
                >
                  {s.title}
                </span>
                <span className="text-[10px]" style={{ color: "hsl(242 17% 32%)" }}>
                  {relativeTime(s.timestamp)}
                </span>
                <button
                  onClick={e => handleDelete(e, s.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-white/[0.06]"
                  style={{ color: "hsl(242 17% 38%)" }}
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
        className="px-5 py-3.5 flex-shrink-0"
        style={{ borderTop: "1px solid hsl(240 20% 9%)" }}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex h-1.5 w-1.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-50" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
          </div>
          <span className="text-[11px]" style={{ color: "hsl(242 18% 38%)", letterSpacing: "0.02em" }}>
            13 capabilities online
          </span>
        </div>
      </div>
    </aside>
  );
}
