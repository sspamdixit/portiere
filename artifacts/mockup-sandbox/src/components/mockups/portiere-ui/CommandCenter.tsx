import React, { useState } from "react";
import { 
  MessageSquare, Clock, Cpu, Settings, Brain, ArrowUp, Paperclip, ChevronRight
} from "lucide-react";

export function CommandCenter() {
  const [traceExpanded, setTraceExpanded] = useState(false);

  return (
    <div 
      className="flex flex-row overflow-hidden antialiased"
      style={{ 
        width: "1280px", 
        height: "800px", 
        backgroundColor: "#09090e",
        color: "#f1f0ff",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #252540;
          border-radius: 4px;
        }
        .code-block {
          font-family: 'JetBrains Mono', monospace;
        }
      `}} />

      {/* Sidebar */}
      <div 
        className="flex flex-col flex-shrink-0"
        style={{ width: "220px", backgroundColor: "#0d0d14" }}
      >
        {/* Brand */}
        <div className="p-6 flex flex-col gap-1">
          <div className="flex items-center gap-2 font-semibold text-[16px] text-[#f1f0ff]">
            <span style={{ color: "#7c6ff7" }}>◈</span>
            <span>Portiere</span>
          </div>
          <span className="text-[12px]" style={{ color: "#4d4c6a" }}>AI Orchestrator</span>
        </div>

        {/* Nav Items */}
        <div className="flex flex-col gap-1 mt-4">
          <NavItem icon={<MessageSquare size={20} />} label="Chat" active />
          <NavItem icon={<Clock size={20} />} label="History" />
          <NavItem icon={<Cpu size={20} />} label="Workers" />
          <NavItem icon={<Settings size={20} />} label="Settings" />
        </div>

        <div className="mt-auto p-6">
          <div className="flex items-center gap-2">
            <div className="relative flex h-2 w-2 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "#22c55e" }}></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: "#22c55e" }}></span>
            </div>
            <span className="text-[11px]" style={{ color: "#4d4c6a" }}>4 workers online</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 relative overflow-hidden">
        {/* Header */}
        <div 
          className="h-[48px] flex items-center justify-between px-6 flex-shrink-0"
          style={{ borderBottom: "1px solid #252540" }}
        >
          <div className="flex items-center gap-2 text-[14px]">
            <span style={{ color: "#f1f0ff" }}>Chat</span>
            <ChevronRight size={14} style={{ color: "#4d4c6a" }} />
            <span style={{ color: "#8b8aad" }}>github.com investigation</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-2 py-0.5 rounded-md text-[12px]" style={{ backgroundColor: "#12121a", border: "1px solid #1c1c2e", color: "#f1f0ff" }}>
              Run #12
            </div>
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "#22c55e" }}>
              ● Complete
            </div>
          </div>
        </div>

        {/* Feed area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pb-48">
          <div className="w-full max-w-4xl mx-auto flex flex-col px-8 py-8 gap-8">
            
            {/* User message */}
            <div className="flex flex-col items-end w-full gap-1">
              <span className="text-[12px]" style={{ color: "#4d4c6a" }}>You</span>
              <div className="text-[15px] max-w-[60%] text-right leading-relaxed" style={{ color: "#f1f0ff" }}>
                Investigate github.com
              </div>
            </div>

            {/* Orchestration trace */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Brain size={14} style={{ color: "#4d4c6a" }} />
                <span className="text-[13px]" style={{ color: "#4d4c6a" }}>Brain routed to OSINT — 2 steps planned</span>
                <button 
                  onClick={() => setTraceExpanded(!traceExpanded)}
                  className="text-[13px] ml-1 hover:underline flex items-center" 
                  style={{ color: "#7c6ff7" }}
                >
                  {traceExpanded ? '▾ Hide trace' : '▸ View trace'}
                </button>
              </div>
              {traceExpanded && (
                <div className="text-[13px] pl-6 mt-1 border-l" style={{ color: "#8b8aad", borderColor: "#252540" }}>
                  Step 1: DNS & Domain analysis<br/>
                  Step 2: HTTP server fingerprinting
                </div>
              )}
            </div>

            {/* OSINT worker output */}
            <div className="flex flex-col w-full">
              <div className="flex justify-between items-center mb-3 px-1">
                <div className="px-1.5 py-0.5 rounded text-[11px] font-medium tracking-wide" style={{ backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
                  OSINT
                </div>
                <div className="text-[12px]" style={{ color: "#4d4c6a" }}>
                  finished in 2.1s
                </div>
              </div>

              <div 
                className="rounded-xl p-5 w-full flex flex-col gap-6"
                style={{ backgroundColor: "#12121a", border: "1px solid rgba(28, 28, 46, 0.5)" }}
              >
                {/* Section 1 */}
                <div className="grid grid-cols-[120px_1fr] gap-y-3 text-[14px]">
                  <div style={{ color: "#8b8aad" }}>Domain</div>
                  <div className="code-block" style={{ color: "#f1f0ff" }}>github.com</div>
                  
                  <div style={{ color: "#8b8aad" }}>Registered</div>
                  <div className="code-block" style={{ color: "#f1f0ff" }}>2007-10-09 <span style={{ color: "#4d4c6a" }}>·</span> MarkMonitor Inc.</div>
                </div>

                {/* Section 2 */}
                <div className="grid grid-cols-[120px_1fr] gap-y-3 text-[14px]">
                  <div className="col-span-2 text-[12px] uppercase tracking-wider mb-1 font-medium" style={{ color: "#4d4c6a" }}>DNS Records</div>
                  
                  <div style={{ color: "#8b8aad" }}>A</div>
                  <div className="code-block" style={{ color: "#f1f0ff" }}>140.82.113.3, 140.82.112.4</div>
                  
                  <div style={{ color: "#8b8aad" }}>MX</div>
                  <div className="code-block" style={{ color: "#f1f0ff" }}>10 alt1.aspmx.l.google.com</div>
                  
                  <div style={{ color: "#8b8aad" }}>TXT</div>
                  <div className="code-block" style={{ color: "#f1f0ff" }}>v=spf1 include:_spf.github.com ~all</div>
                </div>

                {/* Section 3 */}
                <div className="grid grid-cols-[120px_1fr] gap-y-3 text-[14px]">
                  <div style={{ color: "#8b8aad" }}>HTTP</div>
                  <div className="code-block flex items-center gap-2" style={{ color: "#f1f0ff" }}>
                    <span style={{ color: "#22c55e" }}>200 OK</span>
                    <span style={{ color: "#4d4c6a" }}>·</span>
                    <span>server: GitHub.com</span>
                    <span style={{ color: "#4d4c6a" }}>·</span>
                    <span>HSTS enabled</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Run summary line */}
            <div className="w-full text-center text-[12px] mt-4" style={{ color: "#4d4c6a" }}>
              Run #12 · github.com investigation · 2.1s · 1 worker
            </div>

          </div>
        </div>

        {/* Empty state & Input Area Container (Sticky at bottom) */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col bg-[#09090e]">
          
          {/* Suggestion Chips */}
          <div className="flex justify-center gap-3 py-4 w-full">
            <SuggestionChip text="Check system health" />
            <SuggestionChip text="Scan a domain" />
            <SuggestionChip text="Generate code" />
          </div>

          {/* Input Bar */}
          <div className="w-full pb-6 px-8" style={{ borderTop: "1px solid #252540", paddingTop: "24px" }}>
            <div className="max-w-3xl mx-auto w-full">
              <div 
                className="relative flex items-center rounded-2xl overflow-hidden group transition-colors" 
                style={{ backgroundColor: "#12121a", border: "1px solid #1c1c2e" }}
              >
                <style dangerouslySetInnerHTML={{__html: `
                  .portiere-input::placeholder { color: #4d4c6a; }
                  .portiere-group:focus-within { border-color: #7c6ff7 !important; }
                  .portiere-btn:hover { background-color: #6a5ff0 !important; }
                  .chip:hover { border-color: #7c6ff7 !important; color: #f1f0ff !important; }
                  .nav-item:hover:not(.nav-active) { color: #f1f0ff !important; }
                `}} />
                <div className="pl-4">
                  <Paperclip size={16} style={{ color: "#4d4c6a" }} />
                </div>
                <input 
                  type="text" 
                  placeholder="What should Portiere do next?" 
                  className="portiere-input w-full bg-transparent border-none text-[15px] py-3.5 pl-3 pr-14 outline-none"
                  style={{ color: "#f1f0ff" }}
                />
                <button 
                  className="portiere-btn absolute right-2 p-1.5 rounded-lg transition-colors flex items-center justify-center"
                  style={{ backgroundColor: "#7c6ff7", color: "#ffffff", height: "32px", width: "32px" }}
                >
                  <ArrowUp size={16} />
                </button>
              </div>
              <div className="text-center mt-3 text-[12px]" style={{ color: "#4d4c6a" }}>
                Portiere uses AI — always verify important results
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div 
      className={`nav-item flex items-center gap-3 h-[40px] px-3 text-[14px] cursor-pointer transition-colors relative ${active ? 'nav-active' : ''}`}
      style={{ 
        color: active ? "#f1f0ff" : "#8b8aad",
        backgroundColor: active ? "rgba(124, 111, 247, 0.15)" : "transparent"
      }}
    >
      {active && (
        <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ backgroundColor: "#7c6ff7" }}></div>
      )}
      <div>
        {icon}
      </div>
      <span>{label}</span>
    </div>
  );
}

function SuggestionChip({ text }: { text: string }) {
  return (
    <button 
      className="chip px-4 py-1.5 rounded-full text-[13px] transition-colors border" 
      style={{ backgroundColor: "#12121a", borderColor: "#1c1c2e", color: "#8b8aad" }}
    >
      {text}
    </button>
  );
}
