# Quick Form Filler

A lightweight, local-only Chrome/Chromium extension for quickly reusing common form values such as names, phone numbers, IDs, email addresses, and other frequently typed text.

## Features

- Stores values locally in `chrome.storage.local`
- Suggests matching values as the user types in text-like form fields
- Prefix matching with case-sensitive comparisons
- Keyboard navigation with Arrow Up/Down, Enter, and Escape
- Mouse click selection
- Popup UI for adding, editing, deleting, and viewing saved values
- Bulk import from `.txt` files or `.json` string arrays
- Export saved values as a JSON file
- Manual on/off toggle from the popup
- `Alt+V` shortcut to turn suggestions on or off
- React/Vue/Angular-friendly insertion via native input setter plus `input` and `change` events
- Suggestion UI is rendered with safe DOM APIs inside a closed Shadow DOM
- No backend, no auth, and no network requests

## Privacy model

This extension is explicitly local-only.

- Data is stored only on the current machine using `chrome.storage.local`
- No data is sent anywhere
- No analytics, analytics cookies, telemetry, or account system
- No backend or external API calls
- No remote synchronization or cloud storage

## How it works

1. The popup lets you add values you reuse often.
2. When you focus a text-like input on a webpage, the content script watches what you type.
3. It searches the saved values using prefix matching and shows a floating suggestion list.
4. You can choose a suggestion with mouse or keyboard.
5. The chosen value is inserted into the field while dispatching the events frameworks expect.

## Installation

1. Run `npm install`
2. Run `npm run build`
3. Open Chrome/Chromium and go to `chrome://extensions`
4. Enable Developer Mode
5. Click Load unpacked
6. Select this project folder or the generated `dist` folder

## Development

```bash
npm install
npm run build
```

To watch for changes while editing:

```bash
npm run dev
```

## Adding saved values

Open the extension popup from the toolbar and enter a value in the input box, then click Add.

You can also bulk import values:

- `.txt`: one saved value per line
- `.json`: an array of strings

Example JSON:

```json
[
  "Alex Example",
  "Alex",
  "120045006789",
  "alex@example.com"
]
```

Imported values are merged with existing values and exact duplicates are skipped. Different casing is treated as a different value. The popup can also export the current list as `quick-form-filler-values.json`.

Editable examples live in `examples/values.txt` and `examples/values.json`.

## Keyboard navigation

- Arrow Down: move selection down
- Arrow Up: move selection up
- Enter: accept the highlighted suggestion
- Escape: close the suggestion popup
- Typing: updates results
- Alt+V: turn the extension on or off

The suggestion popup only appears when there is a real match. The user must choose a suggestion instead of automatic replacement.

## Project structure

```text
form-filler-extension/
├── manifest.json
├── package.json
├── tsconfig.json
├── README.md
├── scripts/
│   └── build.mjs
├── src/
│   ├── content/
│   │   ├── content.ts
│   │   ├── suggestion-ui.ts
│   │   └── input-handler.ts
│   ├── search/
│   │   └── search.ts
│   ├── storage/
│   │   └── storage.ts
│   ├── popup/
│   │   ├── popup.ts
│   │   ├── popup.html
│   │   └── popup.css
│   └── shared/
│       └── types.ts
├── tests/
│   └── search.test.ts
└── dist/
```

## Known limitations

- This is an MVP focused on local personal productivity, not a full general-purpose autofill system.
- Suggestions are prefix-based in the initial version, with a modular ranking/search design to support future fuzzy matching.
- The extension does not attempt to auto-submit forms or interact with websites beyond inserting values into eligible inputs.
- Fields marked as password or other sensitive control types are intentionally ignored.

## Sharing The Extension

To share the source project with someone else, include:

- `manifest.json`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `README.md`
- `src/`
- `scripts/`
- `tests/`
- `examples/` only if it contains dummy/example values

You can exclude:

- `node_modules/`
- `dist/`
- `.env` files
- real personal import/export files such as `personal-values.json`, `personal-values.txt`, or `quick-form-filler-values.json`

The receiver can rebuild with:

```bash
npm install
npm run build
```

To share a ready-to-load extension without source code, run `npm run build` and share only the generated `dist/` folder. Do not include any file containing your real saved values.
