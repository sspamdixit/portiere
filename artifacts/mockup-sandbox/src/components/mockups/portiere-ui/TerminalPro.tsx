import React from "react";
import {
  Terminal,
  Zap,
  Globe,
  HardDrive,
  Brain,
  Film,
  Send,
  Settings,
  Cpu,
  Activity,
} from "lucide-react";

export function TerminalPro() {
  return (
    <div
      style={{
        width: "1280px",
        height: "800px",
        overflow: "hidden",
        backgroundColor: "#0a0c12",
        color: "#c8d0e0",
        fontFamily: "'JetBrains Mono', monospace",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
          
          * {
            box-sizing: border-box;
          }

          .console-bg {
            background-color: #0a0c12;
            background-image: radial-gradient(rgba(200, 208, 224, 0.05) 1px, transparent 1px);
            background-size: 20px 20px;
          }
          
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #0a0c12;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #3a4060;
            border-radius: 4px;
          }
        `}
      </style>

      {/* Top Status Bar */}
      <div
        className="flex items-center justify-between px-4"
        style={{
          height: "28px",
          backgroundColor: "#070810",
          borderBottom: "1px solid #1a1d2d",
          fontSize: "11px",
          color: "#3a4060",
        }}
      >
        <div className="flex items-center gap-2 text-[#00d4ff] font-bold">
          <span className="animate-pulse">●</span> PORTIERE
        </div>
        <div className="flex items-center gap-2">
          <span>STATUS:</span>
          <span className="text-[#00e87a]">IDLE</span>
        </div>
        <div>{new Date().toISOString().split("T")[1].slice(0, 8)} UTC</div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className="flex flex-col items-center py-4 gap-6"
          style={{
            width: "56px",
            backgroundColor: "#070810",
            borderRight: "1px solid #1a1d2d",
          }}
        >
          <div className="p-2 rounded-md bg-[#1a1d2d] text-[#c8d0e0] cursor-pointer hover:text-white transition-colors">
            <Terminal size={20} />
          </div>
          <div className="p-2 rounded-md text-[#3a4060] cursor-pointer hover:text-[#c8d0e0] transition-colors">
            <Activity size={20} />
          </div>
          <div className="p-2 rounded-md text-[#3a4060] cursor-pointer hover:text-[#c8d0e0] transition-colors">
            <HardDrive size={20} />
          </div>
          <div className="mt-auto p-2 rounded-md text-[#3a4060] cursor-pointer hover:text-[#c8d0e0] transition-colors">
            <Settings size={20} />
          </div>
        </div>

        {/* Main Console */}
        <div className="flex flex-col flex-1 relative console-bg custom-scrollbar">
          {/* Feed */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 text-[13px] leading-relaxed custom-scrollbar">
            {/* Run data */}
            <div className="flex items-start gap-3 py-1">
              <span className="text-[#3a4060] shrink-0 w-[65px]">10:42:01</span>
              <span
                className="px-2 py-[2px] rounded border text-[10px] font-bold shrink-0 w-[55px] text-center"
                style={{ borderColor: "#c8d0e0", color: "#c8d0e0" }}
              >
                USER
              </span>
              <span className="text-white font-medium">Scan the digital footprint of github.com</span>
            </div>

            <div className="flex items-start gap-3 py-1">
              <span className="text-[#3a4060] shrink-0 w-[65px]">10:42:02</span>
              <span
                className="px-2 py-[2px] rounded border text-[10px] font-bold shrink-0 w-[55px] text-center"
                style={{ borderColor: "#00d4ff", color: "#00d4ff" }}
              >
                BRAIN
              </span>
              <span className="text-[#c8d0e0]">Analyzing request — this requires OSINT reconnaissance</span>
            </div>

            <div className="flex items-start gap-3 py-1">
              <span className="text-[#3a4060] shrink-0 w-[65px]">10:42:03</span>
              <span
                className="px-2 py-[2px] rounded border text-[10px] font-bold shrink-0 w-[55px] text-center"
                style={{ borderColor: "#00d4ff", color: "#00d4ff" }}
              >
                BRAIN
              </span>
              <span className="text-[#c8d0e0]">Routing to OSINT worker → checking DNS, WHOIS, HTTP headers</span>
            </div>

            <div className="flex items-start gap-3 py-1">
              <span className="text-[#3a4060] shrink-0 w-[65px]">10:42:03</span>
              <span
                className="px-2 py-[2px] rounded border text-[10px] font-bold shrink-0 w-[55px] text-center"
                style={{ borderColor: "#a78bfa", color: "#a78bfa" }}
              >
                SYS
              </span>
              <span className="text-[#a78bfa]">Step 1/2: osint</span>
            </div>

            <div className="flex items-start gap-3 py-1">
              <span className="text-[#3a4060] shrink-0 w-[65px]">10:42:04</span>
              <span
                className="px-2 py-[2px] rounded border text-[10px] font-bold shrink-0 w-[55px] text-center"
                style={{ borderColor: "#fbbf24", color: "#fbbf24" }}
              >
                OSINT
              </span>
              <span className="text-[#fbbf24]">Scanning digital footprint of github.com</span>
            </div>

            {/* OSINT Block */}
            <div className="flex items-start gap-3 py-1 mt-1 mb-2">
              <span className="shrink-0 w-[65px]"></span>
              <span className="shrink-0 w-[55px]"></span>
              <div
                className="flex-1 p-3 rounded bg-[#070810] text-[#a0a8b8] text-[12px] whitespace-pre-wrap overflow-x-auto custom-scrollbar border-l-2"
                style={{ borderLeftColor: "#fbbf24" }}
              >
                {`[DNS RECORDS]
A     140.82.113.3
A     140.82.112.4
TXT   "v=spf1 include:_spf.github.com ~all"
MX    10 alt1.aspmx.l.google.com.

[WHOIS SNIPPET]
Domain Name: GITHUB.COM
Registry Domain ID: 111111111_DOMAIN_COM-VRSN
Registrar WHOIS Server: whois.markmonitor.com
Creation Date: 2007-10-09T18:20:50Z

[HTTP HEADERS]
server: GitHub.com
x-frame-options: deny
content-security-policy: default-src 'none'; ...`}
              </div>
            </div>

            <div className="flex items-start gap-3 py-1">
              <span className="text-[#3a4060] shrink-0 w-[65px]">10:42:08</span>
              <span
                className="px-2 py-[2px] rounded border text-[10px] font-bold shrink-0 w-[55px] text-center"
                style={{ borderColor: "#fbbf24", color: "#fbbf24" }}
              >
                OSINT
              </span>
              <span className="flex items-center gap-2 text-[#00e87a]">
                <span className="w-2 h-2 rounded-full bg-[#00e87a]"></span> Completed successfully
              </span>
            </div>

            {/* Completion Bar */}
            <div className="mt-4 mb-2 flex items-center">
              <div className="h-px bg-[#3a4060] flex-1"></div>
              <div className="px-4 py-1 bg-[#1a1d2d] text-[#00d4ff] font-bold text-xs tracking-widest border border-[#3a4060] rounded">
                ORCHESTRATION COMPLETE
              </div>
              <div className="h-px bg-[#3a4060] flex-1"></div>
            </div>
          </div>

          {/* Command Bar */}
          <div
            className="flex items-center px-4 py-3 bg-[#070810] border-t border-[#1a1d2d]"
          >
            <span className="text-[#00e87a] mr-3 font-bold">❯</span>
            <input
              type="text"
              placeholder="Enter orchestration prompt..."
              className="flex-1 bg-transparent border-none outline-none text-[#c8d0e0] font-mono text-[13px] placeholder:text-[#3a4060]"
              disabled
            />
            <button className="text-[#3a4060] hover:text-[#00d4ff] transition-colors bg-[#1a1d2d] p-1.5 rounded">
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
