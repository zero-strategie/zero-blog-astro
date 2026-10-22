# scripts/

Hors build : rien ici ne tourne pendant `pnpm build`.

- `check-weight.mjs` : `pnpm check:weight [dist]` vérifie les budgets sur `dist/client` (CSS ≤ 15 KB par page, accueil ≤ 100 KB hors images, une seule fonte ≤ 50 KB, 0 script). Code de sortie 1 en cas de dépassement.
- `lib/` : helpers partagés avec les tests (lecture de `dist/client`, jetons, contraste, poids).

## Régénérer l'image de partage (`public/og-default.png`)

Le titre et le sous-titre sont composés en Fraunces (`src/assets/fonts/fraunces.woff2`), couleurs lues dans `src/styles/tokens.css` (`--ink`, `--ink-soft`, `--ink-red`, `--paper`), textes lus dans `src/consts.ts`. Le texte est converti en tracés SVG, car sharp ne charge pas de fonte hors système sous macOS.

```sh
# 1. SVG vectorisé (fonttools installé hors du projet, rien dans package.json)
python3 -m venv /tmp/fonttools && /tmp/fonttools/bin/pip install fonttools brotli
/tmp/fonttools/bin/python scripts/og-default-svg.py     # écrit scripts/og-default.svg
# 2. Rastérisation 1200×630 avec sharp (déjà dépendance du projet)
node scripts/generate-og-image.mjs                      # écrit public/og-default.png
```

Commiter ensemble `scripts/og-default.svg` et `public/og-default.png`.
