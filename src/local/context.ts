// Ce que l'équipe doit savoir avant chaque mission : le règlement, le tiroir, la liste des skills.
// Tout vit dans le navigateur ; on l'envoie avec chaque demande au moteur (version locale ou Cloudflare).
import type { TeamInput } from '../../shared/protocol.ts';
import { lsGet } from './db.ts';
import { drawerPrompt } from './drawer.ts';
import { activeSkills, skillsPrompt } from './skills.ts';

export function rulesText() {
  return lsGet<string>('rules', '').replace(/\(par exemple[^)]*\)/g, '').trim();
}

export function teamInput(): TeamInput {
  const rules = rulesText();
  const context = [
    rules ? `## Le règlement du bureau (écrit par ta patronne)\n${rules}` : '',
    drawerPrompt(),
    skillsPrompt().replace('(lis-en un avec use_skill avant de l’appliquer)', '(dans le dossier .skills de la mission : lis celui qui s’applique)'),
  ].filter(Boolean).join('\n\n');
  return { context, skills: activeSkills().map((s) => ({ name: s.name, content: s.content })) };
}
