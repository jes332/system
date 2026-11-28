# EPTS design system

Source of truth: `client/src/tokens.css`. `styles.css` only uses those tokens.

## Color
| Token | Use |
|---|---|
| `--pri` navy | structure: sidebar, headings, sort/active states |
| `--sec` teal | data: chart line, progress fill (never small text: 4.1:1 is too low) |
| `--sec-ink` dark teal | teal when it is small text (6.4:1 on white) |
| `--acc` orange | the one action on a screen (primary button, active-nav marker) |
| `--acc-ink` dark orange | accent when it is text (the big "Reports to Review" number) |
| `--ok-ink` / `--ok-bg` | success and finished states (Approved, Active) |
| `--warn-ink` / `--warn-bg` | something is waiting for a person (Waiting for review/approval) |
| `--danger-ink` / `--danger-bg` | errors and destructive actions |
| `--ctl-line` | border of inputs and outline buttons (4:1 on white) |
| `--ink`, `--muted`, `--line`, `--bg`, `--card` | text, secondary text, borders, page, cards |

Secondary text never goes lighter than `--muted` (7.3:1 on white).
**Status is never shown by color alone**: every status and message has a text label and an icon.

## Space
4px scale: `--s1` 4 ... `--s8` 64. Related things sit 8-16px apart. Groups sit 24-32px apart.

## Type
Public Sans. Sizes: `--t-sm` 14, `--t-md` 16, `--t-lg` 20 (card headings), `--t-xl` 24-32 (page headline), `--t-hero` 40-56 (one number per page).
Heading order: one `h1` per page, `h2` for cards and sections (`.cardh`), `h3` only inside a section.
Numbers use `font-variant-numeric: tabular-nums`; numeric table columns are right-aligned (`num: true`).

## Radius
Cards `--r-card` 16, controls and buttons `--r-ctl` 10, pills (status tags only) `--r-pill`.

## Components (`client/src/components/`)
- **Buttons** `.btn` orange primary (one per view), `.btn.sec` outline secondary, `.btn.danger` destructive, `.link` text. Sizes: default 44px high, `.sm` 40px for table rows. Use `<Btn busy busyText>` for any button that starts a request: it disables itself and shows a spinner.
- **Toasts** `useToast()` gives `toast.ok(text)` and `toast.err(text)`. One place (bottom right), one style, used for every success or failure after an action.
- **ConfirmDialog** native `<dialog>`: keyboard accessible, Esc cancels, focus starts on Cancel. Used for deleting a draft, an employee, or declining an account.
- **Loading / ErrorBox / useLoad** every page load has a loading state, an error state with "Try again", and never stays on "Loading" after a failure.
- **Status** `<Status k={STATUS[x]} />`: icon + label + tone (neutral, warn, ok).
- **SortTable / SearchBox / useList** server-side search and sort, empty state, error state with retry, `rowClass` to highlight rows, `caption` for screen readers.
- **Trend** line chart with a fixed 0%-100% scale, 0/50/100% reference lines, and a "View these values as a table" equivalent.

## The percentage: what it is and is not
The rate is **Task Completion Rate = tasks completed / tasks assigned x 100**.
- It counts tasks only. Hours worked are collected but are **not** part of it.
- It does not account for task difficulty, importance, quality of work, or time efficiency.
- It is shown as a progress indicator, never as a score or a performance rating.
- The earlier "Excellent / Good / Fair / Needs support" bands (90/75/50) were removed: they had no documented or validated basis, and a label like "Needs support" reads as a judgment of a person. If the project later needs bands, the instructor/client should approve the cut-off values and the reason should be written here.
