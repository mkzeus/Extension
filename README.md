# AI Job Copilot (Chrome Extension)

AI Job Copilot is a Chrome extension (Manifest V3) built with React + TypeScript.

## Features

- Enter target job title and location
- Search LinkedIn jobs and fetch the first 5 matches
- Select jobs in popup UI
- Upload and parse CV PDF text
- Generate AI-style application answers
- Store application history in `chrome.storage.local`
- Show desktop notification when manual input is needed

## Tech Stack

- React + TypeScript
- Vite + `@crxjs/vite-plugin`
- Chrome Extension Manifest V3
- `pdfjs-dist` for CV PDF parsing

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Load the generated extension from `dist/` via **Chrome -> Extensions -> Load unpacked**.

## Notes

- LinkedIn search parsing depends on LinkedIn DOM structure and may need selector updates over time.
- AI answers are generated locally using CV context and templates (no external API key required).
