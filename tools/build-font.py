"""Build web fonts from the current Vue UI, server messages and poem library.
Requires fonttools and brotli. Run again after changing interface or poem text.
"""
from pathlib import Path
from string import printable
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
sources = [root / 'index.html', root / 'styles.css']
for directory in ('src', 'server'):
    sources.extend(sorted(path for path in (root / directory).rglob('*')
                          if path.suffix in {'.vue', '.js', '.css', '.json'}))
locale = root / 'node_modules/element-plus/es/locale/lang/zh-cn.mjs'
if not locale.exists():
    raise SystemExit('Run npm ci first to include Element Plus Chinese UI labels.')
sources.append(locale)
text = printable + ''.join(path.read_text(encoding='utf-8') for path in sources)
source = root / 'assets/huiwen-mincho.ttf'
font = TTFont(source)
options = subset.Options()
options.flavor = 'woff2'
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=text)
subsetter.subset(font)
font.flavor = 'woff2'
target = root / 'assets/huiwen-mincho-subset.woff2'
font.save(target)
print(f'{target.name}: {target.stat().st_size:,} bytes')

# A separate CSS fallback face covers characters in future user submissions.
# Multiple src URLs in one face would only handle download failures.
font = TTFont(source)
font.flavor = 'woff2'
target = root / 'assets/huiwen-mincho-full.woff2'
font.save(target)
print(f'{target.name}: {target.stat().st_size:,} bytes')
