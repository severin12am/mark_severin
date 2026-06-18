# Games & Apps Portfolio

A static site for showcasing your HTML5 games and apps — styled like **Doabli** (dark navy + orange, soft glows, smooth animations).

## Quick start

**Double-click `start.bat`** — opens the site at http://localhost:3456 (includes Unity WebGL headers for Bug Eaters).

Or manually:

```bash
cd d:\Portfolio
python serve.py
```

Then open http://localhost:3456 in your browser.

> Don't open `index.html` directly — browsers block the catalog and Unity games. Use `start.bat`.

**Showing to an investor:** deploy to [Netlify](https://netlify.com) (drag-and-drop the folder) or see **`DEPLOY.md`** (RU).

---

## How to add a game

### Step 1 — Create a folder

Each game lives in its own folder:

```
Portfolio/
├── games/
│   ├── orbita/          ← your game
│   │   ├── index.html   ← REQUIRED — entry point
│   │   ├── preview.mp4  ← optional video for card & detail page
│   │   ├── preview.jpg  ← optional image (used if no video)
│   │   └── ...          ← all your game assets (js, images, etc.)
│   └── maze/
│       ├── index.html
│       └── preview.mp4
```

**Copy your entire game folder** into `games/`. The game must have an `index.html` at the root of that folder.

### Step 2 — Add an entry in `data/catalog.js`

Open `data/catalog.js` and add an object to the `"games"` array:

```json
{
  "id": "orbita",
  "folder": "OrbitaPong",
  "languages": ["ru", "en"],
  "title": { "ru": "Орбита Понг", "en": "Orbit Pong" },
  "description": {
    "ru": "Короткое описание на русском.",
    "en": "Short description in English."
  },
  "tags": ["puzzle", "physics"],
  "featured": true
}
```

| Field         | Meaning                                      |
|---------------|----------------------------------------------|
| `id`          | Unique slug (no spaces)                      |
| `folder`      | Folder name inside `games/`                  |
| `languages`   | `["ru"]`, `["en"]`, or `["ru", "en"]`        |
| `title`       | Object with `ru` and/or `en` keys            |
| `description` | Object with `ru` and/or `en` keys            |
| `tags`        | Small labels on the card                     |
| `featured`    | `true` = orange border highlight             |

Click a game to start it immediately. Language is picked automatically from the site RU/EN toggle (falls back to the only language the game supports).

### Step 3 — Add preview media (recommended)

Drop **one** of these into the game folder (first match wins):

**Video (autoplays muted on cards):**
- `preview.mp4`
- `preview.webm`

**Image / GIF (fallback, GIF animates on cards):**
- `preview.gif` / `preview.webp` / `preview.jpg` / `preview.png`
- `thumbnail.gif` / `thumbnail.jpg` / `thumbnail.png`

Tip: record 5–15 seconds of gameplay on your phone, transfer as `preview.mp4`.

---

## How to add an app

Same idea, but use the `apps/` folder and the `"apps"` array in `data/games.json`:

```
apps/
  my-app/
    index.html
    preview.jpg
```

```json
{
  "id": "my-app",
  "title": "My App",
  "type": "app",
  "description": "What it does.",
  "folder": "my-app",
  "tags": ["utility"],
  "featured": false
}
```

---

## Copying your existing games from Desktop

Your HTML5 builds are already self-contained folders. For example:

| Your game      | Copy from (example)                              | To                          |
|----------------|--------------------------------------------------|-----------------------------|
| Orbita         | `Desktop\...\Orbita1\` (folder with index.html)  | `games/orbita/`             |
| Maze           | `Desktop\maze1203\`                              | `games/maze/`               |
| Nucleon        | `Desktop\...\Nucleon2102\`                       | `games/nucleon/`            |
| Papery         | `Desktop\papery\ready\`                          | `games/papery/`             |

1. Copy the **whole folder** (all `.js`, assets, etc.)
2. Make sure `index.html` is at the top level of that folder
3. Add the JSON entry
4. Add a `preview.mp4` or screenshot

---

## Site settings

Edit the top of `data/games.json`:

```json
"site": {
  "title": "Your Name — Games",
  "tagline": "HTML5 games and interactive experiments"
}
```

---

## Deploy

Upload the entire `Portfolio` folder to any static host:

- **GitHub Pages** — push repo, enable Pages
- **Netlify / Vercel** — drag & drop or connect repo
- **itch.io** — can host the whole site as HTML

No build step required.

---

## Folder structure summary

```
Portfolio/
├── index.html          ← main page
├── css/styles.css      ← Doabli-style theme
├── js/app.js           ← loads games.json, renders cards
├── data/games.json     ← catalog (edit this to add items)
├── games/              ← one folder per game
│   └── demo/           ← working placeholder
└── apps/               ← one folder per app
```
