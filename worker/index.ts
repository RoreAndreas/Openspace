// Le Worker Cloudflare de l'open space. Il ne stocke rien : il sert le bureau (fichiers statiques) et fait
// trois choses pour le navigateur, toutes protégées par le code d'accès :
//   POST /api/chat    une réponse de l'IA (Workers AI, gratuit dans la limite du quota quotidien)
//   POST /api/search  une recherche sur internet (Tavily si une clé est configurée, sinon DuckDuckGo)
//   POST /api/fetch   le texte d'une page web (nettoyé et raccourci)
//   GET  /api/ping    vérifie le code d'accès
// Les missions, les rapports, le tiroir et les skills restent dans le navigateur de l'utilisatrice.

interface Env {
  AI: { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  /** le code d'accès (secret Cloudflare : npx wrangler secret put ACCESS_CODE) */
  ACCESS_CODE?: string;
  /** facultatif : une clé Tavily pour une recherche web plus fiable */
  TAVILY_KEY?: string;
}

/** Les modèles autorisés (le premier est celui par défaut). */
const MODELS = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-3.1-8b-instruct'];
const MAX_BODY = 200_000;
const PAGE_CHARS = 7000;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });

const fail = (status: number, message: string) => json({ error: message }, status);

/** Comparaison à temps constant (le code d'accès ne se devine pas caractère par caractère). */
function same(a: string, b: string) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);

    if (!env.ACCESS_CODE) return fail(503, 'Le code d’accès n’est pas encore configuré sur Cloudflare (secret ACCESS_CODE).');
    if (!same(req.headers.get('x-code') ?? '', env.ACCESS_CODE)) return fail(401, 'Code d’accès incorrect.');
    // une page d'un autre site ne peut pas appeler l'API à la place du bureau
    const origin = req.headers.get('origin');
    if (origin && origin !== url.origin) return fail(403, 'Origine refusée.');

    try {
      if (url.pathname === '/api/ping') return json({ ok: true, models: MODELS, search: env.TAVILY_KEY ? 'tavily' : 'duckduckgo' });
      if (req.method !== 'POST') return fail(405, 'Méthode non autorisée.');
      const raw = await req.text();
      if (raw.length > MAX_BODY) return fail(413, 'Demande trop longue.');
      const body = JSON.parse(raw || '{}') as Record<string, unknown>;
      switch (url.pathname) {
        case '/api/chat': return await chat(env, body);
        case '/api/search': return await search(env, String(body.q ?? ''));
        case '/api/fetch': return await page(String(body.url ?? ''));
      }
      return fail(404, 'Inconnu.');
    } catch (e) {
      return fail(500, e instanceof Error ? e.message : String(e));
    }
  },
};

// ── L'IA ──
const ACTION_SCHEMA = {
  type: 'object',
  properties: { say: { type: 'string' }, action: { type: 'string' }, input: { type: 'object', additionalProperties: true } },
  required: ['action', 'input'],
};

async function chat(env: Env, body: Record<string, unknown>) {
  const model = MODELS.includes(String(body.model)) ? String(body.model) : MODELS[0];
  const messages = Array.isArray(body.messages)
    ? (body.messages as { role?: unknown; content?: unknown }[])
      .filter((m) => m && ['system', 'user', 'assistant'].includes(String(m.role)))
      .map((m) => ({ role: String(m.role), content: String(m.content ?? '').slice(0, 60_000) }))
    : [];
  if (!messages.length) return fail(400, 'Aucun message.');
  const base = { messages, max_tokens: Math.min(Number(body.max_tokens) || 3000, 4000), temperature: 0.3 };
  const quota = (e: unknown) => /neuron|quota|daily|limit|429|capacity/i.test(e instanceof Error ? e.message : String(e));
  let out: unknown;
  try {
    // d'habitude en texte libre (le bureau sait y lire l'objet JSON) ; en mode JSON strict si le bureau
    // le demande (après une réponse illisible)
    out = await env.AI.run(model, body.json === true ? { ...base, response_format: { type: 'json_schema', json_schema: ACTION_SCHEMA } } : base);
  } catch (e) {
    if (quota(e)) return fail(429, 'Le quota gratuit de l’IA est épuisé pour aujourd’hui (remis à zéro à minuit UTC).');
    if (body.json !== true) throw e;
    try { out = await env.AI.run(model, base); } catch (e2) {
      if (quota(e2)) return fail(429, 'Le quota gratuit de l’IA est épuisé pour aujourd’hui (remis à zéro à minuit UTC).');
      throw e2;
    }
  }
  const o = (out ?? {}) as Record<string, unknown>;
  const r = o.response;
  const text = typeof r === 'string' ? r : r && typeof r === 'object' ? JSON.stringify(r) : '';
  return json({ text, usage: o.usage ?? null, model });
}

// ── La recherche sur internet ──
interface Hit { title: string; url: string; snippet: string }

const decode = (s: string) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const strip = (s: string) => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

async function search(env: Env, q: string) {
  const query = q.trim().slice(0, 300);
  if (!query) return fail(400, 'Recherche vide.');
  if (env.TAVILY_KEY) {
    const r = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.TAVILY_KEY}` },
      body: JSON.stringify({ query, max_results: 6, search_depth: 'basic' }),
    });
    if (!r.ok) return fail(502, `La recherche a échoué (Tavily ${r.status}).`);
    const d = (await r.json()) as { results?: { title?: string; url?: string; content?: string }[] };
    const hits: Hit[] = (d.results ?? []).map((x) => ({ title: x.title ?? '', url: x.url ?? '', snippet: (x.content ?? '').slice(0, 300) }));
    return json({ hits, engine: 'tavily' });
  }
  const r = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (compatible; OpenSpace/1.0)' },
    body: new URLSearchParams({ q: query, kl: 'fr-fr' }).toString(),
  });
  if (!r.ok) return fail(502, `La recherche a échoué (DuckDuckGo ${r.status}). Ajoute une clé Tavily pour plus de fiabilité.`);
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
  return json({ hits, engine: 'duckduckgo' });
}

// ── Lire une page web ──
function allowed(u: URL) {
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false;
  // pas d'adresses IP privées
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

async function page(raw: string) {
  let u: URL;
  try { u = new URL(raw); } catch { return fail(400, 'Adresse invalide.'); }
  if (!allowed(u)) return fail(400, 'Cette adresse n’est pas autorisée.');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const r = await fetch(u.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OpenSpace/1.0)', Accept: 'text/html,text/plain,text/markdown,application/json;q=0.9,*/*;q=0.5' },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    if (!r.ok) return fail(502, `La page répond ${r.status}.`);
    const type = r.headers.get('content-type') ?? '';
    if (!/text|json|xml|markdown/.test(type)) return fail(415, 'Ce n’est pas une page de texte.');
    const raw = (await r.text()).slice(0, 2_000_000);
    const { title, text } = /html/.test(type) ? htmlToText(raw) : { title: '', text: raw };
    return json({ url: r.url, title, text: text.slice(0, PAGE_CHARS), truncated: text.length > PAGE_CHARS });
  } finally {
    clearTimeout(timer);
  }
}
