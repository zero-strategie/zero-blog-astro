# Stories : design « Samizdat », blog zero-stratégie

> Source : cadrage validé `docs/cadrage-design-samizdat.md`, plan `~/.claude/plans/j-ai-un-blog-localement-mutable-galaxy.md`, arbitrages D1 à D6 et valeurs provisoires Q1 à Q8 transmis le 2026-10-22.
> Version machine : `docs/stories/design-samizdat.json` (même contenu, même ordre).
> Branche : `feat/design-samizdat`. Projet existant : pas de story d'initialisation.

## Comment lire ce découpage

Le plan prévoit 6 stories. Chacune dépassait la limite d'un jour de travail : le cadrage les estime entre 1 et 3,5 jours. Elles deviennent donc **6 lots, qui correspondent exactement aux 6 stories du plan**, découpés en **14 stories d'au plus 1 jour**. Une story du harnais de tests (S01) s'y ajoute en tête, comme le prévoit la ligne 0 du cadrage. Chaque story est livrable seule : `pnpm test` est vert à la fin de chacune.

**Ordre d'exécution : S01 → S14, en séquence.** Les stories touchent les mêmes fichiers (BaseHead, BlogPost, global.css, consts.ts). Les dépendances listées sont les dépendances fonctionnelles minimales.

**Règles transverses (valables pour toutes les stories)**
- Tests en `node:test`, fichiers `.mjs` dans `tests/`. `pnpm test` = `pnpm build && node --test tests/`. Aucune dépendance ajoutée.
- Assertions sur `dist/client/` dès que c'est possible. Ce qui reste manuel est marqué « Manuel » dans les critères.
- Le test « zéro JS » de S01 (pas de `<script`, d'attribut `on…=` ni de `javascript:`) reste vert dans toutes les stories suivantes.
- À partir de S02, seul `tokens.css` contient des couleurs littérales, et la CSS de chaque page reste ≤ 15 KB.
- Liens en encre soulignés de rouge. Tout texte rouge en petit corps utilise `--ink-red-text` (#c0341f). `#e3412b` est réservé aux aplats, filets, calage et gros titres (D1).
- Aucun texte visible en dur dans les composants : tout passe par `src/consts.ts`. Indentation par tabulations dans `src/`.
- Ne pas toucher `.github/workflows/ci.yml`.

---

## Lot 1 – Fondations (tests, tokens, fonte), story 1 du plan

**Total du lot : 2,5 j** (cadrage : 2 à 3,5 j, harnais compris)

### S01 – Mettre en place le harnais node:test sur dist/client
P0 · 0,5 j · dépend de : aucune

En tant que développeur du blog, je veux une commande `pnpm test` qui construit le site puis vérifie le HTML produit dans `dist/client/`, afin de prouver en TDD chaque règle du design Samizdat (0 JS, langue, budgets) sans ajouter de dépendance.

Critères d'acceptation
- Étant donné le dépôt, quand je lance `pnpm test`, alors `pnpm build` s'exécute, puis `node --test` lance les fichiers de `tests/`, et la commande sort en code 0.
- Étant donné que `dist/client/` n'existe pas, quand un test appelle le helper de lecture, alors il échoue avec un message qui contient « pnpm build ».
- Étant donné le build, quand le test « zéro JS » parcourt tous les `.html` de `dist/client/`, alors aucun ne contient de `<script`, d'attribut `on…=` dans une balise, ni de `javascript:`.
- Étant donné le build, quand le test liste `dist/client/`, alors il n'y trouve aucun fichier `.js` ni `.mjs`.
- Étant donné un fragment HTML de test avec un attribut onclick, quand la fonction de détection l'analyse, alors elle signale une violation. Étant donné le texte « on=1 » hors balise, alors elle ne signale rien.
- Étant donné `using-mdx.mdx`, quand je cherche `onclick`, alors il n'apparaît plus.
- Étant donné `package.json`, quand je le compare à la version précédente, alors seuls les scripts ont changé : aucune dépendance n'a été ajoutée.

Notes techniques : `scripts/lib/dist.mjs` est partagé avec `check:weight` (S14). Si `node --test tests/` ne résout pas le répertoire sur Node 22.12, utiliser un glob quoté. Détecter les `on*` dans les balises ouvrantes seulement. Confirmer que les pages sortent bien dans `dist/client/`.

### S02 – Poser les tokens Samizdat, le nouveau global.css et le mode sombre
P0 · 1 j · dépend de : S01

En tant que lecteur, je veux une page aux couleurs papier, encre et rouge riso, lisible en clair comme en sombre, afin de reconnaître l'identité Samizdat et de lire confortablement quel que soit le réglage de mon système.

Critères d'acceptation
- `tokens.css` déclare papier #f3eee3, encre #17161a, rouge #e3412b, rouge texte #c0341f, puis en sombre nuit #131210, texte #ebe5d7, rouge #ff6b55.
- Le test de contraste WCAG vérifie chaque couple texte/fond déclaré, en clair et en sombre : au moins 4,5:1 pour le texte courant, au moins 3:1 pour les composants graphiques et le grand texte.
- Un cas de test volontairement faible (#e3412b sur papier, en texte courant) est bien classé en échec.
- Aucune couleur littérale (hexadécimal, `rgb(`, `hsl(`) dans les autres CSS de `src/` ni dans les `<style>` des `.astro`.
- La CSS construite contient `prefers-color-scheme: dark`. Les liens sont en encre avec un `text-decoration-color` rouge.
- La CSS liée plus la CSS inline de chaque page ne dépasse pas 15 KB (15 360 octets).
- Sous `prefers-reduced-motion: reduce`, la durée des animations et des transitions est nulle.
- Pas de `background-attachment: fixed` pour la trame. Le calage rouge (`text-shadow`) est réservé aux h1.
- Manuel : en clair puis en sombre, aucun texte illisible, et le décalage rouge est visible sur le H1.

Notes techniques : `scripts/lib/contrast.mjs` reprend le modèle de `zero-audit/web/src/styles/contrast.ts`. Piège : un sélecteur `#add` ressemble à un hexadécimal, donc ne chercher les couleurs que dans les valeurs. Les couleurs en dur de Header, BlogPost et blog/index passent en tokens dans cette story.

### S03 – Installer Fraunces woff2 et sa fonte de secours à métriques ajustées
P0 · 1 j · dépend de : S02

En tant que lecteur, je veux que titres et texte soient composés en Fraunces sans saut de mise en page au chargement, afin de retrouver la typographie Samizdat sans payer plus d'une webfont.

Critères d'acceptation
- `src/assets/fonts/` contient un seul `fraunces*.woff2`, `OFL.txt` et un `README.md` qui explique comment reproduire le fichier. Plus aucun fichier Atkinson.
- `dist/client/` contient exactement un fichier de fonte, en `.woff2`, de 50 KB au plus.
- « atkinson » n'apparaît nulle part dans les HTML et CSS de `dist/client/`.
- Un `@font-face` de secours avec `size-adjust` existe.
- L'accueil précharge le woff2 de Fraunces.
- Les métadonnées utilisent `var(--font-mono)`.
- Manuel : l'onglet réseau ne montre qu'une requête de fonte, et é à ç « » — ’ § s'affichent bien en Fraunces.

Notes techniques : `fontProviders.local()` avec `weight: '400 900'`. Vérifier que `optimizedFallbacks` fonctionne avec le fournisseur local (R15), sinon écrire un fallback manuel. Le fichier vient de Google Fonts CSS2 (opsz et wght uniquement). Si nécessaire, fonttools hors projet.

---

## Lot 2 – Coque du site, story 2 du plan

**Total du lot : 2 j** (cadrage : 1 à 2 j)

### S04 – Extraire Layout.astro et passer la tête du document en français
P0 · 1 j · dépend de : S02

En tant que lecteur francophone (et moteur de recherche), je veux que chaque page déclare le français, porte le favicon zero-stratégie et une image de partage Samizdat, afin que le site soit correctement lu, indexé et partagé.

Critères d'acceptation
- Chaque HTML de `dist/client/` commence par `<!DOCTYPE html>` et déclare `lang` = `fr`.
- Seul `src/layouts/Layout.astro` contient la balise `<html`.
- `/favicon.svg` est référencé en `image/svg+xml`. Plus de `favicon.ico`, ni dans le `<head>` ni dans `dist/client/`.
- `og-default.png` fait 1200×630 (dimensions lues dans l'en-tête PNG).
- Sur l'accueil, `og:image` et `twitter:image` valent `https://zero-strategie.dev/og-default.png` et `og:locale` vaut `fr_FR`. Un article avec couverture utilise sa couverture.
- Plus de `blog-placeholder-1` dans les meta de l'accueil, de /about/ et de /blog/.
- La CSS contient `@view-transition { navigation: auto }`, neutralisé sous reduced-motion. Aucun `ClientRouter`.
- Le premier lien du `<body>` est « Aller au contenu » et pointe vers l'id du `<main>`.
- Manuel : fondu entre les pages dans Chrome, navigation normale dans Firefox, lien d'évitement visible au premier Tab.

Notes techniques : `global.css` est importé par Layout et non plus par BaseHead. `og-default.png` est générée une seule fois (avec sharp, déjà présent, ou un outil externe), puis commitée. Le support de `@view-transition` dans Firefox est à vérifier sur MDN.

### S05 – Refaire le masthead, la navigation et le pied de page en français
P0 · 1 j · dépend de : S04

En tant que lecteur, je veux un en-tête « zero-stratégie » façon journal, une navigation en français et un pied de page qui indique licence, flux RSS et source, afin de savoir où je suis, qui publie et sous quelles conditions.

Critères d'acceptation
- L'en-tête affiche « zero-stratégie » et le sous-titre « carnet indépendant — open source, IA, souveraineté ».
- La navigation est un `<nav aria-label>` en français, avec Accueil, Archive (/blog/) et À propos (/about/). Le lien actif, et lui seul, porte `aria-current=page`.
- Le pied de page contient un lien vers la licence CC BY-SA 4.0 (deed.fr), vers /rss.xml et vers github.com/zero-strategie/zero-blog-astro.
- Plus aucune trace dans `dist/client/` de « Astro Blog », « Your name here », « Welcome to my website », « withastro » ou « astrodotbuild ».
- Tout lien en `target=_blank` porte `rel=noopener noreferrer` (ou il n'y en a aucun).
- first-post affiche « 8 juillet 2022 », avec un `datetime` qui commence par 2022-07-08.
- Manuel : la date est identique en build avec `TZ=Europe/Paris` et avec `TZ=UTC`.
- Les SVG sociaux d'Astro ont disparu. Les URL et les textes viennent de `consts.ts`.
- Manuel : à 375 px, aucun débordement et un focus clavier visible.

Notes techniques : `Intl.DateTimeFormat('fr-FR', { day, month: 'long', year, timeZone: 'UTC' })`. Pour cela, passer les `pubDate` des 5 articles au format ISO, sinon une date lue en heure locale recule d'un jour à Paris.

---

## Lot 3 – Rubriques, story 3 du plan

**Total du lot : 1,5 j** (cadrage : 1 à 1,5 j)

### S06 – Classer les articles en 5 rubriques et publier les pages de rubrique
P0 · 1 j · dépend de : S05

En tant que lecteur, je veux parcourir les articles par rubrique (§01 Projets à §05 Politique) depuis la navigation, afin de ne lire que le thème qui m'intéresse.

Critères d'acceptation
- Manuel : un article sans `category`, ou avec une valeur hors enum, fait échouer `pnpm build` avec une erreur qui nomme le champ.
- Les 5 articles ont une `category` valide (D3, Q4).
- `dist/client/rubriques/` contient exactement les dossiers projets, open-source, ia, souverainete et politique.
- Sur chaque page de rubrique, le H1 affiche « §0N Libellé » et la page liste les articles de la rubrique du plus récent au plus ancien, avec des liens vers /blog/<id>/.
- Une rubrique vide (politique) affiche « Rien d'imprimé ici pour l'instant » et un lien vers l'archive.
- La navigation contient les 5 rubriques. Sur /rubriques/ia/, seul le lien IA est en `aria-current`.
- Les gabarits d'URL `/blog/${…}` et `/rubriques/${…}` n'existent que dans `src/lib/url.ts`, que `rss.xml.js` utilise aussi.
- Manuel : à 375 px, les 8 liens de navigation restent accessibles.

Notes techniques : `CATEGORIES` est défini une seule fois dans `consts.ts` et alimente `z.enum`. Piège : HeaderLink calcule le lien actif sur le premier segment de l'URL, donc il faut comparer le chemin complet pour les rubriques. Répartition proposée : first-post et using-mdx en projets, second-post en open-source, third-post en ia, markdown-style-guide en souverainete. Politique reste vide.

### S07 – Afficher le tampon de rubrique sur chaque article
P1 · 0,5 j · dépend de : S06

En tant que lecteur, je veux voir la rubrique de chaque article sous la forme d'un tampon incliné « §0N Libellé » cliquable, afin d'identifier le thème d'un coup d'œil et de rejoindre sa rubrique.

Critères d'acceptation
- Chaque page d'article contient exactement un tampon qui pointe vers /rubriques/<slug>/ et affiche le bon numéro et le bon libellé.
- Le `clip-path` est posé sur un pseudo-élément et non sur le lien. `:focus-visible` est défini (R10).
- La couleur du texte est `var(--ink-red-text)` ou `var(--ink)`, jamais `var(--ink-red)`.
- Aucune animation, ou une animation neutralisée sous reduced-motion.
- Manuel : le focus clavier n'est pas rogné, en clair comme en sombre.

---

## Lot 4 – Accueil et archive, story 4 du plan

**Total du lot : 1,5 j** (cadrage : 1 à 1,5 j)

### S08 – Composer l'accueil : manifeste, article à la une et sommaire
P0 · 1 j · dépend de : S07

En tant que lecteur qui arrive sur le blog, je veux lire en quelques lignes ce que défend le carnet, voir le dernier article mis en avant et parcourir les suivants en liste dense, afin de décider vite quoi lire.

Critères d'acceptation
- L'accueil affiche le manifeste de `consts.ts`. Il ne contient ni « Hello, Astronaut » ni « Lorem ».
- L'article à la une est le plus récent : son `datetime` est supérieur ou égal à celui de chaque ligne du sommaire.
- Le sommaire contient au plus 20 articles, triés du plus récent au plus ancien, sans l'article à la une. Chaque ligne a un `<time>`, un tampon et un titre lié.
- La couverture à la une a un `alt` égal à `heroAlt`, avec `loading=eager`, `fetchpriority=high`, `srcset` et `sizes`.
- Manuel : un `heroImage` sans `heroAlt` fait échouer le build.
- La CSS applique la bichromie : `grayscale` et `mix-blend-mode: multiply` sur un fond rouge défini par token.
- Manuel : avec une collection vide, l'accueil affiche le manifeste et l'état vide.
- Manuel : la couverture reste lisible à 375 px et en desktop, en clair et en sombre. Lighthouse ne signale pas de LCP en lazy.

Notes techniques : `heroAlt` est ajouté au schéma (obligatoire dès qu'il y a un `heroImage`) et renseigné dans les 5 articles. Composants à props étroites : `FeaturedArticle.astro` et `ArticleRow.astro`. La fonction pure `splitFeatured` vit dans `src/lib/`.

### S09 – Restyler l'archive /blog en sommaire de journal
P1 · 0,5 j · dépend de : S08

En tant que lecteur, je veux retrouver tous les articles publiés dans une archive au même style que le sommaire de l'accueil, afin de remonter dans le temps sans changer de repères.

Critères d'acceptation
- /blog/ liste tous les articles (5 dans le jeu d'essai), du plus récent au plus ancien.
- Chaque ligne affiche la date en français dans un `<time>`, le tampon et un titre lié.
- Le `<title>` et le H1 sont en français (« Archive »).
- Pas de largeur en px codée en dur, pas d'image sans texte alternatif.
- Manuel : avec une collection vide, l'archive affiche l'état vide. Pas de défilement horizontal à 375 px.

---

## Lot 5 – Article, story 5 du plan

**Total du lot : 3 j** (cadrage : 2 à 3,5 j)

### S10 – Composer l'article : lettrine, citations tract, temps de lecture
P0 · 1 j · dépend de : S07

En tant que lecteur d'un article, je veux une colonne de lecture confortable de 66ch, une lettrine, des citations façon tract et le temps de lecture estimé, afin de lire un texte long comme un tract imprimé et de savoir combien de temps il me prendra.

Critères d'acceptation
- `readingTime` renvoie 1 pour un texte vide, 1 pour 220 mots, 2 pour 221 mots, et ignore le code délimité.
- markdown-style-guide affiche « N min de lecture », où N vaut `readingTime` du fichier source.
- La colonne est limitée par `var(--measure)` (66ch). La lettrine porte sur le `::first-letter` du premier paragraphe. `initial-letter` n'apparaît que sous `@supports`.
- L'`alt` de la couverture vaut `heroAlt`, non vide.
- Dans `blockquote`, le rouge sert au filet ou à l'aplat, et le texte reste en encre.
- L'en-tête suit l'ordre : tampon, H1, date et temps de lecture (en mono).
- Manuel : la lettrine s'affiche en float dans Firefox. Pas de défilement horizontal à 375 px. La citation reste lisible en sombre.

Notes techniques : `src/lib/reading-time.mjs` est écrit en ESM + JSDoc, pour pouvoir être testé directement par node:test. `[...slug].astro` passe le résultat en prop au layout.

### S11 – Transformer les notes de bas de page en notes en marge
P1 · 1 j · dépend de : S10

En tant que lecteur sur grand écran, je veux lire chaque note à côté de son appel, dans la marge, et retrouver les notes classiques en fin d'article sur mobile, afin de ne pas perdre le fil du texte.

Critères d'acceptation
- Tests unitaires du plugin sur des arbres hast construits à la main : la note en marge est insérée après le premier appel, sans lien retour. Une seule note est insérée quand elle est appelée deux fois. Un arbre sans note reste inchangé. La copie ne contient aucun élément de bloc et garde ses liens.
- markdown-style-guide contient une note en marge « Rob Pike » et garde la section de notes de fin, intitulée « Notes », avec des liens retour en français.
- La CSS affiche les notes en marge en desktop et les notes de fin sur mobile, et masque l'autre version en `display: none`.
- Manuel : une note ajoutée temporairement dans le MDX est bien transformée.
- Manuel : en desktop, la note est alignée sur son appel sans chevauchement. À 375 px, les notes sont en fin d'article et la navigation clavier aller-retour fonctionne.

Notes techniques : `src/lib/rehype-sidenotes.mjs` parcourt l'arbre à la main, sans unist-util-visit. `markdown.remarkRehype` reçoit `footnoteLabel: 'Notes'` et `footnoteBackLabel: 'Retour au texte'`. Piège : dans le jeu d'essai, l'appel est dans un `cite` à l'intérieur d'un `blockquote`.

### S12 – Ajouter la barre de lecture, le thème de code et l'impression
P1 · 1 j · dépend de : S10

En tant que lecteur d'un article, je veux voir ma progression, lire des blocs de code aux couleurs du blog en clair comme en sombre, et imprimer l'article proprement, afin de lire et de conserver le texte confortablement.

Critères d'acceptation
- La barre n'est visible que sous `@supports (animation-timeline: scroll())`. Sinon, elle est en `display: none`.
- La barre est masquée sous reduced-motion.
- Les blocs de code n'ont plus de couleur littérale inline et utilisent les variables `--astro-code-*`.
- Les variables `--astro-code-*` sont définies dans `tokens.css`, en clair et en sombre. Le couple code/fond est couvert par le test de contraste.
- Un bloc `@media print` masque la navigation, le lien d'évitement et la barre, retire la trame et garde la licence.
- La CSS de chaque page reste ≤ 15 KB.
- Manuel : la barre fonctionne dans Chrome et n'apparaît pas dans Firefox. L'aperçu d'impression est propre.

Notes techniques : `shikiConfig.theme: 'css-variables'`. Vérifier que ce nom est toujours accepté par Astro 6. Si l'import direct de Shiki n'est pas possible proprement, le signaler plutôt que d'ajouter la dépendance.

---

## Lot 6 – Pages annexes et budgets, story 6 du plan

**Total du lot : 1,75 j** (cadrage : 1 à 1,5 j)

### S13 – Restyler la page À propos et créer la page 404
P0 · 0,75 j · dépend de : S06

En tant que lecteur, je veux une page À propos qui présente le carnet et, si je suis une adresse erronée, une page 404 en français qui me ramène vers le contenu, afin de ne jamais tomber sur une page vide ou en anglais.

Critères d'acceptation
- /about/ a un H1 « À propos » et affiche le texte de `consts.ts`, sans « Lorem » ni `<time>`.
- `about.astro` utilise Layout, sans BlogPost et sans date fictive.
- `404.html` existe, déclare `lang` = `fr`, a un H1 en français et des liens vers l'accueil, l'archive et les 5 rubriques.
- Manuel : `curl -i /page-inexistante` sur le serveur standalone renvoie le statut 404 avec le corps de la page 404.
- Manuel : les deux pages sont correctes en clair et en sombre, à 375 px et en desktop.

### S14 – Créer pnpm check:weight et vérifier les budgets sur dist/client
P0 · 1 j · dépend de : S09, S11, S12, S13

En tant que mainteneur du blog, je veux une commande qui échoue dès qu'un budget de poids ou de JS est dépassé, afin de garder le site léger à chaque évolution sans relire le build à la main.

Critères d'acceptation
- Sur un build conforme, `pnpm check:weight` affiche le poids CSS de chaque page et le total de l'accueil, en brut et en gzip, puis sort en code 0.
- Sur des fixtures, la commande sort en code 1 et nomme la règle violée dans chacun de ces cas : CSS de plus de 15 KB (liée et inline), accueil de plus de 100 KB hors images, deux fonts, une balise script, un attribut onclick.
- Si `dist/client/` est absent, elle sort en code 1 et invite à lancer `pnpm build`.
- Le test anti-starter ne trouve ni « Astro Blog », ni « Hello, Astronaut », ni « withastro », ni « Atkinson ». « Lorem » n'apparaît que dans le corps des 5 articles du jeu d'essai.
- Manuel (recette globale) : accueil, rubrique et article, en clair et en sombre, à 375 px et en desktop. Captures, console propre, 0 requête JS, Lighthouse perf et a11y à 100 sur l'accueil et un article. Rien ne bouge avec reduced-motion. Firefox affiche des pages complètes.

Notes techniques : `scripts/check-weight.mjs` prend un répertoire en argument, ce qui permet de le tester sur des fixtures. 1 KB = 1 024 octets. L'entrée `zero-blog` est à ajouter dans le `.claude/launch.json` du dépôt parent pour la recette.

---

## Totaux

| Lot | Stories | Jours | Cadrage (bas – haut) |
|---|---|---|---|
| Lot 1 – Fondations | S01, S02, S03 | 2,5 | 2 – 3,5 (harnais + story 1) |
| Lot 2 – Coque du site | S04, S05 | 2 | 1 – 2 |
| Lot 3 – Rubriques | S06, S07 | 1,5 | 1 – 1,5 |
| Lot 4 – Accueil et archive | S08, S09 | 1,5 | 1 – 1,5 |
| Lot 5 – Article | S10, S11, S12 | 3 | 2 – 3,5 |
| Lot 6 – Pages annexes et budgets | S13, S14 | 1,75 | 1 – 1,5 |
| **Total** | **14 stories** | **12,25 j** | **8 – 13,5 j de dev ; 9,5 – 16 j recette comprise** |

L'estimation reste dans la fourchette du rapport, sans écart de plus de 20 %. Deux lots dépassent légèrement leur fourchette. Le lot 5 inclut la feuille d'impression (Q6, absente du cadrage, environ 0,25 j). Le lot 6 inclut la recette manuelle globale (Lighthouse, captures), que le cadrage comptait à part dans sa ligne « recette et imprévus ». Les imprévus (environ 18 % selon le cadrage) ne sont pas répartis dans les stories.

## Valeurs provisoires à faire confirmer par le client

Aucune n'est bloquante. Toutes sont centralisées dans `src/consts.ts` ou dans le frontmatter, donc faciles à changer.
- Q1 : licence du contenu CC BY-SA 4.0 (S05).
- Q2 : manifeste (S08) et texte À propos (S13) provisoires en français.
- Q3 : lien source vers github.com/zero-strategie/zero-blog-astro, sous réserve que le dépôt soit public (S05).
- Q4 : les 5 articles du starter sont gardés comme jeu d'essai. Rubriques et `heroAlt` sont proposés par l'équipe. Leur corps reste en Lorem (S06, S08).
- Q6 : feuille d'impression minimale (S12).
- Q7 : liens sociaux limités à GitHub et RSS (S05).
- Q8 : dates longues en français, « 22 octobre 2026 » (S05). Le cadrage (A5) proposait « 22 oct. 2026 », l'arbitrage l'emporte.
- Q5 : hors périmètre. Le budget de 100 KB se mesure en brut, ce qui est plus strict.

## Écarts détectés

Ces points ne font l'objet d'aucune story.
1. **La CI ne lance pas les tests.** `ci.yml` n'est pas modifié dans cette mission, donc `pnpm test` et `pnpm check:weight` ne protègent rien en CI. Une mission ultérieure devra les y ajouter.
2. **AGENTS.md est en décalage avec la mission.** Son §7 prévoit vitest alors que la mission utilise node:test, et ses §3 et §8 décrivent encore Atkinson, l'absence de dark mode et l'absence de 404. Il faudra le mettre à jour après la mission (cadrage §3).
3. **Champ `heroAlt` ajouté au schéma (S08).** Le cadrage demande des textes alternatifs pour les couvertures sans préciser comment. Ce champ n'existe pas dans le modèle Strapi (`article.cover`, dont le texte alternatif est porté par le média) : la mission Strapi devra faire la correspondance.
4. **Pas de page index `/rubriques/`.** Elle n'est demandée nulle part. L'URL renverra une 404, même si on peut la deviner depuis les pages de rubrique.
5. **Lighthouse reste manuel (R14).** Aucun contrôle automatique ne garantit le score de 100 dans la durée.
6. **Dettes non traitées** (hors périmètre du cadrage) : typage de `rss.xml.js`, JSON-LD, `robots.txt`, image OG par article.
