# EPTS design system

Source of truth: `client/src/tokens.css`. `styles.css` only uses those tokens.

## Color
| Token | Use |
|---|---|
| `--pri` navy | structure: sidebar, headings, sort/active states |
| `--sec` teal | data: chart line, progress fill |
| `--acc` orange | the one action on a screen (primary button, active-nav marker) |
| `--acc-ink` dark orange | accent when it is text (the big "to review" number) |
| `--ink`, `--muted`, `--line`, `--bg`, `--card` | text, secondary text, borders, page, cards |

Secondary text never goes lighter than `--muted` (7.3:1 on white).

## Space
4px scale: `--s1` 4, `--s2` 8, `--s3` 12, `--s4` 16, `--s5` 24, `--s6` 32, `--s7` 48, `--s8` 64.
Related things sit 8-16px apart. Groups sit 24-32px apart.

## Type
Public Sans. Sizes: `--t-sm` 14, `--t-md` 16, `--t-lg` 20, `--t-xl` 24-32 (page headline), `--t-hero` 40-56 (one number per page).
No monospace anywhere. Numbers use `font-variant-numeric: tabular-nums`; numeric table columns are right-aligned (`num: true` on the column).
Headlines use `text-wrap: balance`, paragraphs `text-wrap: pretty`.

## Radius
Cards `--r-card` 16, controls `--r-ctl` 10, pills `--r-pill`.
Nested corner = outer radius - padding between them (`--r-bar-fill` is the example: track 8 - padding 3 = 5).

## Components
- **Primary button** `.btn`: orange, one per view. **Secondary** `.btn.sec`: outline. **Tertiary** `.link`: text.
- **Status**: `<Status k={STATUS[x]} />` shows plain text, and a pill only for states that need action (`Waiting for review`, `Waiting for approval`).
- **Hero number**: `.stat` (My Week score) and `.facts .main b` (Overview). One per page.
- **Tables**: `SortTable` columns take `num: true` (right-aligned figures) and `hide: true` (visually hidden header, e.g. Action).
