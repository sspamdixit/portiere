import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const primary = "hsl(246 89% 70%)";
const codeBg = "hsl(240 22% 7%)";
const codeBorder = "hsl(240 24% 13%)";

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
    <p className="text-[14px] leading-[1.75] mb-3 last:mb-0" style={{ color: "hsl(244 100% 97% / 0.82)" }}>
      {children}
    </p>
  ),

  ul: ({ children }) => (
    <ul className="mb-3 last:mb-0 space-y-1.5 pl-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 last:mb-0 space-y-1.5 pl-5 list-decimal">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-[14px] leading-[1.7] flex items-start gap-2.5" style={{ color: "hsl(244 100% 97% / 0.8)" }}>
      <span
        className="mt-[8px] w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: "hsl(246 89% 70% / 0.7)" }}
      />
      <span className="flex-1">{children}</span>
    </li>
  ),

  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic" style={{ color: "hsl(244 100% 97% / 0.75)" }}>{children}</em>
  ),

  code: ({ className, children }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <code
          className="mono-output text-[13px] leading-relaxed"
          style={{ color: "hsl(244 100% 97% / 0.88)" }}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="text-[13px] font-mono px-1.5 py-0.5 rounded-md"
        style={{
          backgroundColor: "hsl(240 20% 13%)",
          color: "hsl(246 89% 78%)",
          border: "1px solid hsl(240 24% 18%)",
        }}
      >
        {children}
      </code>
    );
  },

  pre: ({ children }) => {
    return (
      <div
        className="rounded-xl overflow-hidden mb-3 last:mb-0"
        style={{ backgroundColor: codeBg, border: `1px solid ${codeBorder}` }}
      >
        <pre className="overflow-x-auto p-4 text-[13px] leading-[1.7]">
          {children}
        </pre>
      </div>
    );
  },

  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-2 transition-opacity hover:opacity-70"
      style={{ color: primary }}
    >
      {children}
    </a>
  ),

  blockquote: ({ children }) => (
    <blockquote
      className="pl-4 my-3 italic text-[14px] leading-[1.75]"
      style={{
        borderLeft: "2px solid hsl(246 89% 70% / 0.35)",
        color: "hsl(242 18% 60%)",
      }}
    >
      {children}
    </blockquote>
  ),

  hr: () => (
    <hr className="my-4" style={{ borderColor: "hsl(240 24% 14%)" }} />
  ),

  table: ({ children }) => (
    <div className="overflow-x-auto mb-3 last:mb-0 rounded-xl" style={{ border: `1px solid ${codeBorder}` }}>
      <table className="w-full text-[13px] border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead style={{ backgroundColor: "hsl(240 20% 10%)", borderBottom: `1px solid ${codeBorder}` }}>
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th
      className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest"
      style={{ color: "hsl(242 18% 52%)" }}
    >
      {children}
    </th>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr style={{ borderBottom: `1px solid hsl(240 24% 11%)` }}>{children}</tr>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-[14px]" style={{ color: "hsl(244 100% 97% / 0.78)" }}>
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
