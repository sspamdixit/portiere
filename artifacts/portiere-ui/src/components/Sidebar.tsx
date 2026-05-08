import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { MessageSquare, Cpu, Settings, Plus, Trash2, Search, Pin, PinOff, Sun, Moon } from "lucide-react";
import { getSessions, deleteSession, togglePin, relativeTime, searchSessions, type Session } from "@/lib/sessions";
import { useSession } from "@/lib/SessionContext";

const B = "#141414";          // background
const SURFACE = "#0F0E0C";    // sidebar (slightly deeper)
const BORDER = "#242018";     // border
const AMBER = "#CC7722";      // burnt amber
const OXBLOOD = "#600000";    // active state
const TEXT = "#E2D0B4";       // primary text
const MUTED = "#7A6A54";      // muted text
const DIM = "#4A3A28";        // dim text

const nav = [
  { href: "/",             icon: MessageSquare, label: "Chat"         },
  { href: "/capabilities", icon: Cpu,           label: "Capabilities" },
  { href: "/settings",     icon: Settings,      label: "Settings"     },
];

export default function Sidebar() {
  const [location, navigate] = useLocation();
  const { setLoadedSession, sidebarKey, notifySessionSaved } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const [isDark, setIsDark] = useState(() => localStorage.getItem("portiere_theme") !== "light");

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("portiere_theme", next ? "dark" : "light");
    document.body.classList.toggle("light-mode", !next);
  };

  useEffect(() => {
    document.body.classList.toggle("light-mode", !isDark);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSessions(getSessions());
  }, [sidebarKey, notifySessionSaved]);

  useEffect(() => {
    if (showSearch) searchRef.current?.focus();
  }, [showSearch]);

  const handleSessionClick = (s: Session) => {
    setLoadedSession(s);
    navigate("/");
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteSession(id);
    setSessions(getSessions());
  };

  const handlePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    togglePin(id);
    setSessions(getSessions());
  };

  const handleNewChat = () => {
    setLoadedSession(null);
    navigate("/");
  };

  const filtered = search.trim() ? searchSessions(search) : sessions;
  const pinned = filtered.filter(s => s.pinned);
  const recent = filtered.filter(s => !s.pinned);

  return (
    <aside
      className="w-[218px] flex-shrink-0 flex flex-col"
      style={{
        background: SURFACE,
        borderRight: `1px solid ${BORDER}`,
      }}
    >
      {/* Brand */}
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3 px-1">
          <div className="relative flex-shrink-0">
            <div
              className="absolute rounded-full pointer-events-none animate-logo-breathe"
              style={{ inset: "-6px", background: "rgba(96,0,0,0.35)", filter: "blur(10px)" }}
            />
            <div
              className="relative w-8 h-8 flex items-center justify-center"
              style={{
                background: "linear-gradient(140deg, #7A0000 0%, #400000 100%)",
                border: "1px solid rgba(204,119,34,0.3)",
                borderRadius: "3px",
                boxShadow: "0 2px 10px rgba(96,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset",
              }}
            >
              <span className="text-[15px] leading-none select-none" style={{ color: AMBER }}>◈</span>
            </div>
          </div>
          <div className="min-w-0">
            <span
              className="text-[15px] block"
              style={{
                color: TEXT,
                letterSpacing: "-0.015em",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 500,
                fontSize: "17px",
              }}
            >
              Portiere
            </span>
            <p className="text-[10px] font-medium leading-none mt-0.5" style={{ color: DIM, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              AI Concierge
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 mb-2 h-px" style={{ background: BORDER }} />

      {/* Nav */}
      <nav className="px-2 flex flex-col gap-px flex-shrink-0">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = location === href || (href !== "/" && location.startsWith(href));
          return (
            <Link key={href} href={href}>
              <div
                className="group relative flex items-center gap-2.5 h-9 px-3 cursor-pointer text-[13px] font-medium transition-all duration-100"
                style={{
                  borderRadius: "2px",
                  color: active ? TEXT : MUTED,
                  backgroundColor: active ? "rgba(96,0,0,0.16)" : "transparent",
                  borderLeft: active ? `2px solid ${OXBLOOD}` : "2px solid transparent",
                  letterSpacing: "-0.005em",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = "#B8A080";
                    (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.025)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = MUTED;
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }
                }}
              >
                <Icon
                  size={14}
                  className="flex-shrink-0"
                  style={{
                    color: active ? AMBER : "currentColor",
                    opacity: active ? 1 : 0.55,
                    strokeWidth: active ? 2.2 : 1.8,
                  }}
                />
                <span>{label}</span>
                {active && (
                  <div
                    className="ml-auto w-1 h-1 flex-shrink-0"
                    style={{ background: AMBER, opacity: 0.7, borderRadius: "1px" }}
                  />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* New chat + search row */}
      <div className="px-2 mt-2 flex items-center gap-1 flex-shrink-0">
        <button
          onClick={handleNewChat}
          className="flex-1 flex items-center gap-2 h-8 px-3 text-[12.5px] font-medium transition-all duration-100"
          style={{ color: DIM, letterSpacing: "-0.01em", borderRadius: "2px" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = "#B8A080";
            (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.028)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = DIM;
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
          }}
        >
          <Plus size={12} style={{ opacity: 0.6, strokeWidth: 2.5 }} />
          New chat
        </button>
        <button
          onClick={() => setShowSearch(v => !v)}
          className="flex items-center justify-center w-8 h-8 transition-all"
          style={{ color: showSearch ? AMBER : DIM, borderRadius: "2px" }}
          title="Search sessions"
          onMouseEnter={e => { if (!showSearch) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.03)"; }}
          onMouseLeave={e => { if (!showSearch) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
        >
          <Search size={11} />
        </button>
      </div>

      {/* Search input */}
      {showSearch && (
        <div className="px-2 mt-1.5 flex-shrink-0 animate-feed-in">
          <div className="relative">
            <Search size={10} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: DIM }} />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search history & content…"
              className="w-full text-[12px] outline-none"
              style={{
                backgroundColor: "#111009",
                border: `1px solid ${BORDER}`,
                borderRadius: "2px",
                color: TEXT,
                padding: "6px 10px 6px 26px",
                caretColor: AMBER,
                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
              }}
            />
          </div>
          {search.trim() && (
            <p className="text-[10.5px] mt-1 px-1" style={{ color: DIM }}>
              Searching titles & messages
            </p>
          )}
        </div>
      )}

      {/* Session history */}
      {sessions.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0 mt-3">
          <div className="mx-4 mb-2.5 h-px" style={{ background: BORDER }} />

          <div className="flex-1 overflow-y-auto feed-scroll px-2 pb-3 flex flex-col gap-px">
            {pinned.length > 0 && (
              <>
                <p className="text-[10px] font-semibold px-3 pb-1 flex items-center gap-1.5"
                  style={{ color: `${AMBER}99`, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  <Pin size={8} style={{ strokeWidth: 2.5 }} /> Pinned
                </p>
                {pinned.map(s => (
                  <SessionItem key={s.id} s={s} onClick={handleSessionClick} onDelete={handleDelete} onPin={handlePin} />
                ))}
                {recent.length > 0 && (
                  <div className="mx-1 my-1.5 h-px" style={{ background: BORDER }} />
                )}
              </>
            )}

            {recent.length > 0 && (
              <>
                {pinned.length === 0 && (
                  <p className="text-[10px] font-semibold px-3 pb-1"
                    style={{ color: DIM, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Recent
                  </p>
                )}
                {recent.map(s => (
                  <SessionItem key={s.id} s={s} onClick={handleSessionClick} onDelete={handleDelete} onPin={handlePin} />
                ))}
              </>
            )}

            {search && filtered.length === 0 && (
              <p className="text-[12px] text-center py-6" style={{ color: DIM }}>
                No sessions match
              </p>
            )}
          </div>
        </div>
      )}

      {sessions.length === 0 && <div className="flex-1" />}

      {/* Footer */}
      <div
        className="px-5 py-3.5 flex-shrink-0"
        style={{ borderTop: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="relative h-1.5 w-1.5 flex-shrink-0"
            style={{
              background: AMBER,
              boxShadow: `0 0 4px ${AMBER}`,
              borderRadius: "1px",
            }}
          />
          <span className="text-[11px]" style={{ color: DIM, letterSpacing: "-0.005em" }}>
            13 capabilities ready
          </span>
          <button
            onClick={toggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="ml-auto p-1.5 transition-all"
            style={{ color: DIM, borderRadius: "2px" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = MUTED; (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.03)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = DIM; (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
          >
            {isDark ? <Sun size={11} /> : <Moon size={11} />}
          </button>
        </div>
      </div>
    </aside>
  );
}

function SessionItem({
  s,
  onClick,
  onDelete,
  onPin,
}: {
  s: Session;
  onClick: (s: Session) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onPin: (e: React.MouseEvent, id: string) => void;
}) {
  const AMBER = "#CC7722";
  const DIM = "#4A3A28";
  return (
    <button
      onClick={() => onClick(s)}
      className="group relative flex flex-col text-left gap-0.5 px-3 py-2 w-full transition-all duration-100"
      style={{ backgroundColor: "transparent", borderRadius: "2px" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.025)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
    >
      <span
        className="text-[12px] truncate w-full pr-12 leading-snug font-medium"
        style={{
          color: s.pinned ? "rgba(226,208,180,0.75)" : "rgba(226,208,180,0.5)",
          letterSpacing: "-0.01em",
        }}
      >
        {s.title}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-[10.5px]" style={{ color: DIM }}>
          {relativeTime(s.timestamp)}
        </span>
        {s.tags && s.tags.length > 0 && (
          <div className="flex gap-1">
            {s.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 font-medium"
                style={{ background: "rgba(165,124,0,0.1)", color: AMBER, border: "1px solid rgba(165,124,0,0.22)", borderRadius: "1px" }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => onPin(e, s.id)}
          className="p-1 transition-colors"
          style={{ color: s.pinned ? AMBER : "#4A3A28", borderRadius: "2px" }}
          title={s.pinned ? "Unpin" : "Pin"}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.05)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
        >
          {s.pinned ? <PinOff size={10} /> : <Pin size={10} />}
        </button>
        <button
          onClick={e => onDelete(e, s.id)}
          className="p-1 transition-colors"
          style={{ color: "#4A3A28", borderRadius: "2px" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(96,0,0,0.18)"; (e.currentTarget as HTMLElement).style.color = "#CC4444"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "#4A3A28"; }}
        >
          <Trash2 size={10} />
        </button>
      </div>
    </button>
  );
}
