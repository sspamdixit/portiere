import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { MessageSquare, Cpu, Settings, Plus, Trash2, Zap } from "lucide-react";
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
      className="w-[218px] flex-shrink-0 flex flex-col"
      style={{
        background: "hsl(238 22% 4%)",
        borderRight: "1px solid hsl(238 20% 8%)",
      }}
    >
      {/* Brand */}
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3 px-1">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 relative"
            style={{
              background: "linear-gradient(135deg, hsl(248 82% 62%) 0%, hsl(264 70% 66%) 100%)",
              boxShadow: "0 0 16px rgba(109,95,234,0.45), 0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.08) inset",
            }}
          >
            <span className="text-white text-[15px] font-bold leading-none select-none">◈</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[15px] font-semibold"
                style={{ color: "hsl(240 20% 97%)", letterSpacing: "-0.025em" }}
              >
                Portiere
              </span>
            </div>
            <p className="text-[10px] font-medium leading-none mt-0.5 tracking-widest uppercase" style={{ color: "hsl(240 16% 36%)" }}>
              Concierge
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 mb-2 h-px" style={{ background: "hsl(238 20% 8%)" }} />

      {/* Nav */}
      <nav className="px-2 flex flex-col gap-0.5 flex-shrink-0">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = location === href || (href !== "/" && location.startsWith(href));
          return (
            <Link key={href} href={href}>
              <div
                className="group relative flex items-center gap-2.5 h-9 px-3 rounded-xl cursor-pointer text-[13px] font-medium transition-all duration-100"
                style={{
                  color: active ? "hsl(240 20% 96%)" : "hsl(240 16% 44%)",
                  backgroundColor: active ? "rgba(109,95,234,0.13)" : "transparent",
                  letterSpacing: "-0.01em",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = "hsl(240 20% 78%)";
                    (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.04)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = "hsl(240 16% 44%)";
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }
                }}
              >
                {active && (
                  <div
                    className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                    style={{
                      background: "linear-gradient(180deg, hsl(248 82% 72%) 0%, hsl(264 68% 70%) 100%)",
                    }}
                  />
                )}
                <Icon
                  size={15}
                  className="flex-shrink-0"
                  style={{
                    color: active ? "hsl(248 90% 74%)" : "currentColor",
                    opacity: active ? 1 : 0.6,
                    strokeWidth: active ? 2.2 : 1.8,
                  }}
                />
                <span>{label}</span>
                {active && (
                  <div
                    className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: "hsl(248 90% 72%)", opacity: 0.6 }}
                  />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* New chat button */}
      <div className="px-2 mt-2 flex-shrink-0">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2.5 h-8 px-3 rounded-xl text-[12.5px] font-medium transition-all duration-100"
          style={{ color: "hsl(240 16% 40%)", letterSpacing: "-0.01em" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = "hsl(240 20% 72%)";
            (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.035)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = "hsl(240 16% 40%)";
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
          }}
        >
          <Plus size={13} style={{ opacity: 0.55, strokeWidth: 2.5 }} />
          New chat
        </button>
      </div>

      {/* Session history */}
      {sessions.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0 mt-3">
          <div className="mx-4 mb-2.5 h-px" style={{ background: "hsl(238 20% 8%)" }} />
          <p
            className="text-[10px] font-semibold px-5 pb-1"
            style={{ color: "hsl(240 16% 28%)", letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            Recent
          </p>
          <div className="flex-1 overflow-y-auto feed-scroll px-2 pb-3 flex flex-col gap-px">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => handleSessionClick(s)}
                className="group relative flex flex-col text-left gap-0.5 px-3 py-2 rounded-xl w-full transition-all duration-100"
                style={{ backgroundColor: "transparent" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
              >
                <span
                  className="text-[12px] truncate w-full pr-5 leading-snug font-medium"
                  style={{ color: "hsl(240 20% 76% / 0.6)", letterSpacing: "-0.01em" }}
                >
                  {s.title}
                </span>
                <span className="text-[10.5px]" style={{ color: "hsl(240 16% 28%)" }}>
                  {relativeTime(s.timestamp)}
                </span>
                <button
                  onClick={e => handleDelete(e, s.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg"
                  style={{ color: "hsl(240 16% 36%)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                >
                  <Trash2 size={10} />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Spacer if no sessions */}
      {sessions.length === 0 && <div className="flex-1" />}

      {/* Footer */}
      <div
        className="px-5 py-3.5 flex-shrink-0"
        style={{ borderTop: "1px solid hsl(238 20% 8%)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="relative h-1.5 w-1.5 flex-shrink-0 rounded-full"
            style={{ background: "hsl(var(--accent))", boxShadow: "0 0 6px hsl(var(--accent))" }}
          />
          <span className="text-[11px] font-medium" style={{ color: "hsl(240 16% 34%)", letterSpacing: "0.01em" }}>
            13 capabilities
          </span>
          <Zap size={9} style={{ color: "hsl(240 16% 30%)", marginLeft: "auto" }} />
        </div>
      </div>
    </aside>
  );
}
