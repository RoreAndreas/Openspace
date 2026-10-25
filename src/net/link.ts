// Le lien entre l'interface et le bureau. Dans l'open space, le bureau tourne dans le navigateur
// (src/local/bureau.ts) et ne parle qu'au Worker Cloudflare : plus de serveur local.
// On garde ici la rediffusion d'une mission enregistrée (pratique pour la revoir, ou la filmer).
import type { Logged, MissionInfo } from '../../shared/protocol.ts';
import { bureau } from '../local/bureau.ts';
import { useOffice } from '../state/store.ts';

let player: { stop: () => void } | null = null;
let lastReplay: { mission: MissionInfo; log: Logged[] } | null = null;

export function connect() {
  void bureau.init();
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
  const cur = bureau.current;
  const st = useOffice.getState();
  st.resetMission(cur ? cur.mission : null);
  if (cur) for (const l of cur.log) st.apply(l.ev, l.at, false);
}
