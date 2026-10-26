# L'open space : notes pour Claude Code

Un bureau en pixel art où l'on regarde une équipe d'agents IA travailler : Lilou (la cheffe, rôle `chef`) et un
seul analyste (rôle `analyse`), pour une responsable marketing et communication. Hébergé sur Cloudflare.
D'après « Le Bureau des agents » (VibesMoney, MIT).

## Quatre moteurs (et le levier)

- **Version locale** (`npm start`, `server/`) : le pont Node lance Claude Code avec le compte Claude de l'utilisateur
  (`claude -p`, stream-json, `--agents` : un seul `analyste`). Le navigateur le détecte (WebSocket `/ws` sur localhost)
  et envoie `team` (règlement + tiroir + skills) avec chaque `start`/`say` ; les skills sont copiés dans `.skills/` de la
  mission ; les lignes de `a-retenir.md` rejoignent le tiroir (`src/net/link.ts`).
- **En ligne, IA gratuite** : Worker Cloudflare + Workers AI (`worker/index.ts`), équipe dans le navigateur (`src/local/`).
- **En ligne, Claude** : clé API Claude de l'utilisatrice (« Se connecter à Claude »), appels directs du navigateur à
  `api.anthropic.com` (`src/local/api.ts`, `claude`). Jamais d'identifiants d'abonnement Claude dans la version en ligne :
  Anthropic ne l'autorise pas.
- **En local, IA gratuite** : Ollama sur le PC. Le bureau tourne dans le navigateur (`bureau.init('ollama')`, moteur
  `ollama`) ; le serveur local relaie `/api/ollama/tags|chat` vers Ollama (`OLLAMA_HOST`, par défaut 127.0.0.1:11434)
  et sert `/api/search`, `/api/fetch`, `/api/ping` (code partagé avec le Worker : `shared/web.ts`). Ces routes exigent le
  bon `Host`, une origine du bureau et l'en-tête `x-code`.
- **Le levier** (meuble `lever`, `pullLever` dans `src/net/link.ts`) : en local, il bascule `brain` (`claude` ↔ `free`,
  dans localStorage) et recharge la page ; en ligne, il passe le modèle de Workers AI à Claude (clé API) et inversement.

## Les commandes

- `npm start` : version locale (vérifie Node, construit, lance `server/index.ts` sur http://localhost:4848).
- `npm run dev` : le bureau avec Vite (http://localhost:5174) ; `/api` est relayé vers `npx wrangler dev` (port 8787).
- `npm run check` : les types (client, Worker, serveur local). `npm run build` : la construction. Les deux doivent passer.
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
- **`src/ui/`** : l'interface React. `Extras.tsx` : le tiroir, les skills, le règlement, la sauvegarde. `Jukebox.tsx` : la
  liste YouTube et le petit lecteur (`src/audio/music.ts` pilote l'iframe youtube-nocookie par `postMessage`).
- La note « Comment ça marche » est le meuble `note` (fenêtre `howto` dans `Rooms.tsx`). Lilou se promène après 2 minutes
  d'inactivité (`stroll`, `IDLE_STROLL` dans `world.ts`). `findClaude` lit `claude --help` : sans `--restricted` ni mode
  « auto » (version ancienne), le pont s'en passe (`supports`). Le panneau de droite se replie (`panelOpen`, touche P).

## Les règles

- **Français, tutoiement, phrases courtes** dans tout ce que l'utilisatrice lit. Lilou est une femme : accords au féminin.
- **Moins de données** : rien côté serveur ; pas de fichier de musique ni de voix ; la musique vient des liens YouTube
  de l'utilisatrice (youtube-nocookie.com, seule exception à la CSP : `frame-src`) ; pas d'image externe.
- **Sécurité** : jamais de secret dans le dépôt (`.dev.vars` est ignoré) ; les pages HTML créées par l'équipe s'affichent
  dans un iframe `sandbox` sans `allow-same-origin`.
- **zustand** : un sélecteur qui renvoie un nouveau tableau ou objet passe par `useShallow`.
- **Serveur local** : Node ≥ 22.18 exécute le TypeScript directement ; dans `server/` et `shared/`, imports en `.ts` et
  syntaxe effaçable seulement (pas d'`enum`, pas de `namespace`). Sous Windows, `findClaude` gère `claude.exe` et `claude.cmd`.
