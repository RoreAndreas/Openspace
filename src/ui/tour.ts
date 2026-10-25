// La visite guidée : Max présente son bureau, coin par coin, avec sa voix (ElevenLabs). La caméra suit,
// et s'il n'y a pas de mission en cours, une équipe de démonstration s'installe le temps de la visite.
import { say, stopVoice, type Line } from '../audio/voice.ts';
import { camera, world } from '../engine/instance.ts';
import { useOffice } from '../state/store.ts';

const STEPS: { line: Line; text: string; shot: [number, number, number] }[] = [
  { line: 'visite-1', text: 'Bienvenue dans mon bureau ! Moi, c’est Max, le chef. Ici, une équipe d’agents IA bosse pour toi, jour et nuit.', shot: [176, 186, 1.9] },
  { line: 'visite-2', text: 'Là, c’est la recherche. Mes chercheurs fouillent internet pour toi. Les prix, tes concurrents, les avis clients.', shot: [64, 104, 1.7] },
  { line: 'visite-3', text: 'Ici, l’atelier code. Ils construisent tes sites, tes outils, tes automatisations.', shot: [288, 76, 1.95] },
  { line: 'visite-4', text: 'Le studio design. Tout ce qui doit être beau passe par ici.', shot: [276, 124, 1.95] },
  { line: 'visite-5', text: 'La rédaction. Tes posts, tes mails, tes scripts vidéo.', shot: [64, 188, 1.95] },
  { line: 'visite-6', text: 'Et l’analyse. Les chiffres, les tableaux, et les conclusions qui comptent.', shot: [258, 188, 1.95] },
  { line: 'visite-7', text: 'Sur ce tableau, j’écris le plan de chaque mission. Et chaque rapport finit sur mon bureau.', shot: [176, 46, 2.05] },
  { line: 'visite-8', text: 'Toi, tu me dis ce que tu veux. Je monte l’équipe. Et tu regardes.', shot: [176, 128, 1] },
];

let run = 0;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function startTour() {
  const id = ++run;
  const st = useOffice.getState();
  useOffice.setState({ modal: null, showFinal: false });
  const demo = !st.busySince;
  if (demo) world.demoTeam(true);
  for (let i = 0; i < STEPS.length; i++) {
    if (run !== id) return;
    const s = STEPS[i];
    camera.shot(s.shot[0], s.shot[1], s.shot[2], 60);
    useOffice.setState({ tour: { step: i, text: s.text } });
    if (i === 0 || i === STEPS.length - 1) world.chef.happyUntil = world.time + 2;
    const t0 = Date.now();
    await say(s.line, true);
    // sans la voix (ou si elle est coupée), on laisse le temps de lire
    const minMs = 900 + s.text.length * 38;
    const spent = Date.now() - t0;
    if (spent < minMs) await wait(minMs - spent);
    await wait(350);
  }
  if (run !== id) return;
  endTour(demo);
}

function endTour(demo: boolean) {
  useOffice.setState({ tour: null });
  camera.wide(2);
  if (demo) world.demoTeam(false);
}

export function stopTour() {
  if (!useOffice.getState().tour) return;
  run++;
  stopVoice();
  endTour(true);
}
