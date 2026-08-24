#!/usr/bin/env python3
"""Audit light-dark() colour tokens against the surfaces they land on.

    python3 contrast-audit.py src/styles.css

Token VALUES are read from the stylesheet, so this never goes stale.
The token-to-surface MAP below is declared by hand on purpose: which
surface a colour lands on is a fact about the markup, and guessing it
from CSS structure produces confident wrong answers.

Edit PLAN for each app, then run. Exit code 1 on any failure.
"""
import re, sys, colorsys

TEXT_MIN, SHAPE_MIN = 4.5, 3.0

# ── PLAN — CI/CD Questionnaire Lab ────────────────────────
# surface: opaque background tokens. --signal-note is listed as a surface
#          because .btn.run fills with it and sets its label to --black.
# wash:    translucent fills, given as (token, surface it sits on).
# text:    foreground token -> surfaces its TEXT can land on.
# shape:   foreground token -> surfaces, judged at 3:1 (dots, borders).
#
# The washes land on TWO grounds in this app: --glass under an answered
# quiz row, and --panel under the merge-gate verdict banner. Only --panel is
# listed, because it is the worse of the two in BOTH schemes — it is the
# darker surface on paper and the lighter one on phosphor, so a wash over
# it is the nearer ground either way. Testing --glass as well would add
# pairings that cannot fail once --panel passes.
SURFACES = ['--black', '--deep', '--panel', '--glass', '--g0', '--signal-note']
WASHES   = [('--wash-ok', '--panel'), ('--wash-err', '--panel')]

TEXT = {
    '--signal-ok':   ['--deep', '--panel', '--glass', '--wash-ok'],
    '--signal-err':  ['--panel', '--glass', '--wash-err'],
    '--signal-warn': ['--panel', '--glass'],
    '--signal-note': ['--black', '--panel', '--glass', '--g0'],
    '--black':       ['--signal-note'],   # .btn.run label on the accent fill
    '--g1': ['--black', '--deep', '--panel', '--glass'],
    '--g2': ['--black', '--deep', '--panel', '--glass'],
    '--g3': ['--black', '--deep', '--panel', '--glass'],
    '--g4': ['--black', '--deep', '--panel', '--glass'],
}
SHAPE = {
    '--signal-ok':        ['--deep', '--panel', '--g0'],   # .pg-dot.g, .done-btn.done
    '--signal-err':       ['--black', '--panel'],          # .callout.warn rule
    '--signal-warn':      ['--panel', '--g0'],             # .pg-dot.y, .jb.report frame
    '--signal-err-deep':  ['--g0'],                        # .pg-dot.r, on .pg-bar
    '--signal-note':      ['--panel', '--g0', '--glass'],  # .progress-fill, chip frames
}

# Reported, never gated. WCAG 1.4.11 exempts purely decorative borders,
# and a hairline divider carries no meaning on its own. Listed so a low
# number is a deliberate choice you can see, not an oversight.
DECOR = {
    '--g5': ['--black', '--deep', '--panel', '--glass'],
}
# ────────────────────────────────────────────────────────────────────

def hx(h):
    h = h.lstrip('#')
    if len(h) == 3: h = ''.join(c*2 for c in h)
    return tuple(int(h[i:i+2], 16)/255 for i in (0, 2, 4))

def to_hex(*c):
    return '#%02x%02x%02x' % tuple(max(0, min(255, round(x*255))) for x in c)

def over(fg, alpha, bg):
    f, b = hx(fg), hx(bg)
    return to_hex(*[f[i]*alpha + b[i]*(1-alpha) for i in range(3)])

def lum(h):
    c = [x/12.92 if x <= 0.03928 else ((x+0.055)/1.055)**2.4 for x in hx(h)]
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]

def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

def retune(value, scheme, bgs, target):
    """Nearest passing value, moving lightness only. Hue and saturation hold."""
    h, l, s = colorsys.rgb_to_hls(*hx(value))
    step = -0.002 if scheme == 'light' else 0.002
    for _ in range(600):
        c = to_hex(*colorsys.hls_to_rgb(h, l, s))
        if min(ratio(c, b) for b in bgs) >= target:
            return c
        l += step
        if not 0 < l < 1:
            return None
    return None

def load(path):
    css = open(path, encoding='utf-8').read()
    hexes, rgbas = {}, {}
    for m in re.finditer(r'(--[\w-]+):\s*light-dark\(\s*(#[0-9a-fA-F]{3,6})\s*,'
                         r'\s*(#[0-9a-fA-F]{3,6})\s*\)', css):
        hexes[m.group(1)] = (m.group(2), m.group(3))
    for m in re.finditer(r'(--[\w-]+):\s*light-dark\(\s*rgba\(([\d\s,]+?),\s*'
                         r'([\d.]+)\)\s*,\s*rgba\(([\d\s,]+?),\s*([\d.]+)\)\s*\)', css):
        f = lambda s: to_hex(*[int(x)/255 for x in s.split(',')])
        rgbas[m.group(1)] = ((f(m.group(2)), float(m.group(3))),
                             (f(m.group(4)), float(m.group(5))))
    return hexes, rgbas

def main(path):
    hexes, rgbas = load(path)
    missing = [t for t in SURFACES if t not in hexes]
    if missing:
        print(f'Surfaces not found in {path}: {", ".join(missing)}')
        print('Adjust SURFACES in the PLAN block to match this app.')
        return 2

    # Resolve every surface to a concrete pair, compositing washes.
    bg = {t: hexes[t] for t in SURFACES}
    for wt, base in WASHES:
        if wt not in rgbas: continue
        lp, dp = rgbas[wt]
        bg[wt] = (over(lp[0], lp[1], hexes[base][0]),
                  over(dp[0], dp[1], hexes[base][1]))
        print(f'composited {wt} over {base}: light {bg[wt][0]}  dark {bg[wt][1]}')
    print()

    fails, checked = [], 0
    for kind, plan, floor in (('text', TEXT, TEXT_MIN), ('shape', SHAPE, SHAPE_MIN)):
        print(f'── {kind.upper()} (floor {floor}:1) ' + '─'*34)
        for tok, surfs in sorted(plan.items()):
            if tok not in hexes:
                print(f'  skip {tok:<20} not defined in this stylesheet'); continue
            for i, scheme in enumerate(('light', 'dark')):
                val = hexes[tok][i]
                avail = [s for s in surfs if s in bg]
                r, worst = min((ratio(val, bg[s][i]), s) for s in avail)
                checked += 1
                ok = r >= floor
                if not ok:
                    fix = retune(val, scheme, [bg[s][i] for s in avail], floor + 0.1)
                    fails.append((tok, scheme, val, worst, r, fix, floor))
                print(f'  {"ok  " if ok else "FAIL"} {tok:<20}{scheme:<6}{val}'
                      f'  worst {worst:<14}{r:5.2f}:1')
        print()

    print('── DECORATIVE (reported, not gated) ' + '─'*22)
    for tok, surfs in sorted(DECOR.items()):
        if tok not in hexes: continue
        for i, scheme in enumerate(('light', 'dark')):
            val = hexes[tok][i]
            avail = [s for s in surfs if s in bg]
            r, worst = min((ratio(val, bg[s][i]), s) for s in avail)
            print(f'  --   {tok:<20}{scheme:<6}{val}  worst {worst:<14}{r:5.2f}:1')
    print()

    print(f'{checked} gated pairings checked, {len(fails)} below floor.')
    if not fails:
        print('PASS'); return 0
    print('\nLightness-only fixes (hue and saturation held):\n')
    for tok, scheme, val, worst, r, fix, floor in fails:
        if fix:
            a, b = colorsys.rgb_to_hls(*hx(val)), colorsys.rgb_to_hls(*hx(fix))
            print(f'  {tok} ({scheme}): {val} -> {fix}   [{r:.2f} -> {floor}+]')
            print(f'      lightness {a[1]*100:5.1f}% -> {b[1]*100:5.1f}%   '
                  f'hue {a[0]*360:5.1f} -> {b[0]*360:5.1f}   '
                  f'sat {a[2]*100:4.1f}% -> {b[2]*100:4.1f}%')
        else:
            print(f'  {tok} ({scheme}): {val} -> unreachable by lightness alone.')
            print(f'      Lower the saturation, or move the text to a different surface.')
    return 1

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(__doc__); sys.exit(2)
    sys.exit(main(sys.argv[1]))
