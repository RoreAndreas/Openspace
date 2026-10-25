// Fabrique la démo publique (public/demo/mission.json) à partir d'une mission enregistrée :
//   node scripts/make-demo.ts <identifiant de la mission>      (voir ~/Documents/Bureau des agents/.bureau/state.json)
// Les chemins de ton ordinateur sont effacés : la démo ne garde que ce qui s'affiche dans le bureau.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Logged, MissionInfo } from '../shared/protocol.ts';

const id = process.argv[2];
if (!id) { console.error('Indique l’identifiant de la mission (dans .bureau/state.json).'); process.exit(1); }
const dir = process.env.BUREAU_DIR ?? path.join(os.homedir(), 'Documents', 'Bureau des agents');
const state = JSON.parse(readFileSync(path.join(dir, '.bureau', 'state.json'), 'utf8')) as { missions: MissionInfo[] };
const mission = state.missions.find((m) => m.id === id);
if (!mission) { console.error('Mission introuvable : ' + id); process.exit(1); }
const log = readFileSync(path.join(dir, '.bureau', 'missions', `${id}.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Logged);

const scrub = (s: string) => s.split(mission.folder + '/').join('').split(mission.folder).join('.').split(os.homedir()).join('~');
const clean = JSON.parse(scrub(JSON.stringify(log))) as Logged[];
const info: MissionInfo = { ...mission, folder: 'Missions/' + path.basename(mission.folder), sessionId: undefined, files: mission.files.map((f) => ({ ...f })) };

const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'demo');
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, 'mission.json'), JSON.stringify({ mission: info, log: clean }));
console.log(`Démo écrite : public/demo/mission.json (${clean.length} événements, ${Math.round((clean.at(-1)!.at - clean[0].at) / 1000)} s)`);
