# Local verification — English Mozgoput & Lest

Serve from the repo root (do not open `file://`):

```bash
python3 -m http.server 8000
```

## Mozgoput (Brain Path)

1. Open http://localhost:8000/games/Mozgoput/
2. Confirm the menu is English: **Brain Path**, Choose / Type, Start game, EN selected.
3. Open DevTools → Console. There should be no script errors.
4. Start **Choose** mode. Start and goal words must be English. Pick a green-path card or any connected word until the round ends. Result screen should be English (**Round over**, shortest path).
5. Start **Type** mode and enter a real English neighbor of the current word (or use Hint, which reveals the next word as a green placeholder and a **Hint:** banner).
6. In **Choose** mode, pick a non-optimal card, then click **Hint**. The next valid word must flash (it is inserted into the batch if it was missing). If you are in a dead end, a modal explains that — Hint must never do nothing.
7. Optional: click **RU** or open `?lang=ru` — UI and words switch to Russian after reload.

Automated hint logic: `node tools/test-mozgoput-hint.mjs`

GameMonetize pack (same play, plus SDK scripts): http://localhost:8000/publish/gamemonetize/Mozgoput/

## Lest (Word Ladder)

1. Open http://localhost:8000/games/Lest/
2. Confirm English menu: **Word Ladder**, Play, word counts in the thousands.
3. Console should stay clean.
4. Play length 4, Medium. Start/goal are English. Change exactly one letter per step; Submit accepts dictionary words only.
5. Try Hint, then Give up — solution overlay is English.
6. Optional: **RU** or `?lang=ru` reloads the Russian noun list and Cyrillic letter picker.

GameMonetize pack: http://localhost:8000/publish/gamemonetize/Lest/

## Zip check

`publish/zips/gamemonetize/Mozgoput.zip` and `Lest.zip` must contain `index.html` at the archive root (not in a subfolder).
