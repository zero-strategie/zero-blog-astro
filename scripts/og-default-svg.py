"""Génère scripts/og-default.svg : image de partage avec le texte vectorisé en Fraunces.

Pourquoi des tracés et pas du <text> : sharp/librsvg sous macOS ignore @font-face
et les fontes hors système ; le texte converti en courbes rend à l'identique partout.
Hors build, hors dépendances du projet (voir scripts/README.md) :

    python3 -m venv /tmp/fonttools && /tmp/fonttools/bin/pip install fonttools brotli
    /tmp/fonttools/bin/python scripts/og-default-svg.py

Limite : pas de crénage GPOS (avances horizontales seules), l'italique est un skew,
comme celui que synthétise le navigateur.
"""
import re
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "src/assets/fonts/fraunces.woff2"
OUTPUT = ROOT / "scripts/og-default.svg"

WIDTH, HEIGHT = 1200, 630
MARGIN_X = 100
TITLE_SIZE, TITLE_BASELINE = 128, 330
RULE = {"x": MARGIN_X, "y": 370, "width": 520, "height": 12}
SUBTITLE_SIZE, SUBTITLE_BASELINE = 40, 460
ITALIC_SKEW = 0.2


def token(name: str) -> str:
    """Valeur claire d'un jeton (premier bloc :root de tokens.css)."""
    css = (ROOT / "src/styles/tokens.css").read_text(encoding="utf8")
    return re.search(rf"{re.escape(name)}:\s*(#[0-9a-fA-F]{{6}})", css).group(1)


def constant(name: str) -> str:
    source = (ROOT / "src/consts.ts").read_text(encoding="utf8")
    return re.search(rf"{name}\s*=\s*\n?\s*['\"](.+?)['\"];", source).group(1)


def outline(text: str, axes: dict, size: float, x: float, baseline: float, skew: float = 0) -> str:
    font = instantiateVariableFont(TTFont(FONT), axes)
    glyphs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
    scale = size / font["head"].unitsPerEm
    pen = SVGPathPen(glyphs)
    cursor = x
    for char in text:
        name = cmap[ord(char)]
        # Repère SVG : y vers le bas, donc échelle verticale négative ; skew > 0 penche vers la droite.
        transform = (scale, 0, skew * scale, -scale, cursor, baseline)
        glyphs[name].draw(TransformPen(pen, transform))
        cursor += hmtx[name][0] * scale
    return pen.getCommands()


def main() -> None:
    paper, ink, red, soft = (token(n) for n in ("--paper", "--ink", "--ink-red", "--ink-soft"))
    title = outline(constant("SITE_TITLE"), {"wght": 900, "opsz": 30}, TITLE_SIZE, MARGIN_X, TITLE_BASELINE)
    subtitle = outline(
        constant("SITE_TAGLINE"), {"wght": 400, "opsz": 14}, SUBTITLE_SIZE, MARGIN_X, SUBTITLE_BASELINE, ITALIC_SKEW
    )
    OUTPUT.write_text(
        f'''<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}">
<rect width="{WIDTH}" height="{HEIGHT}" fill="{paper}"/>
<rect x="38" y="38" width="1124" height="554" fill="none" stroke="{ink}" stroke-width="8"/>
<rect x="55.5" y="55.5" width="1089" height="519" fill="none" stroke="{ink}" stroke-width="1.5"/>
<path fill="{ink}" d="{title}"/>
<rect x="{RULE['x']}" y="{RULE['y']}" width="{RULE['width']}" height="{RULE['height']}" fill="{red}"/>
<path fill="{soft}" d="{subtitle}"/>
</svg>
''',
        encoding="utf8",
    )


main()
