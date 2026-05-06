import React from "react";
import { 
  Terminal, Zap, Globe, HardDrive, Brain, Film, Send, Settings, Cpu, Activity, 
  ChevronRight, Square, Sparkles 
} from "lucide-react";

export function CommandCenter() {
  return (
    <div 
      className="flex flex-row overflow-hidden antialiased text-[#d4daf0]"
      style={{ 
        width: "1280px", 
        height: "800px", 
        backgroundColor: "#0d0f16",
        fontFamily: "'Inter', sans-serif" 
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #1e2235;
          border-radius: 4px;
        }
        .code-block {
          font-family: 'JetBrains Mono', monospace;
        }
      `}} />

      {/* Sidebar */}
      <div 
        className="flex flex-col border-r flex-shrink-0"
        style={{ width: "160px", backgroundColor: "#0a0c12", borderColor: "#1e2235" }}
      >
        {/* Brand */}
        <div className="p-4 border-b flex flex-col gap-1" style={{ borderColor: "#1e2235" }}>
          <div className="flex items-center gap-2 font-semibold text-[15px]">
            <Sparkles size={16} className="text-[#818cf8]" />
            <span>Portiere</span>
          </div>
          <span className="text-[11px] text-[#818cf8]/70 font-medium tracking-wide uppercase">AI Orchestrator</span>
        </div>

        {/* Nav Items */}
        <div className="flex flex-col py-3 gap-1 px-2">
          <NavItem icon={<Terminal size={16} />} label="Console" active />
          <NavItem icon={<Activity size={16} />} label="Runs" />
          <NavItem icon={<Cpu size={16} />} label="Workers" />
          <NavItem icon={<HardDrive size={16} />} label="Storage" />
          <NavItem icon={<Settings size={16} />} label="Settings" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 relative overflow-hidden">
        {/* Header */}
        <div 
          className="h-14 flex items-center justify-between px-6 border-b flex-shrink-0"
          style={{ borderColor: "#1e2235", backgroundColor: "rgba(13, 15, 22, 0.8)", backdropFilter: "blur(8px)" }}
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#d4daf0]/50">Console</span>
            <ChevronRight size={14} className="text-[#d4daf0]/30" />
            <span className="font-medium text-[#d4daf0]">Run #12</span>
            
            <div className="ml-4 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#34d399]/10 text-[#34d399] text-xs font-medium border border-[#34d399]/20">
              <div className="w-1.5 h-1.5 rounded-full bg-[#34d399]"></div>
              COMPLETE
            </div>
          </div>
          
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1e2235] hover:bg-[#1e2235]/80 transition-colors text-sm font-medium text-[#d4daf0]/70">
            <Square size={12} fill="currentColor" />
            Stop
          </button>
        </div>

        {/* Feed area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center pb-32">
          <div className="w-full max-w-3xl flex flex-col gap-6 py-8 px-6">
            
            {/* Timestamp divider */}
            <div className="flex items-center justify-center gap-4 text-xs text-[#d4daf0]/40 font-medium">
              <div className="h-px w-8 bg-[#1e2235]"></div>
              <span>Session started at 10:42 PM</span>
              <div className="h-px w-8 bg-[#1e2235]"></div>
            </div>

            {/* User message bubble */}
            <div className="flex justify-end w-full">
              <div className="bg-[#1e2235] px-4 py-3 rounded-2xl rounded-tr-sm max-w-lg text-[15px] shadow-sm border border-[#1e2235]">
                Write a Python merge sort function
              </div>
            </div>

            {/* Worker Outputs Container */}
            <div className="flex flex-col gap-4 pl-4 border-l-2" style={{ borderColor: "#1e2235" }}>
              
              {/* Brain Worker Card */}
              <div className="rounded-lg border shadow-sm flex flex-col overflow-hidden relative" style={{ backgroundColor: "#13161f", borderColor: "#1e2235" }}>
                {/* Accent Top Line */}
                <div className="h-[2px] w-full bg-[#f59e0b] absolute top-0 left-0"></div>
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#1e2235" }}>
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-[#f59e0b]/10 text-[#f59e0b]">
                      <Brain size={14} />
                    </div>
                    <span className="text-sm font-semibold tracking-wide text-[#f59e0b]">BRAIN</span>
                  </div>
                  <span className="text-xs text-[#d4daf0]/40 font-mono">finished in 0.4s</span>
                </div>
                <div className="p-4 text-sm text-[#d4daf0]/80 leading-relaxed">
                  Routing request to code generation model. The user is asking for a standard algorithm implementation in Python. Claude is best suited for clear, well-documented Python code.
                </div>
              </div>

              {/* Claude Worker Card */}
              <div className="rounded-lg border shadow-sm flex flex-col overflow-hidden relative" style={{ backgroundColor: "#13161f", borderColor: "#1e2235" }}>
                {/* Accent Top Line */}
                <div className="h-[2px] w-full bg-[#818cf8] absolute top-0 left-0"></div>
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#1e2235" }}>
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-[#818cf8]/10 text-[#818cf8]">
                      <Zap size={14} />
                    </div>
                    <span className="text-sm font-semibold tracking-wide text-[#818cf8]">CLAUDE</span>
                  </div>
                  <span className="text-xs text-[#d4daf0]/40 font-mono">finished in 3.0s</span>
                </div>
                <div className="p-0">
                  <pre className="code-block text-[13px] leading-relaxed p-4 m-0 overflow-x-auto text-[#d4daf0]/90">
                    <span className="text-[#818cf8]">def</span> <span className="text-[#38bdf8]">merge_sort</span>(arr):<br/>
                    {"    "}<span className="text-[#818cf8]">if</span> len(arr) &lt;= <span className="text-[#f59e0b]">1</span>:<br/>
                    {"        "}<span className="text-[#818cf8]">return</span> arr<br/>
                    <br/>
                    {"    "}mid = len(arr) // <span className="text-[#f59e0b]">2</span><br/>
                    {"    "}left = merge_sort(arr[:mid])<br/>
                    {"    "}right = merge_sort(arr[mid:])<br/>
                    <br/>
                    {"    "}<span className="text-[#818cf8]">return</span> merge(left, right)<br/>
                    <br/>
                    <span className="text-[#818cf8]">def</span> <span className="text-[#38bdf8]">merge</span>(left, right):<br/>
                    {"    "}result = []<br/>
                    {"    "}i = j = <span className="text-[#f59e0b]">0</span><br/>
                    <br/>
                    {"    "}<span className="text-[#818cf8]">while</span> i &lt; len(left) <span className="text-[#818cf8]">and</span> j &lt; len(right):<br/>
                    {"        "}<span className="text-[#818cf8]">if</span> left[i] &lt;= right[j]:<br/>
                    {"            "}result.append(left[i])<br/>
                    {"            "}i += <span className="text-[#f59e0b]">1</span><br/>
                    {"        "}<span className="text-[#818cf8]">else</span>:<br/>
                    {"            "}result.append(right[j])<br/>
                    {"            "}j += <span className="text-[#f59e0b]">1</span><br/>
                    <br/>
                    {"    "}result.extend(left[i:])<br/>
                    {"    "}result.extend(right[j:])<br/>
                    {"    "}<span className="text-[#818cf8]">return</span> result
                  </pre>
                </div>
              </div>

            </div>

            {/* Run footer metadata */}
            <div className="flex justify-end text-[11px] font-medium text-[#d4daf0]/30 mt-2 pr-2 uppercase tracking-wide">
              Run #12 • 3.4s • 2 workers
            </div>

            {/* Divider for next session */}
            <div className="mt-8 flex flex-col gap-6">
              <div className="flex items-center justify-center gap-4 text-xs text-[#d4daf0]/40 font-medium">
                <div className="h-px w-full bg-[#1e2235]"></div>
              </div>

              {/* Empty State Welcome Card */}
              <div className="rounded-xl border p-6 flex flex-col gap-6 mt-4" style={{ backgroundColor: "#13161f", borderColor: "#1e2235" }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#38bdf8]/10 text-[#38bdf8]">
                    <Terminal size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-[#d4daf0]">Good evening.</h2>
                    <p className="text-sm text-[#d4daf0]/60 mt-0.5">What should Portiere do?</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <SuggestionChip text="Scrape HackerNews frontpage" />
                  <SuggestionChip text="Write an express server" />
                  <SuggestionChip text="Summarize latest logs" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0d0f16] via-[#0d0f16] to-transparent pt-12 pointer-events-none">
          <div className="max-w-3xl mx-auto w-full pointer-events-auto">
            <div className="relative flex items-center bg-[#13161f] border rounded-xl overflow-hidden shadow-lg transition-all focus-within:border-[#38bdf8]/50 focus-within:shadow-[0_0_0_1px_rgba(56,189,248,0.5)]" style={{ borderColor: "#1e2235" }}>
              <input 
                type="text" 
                placeholder="Ask Portiere anything…" 
                className="w-full bg-transparent border-none text-[15px] py-4 pl-4 pr-12 outline-none placeholder:text-[#d4daf0]/30 text-[#d4daf0]"
              />
              <button className="absolute right-2 p-2 rounded-lg bg-[#38bdf8] text-[#0d0f16] hover:bg-[#38bdf8]/90 transition-colors">
                <Send size={16} />
              </button>
            </div>
            <div className="text-center mt-3 text-[11px] text-[#d4daf0]/30 font-medium tracking-wide">
              Press Enter to orchestrate • ⇧ ↵ for new line
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`
      relative flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors
      ${active ? 'text-[#d4daf0] bg-white/[0.02]' : 'text-[#d4daf0]/50 hover:text-[#d4daf0]/80 hover:bg-white/[0.01]'}
    `}>
      {active && (
        <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#38bdf8] rounded-r-full shadow-[0_0_8px_rgba(56,189,248,0.4)]"></div>
      )}
      <div className={active ? 'text-[#38bdf8]' : ''}>
        {icon}
      </div>
      {label}
    </div>
  );
}

function SuggestionChip({ text }: { text: string }) {
  return (
    <button className="px-3 py-1.5 rounded-full border text-xs font-medium text-[#d4daf0]/70 hover:text-[#d4daf0] hover:bg-[#1e2235]/50 transition-colors flex items-center gap-1.5" style={{ borderColor: "#1e2235", backgroundColor: "rgba(30, 34, 53, 0.3)" }}>
      <Sparkles size={10} className="text-[#38bdf8]" />
      {text}
    </button>
  );
}