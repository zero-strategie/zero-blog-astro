# Cadrage : refonte du design « Samizdat », blog zero-stratégie

> Source : plan validé `~/.claude/plans/j-ai-un-blog-localement-mutable-galaxy.md` (cité « Plan ») et lecture du dépôt `blog/zero-blog-astro` (branche `feat/design-samizdat`).
> Rédigé le 2026-10-22. Le plan contient déjà des décisions prises : palette, Fraunces comme unique webfont, signatures CSS, budgets, 6 stories, Strapi hors périmètre. Ce document ne les remet pas en cause. Il les précise, signale ce qui coince et liste ce qui reste à trancher.

---

## 1. Résumé du besoin et objectifs

Le blog zero-stratégie (Astro 6.4.7, adapter `@astrojs/node`, contenu Markdown/MDX local) reprend encore entièrement le starter Astro : Atkinson, accent `#2337ff`, `lang="en"`, `SITE_TITLE = 'Astro Blog'` et contenu Lorem. L'auteur, qui est aussi le client, veut lui donner une identité propre, « Samizdat », autour du tract imprimé en risographie. Elle doit se distinguer nettement du « Sismographe » d'audit.zero-strategie.dev tout en suivant les mêmes principes : zéro JS client, tokens centralisés, une seule fonte de secours à métriques ajustées. Le public, ce sont les lecteurs francophones des thèmes projets, open source, IA, souveraineté et politique.

**Objectifs mesurables**
1. Une identité visuelle Samizdat cohérente sur toutes les pages : accueil, archive, rubrique, article, à propos et 404, en clair et en sombre.
2. Un site entièrement en français : `lang="fr"`, dates `fr-FR`, libellés d'interface.
3. Un classement en 5 rubriques (`§01` à `§05`), chacune avec une page statique.
4. Des budgets de performance vérifiés automatiquement sur `dist/` : 0 script client, CSS < 15 KB, une seule webfont, accueil < 100 KB hors images.
5. Le contraste AA respecté partout, en clair comme en sombre.

---

## 2. Périmètre fonctionnel

### Lot 1 : tokens, fonte, feuille globale (story 1)
- `src/styles/tokens.css` : papier `#f3eee3`, encre `#17161a`, rouge riso `#e3412b`, et en sombre nuit `#131210`, texte `#ebe5d7`, rouge `#ff6b55`. [EXPLICITE]
- Mode sombre automatique via `prefers-color-scheme`. [EXPLICITE]
- Fraunces variable, sous-ensemble latin en woff2, plus une fonte de secours à métriques ajustées. [EXPLICITE]
- Pile `ui-monospace` pour les métadonnées. [EXPLICITE] Elle doit être complétée par des fontes système nommées (voir R6). [DÉDUIT]
- Nouveau `global.css` : reset, typographie, trame (`radial-gradient`), défaut de calage des H1 (`text-shadow`). [EXPLICITE]
- Token d'accent « texte » plus sombre pour atteindre AA sur papier (voir R1 et décision D1). [DÉDUIT]
- Prise en compte de `prefers-reduced-motion` pour toutes les animations. [DÉDUIT]
- Mise en place du harnais de tests `node:test` sur `dist/` : script `pnpm test`, helpers de lecture du build. [DÉDUIT, car le plan impose le TDD sur `dist/` alors qu'il n'existe aucun test aujourd'hui]

### Lot 2 : coque du site (story 2)
- `BaseHead` : `lang="fr"`, favicon, OG. [EXPLICITE]
- Création de `src/layouts/Layout.astro`, la coque unique du document, que toutes les pages utilisent. [DÉDUIT : AGENTS.md §4.8 et dette n°8. Le `<html lang>` est aujourd'hui dupliqué dans 3 fichiers et ne peut pas passer en `fr` proprement sans cette coque]
- `Header` : masthead « zero-stratégie » en Fraunces très gras, sous-titre « carnet indépendant — open source, IA, souveraineté », navigation par rubriques. [EXPLICITE]
- `Footer` : licence, RSS, source. [EXPLICITE] Les liens sociaux Astro sont retirés. [DÉDUIT]
- `consts.ts` : titre, description, rubriques. [EXPLICITE]
- Transitions de page `@view-transition` en CSS. [EXPLICITE] Le `<ClientRouter />` d'Astro est exclu car il injecte du JS. [DÉDUIT]
- Nouveau `public/favicon.svg` (un « 0 » barré rouge). [EXPLICITE] Remplacement ou suppression de `public/favicon.ico`, qui porte encore le logo Astro. [DÉDUIT]
- Lien d'évitement (« Aller au contenu ») et `<nav aria-label>`. [DÉDUIT : dette AGENTS.md n°12, nécessaire pour viser a11y à 100]
- `FormattedDate` en `fr-FR`. [DÉDUIT : AGENTS.md §4.8]

### Lot 3 : rubriques (story 3)
- Champ `category` (enum des 5 rubriques) dans `src/content.config.ts`. [EXPLICITE]
- Pages statiques `/rubriques/[slug]`. [EXPLICITE]
- Composant `Stamp.astro` : tampon incliné, bordure irrégulière en `clip-path`. [EXPLICITE]
- Mise à jour du frontmatter des 5 articles existants (voir R4 et D3). [DÉDUIT]
- État vide explicite sur une rubrique sans article (« Rien d'imprimé ici pour l'instant »). [DÉDUIT : AGENTS.md §4.8 interdit les pages silencieusement vides]
- Helpers d'URL `categoryHref()` et `articleHref()`. [DÉDUIT : AGENTS.md §4.5]

### Lot 4 : accueil (story 4)
- Manifeste court. [EXPLICITE] Le texte n'est pas fourni (Q2).
- Article « à la une » avec couverture bichrome (`grayscale` et `mix-blend-mode: multiply` sur fond rouge). [EXPLICITE]
- Liste chronologique dense, façon sommaire de journal. [EXPLICITE]
- Règle de choix de l'article à la une (le plus récent par défaut). [DÉDUIT, voir A3]
- Restylage de `/blog`, l'archive complète, pour l'aligner sur le sommaire. [DÉDUIT : `src/pages/blog/index.astro` figure dans les fichiers critiques du plan, sans story dédiée]

### Lot 5 : article (story 5)
- Lettrine. [EXPLICITE]
- Sidenotes. [EXPLICITE] Le mode de saisie en Markdown est à trancher (D4).
- Colonne de lecture de 66ch. [EXPLICITE]
- Barre de lecture en `animation-timeline: scroll()`. [EXPLICITE]
- Citations façon « tract ». [EXPLICITE]
- Blocs de code. [EXPLICITE] Thème Shiki branché sur les tokens. [DÉDUIT, voir R9]
- Temps de lecture. [EXPLICITE] Il est calculé au build par une fonction pure testée. [DÉDUIT]
- Textes alternatifs des couvertures (aujourd'hui `alt=""` partout). [DÉDUIT : dette n°12]

### Lot 6 : pages annexes et budget (story 6)
- `/about` restylée. [EXPLICITE] Le texte reste du Lorem tant qu'il n'est pas fourni (Q2).
- `src/pages/404.astro` (inexistante aujourd'hui). [EXPLICITE]
- Script `pnpm check:weight`, qui vérifie les budgets sur `dist/`. [EXPLICITE]

### Contraintes (non négociables, issues du plan ou du dépôt)
| Contrainte | Valeur | Source |
|---|---|---|
| Script client | 0 `<script>`. Le test doit aussi rejeter les attributs `on*=` (voir R5) | Plan, Budgets |
| CSS | < 15 KB par page (mode de mesure : D2) | Plan, Budgets |
| Webfont | 1 seule (Fraunces), aucune autre requête de fonte | Plan, Typo |
| Accueil | < 100 KB transférés, hors images | Plan, Budgets |
| Lighthouse | Perf 100, a11y 100 | Plan, Budgets |
| Contraste | WCAG AA : 4,5:1 pour le texte courant, 3:1 pour le grand texte et les composants d'interface, en clair et en sombre | Plan, Budgets |
| Langue | FR partout (`lang`, dates, libellés, `alt`) | Plan, Story 2 |
| Dépendances | Aucune ajoutée. Tests en `node:test` | Plan, Mise en œuvre §3 |
| Gestionnaire de paquets | pnpm uniquement | AGENTS.md §2 |
| Indentation | Tabulations dans `src/` | AGENTS.md §4.8 |
| CI | Ne pas toucher à la modification non commitée de `.github/workflows/ci.yml` | Plan, Mise en œuvre |

### Critères d'acceptation globaux
1. `pnpm build` passe, puis `pnpm test` (`node --test`) et `pnpm check:weight` sont au vert.
2. Aucun fichier HTML de `dist/client/` ne contient de balise `<script`, d'attribut `on[a-z]+=` ni de lien vers un `.js` ou `.mjs` côté client.
3. Chaque page HTML a `<html lang="fr">` et des dates au format français (`22 oct. 2026` ou `22 octobre 2026`, voir A5).
4. Le cumul du CSS lié et inline de chaque page reste sous 15 KB. Une seule famille `@font-face` téléchargée (Fraunces), en woff2.
5. L'accueil (HTML, CSS, fonte, favicon, hors images) pèse moins de 100 KB.
6. `tokens.css` est le seul fichier qui contient des couleurs littérales. Le test cherche `#[0-9a-f]{3,8}`, `rgb(` et `hsl(` dans les autres CSS et les `<style>` des composants.
7. Un test de contraste, sur le modèle de `zero-audit/web/src/styles/contrast.ts`, vérifie chaque couple texte/fond déclaré, en clair et en sombre.
8. Les 5 pages `/rubriques/<slug>/` existent, une rubrique vide affiche un état vide, et chaque article affiche son tampon.
9. Plus aucune trace du starter dans `dist/` : « Astro Blog », « Hello, Astronaut », liens `withastro`, Atkinson.
10. Contrôle manuel dans le navigateur intégré : accueil, rubrique, article, en clair et en sombre, à 375 px et en desktop. Captures d'écran à l'appui, console sans erreur, 0 requête JS dans l'onglet réseau, Lighthouse perf/a11y à 100 sur accueil et article.
11. Avec `prefers-reduced-motion: reduce`, rien ne se déplace : la barre de lecture reste ou se fige, les transitions de page deviennent un fondu court ou disparaissent.
12. Dans un navigateur sans `animation-timeline` ni `@view-transition` (Firefox), la page est complète et utilisable : pas de barre figée à moitié, pas d'élément invisible.

### Hors périmètre
- Connexion à Strapi, repositories, mappers et i18n multi-locale (Plan, Hors périmètre).
- Rédaction des contenus réels : articles, manifeste définitif, page à propos (HYPOTHÈSE : la story livre des textes provisoires en FR).
- Image OG générée dynamiquement par article (une image OG par défaut statique est en revanche nécessaire, voir D6).
- Sélecteur manuel clair/sombre : il demanderait du JS ou une astuce à base de checkbox, et le plan dit « automatique ».
- Recherche, pagination, commentaires, newsletter.
- Feuille de style d'impression (pourtant cohérente avec le thème, voir Q6).
- Outillage qualité d'AGENTS.md §7 (TypeScript/`astro check`, ESLint, Prettier, Vitest).
- JSON-LD, `robots.txt`, correction du typage de `rss.xml.js` (dettes n°6, 12, 13), sauf si une story y touche par nécessité.

---

## 3. Impact sur l'existant

| Fichier | État actuel (lu) | Changement |
|---|---|---|
| `astro.config.mjs:34-57` | Fonts API, `fontProviders.local()` sur 2 woff Atkinson | Remplacé par Fraunces woff2. **Absent de la liste « fichiers critiques » du plan mais obligatoire.** Il porte aussi `markdown.shikiConfig` (R9) et un éventuel plugin rehype pour les sidenotes (D4) |
| `src/styles/global.css:1-141` | Bear Blog, tokens `--accent`, `--black` en triplets RGB, `720px` en dur | Réécrit entièrement. Les tokens partent dans `tokens.css` |
| `src/components/BaseHead.astro:4` | Importe `global.css` en effet de bord (contre-exemple AGENTS.md §4.2) | L'import CSS passe dans `Layout.astro`. `Font` Fraunces en preload. OG par défaut `blog-placeholder-1.jpg` (`:6,18`) à remplacer |
| `src/components/BaseHead.astro:25` | `<link rel="icon" href="/favicon.ico">` | Dépend du sort de `favicon.ico` (D6) |
| `src/components/Header.astro:6-85` | 3 liens anglais, SVG sociaux Astro, `color: var(--black)` invalide (`:68`) | Réécrit : masthead et rubriques |
| `src/components/HeaderLink.astro:7-9` | Lien actif calculé sur le 1er segment d'URL | Réutilisable pour `/rubriques/<slug>`. Ajouter `aria-current="page"` |
| `src/components/Footer.astro:6` | « Your name here. All rights reserved. » | Licence, RSS, source (Q1, Q3) |
| `src/components/FormattedDate.astro:11` | `'en-us'` | `fr-FR` |
| `src/layouts/BlogPost.astro:14` | `<html lang="en">` sans doctype, `alt=""` (`:63`), « Last updated on » (`:72`) | Utilise `Layout.astro`. Lettrine, sidenotes, barre de lecture, temps de lecture, tampon |
| `src/pages/index.astro:8-49` | Texte du starter | Manifeste, article à la une, sommaire |
| `src/pages/blog/index.astro:16,21,99` | `lang="en"`, `960px` en dur, `alt=""` | Archive restylée |
| `src/pages/about.astro:3,6-11` | Utilise le layout `BlogPost` avec une fausse `pubDate` | Utilise `Layout.astro`, sans date fictive |
| `src/pages/404.astro` | Inexistant | À créer |
| `src/pages/rubriques/[slug].astro` | Inexistant | À créer, `getStaticPaths` sur l'enum |
| `src/content.config.ts:10-17` | Pas de `category` | `category: z.enum([...])` |
| `src/consts.ts:4-5` | `'Astro Blog'`, `'Welcome to my website!'` | Titre, description et table des rubriques (`§NN`, libellé, slug) |
| `src/content/blog/*.md(x)` (5 fichiers) | Sans `category`. `using-mdx.mdx:23` contient `onclick="alert(...)"` | Ajouter `category`. Neutraliser le `onclick` (R5) |
| `src/pages/rss.xml.js:11-14` | Étale `...post.data` | Désormais aussi `category`, sans danger. Ajout facultatif d'un `<category>` [DÉDUIT, CONFORT] |
| `src/assets/fonts/` | `atkinson-*.woff` | Supprimés. Ajouter `fraunces-*.woff2` et `OFL.txt` |
| `public/favicon.svg`, `public/favicon.ico` | Logo Astro | Remplacés |
| `package.json:9-14` | Pas de `test` ni de `check:weight` | Ajout de `"test": "node --test"` et `"check:weight"`, sans dépendance |
| `tests/` (nouveau) | — | Tests `.mjs` sur `dist/client/` |

**Points structurants**
- Avec `@astrojs/node` en mode standalone, les pages prérendues et les assets sortent dans `dist/client/`, pas à la racine de `dist/`. Les tests et `check:weight` doivent viser `dist/client/` (à confirmer au premier build).
- Astro inline les petites feuilles (`build.inlineStylesheets: 'auto'`, seuil de 4 KB). Le budget CSS doit donc additionner les `<link rel="stylesheet">` et les `<style>` inline de chaque page, sinon il peut être contourné sans qu'on s'en aperçoive.
- Contradiction entre AGENTS.md et le plan : AGENTS.md §7 prévoit `vitest` pour les tests unitaires, le plan impose `node:test` sans dépendance. **Le plan prime** (décision de l'utilisateur). Il faudra noter l'écart dans AGENTS.md lors d'une mission ultérieure.
- La CI (`ci.yml`) ne lance que `pnpm build`. Les nouveaux tests ne protègent donc rien en CI tant qu'on ne les y ajoute pas, ce que le plan exclut pour cette mission (fichier modifié et non commité).

---

## 4. Ambiguïtés

| # | Citation | Interprétations | HYPOTHÈSE retenue |
|---|---|---|---|
| A1 | « CSS de moins de 15 KB » | (a) brut minifié, par page ; (b) gzip ; (c) somme de tout le CSS du site | (a) : brut minifié, cumul lié et inline par page. C'est la mesure la plus stricte et la plus simple (voir D2) |
| A2 | « page d'accueil de moins de 100 KB transférés » | Octets réseau compressés ou poids brut | Poids brut de HTML, CSS, fonte et favicon. Le serveur Node standalone ne compresse pas forcément, et on ne sait pas s'il y a un reverse proxy devant (Q5) |
| A3 | « article à la une » | Le plus récent, ou un champ `featured` dans le frontmatter | Le plus récent. Pas de nouveau champ |
| A4 | « liste chronologique dense » sur l'accueil, alors que `/blog` existe aussi | Accueil = tout, ou accueil = N derniers et `/blog` = archive | L'accueil liste les 20 derniers hors « une », `/blog` reste l'archive complète |
| A5 | « dates » en `ui-monospace` | `22/10/2026`, `22 oct. 2026`, ISO `2026-10-22` | `22 oct. 2026` (`fr-FR`, mois court), avec `datetime` ISO |
| A6 | « lettrine » | `initial-letter` (non supporté par Firefox) ou `float` sur `::first-letter` | `float` en base, `initial-letter` en amélioration sous `@supports` |
| A7 | « notes en marge (sidenotes CSS) » | Notes de bas de page GFM repositionnées, HTML brut façon Tufte, ou composant MDX | Voir D4 |
| A8 | « citations façon tract » | Simple style de `blockquote`, ou composant | Style CSS de `blockquote`, sans composant |
| A9 | « Footer (licence, RSS, source) » | Licence du contenu ou du code, URL du dépôt | Licence du contenu, lien vers le dépôt GitHub (Q1, Q3) |
| A10 | Slugs des rubriques | `/rubriques/souverainete` ou `/rubriques/souveraineté` | ASCII sans accent : `projets`, `open-source`, `ia`, `souverainete`, `politique` |
| A11 | « une seule webfont » et l'italique | Fraunces romain seul (italique synthétisé) ou romain et italique (2 fichiers) | Romain seul. `em` en italique synthétisé (voir D5) |

---

## 5. Questions pour le client

**BLOQUANTE**
- Aucune. Toutes les ambiguïtés ont une hypothèse par défaut qui permet de démarrer.

**IMPORTANTE**
1. Sous quelle licence publiez-vous vos articles : CC BY-SA 4.0, CC BY 4.0, ou tous droits réservés ?
2. Pouvez-vous fournir le texte du manifeste de l'accueil (3 à 5 lignes) et celui de la page « à propos » ? Sinon, acceptez-vous un texte provisoire rédigé par l'équipe ?
3. Le dépôt `github.com/zero-strategie/zero-blog-astro` est-il public, pour figurer en lien « source » dans le pied de page ?
4. Pour les 5 articles d'exemple du starter : on leur attribue une rubrique et on les garde comme jeu d'essai, ou on les supprime ?

**CONFORT**
5. Un reverse proxy (Caddy, Traefik…) compresse-t-il les réponses en production ? (Cela change la lecture du budget de 100 KB.)
6. Voulez-vous une version imprimable des articles ? (C'est cohérent avec l'esprit « tract », mais non demandé.)
7. Quels liens sociaux faut-il garder dans le pied de page (Mastodon, GitHub, aucun) ?
8. Préférez-vous des dates `22 oct. 2026` ou `2026-10-22` ?

---

## 6. Risques

| # | Risque | Impact | Prob. | Parade |
|---|---|---|---|---|
| R1 | **Le rouge riso `#e3412b` ne passe pas AA pour le texte courant.** Calcul WCAG : environ 3,6:1 sur papier `#f3eee3` et environ 4,3:1 pour l'encre `#17161a` posée sur aplat rouge. Les liens, les tampons en petit corps mono et les métadonnées rouges échouent | a11y < 100, critère AA non tenu | Certaine si le rouge sert au texte | Garder `#e3412b` pour les aplats, filets, trame, calage et tampons en grand corps. Ajouter un token `--ink-accent-text` plus sombre pour le texte en clair (`#c0341f` ≈ 4,8:1 sur papier, à confirmer par le test). En sombre, `#ff6b55` sur `#131210` ≈ 6,7:1 et `#ebe5d7` ≈ 14,9:1 : conformes. Voir D1 |
| R2 | **Poids de Fraunces.** La fonte a 4 axes (opsz 9–144, wght 100–900, SOFT, WONK). Un woff2 latin qui les garde tous dépasse vraisemblablement les 35–45 KB annoncés, chiffre non vérifié | Budget de 100 KB et Lighthouse | Moyenne | Produire un fichier qui ne garde que `opsz` et une plage `wght` réduite (par exemple 400–900), avec SOFT et WONK figés à 0 et le sous-ensemble latin et latin-1 (accents FR, `«»`, `—`, `’`, `§`). Méthode sans dépendance projet en D5. Le test de `check:weight` fait foi |
| R3 | **Licence et provenance de la fonte.** | Juridique (faible), traçabilité | Faible | Fraunces est sous SIL OFL 1.1 (Undercase Type, dépôt `undercasetype/Fraunces`). L'OFL autorise le sous-ensemble et l'auto-hébergement. Il faut livrer `OFL.txt` à côté du woff2. Le nom réservé « Fraunces » n'est pas déclaré dans l'OFL, donc garder le nom est permis ; le vérifier dans le `OFL.txt` récupéré |
| R4 | **Ancien contenu sans `category`.** Un `z.enum` obligatoire fait échouer `pnpm build` sur les 5 articles existants | Build cassé | Certaine | Dans la même story et le même commit, ajouter `category` aux 5 fichiers. Garder le champ obligatoire (D3). Un test vérifie que chaque article a un tampon |
| R5 | **JS client par la porte des attributs.** `using-mdx.mdx:23` contient `onclick="alert('clicked!')"`. Un test qui ne cherche que `<script` passe quand même | Budget « 0 JS » faussement vert | Certaine | Le test cherche aussi `\son[a-z]+=` et `javascript:`. Supprimer ou réécrire cet exemple (lié à Q4) |
| R6 | `ui-monospace` n'est reconnu que par Safari (macOS, iOS). Chrome et Firefox l'ignorent | Métadonnées en fonte par défaut, aspect variable | Certaine | Pile `ui-monospace, 'SF Mono', 'Cascadia Mono', Menlo, Consolas, 'Liberation Mono', monospace`. On accepte un rendu différent selon l'OS, ce qui reste 0 KB |
| R7 | **`animation-timeline: scroll()`** : Chrome/Edge depuis 2023, Safari depuis septembre 2025, Firefox derrière un flag (au programme d'Interop 2026) | Barre de lecture absente sur Firefox | Certaine | Placer la barre sous `@supports (animation-timeline: scroll())`. Sans support, elle n'est pas affichée (plutôt que figée à 0 % ou 100 %) |
| R8 | **`@view-transition` inter-documents** : Chromium et Safari récents. Pas de support confirmé dans Firefox au moment du cadrage | Pas d'effet sur Firefox | Certaine | Dégradation native : navigation normale. Ne jamais utiliser `<ClientRouter />` (JS). `prefers-reduced-motion` ramène la durée à 0 (même modèle que `zero-audit/web/src/styles/motion.css:110-133`) |
| R9 | **Blocs de code Shiki.** Par défaut, Astro colore le code en `style="color:#…"` inline avec un thème sombre fixe. Couleurs hors tokens, pas de mode clair, HTML alourdi | Critère 6 (couleurs littérales) et cohérence visuelle | Haute | `markdown.shikiConfig.theme: 'css-variables'` dans `astro.config.mjs`, avec des variables `--astro-code-*` définies dans `tokens.css`. Palette réduite : encre, rouge, gris |
| R10 | **`clip-path` sur un tampon cliquable** : le contour de focus est rogné | a11y (focus invisible) | Haute | Mettre le `clip-path` sur un pseudo-élément de fond, pas sur le `<a>`. `:focus-visible` hors zone rognée |
| R11 | **Couvertures bichromes** : `mix-blend-mode: multiply` sur fond rouge assombrit fortement en mode sombre, et l'image à la une est le LCP de l'accueil | Lisibilité, Lighthouse perf | Moyenne | Fond rouge et opacité réglés par token en sombre. Pour l'image à la une : `<Image>` avec `widths`/`sizes`, `loading="eager"`, `fetchpriority="high"`. Images hors budget de 100 KB, mais pas hors Lighthouse |
| R12 | **Sidenotes sans JS** : CSS seul ne peut pas déplacer les notes GFM (rendues en fin d'article) à côté de leur appel | Signature non tenue, ou complexité imprévue | Haute | Voir D4. C'est le principal facteur de variation de l'estimation |
| R13 | **Calage rouge (`text-shadow`) et trame** : l'ombre décalée gêne la lecture en petit corps, et une trame en `background-attachment: fixed` oblige à repeindre à chaque défilement | Lisibilité, perf | Moyenne | Calage réservé aux H1, avec un décalage de 1 à 2 px max en `em`. Trame jamais en `fixed`, uniquement sur des surfaces bornées |
| R14 | **Lighthouse non automatisable** sans dépendance (pas de `lighthouse` ni de Playwright) | Le critère « 100 » reste manuel | Certaine | Vérification manuelle dans le navigateur, consignée avec captures. `check:weight` couvre les budgets mesurables |
| R15 | **Fallback de fonte** : les métriques que l'API Fonts d'Astro génère automatiquement (`optimizedFallbacks`) ne sont pas garanties pour le fournisseur `local()` | Décalage de mise en page au chargement (CLS) | Moyenne | Vérifier dans `dist/` la présence d'un `@font-face` de secours avec `size-adjust`. Sinon, déclarer à la main un `@font-face` sur `local('Georgia')`/`local('Times New Roman')` avec les métriques calculées une fois (même méthode que `zero-audit/web/src/styles/fonts.css:21-38`) |
| R16 | **Enum de rubriques codé en dur alors que Strapi a une collection `category`** (AGENTS.md §1, `category` avec `slug`) | Rework lors de la mission Strapi | Certaine (hors mission) | Centraliser la table des rubriques dans `consts.ts`, avec des slugs identiques à ceux qui seront créés dans Strapi. À noter pour la mission Strapi |

---

## 7. Estimation

Les jours correspondent à du temps de développement en TDD, tests et revue compris.

| Lot / story | Bas | Haut | Commentaire |
|---|---|---|---|
| 0. Harnais `node:test` sur `dist/client/` (build puis lecture des HTML et CSS) | 0,5 | 1 | Préalable à la story 1 |
| 1. Tokens, Fraunces en sous-ensemble, fallback, `global.css`, mode sombre | 1,5 | 2,5 | Haut si le sous-ensemble ou le fallback doit être fait à la main (R2, R15) |
| 2. Coque : `Layout`, `BaseHead`, `Header`, `Footer`, `consts`, favicon, view transitions | 1 | 2 | Inclut l'extraction de `Layout.astro` |
| 3. Rubriques : enum, `/rubriques/[slug]`, `Stamp` | 1 | 1,5 | |
| 4. Accueil : manifeste, à la une bichrome, sommaire (et `/blog`) | 1 | 1,5 | |
| 5. Article : lettrine, sidenotes, barre de lecture, tract, code, temps de lecture | 2 | 3,5 | Haut si un plugin rehype maison est nécessaire (D4), plus Shiki (R9) |
| 6. `/about`, 404, `check:weight` | 1 | 1,5 | |
| **Sous-total** | **8** | **13,5** | |
| Recette (contrôles navigateur, Lighthouse, captures) et imprévus (≈ 18 %) | 1,5 | 2,5 | |
| **Total** | **9,5** | **16** | |

**Hypothèses qui font le plus varier l'estimation**
1. Le mode de saisie des sidenotes (D4) : jusqu'à 1,5 j d'écart.
2. Le poids réel de Fraunces une fois instanciée, et la nécessité d'un fallback calculé à la main (R2, R15) : jusqu'à 1 j.
3. Le rouge texte (D1) : si un deuxième rouge est refusé, une partie des signatures (tampons, liens) doit être repensée en encre.

---

## 8. Décisions à arbitrer (avec recommandation)

**D1 : rouge pour le texte.** Le rouge `#e3412b` ne passe pas AA sur papier (R1).
- Options : (a) ajouter un token `--ink-accent-text` (`#c0341f`, une nuance plus sombre de la même encre) réservé au texte ; (b) liens et petits textes en encre, avec un soulignement rouge.
- **Recommandation : (b), avec (a) en appoint.** Liens en encre et soulignement rouge épais (parfaitement « riso »). Tampons en rouge plus sombre ou en corps ≥ 18,66 px gras. Une seule encre perçue, AA respecté.

**D2 : mesure des budgets.**
- **Recommandation :** CSS ≤ 15 KB brut minifié, cumul lié et inline par page. Accueil ≤ 100 KB brut (HTML, CSS, woff2, favicon), mesuré sur `dist/client/`. Gzip affiché à titre indicatif via `node:zlib`, sans dépendance.

**D3 : `category` obligatoire ou facultatif.**
- **Recommandation : obligatoire** (`z.enum`), et les 5 articles existants renseignés dans le même commit. Un article sans rubrique casse alors le build, ce qui est cohérent avec AGENTS.md §4.8, plutôt qu'une rubrique fourre-tout « Divers » qui n'est pas dans le plan.

**D4 : saisie des sidenotes.**
- Options : (a) notes de bas de page GFM `[^1]`, transformées au build en notes en marge par un petit plugin rehype écrit dans le dépôt (parcours manuel de l'arbre, sans dépendance) ; (b) HTML brut dans le Markdown façon Tufte (`<span class="sidenote">`) ; (c) composant `<Sidenote>` réservé aux `.mdx`.
- **Recommandation : (a).** La syntaxe Markdown reste standard (elle sera aussi celle du rich-text Strapi), il n'y a aucun JS client, la dégradation se fait en notes de bas de page et `markdown-style-guide.md:68-76` sert de jeu d'essai. Sur mobile, les notes s'affichent en ligne sous le paragraphe, sans bascule à base de case à cocher.

**D5 : production du woff2 Fraunces sans dépendance lourde.**
- Options : (a) télécharger une fois le woff2 latin servi par l'API CSS2 de Google Fonts en ne demandant que les axes `opsz,wght` sur une plage réduite, puis le committer avec `OFL.txt` dans `src/assets/fonts/` et le déclarer via `fontProviders.local()` ; (b) `fontProviders.google()` au build, qui exige le réseau en CI et dans Docker ; (c) instancier soi-même avec `fonttools` (`pyftsubset`, `fonttools varLib.instancer`) lancé une fois hors projet, puis committer.
- **Recommandation : (a)**, avec (c) en secours si le fichier dépasse environ 50 KB. Rien n'entre dans `package.json`, le build reste hors ligne, et la commande de reproduction est consignée dans un `README` à côté de la fonte. Romain seul. Italique synthétisé pour `em` (A11) : un fichier italique coûterait une deuxième requête et s'écarterait de la règle « une seule webfont ».

**D6 : favicon `.ico` et image OG par défaut.**
- **Recommandation :** supprimer `favicon.ico` et son `<link>` (tous les navigateurs ciblés gèrent le SVG). Créer une image OG statique 1200×630 en PNG ou JPG aux couleurs Samizdat, puisque le SVG n'est pas accepté par les réseaux sociaux. Elle remplace `blog-placeholder-1.jpg`. Coût : 0,25 j, inclus dans la story 2.

**Points à trancher par l'utilisateur avant le découpage en stories (product-owner)**
1. D1 : liens en encre avec soulignement rouge (recommandé), ou deuxième nuance de rouge pour le texte.
2. D4 : sidenotes à partir des notes de bas de page GFM, avec un plugin rehype maison (recommandé).
3. D5 : Fraunces récupérée une fois via Google Fonts (axes `opsz` et `wght`), committée, romain seul.
4. D3 et Q4 : `category` obligatoire, et sort des 5 articles du starter (gardés comme fixtures ou supprimés).
5. Q1 à Q3 : licence du contenu, textes du manifeste et de l'about, dépôt public ou non.

---

### Sources consultées
- [Astro, Using custom fonts](https://docs.astro.build/zh-cn/guides/fonts/) : `subsets`, `formats` (woff2 par défaut), `optimizedFallbacks`
- [Fraunces, dépôt Undercase Type](https://github.com/undercasetype/Fraunces) et [Fontsource, Fraunces](https://fontsource.org/fonts/fraunces/about) : axes opsz/wght/SOFT/WONK, licence OFL-1.1
- [Mozilla Connect, scroll-driven animations](https://connect.mozilla.org/t5/ideas/implement-css-scroll-driven-animations-animation-timeline/idc-p/119842) et [drweb.de, CSS-Scroll-Animationen ohne JavaScript](https://www.drweb.de/css-scroll-animationen-ohne-javascript/) : Firefox derrière un flag, Safari depuis septembre 2025
- Support de `@view-transition` inter-documents dans Firefox : non confirmé par la recherche, à vérifier sur MDN ou Can I use pendant la story 2
