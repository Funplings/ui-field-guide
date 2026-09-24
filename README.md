# UI Field Guide

A cheat sheet for UI/UX terminology, where every element on the page is labeled with its own name. The header has a tag that says "Header", the search box says "Search bar", and each of the 150 terms is shown as a working example next to a plain-language definition.

## Features

- **150 terms** in 10 sections: layout, navigation, buttons, inputs, feedback, overlays, content, typography, states and UX concepts.
- **Live examples.** Menus open, tabs switch, the date picker picks, and the modal, drawer and bottom sheet really open.
- **Inspect mode.** Point at anything to see its name and size in pixels, and click to pin its definition in a side panel.
- **Search and filter chips** narrow the cards as you type or click.
- **Command palette** to jump straight to a term.
- Follows the system light/dark setting and works at phone widths.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` | Focus the search bar |
| `⌘K` / `Ctrl+K` | Open the command palette |
| `I` | Turn Inspect mode on or off |
| `Esc` | Close a dialog or exit Inspect mode |

## Running it

There is no build step and there are no dependencies. Open `index.html` in a browser, or serve the folder with any static file server:

```bash
npx serve .
```

The fonts (Schibsted Grotesk and IBM Plex Mono) load from Google Fonts, so they need an internet connection. Without one, the page falls back to system fonts.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | All the content: the page layout, every term card and the dialogs |
| `styles.css` | Design tokens (light and dark), layout and every example's styles |
| `app.js` | Search, filters, Inspect mode, the command palette and the interactive examples |
| `favicon.svg` | Tab icon matching the logo mark |

## Adding a term

Add a card to the matching `<section class="cat">` in `index.html`:

```html
<article class="card" id="t-my-term" data-ui="card">
  <div class="stage"><!-- live example --></div>
  <div class="card-body">
    <h3>My term</h3>
    <p class="aka">aka other name · another name</p>
    <p class="def">One or two plain sentences saying what it is.</p>
  </div>
</article>
```

Search, filter counts, the command palette and Inspect mode pick it up on their own. For vocabulary without a visual example, add a `<div id="t-…"><dt>…</dt><dd>…</dd></div>` to the glossary list in the UX concepts section. See [AGENTS.md](AGENTS.md) for the full conventions.
