# Le Bureau des agents

**Tu dis ce que tu veux. Une équipe d'agents IA se met au travail sous tes yeux.**

Le Bureau des agents transforme Claude Code en petit jeu vidéo en pixel art. Max, le chef de projet, lit ta demande et appelle les bons
spécialistes. Ils arrivent par la porte, s'installent à leur bureau, et chaque bulle montre ce qu'ils font vraiment, à cet instant.
Ce ne sont pas des animations : chaque robot est un vrai agent Claude Code, qui travaille sur ton ordinateur, avec ton abonnement.

![L'équipe au travail : cinq chercheurs fouillent internet en même temps, Max attend leurs rapports](docs/bureau-en-mission.gif)

Gratuit, open source, et fait pour être amélioré par tout le monde.

---

## L'installer en 2 minutes (sans savoir coder)

1. Il te faut [Claude Code](https://claude.com/claude-code), installé et connecté à ton compte.
2. Ouvre Claude Code et colle cette phrase :

   ```
   Installe et lance le Bureau des agents : https://github.com/devlikemasta/bureau-des-agents
   ```

3. Claude Code télécharge le bureau, l'installe et le lance. Le bureau s'ouvre dans ton navigateur, sur http://localhost:4848.

Les fois suivantes, dis simplement à Claude Code « Relance le Bureau des agents ».

> **Pour Claude Code** (si on t'a donné ce lien) :
> 1. Vérifie que Node.js 22.18 ou plus récent est installé (`node -v`). Sinon, propose à la personne de l'installer depuis https://nodejs.org (version LTS).
> 2. `git clone https://github.com/devlikemasta/bureau-des-agents.git` dans le dossier de son choix (par défaut : son dossier personnel), puis `cd bureau-des-agents` et `npm install`.
> 3. Lance `npm start` **en arrière-plan** : c'est un petit serveur qui doit rester allumé. Il ouvre le navigateur tout seul sur http://localhost:4848.
> 4. Dis à la personne que le bureau est prêt, qu'il tourne tant que la commande tourne, et qu'elle peut écrire sa première mission à Max.

### À la main, si tu préfères

```bash
git clone https://github.com/devlikemasta/bureau-des-agents.git
cd bureau-des-agents
npm install
npm start
```

Il te faut [Node.js](https://nodejs.org) 22.18 ou plus récent. Pour arrêter le bureau : `Ctrl + C` dans le terminal.

## Ta première mission

Écris à Max, au clavier ou à la voix (🎙️). Quelques idées :

- « Je lance ma marque de café. Analyse 5 concurrents, un agent par concurrent, compare leurs prix et fais-moi le site de lancement. »
- « Fais ma veille IA de la semaine : les 5 nouveautés qui comptent pour un entrepreneur. »
- « Écris-moi 3 posts LinkedIn sur mon activité. »

Avant la première mission, remplis **« Le règlement du bureau »** (bouton dans le panneau de droite) : qui tu es, ce que fait ton
entreprise. Max le lit avant chaque mission, et l'équipe travaille pour toi, pas pour n'importe qui.

![Le bureau en fin de journée](docs/bureau-soir.jpg)

## Ce que tu peux faire dedans

- **Cliquer sur tout.**
  - Un robot : sa fiche, avec la mission que Max lui a donnée, chacune de ses actions et son rapport.
  - Le tableau : le plan, qui fait quoi, et l'historique du plan.
  - L'imprimante : les fichiers rendus par l'équipe. La bibliothèque : tes missions passées.
  - Le serveur : Claude Code, le modèle, ton abonnement. L'horloge, la fenêtre (jour, soir, nuit)…
- **Voir les sites créés par l'équipe dans un écran**, en version ordinateur ou téléphone, avec leur code et toutes leurs versions.
- **Retrouver toute l'équipe** (👥) : les métiers, les outils Claude Code de chacun, et l'historique de tous les agents passés au bureau.
- **Rejouer une mission** (`H`, puis « Rejouer ») : elle se remontre à l'identique, sans relancer l'équipe ni consommer ton abonnement.
- **Mettre de la musique** au jukebox, écouter Max faire **la visite guidée** (`T`).
- Et trouver les surprises : un chat, et un code secret bien connu des joueurs.

![Le site créé par l'équipe, affiché dans le bureau](docs/apercu-site.jpg)

### Filmer ton écran

| Touche | Effet |
|---|---|
| `F` | Mode tournage : la caméra suit l'action toute seule. `F` ou `Échap` pour en sortir |
| `V` | Cadre vertical 9:16, pour Instagram et TikTok |
| `T` | Visite guidée, avec la voix de Max |
| `C` | Caméra automatique : oui ou non |
| `N` | Jour, soir, nuit |
| `J` | Le jukebox |
| `M` | Le son |
| molette | Zoomer où tu veux (double-clic : plan large) |

## Ce qui se passe sur ton ordinateur

- **Tout reste chez toi.** Le bureau n'écoute que sur ton ordinateur (127.0.0.1), et aucun site web ne peut lancer ton équipe à ta place.
- **Max est une vraie séance Claude Code**, lancée sans fenêtre dans le dossier de la mission (`~/Documents/Bureau des agents/Missions/`).
  Son équipe, ce sont de vrais sous-agents Claude Code, chacun avec seulement les outils de son métier.
- **L'équipe ne sort pas du dossier de la mission** (mode restreint de Claude Code) : ni tes réglages ni tes autres agents ne s'invitent.
- **Les actions risquées te sont soumises** : pour une commande sensible, l'agent lève la main et tu réponds Oui ou Non.
- **Les sites créés s'affichent dans un bac à sable** : ils ne peuvent ni lire le bureau, ni parler à Claude Code.
- **Le bureau reste léger** : environ une milliseconde de dessin par image, rien quand l'onglet est caché.
- **Ça consomme ton abonnement Claude**, comme si tu demandais le travail à Claude Code toi-même. Une mission de 7 agents a pris
  2 à 3 % de la fenêtre de 5 heures d'un abonnement, lors de nos essais.

Testé sur macOS. Sur Windows et Linux, ça devrait marcher : dis-nous si ce n'est pas le cas (onglet Issues).

## L'améliorer avec nous

Le Bureau des agents est fait pour grandir avec ses utilisateurs : une idée, un bug, un nouveau meuble, un nouveau métier, une traduction…
Tout est expliqué, même si tu débutes, dans [CONTRIBUTING.md](CONTRIBUTING.md).

Le plus simple : ouvre Claude Code dans le dossier du bureau et dis-lui ce que tu veux ajouter. Le fichier [CLAUDE.md](CLAUDE.md) lui
explique comment le projet est fait.

## Sous le capot

- **`server/`** : un petit serveur Node. Il lance `claude -p` (JSON ligne par ligne), passe l'équipe avec `--agents`, travaille en
  `--restricted`, et traduit chaque appel d'outil (`WebSearch`, `WebFetch`, `Write`, `Agent`…) en action dans le bureau.
- **`src/engine/`** : le bureau en Canvas 2D, sur une image de 352 × 256 pixels. Tout le pixel art est dessiné en code, sans image externe.
- **`src/ui/`** : l'interface (React) : la boîte de dialogue de Max, les fenêtres, le panneau de l'équipe.

Pour développer : `npm run dev` (http://localhost:5174, rechargement à chaud). `npm run check` vérifie les types.

## Merci

- **La musique** : des morceaux originaux composés pour le bureau avec [ElevenLabs Music](https://elevenlabs.io/music) et Google Lyria.
- **La voix de Max** : « Léo », une voix de la bibliothèque [ElevenLabs](https://elevenlabs.io).
- **Les bruitages** : [ZzFX](https://github.com/KilledByAPixel/ZzFX) (MIT). **Les polices** : Pixelify Sans et Plus Jakarta Sans (licence OFL).
- **L'inspiration** : [Pixel Agents](https://github.com/pablodelucca/pixel-agents) et [claude-office](https://github.com/paulrobello/claude-office)
  (MIT). Le code et les dessins du Bureau des agents sont écrits à neuf.

Licence MIT (voir [LICENSE](LICENSE)). Un projet [VibesMoney](https://vibesmoney.com) : on t'apprend à créer des agents IA qui travaillent pour toi.

---

## In English

**The Agents' Office** turns Claude Code into a pixel-art game. You give Max, the project lead, a task. He calls real Claude Code
subagents (research, code, design, writing, analysis), each with only the tools of its trade. Every agent walks to its desk, shows what
it is actually doing, and delivers its report; you read the results, even the websites they build, right inside the office.

It runs locally with your own Claude Code subscription. Requirements: Node.js 22.18+ and Claude Code.
Easiest install: open Claude Code and paste `Install and run the Agents' Office: https://github.com/devlikemasta/bureau-des-agents`.
Manual install: `git clone`, `npm install`, `npm start`, then open http://localhost:4848. The interface is in French for now: an English
translation is a great first contribution (see [CONTRIBUTING.md](CONTRIBUTING.md)).
