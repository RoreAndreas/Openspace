# L'open space : notes pour Claude Code

Un bureau en pixel art où l'on regarde une équipe d'agents IA travailler : Lilou (la cheffe, rôle `chef`) et un
seul analyste (rôle `analyse`), pour une responsable marketing et communication. Hébergé sur Cloudflare.
D'après « Le Bureau des agents » (VibesMoney, MIT).

## Les commandes

- `npm run dev` : le bureau avec Vite (http://localhost:5174) ; `/api` est relayé vers `npx wrangler dev` (port 8787).
- `npm run check` : les types (client et Worker). `npm run build` : la construction. Les deux doivent passer.
- `npm run deploy` : construction + `wrangler deploy` (normalement fait par Cloudflare à chaque push sur `main`).

## Comment c'est fait

- **`worker/index.ts`** : le seul code serveur. Il ne stocke rien. `/api/chat` (Workers AI, modèles autorisés dans
  `MODELS`), `/api/search` (Tavily si `TAVILY_KEY`, sinon DuckDuckGo), `/api/fetch` (texte d'une page, adresses
  privées refusées), `/api/ping`. Tout passe par le secret `ACCESS_CODE` (en-tête `x-code`) et refuse les autres origines.
- **`src/local/`** : le bureau tourne dans le navigateur.
  - `agent.ts` : les boucles de Lilou (`runChef`) et de l'analyste (`runAnalyst`). L'IA répond par un objet JSON
    `{ say, action, input }` ; chaque action devient des `OfficeEvent` (`act`, `act_done`, `hire`, `report`, `leave`…).
  - `bureau.ts` : remplace l'ancien serveur local. Il reçoit les `ClientMsg`, renvoie des `ServerMsg` au store, et range
    missions, journaux, fichiers et mémoire de Lilou dans IndexedDB (`db.ts`). 30 missions au plus.
  - `drawer.ts` (le tiroir : couleurs, types de texte, notes ; localStorage), `skills.ts` (format SKILL.md, skills de
    départ dans `starter-skills.ts`), `api.ts` (appels au Worker, code d'accès), `zip.ts` (téléchargements).
- **`shared/protocol.ts`** et **`shared/activity.ts`** : les événements, les métiers (`ACTIVE_ROLES`), les outils et
  les phrases des bulles (`describeAct`).
- **`src/state/store.ts`** (zustand) range les événements et les transmet au moteur (`src/engine/`).
- **`src/engine/`** : le monde, le dessin (tout le pixel art est dessiné en code), la caméra, les clics.
  Le tiroir est le meuble `cabinet` (`furniture.ts`, `layout.ts`, `hits.ts`, `ui/interact.ts`).
- **`src/ui/`** : l'interface React. `Extras.tsx` : le tiroir, les skills, le règlement, la sauvegarde.

## Les règles

- **Français, tutoiement, phrases courtes** dans tout ce que l'utilisatrice lit. Lilou est une femme : accords au féminin.
- **Moins de données** : rien côté serveur ; pas de musique ni de voix (fichiers retirés) ; pas d'image externe.
- **Sécurité** : jamais de secret dans le dépôt (`.dev.vars` est ignoré) ; les pages HTML créées par l'équipe s'affichent
  dans un iframe `sandbox` sans `allow-same-origin`.
- **zustand** : un sélecteur qui renvoie un nouveau tableau ou objet passe par `useShallow`.
- **Brancher Claude plus tard** : changer le moteur de `/api/chat` dans le Worker (même entrée : `messages`, même
  sortie : `{ text }`). Le reste du bureau ne bouge pas.
