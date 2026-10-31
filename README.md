# Obsidian Document Outline

A minimal outline for your notes, modeled on Linear's document outline.

- A column of short lines on the left of the note, one per heading, centered vertically.
- Hover to expand into a card listing the headings; click a heading to jump to it.
- Nested headings are indented; the current section is highlighted.
- The outline grows as you add headings and scrolls once it no longer fits.
- Styled only with Obsidian's theme variables, so it follows your theme.

Desktop only.

## Development

```bash
npm install
npm run dev     # watch build
npm run build   # type-check + production build
```

Copy `main.js`, `manifest.json` and `styles.css` into `<vault>/.obsidian/plugins/document-outline/`.
