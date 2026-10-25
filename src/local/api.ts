// Les appels au Worker Cloudflare (/api/…), avec le code d'accès. C'est le seul trafic qui sort du navigateur.
import { lsGet, lsSet } from './db.ts';

export const MODELS: { id: string; label: string }[] = [
  { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', label: 'Llama 3.3 70B (recommandé : le plus fin)' },
  { id: '@cf/meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B (plus rapide, consomme moins de quota)' },
];

export const getCode = () => lsGet<string>('code', '');
export const setCode = (c: string) => lsSet('code', c.trim());

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

async function call<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', 'x-code': getCode() },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new ApiError(0, 'Le serveur Cloudflare ne répond pas. Vérifie ta connexion.');
  }
  let data: unknown = null;
  try { data = await res.json(); } catch { /* réponse vide */ }
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? `Erreur ${res.status}.`);
  return data as T;
}

export interface SearchHit { title: string; url: string; snippet: string }
export interface Page { url: string; title: string; text: string; truncated: boolean }
export interface ChatMsg { role: 'system' | 'user' | 'assistant'; content: string }
export interface ChatOut { text: string; usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null; model: string }

export const api = {
  ping: () => call<{ ok: boolean; models: string[]; search: string }>('ping'),
  chat: (model: string, messages: ChatMsg[], signal?: AbortSignal, json = false) => call<ChatOut>('chat', { model, messages, json }, signal),
  search: (q: string, signal?: AbortSignal) => call<{ hits: SearchHit[]; engine: string }>('search', { q }, signal),
  page: (url: string, signal?: AbortSignal) => call<Page>('fetch', { url }, signal),
};
