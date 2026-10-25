# Améliorer le Bureau des agents

Merci de vouloir aider ! Ce projet est fait pour grandir avec ceux qui l'utilisent, débutants compris.

## Tu as une idée ou tu as trouvé un bug

Ouvre une **Issue** (onglet « Issues » en haut de la page GitHub, puis « New issue ») et choisis le modèle qui correspond :
« Un bug » ou « Une idée ». Décris ce que tu as vu, ou ce que tu aimerais voir. Une capture d'écran aide beaucoup.

Pour discuter, montrer ton bureau ou demander de l'aide, il y a aussi l'onglet **Discussions**.

## Tu veux proposer une amélioration

Le chemin classique sur GitHub, en cinq étapes :

1. **Fork** : bouton « Fork » en haut à droite. Tu obtiens ta propre copie du projet.
2. **Une branche** pour ton idée : `git checkout -b nouveau-meuble` (un nom court qui dit ce que tu fais).
3. **Tes changements**, puis vérifie que tout marche :
   ```bash
   npm install
   npm run check    # les types
   npm run build    # la construction du bureau
   npm start        # et regarde le résultat dans le navigateur
   ```
4. **Commit** et **push** sur ta branche.
5. **Pull request** : sur GitHub, « Compare & pull request ». Explique ce que ça change, avec une capture si c'est visible.

On relit, on discute si besoin, et on fusionne dans `main`.

### Le plus simple : demande à Claude Code

Ouvre Claude Code dans le dossier du bureau et dis-lui par exemple :

> Ajoute une machine à pop-corn dans le coin canapé du Bureau des agents, cliquable, puis propose-la sur GitHub avec une pull request.

Le fichier [CLAUDE.md](CLAUDE.md) lui explique comment le projet est construit et quelles règles suivre.

## Des idées pour commencer

- **La traduction en anglais** de l'interface (tous les textes sont en français aujourd'hui).
- **Un nouveau meuble ou une nouvelle surprise** dans le bureau (tout est dessiné en code, dans `src/engine/furniture.ts`).
- **Un nouveau métier** dans l'équipe (`server/team.ts` et `shared/activity.ts`).
- **Tester sur Windows ou Linux** et nous dire ce qui coince.
- **De nouveaux morceaux pour le jukebox** (seulement si tu as le droit de les partager : dis-nous d'où ils viennent).

## Les règles du bureau

- **L'interface parle français et tutoie.** Des phrases courtes, des mots simples : le bureau est fait pour des débutants.
- **Jamais de chemin complet ni de nom d'utilisateur à l'écran** (utilise `tidy()` et `tilde()` de `src/ui/`).
- **Le bureau reste léger** : environ une milliseconde de dessin par image, pas de 3D lourde, rien quand l'onglet est caché.
- **La sécurité d'abord** : le serveur n'écoute que sur 127.0.0.1, l'équipe reste en mode restreint, les sites créés restent dans leur bac à sable.
- **Le pixel art est dessiné en code** : pas d'image externe dans le bureau.

## Les versions

- `main` est toujours la version qui marche.
- Chaque nouvelle version porte un numéro (`v0.2.0`…) et sa liste de changements dans [CHANGELOG.md](CHANGELOG.md), avec une
  « Release » sur GitHub.

---

**In English:** open an issue for bugs and ideas, or fork, create a branch, run `npm run check` and `npm run build`, and open a pull
request. The UI is in French; an English translation is a welcome first contribution.
