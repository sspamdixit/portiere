export interface Template {
  id: string;
  title: string;
  content: string;
  category: string;
  builtin?: boolean;
}

const KEY = "portiere_templates";

const BUILTIN_TEMPLATES: Template[] = [
  { id: "b1", title: "Professional bio", category: "Writing", builtin: true, content: "Write a professional bio for me based on what you know — make it suitable for LinkedIn." },
  { id: "b2", title: "Meeting summary email", category: "Writing", builtin: true, content: "Write a concise follow-up email summarizing the key points from a meeting. Include action items and next steps." },
  { id: "b3", title: "Cold outreach email", category: "Writing", builtin: true, content: "Write a short, personalized cold outreach email to a potential client. Keep it under 150 words and end with a clear CTA." },
  { id: "b4", title: "Today's tech news", category: "Research", builtin: true, content: "What's the most important tech and AI news happening today?" },
  { id: "b5", title: "Market snapshot", category: "Finance", builtin: true, content: "Give me a snapshot of how the major markets are doing today — S&P 500, NASDAQ, Bitcoin, and Ethereum." },
  { id: "b6", title: "Weekend trip planner", category: "Travel", builtin: true, content: "Plan a weekend trip for me. Suggest a destination within a few hours of my city, with things to do, where to stay, and food to try." },
  { id: "b7", title: "System health check", category: "System", builtin: true, content: "Run a full system health check — show me CPU, RAM, disk usage, and any important processes." },
  { id: "b8", title: "Explain like I'm 5", category: "Learning", builtin: true, content: "Explain [topic] in the simplest possible terms, like I'm completely new to it." },
  { id: "b9", title: "Debug this code", category: "Code", builtin: true, content: "Here's my code. Find any bugs, explain what's wrong, and give me a fixed version:\n\n[paste your code here]" },
  { id: "b10", title: "Translate to Spanish", category: "Translate", builtin: true, content: "Translate the following text to Spanish, keeping the tone and meaning intact:\n\n[paste text here]" },
  { id: "b11", title: "Pros & cons analysis", category: "Decision", builtin: true, content: "Give me a clear pros and cons analysis for [decision or topic]. Be balanced and practical." },
  { id: "b12", title: "WHOIS & domain research", category: "Research", builtin: true, content: "Run a WHOIS lookup and DNS research on [domain]. Tell me who owns it, when it was registered, and anything interesting." },
];

export function getTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(KEY);
    const custom: Template[] = raw ? JSON.parse(raw) : [];
    return [...custom, ...BUILTIN_TEMPLATES];
  } catch {
    return BUILTIN_TEMPLATES;
  }
}

export function saveTemplate(title: string, content: string, category = "Custom"): Template {
  const template: Template = {
    id: crypto.randomUUID(),
    title,
    content,
    category,
  };
  const raw = localStorage.getItem(KEY);
  const existing: Template[] = raw ? JSON.parse(raw) : [];
  localStorage.setItem(KEY, JSON.stringify([template, ...existing]));
  return template;
}

export function deleteTemplate(id: string): void {
  const raw = localStorage.getItem(KEY);
  const existing: Template[] = raw ? JSON.parse(raw) : [];
  localStorage.setItem(KEY, JSON.stringify(existing.filter(t => t.id !== id)));
}

export function getCategories(templates: Template[]): string[] {
  return [...new Set(templates.map(t => t.category))];
}
