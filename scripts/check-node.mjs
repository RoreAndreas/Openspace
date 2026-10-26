// Avant de lancer le bureau : la bonne version de Node. Claude Code est facultatif : sans lui, l'équipe peut
// travailler avec l'IA gratuite (Ollama), en tirant le levier du bureau.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const [maj, min] = process.versions.node.split('.').map(Number);
if (maj < 22 || (maj === 22 && min < 18)) {
  console.error(`\n  L’open space (version locale) demande Node.js 22.18 ou plus récent (tu as ${process.versions.node}).`);
  console.error('  Installe la dernière version sur https://nodejs.org, puis relance « npm start ».\n');
  process.exit(1);
}
const home = os.homedir();
// les endroits où l'installateur de Claude Code le range (le PATH n'est pas toujours à jour)
const known = [path.join(home, '.local', 'bin', process.platform === 'win32' ? 'claude.exe' : 'claude'), path.join(home, '.claude', 'local', 'claude')];
let found = known.some((p) => existsSync(p));
if (!found) {
  try { execFileSync('claude', ['--version'], { stdio: 'ignore', timeout: 15000, shell: process.platform === 'win32' }); found = true; } catch { /* absent */ }
}
if (!found) {
  console.warn('\n  ⚠  Claude Code n’est pas trouvé : pour ton compte Claude, installe-le (https://claude.com/claude-code) et connecte-toi avec « claude ».');
  console.warn('     En attendant, tire le levier du bureau : l’équipe travaillera avec l’IA gratuite (Ollama).\n');
}
