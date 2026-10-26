// Le lien entre l'interface et le moteur de l'équipe. Deux cas :
//   - sur ton ordinateur (npm start) : le pont local pilote Claude Code, avec ton compte Claude (WebSocket /ws) ;
//   - sur Cloudflare : le bureau tourne dans le navigateur (src/local/bureau.ts), avec l'IA gratuite de
//     Cloudflare ou ta clé API Claude.
// On garde aussi ici la rediffusion d'une mission enregistrée.
import type { ClientMsg, Logged, MissionInfo, ServerMsg } from '../../shared/protocol.ts';
import { getClaudeKey, modelInfo, MODELS } from '../local/api.ts';
import { bureau } from '../local/bureau.ts';
import { teamInput } from '../local/context.ts';
import { useDrawer } from '../local/drawer.ts';
import { savePref, useOffice } from '../state/store.ts';

let ws: WebSocket | null = null;
let everConnected = false;
let retry = 0;
let build = '';
let player: { stop: () => void } | null = null;
let lastReplay: { mission: MissionInfo; log: Logged[] } | null = null;
/** le fichier où l'analyste (version locale) range ce qu'il faut retenir : il rejoint le tiroir */
const NOTES_FILE = 'a-retenir.md';

const isLocalHost = () => ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

/** Envoi au pont local : le règlement, le tiroir et les skills partent avec chaque demande. */
function sendToBridge(m: ClientMsg) {
  if (m.t === 'open_root' && m.rules) { useOffice.setState({ modal: { kind: 'rules' } }); return; }
  if (m.t === 'open_root') { useOffice.setState({ modal: { kind: 'drawer' } }); return; }
  const msg: ClientMsg = m.t === 'start' || m.t === 'say' ? { ...m, team: teamInput() } : m;
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  else useOffice.getState().toast('error', 'Le bureau n’est plus relié à Claude Code : relance « npm start » sur ton ordinateur.');
}

/** Ce qu'on demande avant que le moteur soit prêt : gardé, puis envoyé dès qu'il l'est. */
let waiting: ClientMsg[] = [];
const flush = () => { const send = useOffice.getState().send; const list = waiting; waiting = []; for (const m of list) send(m); };
const startBrowser = (mode: 'cloud' | 'ollama' = 'cloud') => { void bureau.init(mode).then(flush); };

/** Le levier du bureau : change le cerveau de l'équipe (Claude ↔ IA gratuite). */
export function pullLever() {
  const st = useOffice.getState();
  if (st.busySince !== null) { st.toast('info', 'L’équipe est en pleine mission : attends qu’elle la rende, ou arrête-la, avant de changer de cerveau.'); return false; }
  if (st.engine === 'cloud') {
    // en ligne : Claude (ta clé API) ou l'IA gratuite de Cloudflare
    const onClaude = modelInfo(st.settings.model)?.provider === 'claude';
    if (!onClaude && !getClaudeKey()) {
      st.toast('info', 'Pour passer sur Claude en ligne, connecte-toi d’abord à Claude (ta clé API) dans les réglages.');
      useOffice.setState({ settingsOpen: true });
      return false;
    }
    st.send({ t: 'settings', settings: { model: onClaude ? MODELS[0].id : 'claude-sonnet-5-5' } });
    st.toast('info', onClaude ? 'Levier baissé : l’équipe passe sur l’IA gratuite.' : 'Levier levé : l’équipe passe sur Claude.');
    return true;
  }
  // sur ton ordinateur : Claude Code (ton compte Claude) ou Ollama (gratuit), on recharge le bureau
  const next = st.brain === 'claude' ? 'free' : 'claude';
  savePref('brain', next);
  useOffice.setState({ brain: next });
  setTimeout(() => location.reload(), 900);
  return true;
}

export function connect() {
  if (!everConnected) useOffice.setState({ send: (m: ClientMsg) => { waiting.push(m); } });
  // sur Cloudflare (ou toute autre adresse), pas de pont local : le bureau tourne dans le navigateur
  if (!isLocalHost()) { startBrowser(); return; }
  // sur ton ordinateur, le levier est sur « IA gratuite » : l'équipe travaille avec Ollama, dans le navigateur
  if (useOffice.getState().brain === 'free' && location.port !== '5174') { startBrowser('ollama'); return; }
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const socket = new WebSocket(`${proto}://${location.host}/ws`);
  ws = socket;
  const failTimer = setTimeout(() => { if (!everConnected) socket.close(); }, 1500);
  socket.onopen = () => {
    clearTimeout(failTimer);
    everConnected = true;
    retry = 0;
    useOffice.setState({ connection: 'live', engine: 'claude-code', send: sendToBridge });
    flush();
  };
  socket.onmessage = (e) => {
    let m: ServerMsg;
    try { m = JSON.parse(String(e.data)); } catch { return; }
    if (m.t === 'replay') { playReplay(m.mission, m.log, 1); return; }
    if (m.t === 'hello' && m.build && m.build !== 'dev') {
      // le bureau a été mis à jour depuis l'ouverture de l'onglet : on recharge la page
      if (build && build !== m.build) { location.reload(); return; }
      build = m.build;
    }
    // ce que l'analyste a rangé dans a-retenir.md rejoint son tiroir
    if (m.t === 'ev' && m.ev.k === 'file' && m.ev.file.name === NOTES_FILE) sendToBridge({ t: 'read', missionId: m.missionId, file: m.ev.file.path });
    if (m.t === 'file_text' && m.file.endsWith(NOTES_FILE) && !useOffice.getState().viewer) {
      const title = useOffice.getState().mission?.title;
      for (const line of m.text.split('\n')) {
        const t = line.replace(/^\s*[-*•]\s*/, '').trim();
        if (t && !t.startsWith('#')) useDrawer.getState().addNote(t, 'analyste', title);
      }
      return;
    }
    useOffice.getState().receive(m);
  };
  socket.onclose = () => {
    clearTimeout(failTimer);
    // pas de pont local (npm run dev sans serveur, ou wrangler dev) : le bureau tourne dans le navigateur
    if (!everConnected) { startBrowser(); return; }
    useOffice.setState({ connection: 'connecting' });
    setTimeout(connect, Math.min(8000, 600 * 2 ** retry++));
  };
}

/**
 * Rejoue une mission enregistrée, avec son rythme d'origine (les longues pauses sont raccourcies).
 */
export function playReplay(mission: MissionInfo, log: Logged[], speed = 1, opts: { loop?: boolean; onEnd?: () => void } = {}) {
  player?.stop();
  lastReplay = { mission, log };
  const st = useOffice.getState();
  useOffice.setState({ replaying: true });
  st.resetMission({ ...mission, status: 'working' });
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const start = Date.now();
  let i = 0;
  let virt = 0;
  const step = () => {
    if (cancelled) return;
    if (i >= log.length) {
      if (opts.loop) { timer = setTimeout(() => { if (!cancelled) playReplay(mission, log, speed, opts); }, 9000); }
      opts.onEnd?.();
      return;
    }
    const l = log[i++];
    useOffice.getState().apply(l.ev, start + virt, true);
    if (i < log.length) {
      // le temps réel entre deux événements, accéléré, et jamais plus de 2,5 s d'attente
      const gap = Math.min(2500, Math.max(0, log[i].at - l.at) / speed);
      virt += gap;
      timer = setTimeout(step, gap);
    } else step();
  };
  timer = setTimeout(step, 600);
  player = { stop: () => { cancelled = true; if (timer) clearTimeout(timer); } };
  return player;
}

/** Reprend la rediffusion depuis le début, à une autre vitesse. */
export function replaySpeed(speed: number) {
  if (!lastReplay) return;
  playReplay(lastReplay.mission, lastReplay.log, speed);
}

/** Arrête la rediffusion et revient au bureau en direct. */
export function stopReplay() {
  player?.stop();
  player = null;
  useOffice.setState({ replaying: false });
  if (ws?.readyState === WebSocket.OPEN) { ws.close(); return; } // le pont renvoie l'état du bureau à la reconnexion
  const cur = bureau.current;
  const st = useOffice.getState();
  st.resetMission(cur ? cur.mission : null);
  if (cur) for (const l of cur.log) st.apply(l.ev, l.at, false);
}
