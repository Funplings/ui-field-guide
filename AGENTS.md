# AGENTS.md

Guidance for coding agents working on UI Field Guide. It's a static site (`index.html`, `styles.css`, `app.js`, `favicon.svg`) with no build step, framework or dependencies. Keep it that way unless asked.

## Core idea

Every element names itself. When you add or change UI, make sure it still carries its name in one of these ways:

- **Text is the name.** A button reads "Button"; a placeholder reads "Placeholder".
- **Name tag** (`<span class="rtag">Name</span>`): a filled violet tag on the edge of a region (Header, Sidebar, Modal). The parent needs `position: relative`.
- **Caption** (`<span class="cap">Name</span>`): violet mono text under an element. Wrap the pair in `<div class="an">` (add `an-center` to center it).
- **Highlight** (`class="pick"`): a dashed violet outline marking the part a card is about.

`app.js` sets `aria-hidden` on every `.cap` and `.rtag`, because they are visual annotations only.

## Color rule

Violet (`--label`, `--label-text`, `--label-soft`, …) is reserved for names: tags, captions, highlights, the Inspect overlay and the focus ring. The examples themselves stay monochrome (`--btn`, `--ink`, `--fill`). Semantic colors (`--ok`, `--warn`, `--err`, `--info`) are only for status. Don't use violet for selected or active states.

## Theming

All colors are tokens on `:root` in `styles.css`. The dark palette is defined **twice**, in the `prefers-color-scheme: dark` block (guarded by `:root:not([data-theme="light"])`) and in `:root[data-theme="dark"]`. Change both together. Never give a color its only definition inside a dark block, and never hard-code a color in a component.

## Terms and `data-ui`

- Each term has an anchor `id="t-<slug>"`: either an `<article class="card">` (with `h3`, optional `.aka`, `.def`) or a `<div>` inside the glossary `<dl class="glossary">` (with `dt`, `dd`).
- `app.js` builds its term index from those elements. Search, category counts, the command palette, the combobox and Inspect mode all read from it, so there is no separate data file to update.
- Any element with `data-ui="<slug>"` becomes inspectable and shows that term's name and definition. **Every `data-ui` value must match an existing `t-<slug>`.** Check after edits:

  ```js
  [...new Set([...document.querySelectorAll('[data-ui]')].map(e => e.dataset.ui))]
    .filter(s => !document.getElementById('t-' + s))   // should be []
  ```

- A term's section (`<section class="cat" data-cat="…" data-label="…">`) sets its category. The sidebar badges use `data-count="<cat>"`. The hero count (`[data-total]`) and the search placeholder are filled in by script.

## Interaction conventions in `app.js`

- `data-toast="message"` on any clickable element shows a toast.
- `data-menu` on a button toggles the `.menu` right after it. Add `data-menu-static` for a menu that stays open.
- `data-single="aria-pressed"` or `"aria-current"` on a group makes its buttons or links single-select.
- `data-open="<dialog id>"` opens a `<dialog>`. `data-close` inside it closes it, and so does a click on the scrim.
- `data-open-palette` opens the command palette. `data-to-top` scrolls to the top.
- Add `.inspect-safe` to a control that must keep working while Inspect mode is on. Inspect mode captures every other click.

## Style conventions

- Use `[hidden]` / `el.hidden` to show and hide things, not `style.display`.
- Space siblings with flex/grid `gap`, and keep a gutter of at least 16px at every width. The page body must never scroll sideways; wide things like the table scroll inside their own `overflow-x: auto` wrapper.
- `.card.wide` spans two columns and drops back to one under 640px.
- Respect `prefers-reduced-motion`; the global rule in `styles.css` already covers new animations.
- Write copy in plain, active language: definitions of one or two sentences, and aliases in `.aka` separated by ` · `.

## Previewing and publishing

- `index.html` references `styles.css`, `app.js` and `favicon.svg` by relative paths. Use a real static server (for example `npx serve .`) to preview it; opening the file directly may show a snapshot without the CSS and JS.
- The published claude.ai artifact adds its own `<!doctype>`/`<html>`/`<head>`/`<body>` wrapper. To publish, strip those lines (plus the charset and viewport `<meta>` tags) from a copy of `index.html`, then publish that copy with the other files attached:

  ```bash
  sed -E '/^(<!doctype html>|<html lang="en">|<head>|<meta charset="utf-8">|<meta name="viewport".*|<\/head>|<body>|<\/body>|<\/html>)$/d' index.html > /path/to/copy/index.html
  ```
