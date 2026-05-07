import { useState, useMemo } from "react";
import { Search, X, Plus, Trash2, BookOpen, Check } from "lucide-react";
import { getTemplates, saveTemplate, deleteTemplate, getCategories, type Template } from "@/lib/templates";

interface Props {
  onUse: (content: string) => void;
  onClose: () => void;
}

export default function TemplatesModal({ onUse, onClose }: Props) {
  const [templates, setTemplates] = useState<Template[]>(() => getTemplates());
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showSave, setShowSave] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveContent, setSaveContent] = useState("");
  const [saveCategory, setSaveCategory] = useState("Custom");
  const [justUsed, setJustUsed] = useState<string | null>(null);

  const categories = useMemo(() => ["All", ...getCategories(templates)], [templates]);

  const filtered = useMemo(() => {
    return templates.filter(t => {
      const matchCat = activeCategory === "All" || t.category === activeCategory;
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.content.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [templates, activeCategory, search]);

  const handleUse = (t: Template) => {
    setJustUsed(t.id);
    setTimeout(() => { onUse(t.content); onClose(); }, 300);
  };

  const handleSave = () => {
    if (!saveTitle.trim() || !saveContent.trim()) return;
    saveTemplate(saveTitle.trim(), saveContent.trim(), saveCategory);
    setTemplates(getTemplates());
    setShowSave(false);
    setSaveTitle(""); setSaveContent(""); setSaveCategory("Custom");
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTemplate(id);
    setTemplates(getTemplates());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-xl mx-4 rounded-2xl overflow-hidden animate-feed-in"
        style={{
          background: "hsl(238 20% 7%)",
          border: "1px solid hsl(238 18% 14%)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
          maxHeight: "80vh",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid hsl(238 18% 11%)" }}>
          <div className="flex items-center gap-2.5">
            <BookOpen size={14} style={{ color: "hsl(248 90% 70%)" }} />
            <span className="text-[14px] font-semibold" style={{ color: "hsl(240 20% 94%)", letterSpacing: "-0.02em" }}>
              Prompt templates
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSave(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all"
              style={{
                background: showSave ? "hsl(238 18% 11%)" : "linear-gradient(135deg, hsl(246 89% 64%) 0%, hsl(258 72% 68%) 100%)",
                color: showSave ? "hsl(238 18% 50%)" : "white",
                boxShadow: showSave ? "none" : "0 2px 10px rgba(124,111,247,0.32)",
              }}
            >
              <Plus size={11} /> Save current
            </button>
            <button onClick={onClose} style={{ color: "hsl(238 18% 40%)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "hsl(238 18% 64%)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "hsl(238 18% 40%)"; }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Save form */}
        {showSave && (
          <div className="px-5 py-4 flex-shrink-0 space-y-3" style={{ borderBottom: "1px solid hsl(238 18% 11%)", background: "hsl(238 20% 6%)" }}>
            <input
              value={saveTitle}
              onChange={e => setSaveTitle(e.target.value)}
              placeholder="Template title..."
              className="portiere-input"
              style={{ fontSize: "13px", padding: "9px 14px" }}
              autoFocus
            />
            <textarea
              value={saveContent}
              onChange={e => setSaveContent(e.target.value)}
              placeholder="Prompt content..."
              rows={3}
              className="portiere-input resize-none"
              style={{ fontSize: "13px", padding: "9px 14px" }}
            />
            <div className="flex items-center gap-2">
              <input
                value={saveCategory}
                onChange={e => setSaveCategory(e.target.value)}
                placeholder="Category"
                className="portiere-input flex-1"
                style={{ fontSize: "12px", padding: "7px 12px" }}
              />
              <button
                onClick={handleSave}
                disabled={!saveTitle.trim() || !saveContent.trim()}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, hsl(246 89% 64%) 0%, hsl(258 72% 68%) 100%)",
                  color: "white",
                }}
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: "1px solid hsl(238 18% 10%)" }}>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "hsl(238 18% 36%)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="portiere-input"
              style={{ paddingLeft: "2rem", fontSize: "13px", padding: "8px 14px 8px 2rem" }}
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-1.5 px-5 py-2.5 flex-shrink-0 overflow-x-auto" style={{ borderBottom: "1px solid hsl(238 18% 10%)" }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
              style={{
                backgroundColor: activeCategory === cat ? "rgba(109,95,234,0.18)" : "hsl(238 18% 9%)",
                border: `1px solid ${activeCategory === cat ? "rgba(109,95,234,0.4)" : "hsl(238 18% 13%)"}`,
                color: activeCategory === cat ? "hsl(248 90% 75%)" : "hsl(238 18% 46%)",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Template list */}
        <div className="flex-1 overflow-y-auto feed-scroll px-5 py-3 space-y-1.5">
          {filtered.length === 0 && (
            <div className="text-center py-10 text-[13px]" style={{ color: "hsl(238 18% 38%)" }}>
              No templates found
            </div>
          )}
          {filtered.map(t => (
            <button
              key={t.id}
              onClick={() => handleUse(t)}
              className="group w-full text-left flex items-start justify-between gap-3 p-3.5 rounded-xl transition-all"
              style={{
                backgroundColor: justUsed === t.id ? "rgba(34,197,94,0.07)" : "hsl(238 18% 9%)",
                border: `1px solid ${justUsed === t.id ? "rgba(34,197,94,0.25)" : "hsl(238 18% 13%)"}`,
              }}
              onMouseEnter={e => { if (justUsed !== t.id) { (e.currentTarget as HTMLElement).style.borderColor = "rgba(109,95,234,0.3)"; (e.currentTarget as HTMLElement).style.backgroundColor = "hsl(238 18% 10%)"; } }}
              onMouseLeave={e => { if (justUsed !== t.id) { (e.currentTarget as HTMLElement).style.borderColor = "hsl(238 18% 13%)"; (e.currentTarget as HTMLElement).style.backgroundColor = "hsl(238 18% 9%)"; } }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[12.5px] font-semibold" style={{ color: "hsl(240 20% 90%)", letterSpacing: "-0.01em" }}>
                    {t.title}
                  </span>
                  <span
                    className="text-[10px] px-2 py-px rounded-full font-medium"
                    style={{ backgroundColor: "hsl(238 18% 13%)", color: "hsl(238 18% 46%)" }}
                  >
                    {t.category}
                  </span>
                  {t.builtin && (
                    <span className="text-[10px] px-1.5 py-px rounded font-medium" style={{ color: "hsl(248 90% 65%)", backgroundColor: "rgba(109,95,234,0.1)" }}>
                      built-in
                    </span>
                  )}
                </div>
                <p className="text-[11.5px] leading-relaxed line-clamp-2" style={{ color: "hsl(238 18% 46%)" }}>
                  {t.content}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                {justUsed === t.id
                  ? <Check size={13} style={{ color: "hsl(152 64% 52%)" }} />
                  : <span className="text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "hsl(248 90% 70%)" }}>Use →</span>
                }
                {!t.builtin && (
                  <button
                    onClick={e => handleDelete(t.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg"
                    style={{ color: "hsl(238 18% 38%)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "hsl(4 86% 62%)"; e.stopPropagation(); }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "hsl(238 18% 38%)"; }}
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </button>
          ))}
        </div>

        <div
          className="px-5 py-2.5 text-[11px] text-center flex-shrink-0"
          style={{ borderTop: "1px solid hsl(238 18% 10%)", color: "hsl(238 18% 30%)" }}
        >
          Click any template to use it · ⌘T to open here
        </div>
      </div>
    </div>
  );
}
