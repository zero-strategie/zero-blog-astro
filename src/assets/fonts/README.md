# Fraunces (romain, variable)

`fraunces.woff2` est la seule webfont du site : Fraunces romain, axes `opsz` (9 à 30) et `wght` (400 à 900), sous-ensemble latin (français, `« » — ’ … § œ €`). L'italique est synthétisé par le navigateur. Licence : SIL OFL 1.1 (`OFL.txt`, aucun nom de fonte réservé déclaré).

## Reproduire le fichier

Source : l'API CSS2 de Google Fonts (subset `latin`, axes `opsz` et `wght` seulement). `fonttools` et `brotli` s'installent hors du projet (rien dans `package.json`).

```sh
# 1. Récupérer l'URL du subset « latin » (User-Agent de navigateur récent pour obtenir du woff2)
curl -A "Mozilla/5.0 Chrome/130.0" \
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..900"
# 2. Télécharger le woff2 de la section /* latin */ : fraunces-latin.woff2 (67 KB)

# 3. Réduire la plage de l'axe opsz et retirer les caractères inutiles
python -m venv /tmp/fonttools && /tmp/fonttools/bin/pip install fonttools brotli
/tmp/fonttools/bin/python -m fontTools.varLib.instancer fraunces-latin.woff2 \
  wght=400:900 opsz=9:30 -o instance.ttf
/tmp/fonttools/bin/python -m fontTools.subset instance.ttf \
  --unicodes="U+0020-007E,U+00A0-00FF,U+0152-0153,U+2013-2014,U+2018-201A,U+201C-201E,U+2022,U+2026,U+2039-203A,U+20AC,U+2192,U+2212" \
  --layout-features="kern,liga,ccmp,locl,mark,mkmk,calt" \
  --flavor=woff2 --output-file=fraunces.woff2
```

Résultat : environ 49 KB. Le budget est de 50 KB : `opsz=9:36` donne 51 KB, d'où le plafond à 30.
`OFL.txt` vient de https://github.com/undercasetype/Fraunces (fichier `OFL.txt`).
