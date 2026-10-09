/* Minimal server-side HTML sanitizer for blog content.
   Allowlist of safe tags/attributes; everything else is stripped.
   Runs in Node (server components), so no DOM dependency. */

const ALLOWED_TAGS = new Set([
  "p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "b", "em", "i",
  "a", "blockquote", "br", "hr", "span", "div", "table", "thead",
  "tbody", "tr", "th", "td", "figure", "figcaption", "pre", "code",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "rel", "target"]),
};

function sanitizeUrl(url: string): string | null {
  const u = url.trim();
  if (/^(https?:|mailto:|tel:)/i.test(u) || u.startsWith("/") || u.startsWith("#")) return u;
  return null;
}

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";
  let html = dirty
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<(iframe|object|embed|form|input|button|video|audio|source)[\s\S]*?(?:<\/\1\s*>|\/>|>)/gi, "");

  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase();
    const isClose = match.startsWith("</");
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (isClose) return `</${tag}>`;
    const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>();
    const attrs: string[] = [];
    rawAttrs.replace(/([a-zA-Z-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/g, (_m: string, name: string, val: string) => {
      const attr = name.toLowerCase();
      if (!allowed.has(attr)) return "";
      let v = val.replace(/^['"]|['"]$/g, "");
      if (attr === "href") {
        const safe = sanitizeUrl(v);
        if (!safe) return "";
        v = safe;
      }
      attrs.push(`${attr}="${v.replace(/"/g, "&quot;")}"`);
      return "";
    });
    if (tag === "a" && !attrs.some((a) => a.startsWith("rel="))) {
      attrs.push('rel="noopener"');
    }
    return `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}>`;
  });

  return html;
}
