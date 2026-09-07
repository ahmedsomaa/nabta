const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'ul', 'ol', 'li', 'a']);

function escapeAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function stripAssignmentHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeAssignmentHtml(input: string) {
  if (!input) return '';
  const withoutComments = input.replace(/<!--[\s\S]*?-->/g, '');
  if (!/<[a-z]/i.test(withoutComments)) return withoutComments.slice(0, 20_000);

  return withoutComments
    .replace(/<\/?(script|iframe|object|embed|form|input|textarea|style|link|meta|svg|math)[^>]*>/gi, '')
    .replace(/<(\/?)([a-z0-9]+)([^>]*)>/gi, (_match, slash: string, tag: string, attrs: string) => {
      const name = tag.toLowerCase();
      if (!ALLOWED_TAGS.has(name)) return '';
      if (slash) return `</${name}>`;
      if (name === 'br') return '<br>';
      if (name === 'a') {
        const href = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
        const raw = (href?.[2] ?? href?.[3] ?? href?.[4] ?? '').trim();
        if (!/^https?:\/\//i.test(raw)) return '<a>';
        return `<a href="${escapeAttr(raw)}" rel="noreferrer noopener" target="_blank">`;
      }
      return `<${name}>`;
    })
    .slice(0, 20_000);
}

export function looksLikeHtml(value: string) {
  return /<[a-z][\s\S]*>/i.test(value);
}
