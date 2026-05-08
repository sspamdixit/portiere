import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter";

const primary = "#C8882C";
const codeBorder = "#221A0F";

const codeStyle: { [key: string]: React.CSSProperties } = {
  hljs: {
    background: "#0C0903",
    color: "#D0B898",
    padding: "16px",
    lineHeight: "1.7",
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    overflowX: "auto",
  },
  "hljs-comment":           { color: "#4A3C28", fontStyle: "italic" },
  "hljs-quote":             { color: "#4A3C28", fontStyle: "italic" },
  "hljs-keyword":           { color: "#C8882C" },
  "hljs-selector-tag":      { color: "#C8882C" },
  "hljs-addition":          { color: "hsl(142 60% 58%)" },
  "hljs-number":            { color: "hsl(25 90% 66%)" },
  "hljs-string":            { color: "hsl(142 60% 60%)" },
  "hljs-meta-string":       { color: "hsl(142 60% 60%)" },
  "hljs-doctag":            { color: "hsl(142 60% 60%)" },
  "hljs-attr":              { color: "hsl(185 70% 62%)" },
  "hljs-attribute":         { color: "hsl(185 70% 62%)" },
  "hljs-variable":          { color: "hsl(200 80% 68%)" },
  "hljs-template-variable": { color: "hsl(200 80% 68%)" },
  "hljs-type":              { color: "hsl(38 90% 64%)" },
  "hljs-selector-class":    { color: "hsl(38 90% 64%)" },
  "hljs-selector-id":       { color: "hsl(38 90% 64%)" },
  "hljs-title":             { color: "hsl(200 80% 68%)" },
  "hljs-section":           { color: "hsl(200 80% 68%)" },
  "hljs-built_in":          { color: "hsl(38 90% 64%)" },
  "hljs-literal":           { color: "hsl(25 90% 66%)" },
  "hljs-bullet":            { color: "hsl(25 90% 66%)" },
  "hljs-link":              { color: "#C8882C", textDecoration: "underline" },
  "hljs-regexp":            { color: "hsl(328 80% 68%)" },
  "hljs-symbol":            { color: "hsl(328 80% 68%)" },
  "hljs-deletion":          { color: "hsl(4 86% 64%)" },
  "hljs-emphasis":          { fontStyle: "italic" },
  "hljs-strong":            { fontWeight: "bold" },
};

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-xl overflow-hidden mb-3 last:mb-0" style={{ border: `1px solid ${codeBorder}` }}>
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ background: "#0A0803", borderBottom: `1px solid ${codeBorder}` }}
      >
        <span className="text-[11px] font-medium tracking-wide" style={{ color: "#4A3C28" }}>
          {language}
        </span>
        <button
          onClick={copy}
          className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg transition-all"
          style={{
            color: copied ? "hsl(152 64% 52%)" : "#6A5440",
            backgroundColor: copied ? "rgba(34,197,94,0.08)" : "transparent",
          }}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter language={language} style={codeStyle} PreTag="div">
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-[19px] font-bold text-foreground mt-5 mb-2.5 first:mt-0 leading-tight">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[16px] font-semibold text-foreground mt-4 mb-2 first:mt-0 leading-snug">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[14px] font-semibold text-foreground mt-3 mb-1.5 first:mt-0">
      {children}
    </h3>
  ),

  p: ({ children }) => (
    <p className="text-[14px] leading-[1.75] mb-3 last:mb-0" style={{ color: "#B09070" }}>
      {children}
    </p>
  ),

  ul: ({ children }) => <ul className="mb-3 last:mb-0 space-y-1.5 pl-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 last:mb-0 space-y-1.5 pl-5 list-decimal">{children}</ol>,
  li: ({ children }) => (
    <li className="text-[14px] leading-[1.7] flex items-start gap-2.5" style={{ color: "#B09070" }}>
      <span className="mt-[8px] w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "rgba(200,136,44,0.6)" }} />
      <span className="flex-1">{children}</span>
    </li>
  ),

  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic" style={{ color: "#9A7A5C" }}>{children}</em>,

  pre: ({ children }) => <>{children}</>,

  code: ({ className, children }) => {
    const isBlock = Boolean(className);
    const lang = className?.replace("language-", "") || "text";
    if (isBlock) {
      return <CodeBlock language={lang} code={String(children).replace(/\n$/, "")} />;
    }
    return (
      <code
        className="text-[13px] font-mono px-1.5 py-0.5 rounded-md"
        style={{
          backgroundColor: "rgba(200,136,44,0.1)",
          color: "#C8882C",
          border: "1px solid rgba(200,136,44,0.2)",
        }}
      >
        {children}
      </code>
    );
  },

  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer"
      className="underline underline-offset-2 transition-opacity hover:opacity-70"
      style={{ color: primary }}>
      {children}
    </a>
  ),

  blockquote: ({ children }) => (
    <blockquote className="pl-4 my-3 italic text-[14px] leading-[1.75]"
      style={{ borderLeft: "2px solid rgba(200,136,44,0.35)", color: "#8A7060" }}>
      {children}
    </blockquote>
  ),

  hr: () => <hr className="my-4" style={{ borderColor: "#221A0F" }} />,

  table: ({ children }) => (
    <div className="overflow-x-auto mb-3 last:mb-0 rounded-xl" style={{ border: `1px solid ${codeBorder}` }}>
      <table className="w-full text-[13px] border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead style={{ backgroundColor: "#0A0803", borderBottom: `1px solid ${codeBorder}` }}>
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest"
      style={{ color: "#6A5440" }}>
      {children}
    </th>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr style={{ borderBottom: `1px solid ${codeBorder}` }}>{children}</tr>,
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-[14px]" style={{ color: "#B09070" }}>
      {children}
    </td>
  ),
};

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
