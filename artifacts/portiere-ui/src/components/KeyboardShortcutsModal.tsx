interface Props {
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ["⌘", "K"], description: "Focus the input bar" },
  { keys: ["Enter"], description: "Send message" },
  { keys: ["Shift", "Enter"], description: "New line in input" },
  { keys: ["Escape"], description: "Close this panel / cancel" },
  { keys: ["?"], description: "Show keyboard shortcuts" },
  { keys: ["⌘", "E"], description: "Export conversation" },
  { keys: ["⌘", "T"], description: "Open prompt templates" },
  { keys: ["⌘", "/"], description: "Toggle voice input" },
];

export default function KeyboardShortcutsModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden animate-feed-in"
        style={{
          background: "hsl(238 20% 7%)",
          border: "1px solid hsl(238 18% 14%)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid hsl(238 18% 11%)" }}
        >
          <span className="text-[14px] font-semibold" style={{ color: "hsl(240 20% 94%)", letterSpacing: "-0.02em" }}>
            Keyboard shortcuts
          </span>
          <button
            onClick={onClose}
            className="text-[12px] px-2.5 py-1 rounded-lg transition-colors"
            style={{ color: "hsl(238 18% 44%)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
          >
            Esc
          </button>
        </div>

        <div className="px-5 py-4 space-y-1.5">
          {SHORTCUTS.map(({ keys, description }) => (
            <div key={description} className="flex items-center justify-between gap-4 py-1.5">
              <span className="text-[13px]" style={{ color: "hsl(238 18% 60%)" }}>{description}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {keys.map((k, i) => (
                  <kbd
                    key={i}
                    className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                    style={{
                      backgroundColor: "hsl(238 18% 11%)",
                      border: "1px solid hsl(238 18% 16%)",
                      color: "hsl(240 20% 82%)",
                      fontFamily: "var(--app-font-mono)",
                    }}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          className="px-5 py-3 text-[11px] text-center"
          style={{ borderTop: "1px solid hsl(238 18% 10%)", color: "hsl(238 18% 32%)" }}
        >
          Press <kbd
            className="px-1.5 py-px rounded text-[10px] mx-0.5"
            style={{ backgroundColor: "hsl(238 18% 11%)", border: "1px solid hsl(238 18% 16%)", color: "hsl(240 20% 72%)" }}
          >?</kbd> anytime to open this
        </div>
      </div>
    </div>
  );
}
