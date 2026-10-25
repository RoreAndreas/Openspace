# L'open space

**Tu dis ce que tu veux. Lilou, la cheffe de projet, confie le travail à son analyste, et tu le regardes faire.**

Un bureau en pixel art où une petite équipe d'agents IA travaille pour une responsable marketing et communication :

- **Lilou**, la cheffe de projet, lit ta demande, écrit le plan, confie le travail et vérifie le rendu ;
- **un analyste**, qui cherche sur internet, analyse et rédige les rapports.

Chaque bulle montre ce que l'agent fait vraiment, à cet instant : une recherche, une page lue, un fichier écrit.

> D'après [Le Bureau des agents](https://github.com/devlikemasta/bureau-des-agents) de [VibesMoney](https://vibesmoney.com) (licence MIT).

## Trois façons de faire travailler l'équipe

| | Où | Le cerveau | Ce que ça coûte |
|---|---|---|---|
| **En ligne, IA gratuite** | Cloudflare (une adresse web) | Workers AI (Llama) | Gratuit, dans la limite du quota quotidien |
| **En ligne, avec Claude** | Cloudflare | Claude, avec **ta clé API Claude** (« Se connecter à Claude » dans les réglages) | Facturé à l'usage sur ton compte API Claude |
| **Sur ton ordinateur, avec ton compte Claude** | Ton PC (`npm start`) | Claude Code, connecté à **ton abonnement Claude** | Ton abonnement Pro ou Max |

Pourquoi l'abonnement Claude ne sert que sur ton ordinateur : Anthropic n'autorise pas une application en ligne à
utiliser la connexion d'un compte Pro ou Max. En ligne, on passe donc par une clé API, créée avec ton compte Claude sur
[platform.claude.com](https://platform.claude.com). Sur ton ordinateur, c'est Claude Code lui-même qui travaille, avec
ton compte : c'est prévu et autorisé.

## Ce qu'il y a dedans

- **Le tiroir de l'analyste** : clique sur le caisson à côté de son bureau, ou sur 🗄️. Il contient trois choses :
  - **Couleurs** : la charte, en codes hexadécimaux ;
  - **Types de texte** : les typographies, le ton, les formats attendus ;
  - **À retenir** : ce que l'équipe doit garder en tête pour la suite. L'analyste peut y ranger lui-même une information importante.

  L'analyste et Lilou relisent le tiroir avant chaque mission.
- **Les skills** (🎓) : des méthodes écrites, au format `SKILL.md`, le même que les skills de Claude.
  - Deux sont installées d'office : `rapport-marketing` et `veille-concurrentielle`.
  - On en ajoute d'autres depuis un fichier `.md`, un lien (par exemple un SKILL.md sur GitHub) ou un texte collé.
- **Le règlement du bureau** (⚙️, puis 📜) : qui tu es, ton entreprise, comment travailler pour toi.
- **Les rendus** : chaque rapport se lit dans le bureau ou se télécharge, avec l'historique de ses versions. Une mission entière se télécharge en `.zip`.
- **Les missions précédentes** (touche `H`) : on peut les rejouer.

## Tes données

- **Le serveur ne garde rien.** Les missions, les rapports, le tiroir, les skills et le règlement restent dans le navigateur de la personne qui utilise le bureau.
- **Ce que fait Cloudflare** : il relaie trois choses, l'IA, la recherche web et la lecture des pages.
- **Dans les réglages**, on peut sauvegarder le règlement, le tiroir et les skills dans un fichier, les restaurer, ou tout effacer.
- **Les 30 dernières missions** sont gardées.

## Le mettre en ligne sur Cloudflare (une seule fois, sans rien installer)

1. **Créer le projet.** Sur [dash.cloudflare.com](https://dash.cloudflare.com), va dans **Workers & Pages**, puis **Create**, puis **Import a repository**. Choisis le dépôt **openspace**.
2. **Les réglages de construction** :
   - *Build command* : `npm run build`
   - *Deploy command* : `npx wrangler deploy` (la valeur proposée)

   Lance le déploiement.
3. **Le code d'accès.** Une fois le Worker créé, va dans **Settings**, puis **Variables and Secrets**, puis **Add** :
   - *Type* : **Secret**
   - *Name* : `ACCESS_CODE`
   - *Value* : le code de ton choix, long et difficile à deviner.
4. **Facultatif : une recherche web plus fiable.** Ajoute un deuxième secret `TAVILY_KEY`, avec une clé gratuite créée sur [tavily.com](https://tavily.com) (1 000 recherches par mois). Sans cette clé, la recherche passe par DuckDuckGo.
5. **Ouvrir le bureau** à l'adresse du Worker (`https://openspace.<ton-compte>.workers.dev`). Clique sur ⚙️ et entre le code d'accès : le bureau est prêt.

Ensuite, chaque modification poussée sur la branche `main` du dépôt est remise en ligne automatiquement.

### Se connecter à Claude (en ligne)

1. Avec ton compte Claude, va sur [platform.claude.com](https://platform.claude.com), puis **API Keys**, puis **Create Key**. Ajoute un peu de crédit si ton compte API n'en a pas.
2. Dans le bureau : ⚙️, puis **Se connecter à Claude**, puis colle la clé.

La clé est vérifiée, reste dans ce navigateur et part directement chez Claude : elle ne passe jamais par Cloudflare. Le cerveau de l'équipe passe sur Claude Sonnet ; on peut revenir à l'IA gratuite à tout moment.

### L'IA gratuite

- **Workers AI** offre 10 000 « neurons » par jour, remis à zéro à minuit UTC. Ça représente quelques missions par jour avec Llama 3.3 70B, et davantage avec Llama 3.1 8B. Le modèle se choisit dans les réglages.
- **Quand le quota est épuisé**, Lilou le dit, et l'équipe reprend le lendemain.

## Sur ton ordinateur, avec ton compte Claude

Il te faut :
- [Node.js](https://nodejs.org) 22.18 ou plus récent (version LTS) ;
- [Claude Code](https://claude.com/claude-code), connecté à ton compte : lance `claude` une fois et connecte-toi.

```bash
git clone https://github.com/RoreAndreas/Openspace.git
cd openspace
npm install
npm start
```

Le bureau s'ouvre sur http://localhost:4848. Il reconnaît Claude Code tout seul, et les réglages affichent « l'équipe travaille avec ton compte Claude ».

- **Où vont les fichiers** : dans `Documents/Open space/Missions`, un dossier par mission.
- **Lilou** est une vraie séance Claude Code, et l'analyste un vrai sous-agent Claude Code, avec seulement ses outils.
- **Le règlement, le tiroir et les skills** partent avec chaque demande. Les skills sont copiés dans le dossier caché `.skills` de la mission.
- **Ce que l'analyste retient** : il l'écrit dans `a-retenir.md`, et ces lignes rejoignent son tiroir.

Tu peux aussi demander à Claude Code : « Installe et lance l'open space : https://github.com/RoreAndreas/Openspace ».

## Sous le capot

- **`server/`** : la version locale (Node). Le pont lance Claude Code (`claude -p`, en JSON ligne par ligne) dans le dossier de la mission et traduit ce qu'il fait en événements du bureau. Il marche aussi sous Windows.
- **`worker/index.ts`** : le Worker Cloudflare. Il sert le bureau et expose `/api/chat`, `/api/search`, `/api/fetch` et `/api/ping`. Tout est protégé par le code d'accès et rien n'est stocké.
- **`src/local/`** : l'équipe, dans le navigateur.
  - `agent.ts` : la boucle de travail de Lilou et de l'analyste. L'IA répond par `{ say, action, input }`, le bureau exécute l'action et la montre.
  - `bureau.ts` : les missions, les fichiers, l'enregistrement (IndexedDB).
  - `drawer.ts` : le tiroir.
  - `skills.ts` : les skills.
- **`src/engine/`** : le bureau en pixel art (Canvas 2D, tout est dessiné en code). **`src/ui/`** : l'interface (React).

### Développer

```bash
npm install
npm start            # version locale, avec Claude Code (http://localhost:4848)
npm run dev          # le bureau seul sur http://localhost:5174 ; /api va vers « npx wrangler dev » (2e terminal)
npm run check        # les types (client, Worker, serveur local)
```

Pour `wrangler dev`, mets le code d'accès dans un fichier `.dev.vars` : `ACCESS_CODE=mon-code`. Ce fichier n'est jamais envoyé sur GitHub.

## Merci

- **Le Bureau des agents** de VibesMoney (MIT), d'où vient tout le bureau en pixel art.
- **Les bruitages** : [ZzFX](https://github.com/KilledByAPixel/ZzFX) (MIT).
- **Les polices** : Pixelify Sans et Plus Jakarta Sans (licence OFL).

Licence MIT (voir [LICENSE](LICENSE)).
