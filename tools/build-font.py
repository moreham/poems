"""Rebuild the web font after changing the poem library or interface text.
Requires fonttools and brotli.
"""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
text = ''.join((root / name).read_text(encoding='utf-8') for name in (
    'index.html', 'styles.css', 'app.js', 'interpretations.js'
))
font = TTFont(root / 'assets/huiwen-mincho.ttf')
options = subset.Options()
options.flavor = 'woff2'
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=text)
subsetter.subset(font)
font.flavor = 'woff2'
target = root / 'assets/huiwen-mincho-subset.woff2'
font.save(target)
print(f'{target.name}: {target.stat().st_size:,} bytes')
