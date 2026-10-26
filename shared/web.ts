// La recherche sur internet et la lecture des pages, partagées par le Worker Cloudflare (en ligne) et par le
// serveur local (npm start, avec l'IA gratuite d'Ollama). Rien n'est gardé : on cherche, on lit, on renvoie.

export interface Hit { title: string; url: string; snippet: string }
export interface PageText { url: string; title: string; text: string; truncated: boolean }

/** Une erreur avec le code HTTP à renvoyer au navigateur. */
export class WebError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

const PAGE_CHARS = 7000;
const UA = 'Mozilla/5.0 (compatible; OpenSpace/1.0)';

const decode = (s: string) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const strip = (s: string) => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

/** Une recherche : Tavily si une clé est donnée, sinon DuckDuckGo. */
export async function searchWeb(q: string, tavilyKey?: string): Promise<{ hits: Hit[]; engine: string }> {
  try { return await search(q, tavilyKey); } catch (e) {
    if (e instanceof WebError) throw e;
    throw new WebError(502, 'La recherche sur internet ne répond pas. Vérifie ta connexion.');
  }
}

async function search(q: string, tavilyKey?: string): Promise<{ hits: Hit[]; engine: string }> {
  const query = q.trim().slice(0, 300);
  if (!query) throw new WebError(400, 'Recherche vide.');
  if (tavilyKey) {
    const r = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tavilyKey}` },
      body: JSON.stringify({ query, max_results: 6, search_depth: 'basic' }),
    });
    if (!r.ok) throw new WebError(502, `La recherche a échoué (Tavily ${r.status}).`);
    const d = (await r.json()) as { results?: { title?: string; url?: string; content?: string }[] };
    return { hits: (d.results ?? []).map((x) => ({ title: x.title ?? '', url: x.url ?? '', snippet: (x.content ?? '').slice(0, 300) })), engine: 'tavily' };
  }
  const r = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: new URLSearchParams({ q: query, kl: 'fr-fr' }).toString(),
  });
  if (!r.ok) throw new WebError(502, `La recherche a échoué (DuckDuckGo ${r.status}). Ajoute une clé Tavily pour plus de fiabilité.`);
  const html = await r.text();
  const hits: Hit[] = [];
  // un bloc par résultat : le lien (class="result__a") puis, s'il existe, l'extrait (class="result__snippet")
  for (const block of html.split(/class="result__body/).slice(1)) {
    if (hits.length >= 6) break;
    const a = block.match(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!a) continue;
    let link = decode(a[1]);
    const u = link.startsWith('//') ? new URL('https:' + link) : link.startsWith('/') ? new URL('https://duckduckgo.com' + link) : null;
    if (u?.searchParams.get('uddg')) link = u.searchParams.get('uddg')!;
    if (!/^https?:\/\//.test(link) || /duckduckgo\.com\/y\.js/.test(link)) continue;
    const snip = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div|td)>/);
    hits.push({ title: strip(a[2]), url: link, snippet: strip(snip?.[1] ?? '').slice(0, 300) });
  }
  return { hits, engine: 'duckduckgo' };
}

/** Pas d'adresse locale ni privée : on ne lit que des pages publiques. */
function allowed(u: URL) {
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return false;
  if (/^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h.startsWith('[')) return false;
  return true;
}

function htmlToText(html: string) {
  const title = strip(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  const body = html
    .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article)[^>]*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, ' ');
  const text = decode(body).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l.length > 1).join('\n');
  return { title, text };
}

/** Le texte d'une page web, nettoyé et raccourci. */
export async function readPage(raw: string): Promise<PageText> {
  let u: URL;
  try { u = new URL(raw); } catch { throw new WebError(400, 'Adresse invalide.'); }
  if (!allowed(u)) throw new WebError(400, 'Cette adresse n’est pas autorisée.');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const r = await fetch(u.toString(), {
      headers: { 'User-Agent': UA, Accept: 'text/html,text/plain,text/markdown,application/json;q=0.9,*/*;q=0.5' },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    if (!r.ok) throw new WebError(502, `La page répond ${r.status}.`);
    // après une redirection, on revérifie l'adresse finale
    try { if (!allowed(new URL(r.url))) throw new WebError(400, 'Cette adresse n’est pas autorisée.'); } catch (e) { if (e instanceof WebError) throw e; }
    const type = r.headers.get('content-type') ?? '';
    if (!/text|json|xml|markdown/.test(type)) throw new WebError(415, 'Ce n’est pas une page de texte.');
    const body = (await r.text()).slice(0, 2_000_000);
    const { title, text } = /html/.test(type) ? htmlToText(body) : { title: '', text: body };
    return { url: r.url, title, text: text.slice(0, PAGE_CHARS), truncated: text.length > PAGE_CHARS };
  } catch (e) {
    if (e instanceof WebError) throw e;
    if (ctrl.signal.aborted) throw new WebError(504, 'La page met trop de temps à répondre.');
    throw new WebError(502, 'Impossible de lire cette page.');
  } finally {
    clearTimeout(timer);
  }
}
