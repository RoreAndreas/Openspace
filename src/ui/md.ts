// Le markdown des rapports, affiché sans risque : pas de HTML brut, des liens web seulement (ouverts
// dans un nouvel onglet), pas d'images distantes.
import { Marked } from 'marked';

const SAFE_URL = /^(https?:\/\/|mailto:)/i;

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const marked = new Marked({ breaks: true, gfm: true });
marked.use({
  renderer: {
    html: ({ text }) => escapeHtml(text ?? ''),
    link({ href, tokens }) {
      const text = this.parser.parseInline(tokens);
      if (!SAFE_URL.test(href ?? '')) return text;
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
    image({ text }) { return escapeHtml(text ?? ''); },
  },
});

export function mdToHtml(text: string): string {
  return marked.parse(text, { async: false }) as string;
}
