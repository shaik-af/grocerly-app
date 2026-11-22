# Grocerly

A free offline-friendly grocery list PWA for desktop and Android.

## Files

- `index.html` — semantic HTML layout
- `style.css` — styling and responsive layout
- `app.js` — sections, items, checkbox selection, persistence
- `export.js` — selected-only text, PNG and print/PDF exports
- `sw.js` — offline cache service worker
- `manifest.webmanifest` — installable app settings
- `icons/` — Android app icons

## Deploy to GitHub Pages

Upload **all** files and the `icons` directory to the root of your `grocerly-app` repository. Keep Pages configured for `main` and `/ (root)`.

Your site is `https://shaik-af.github.io/grocerly-app/`.

## Notes

Items are saved per browser using the existing `grocerly-sections-v2` localStorage key. Checkboxes determine which items appear in exports. Sections without selected items are omitted. Exports are disabled when nothing is selected.

When replacing an older installation, allow the service worker to refresh, then reopen the app. Avoid clearing site data if you want to keep saved items.
