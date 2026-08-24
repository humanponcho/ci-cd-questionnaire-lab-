# Visual System — CI/CD Questionnaire Lab

How to write CSS for this project. It covers the design tokens, the colour
rules, and the contrast floor every colour must clear.

For *what* the project is, read [README.md](README.md).

## Where this came from

This app was migrated onto the **shared paper/phosphor token system** used
across the questionnaire labs. The reference implementation is
`docker-questionnaire-lab`; the procedure is the *Accent Migration Runbook*.

Before the migration this app had its own dark-only stylesheet: `--bg`,
`--panel`, `--line`, `--ink`, `--accent`, 8px rounded corners, Space Grotesk +
Inter + JetBrains Mono. **None of that survives.** Only the class names do. If
you are reading an old commit, do not carry a value forward from it.

One thing is still this app's own: **the accent hue**. See
[`--signal-note` is the accent](#signal-note-is-the-accent).

## Design tokens

Every colour lives in one `:root` block at the top of
[src/styles.css](src/styles.css). A **token** is a CSS custom property — a named
value you write once and reference everywhere with `var()`.

Every token uses `light-dark()`. That CSS function takes two values. The browser
picks the first on a light background and the second on a dark one. The page
declares `color-scheme: light dark`, so it follows the reader's operating system
setting. There is no in-app theme switch.

```css
--g3: light-dark(#3a3a34, #b8b7b0);   /* one declaration, both schemes */
```

### Token families

| Family | Meaning | Members |
| --- | --- | --- |
| Background scale | Surfaces, base → most raised | `--black`, `--deep`, `--panel`, `--glass`, `--g0` |
| Ink scale | Foreground, strongest → faintest | `--g1` … `--g5` |
| Signal | State and accent colour | `--signal-ok`, `--signal-err`, `--signal-warn`, `--signal-err-deep`, `--signal-note` |
| Wash | Translucent settled-state fills | `--wash-ok`, `--wash-err` |
| Overlay | Dark-scheme atmosphere | `--overlay-vignette` |
| Bloom | Glow colours, transparent on paper | `--bloom-30`, `--bloom-50` |
| Glow helpers | Ready-made shadow values | `--glow-sm`, `--glow-md`, `--glow-lg` |
| Type | Font stacks | `--mono`, `--display`, `--body` |
| Aliases | Names read by inline JSX styles | `--ink-faint`, `--accent` |

### The ink scale is ordinal

`--g1` always means "strongest ink". On paper it is near-black. On a dark screen
it is near-white. Pick a token by its **rank**, never by the colour it happens to
be in the scheme you are looking at.

```css
/* ✅ Do */
.topic-title { color: var(--g1); }

/* ❌ Don't — this breaks the moment the scheme flips */
.topic-title { color: #0d0d0a; }
```

Any hard-coded colour outside `:root` is a bug.

### Glows erase themselves on paper

The `--bloom-*` tokens are fully transparent in the light scheme. Paper emits no
light, so a glow built from them renders as nothing — with no
`@media (prefers-color-scheme)` rule anywhere. Build new glow effects the same
way. Compose them from `--bloom-*`; do not write a scheme override.

### JSX aliases

Two inline `style` attributes name CSS variables directly:
[Quiz.jsx](src/components/Quiz.jsx) reads `--ink-faint` and
[MergeGate.jsx](src/playgrounds/MergeGate.jsx) reads `--accent`. Both are
aliases — `--ink-faint` for `--g4`, `--accent` for `--signal-note` — and exist
only to keep those call sites working. Delete them only when you delete the
inline styles that read them.

## Signal colours

Quiz feedback, terminal log levels, job badges and gate verdicts **encode information in colour**. Removing the colour
would remove the information.

| Token | Meaning | Used by |
| --- | --- | --- |
| `--signal-ok` | Success, correct, passing | Quiz correct answer, passing check, `MERGEABLE` verdict, `$` prompt, completion tick, `tip` callout, the green dot |
| `--signal-err` | Failure, wrong, blocking | Quiz wrong answer, failing check, `MERGE BLOCKED` verdict, error log lines, `warn` callout, the red dot |
| `--signal-warn` | Caution | Warning log and check rows, the `REPORT` job badge, the amber dot |
| `--signal-err-deep` | A firmer red, **shapes only** | The traffic-light dots. See below. |
| `--signal-note` | Information **and** the accent | See below |

### `--signal-note` is the accent

This one token does two jobs. It marks informational state, and it is also the
violet accent used across the whole interface:

- Brand dot, progress bar fill, active sidebar item and its number
- Section eyebrows, quiz headings, prose bullets
- Inline code, callout code, quiz-explanation code, workflow keywords, the `REUSABLE` and `REQUIRED` chips
- The `▶ Run` button fill, Prev/Next hover border
- Home hero emphasis and card numbers

**Both of its values are the same colour.** Hue 263°, saturation 42%. Only the
lightness differs — 32% on paper, 68% on a dark screen.

```css
--signal-note: light-dark(#492f74, #a48acf);
```

#### Why this hue and not the Docker lab's blue

The migration standardised the *system*, not the brand. This app keeps the hue
of its pre-migration accent (`#a371f7`, hue 263°) and adopts the system's
**saturation** — 42%, the same chroma every sibling lab uses. The four labs
therefore read as one family with four identities: same surfaces, same ink, same
type, same geometry, one hue apart.

The saturation is not negotiable. The old value was 89%, which reads as
decoration next to muted status colours. 42% puts the accent in the same
register as `--signal-ok` and `--signal-warn`, so an accent chip and a status
chip look like they belong to the same instrument.

**If you retune this token, move the lightness only.** Keep the hue and the
saturation locked. Change either one on a single side and the accent stops
looking like one colour across the two schemes.

### Why there are two reds

`--signal-err` carries **text** — error log lines, failing check status, the ✗ on a wrong answer. Text needs 4.5:1. On this
near-black dark ground that floor pushes the red up to lightness 62%, which
is **lighter** than `--signal-warn` at 53%. Side by side at 8px the two stop
reading as red and orange, and start reading as two oranges.

A shape only needs 3:1. `--signal-err-deep` spends that headroom to drop back to
52% — below the warning again — at the same hue and saturation.

Use it only where the red sits **next to** the warning colour. Today that is the
traffic-light dots and nothing else. A lone red rule with no orange near it stays
on `--signal-err`, so the two reds do not drift apart for no reason.

Do not use it for text. It reaches 4.06:1 on `--panel` but only 3.45:1 on
the error wash and 3.21:1 on `--g0` — short of 4.5:1 on both.

## The contrast floor

Text must reach **4.5:1** against the background behind it. That is the WCAG AA
threshold for body text. Shapes that carry meaning without text — the
traffic-light dots, a border — need **3:1**.

**Measure against the surface the text actually lands on, not the page
background.** The signal tokens do not all sit on the same surface:

| Token | Surfaces its text lands on | Darkest case |
| --- | --- | --- |
| `--signal-ok` | `--panel`, `--glass`, `--wash-ok` over `--panel` | the wash |
| `--signal-err` | `--panel`, `--glass`, `--wash-err` over `--panel` | the wash |
| `--signal-warn` | `--panel`, `--glass` | `--panel` |
| `--signal-err-deep` | `--g0` — shape, judged at 3:1 | `--g0` |
| `--signal-note` | `--black`, `--panel`, `--glass`, `--g0` | `--g0` |

`--g0` is the inline-code chip. Only `--signal-note` is used there, because only
`--signal-note` colours inline code. Do not test the other three against it — it
is not a surface they appear on, and it will send you chasing a value you do not
need.

The washes are translucent, so composite them over the surface they sit on
before measuring. Here they land on **two** grounds: `--glass` under an answered
quiz row, and `--panel` under the verdict banner. Only `--panel` is measured,
because it is the nearer ground in *both* schemes — the darker surface on paper
and the lighter one on phosphor. Two values in this app sit one step off the
sibling labs because of it: `--signal-ok` light and `--signal-err` dark.

| Wash | Light | Dark |
| --- | --- | --- |
| `--wash-ok` over `--panel` | `#d0d7ce` | `#213029` |
| `--wash-err` over `--panel` | `#dfd2cd` | `#332523` |

Measured against the current token values, each on its darkest surface:

| Token | Scheme | Value | Darkest surface | Ratio |
| --- | --- | --- | --- | --- |
| `--signal-ok` | light | `#526119` | `#d0d7ce` | 4.64:1 |
| | dark | `#879e2b` | `#213029` | 4.58:1 |
| `--signal-err` | light | `#992918` | `#dfd2cd` | 5.30:1 |
| | dark | `#e46c59` | `#332523` | 4.61:1 |
| `--signal-warn` | light | `#9d4d1b` | `#e4e3dc` | 4.65:1 |
| | dark | `#eb7024` | `#1b1b18` | 5.65:1 |
| `--signal-err-deep` | dark | `#dd442c` | `#2e2e2a` | 3.21:1 (shape, floor 3:1) |
| `--signal-note` | light | `#492f74` | `#cecdc6` | 6.78:1 |
| | dark | `#a48acf` | `#2e2e2a` | 4.62:1 |

The `▶ Run` button is the one place a surface token becomes foreground: its
label is `--black` on a `--signal-note` fill. That pairing measures 9.38:1
on paper and 6.59:1 on phosphor.

To raise a value, move its lightness toward the opposite end of its scheme —
darker on paper, lighter on screen. **Leave the hue and the saturation alone.**
They are what make a status read as the same status in both schemes.

### The auditor does this for you

[tools/contrast-audit.py](tools/contrast-audit.py) reads the token values
straight from the stylesheet, composites the washes, and checks every pairing.
It exits 0 on a clean sheet and 1 with lightness-only fixes otherwise.

```bash
python3 tools/contrast-audit.py src/styles.css
```

The `PLAN` block near the top of that file maps each token to the surfaces its
text lands on. **That map is declared by hand on purpose** — which surface a
colour sits on is a fact about the markup, not something you can infer from CSS.
If you add a component that puts a signal colour on a new surface, add it to
`PLAN` in the same commit. A token listed against a surface it never touches
reports a failure that does not exist.

## Type

Three families, each with a fixed job and a generic fallback. The fallback
matters: if the Google Fonts CDN is blocked, the page degrades to a sane face
instead of dropping to Times.

| Token | Family | Job |
| --- | --- | --- |
| `--mono` | Share Tech Mono | Code, terminal output, instrument labels |
| `--display` | Orbitron | Headings, brand |
| `--body` | Rajdhani | Prose and interface copy |

The fonts are loaded by a `<link>` in [index.html](index.html), not by an
`@import` in the stylesheet. An `@import` blocks the CSS parse until it
resolves, and `preconnect` cannot help it.

Rajdhani is condensed, so `body` sets 16px rather than 15px to hold a readable
line. Instrument labels run at 8–10px on purpose. `body` sets
`text-size-adjust: 100%` to stop iOS Safari inflating them, which would break the
fixed-width columns in the sidebar.

## Stylesheet organisation

[src/styles.css](src/styles.css) reads top to bottom in dependency order:

1. Design tokens (`:root`)
2. Reset, then base (`html`, `body`)
3. Phosphor vignette
4. Layout shell, progress bar, sidebar navigation
5. Main column, headings, prose, callouts
6. Components — playground shell, buttons, editors, terminal, data table, quiz
7. This app's own panels — the workflow analyser and the merge-gate simulator
8. Footer navigation, then home screen
9. Animations, then responsive rules

Each section opens with a banner comment padded to the same width:

```css
/* ── WIDGET CARD ───────────────────────────────────────────── */
```

Put a new component in a new banner section, near related components. Do not
append to the bottom of the file by default — the bottom is reserved for
animations and responsive rules.

## Comments

Write the comment that explains **why**, not what. The declaration already says
what. A reader who wants to change a value needs to know what constraint the
current value satisfies, so they know whether their change breaks it.

```css
/* ✅ Do — records the constraint */
/* ch scales with the rendered font, so the column survives
   browser minimum-font-size / text-only-zoom inflation */
min-width: 3ch;

/* ❌ Don't — restates the code */
/* set minimum width to 3 characters */
min-width: 3ch;
```

## Checklist before you commit CSS

- [ ] No hard-coded colour outside `:root`.
- [ ] Ink tokens picked by rank, not by appearance.
- [ ] `PLAN` in `tools/contrast-audit.py` updated if a colour landed on a new
      surface.
- [ ] `python3 tools/contrast-audit.py src/styles.css` exits 0.
- [ ] Glow effects composed from `--bloom-*`, not from a scheme override.
- [ ] `npm run build` passes.
- [ ] Checked in both schemes by toggling the operating system appearance.
