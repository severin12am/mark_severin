# Publishing Guide for Mark Severin's HTML5 Games

This folder contains ready-to-upload builds for 6 HTML5 games, prepared for **itch.io** and **GameMonetize** platforms.

## 📁 Structure

```
publish/
├── README.md              # This file
├── LISTINGS.md            # Game metadata (titles, descriptions, tags, prices)
├── itch/                  # Clean builds for itch.io (no SDK)
│   ├── MeduzaMaze/
│   ├── OrbitaPong/
│   ├── Rotatris/
│   ├── Nucleon/
│   ├── Mozgoput/
│   └── Lest/
├── gamemonetize/          # Builds with GameMonetize SDK
│   ├── MeduzaMaze/
│   ├── OrbitaPong/
│   ├── Rotatris/
│   ├── Nucleon/
│   ├── Mozgoput/
│   └── Lest/
└── zips/                  # Pre-made ZIP archives
    ├── itch/              # 6 ready-to-upload itch.io zips
    └── gamemonetize/      # 6 ready-to-upload GameMonetize zips
```

---

## 🎮 Games Included

1. **Medusa Maze** (Лабиринт Медузы) - Neon maze runner
2. **Orbit Pong** (Орбита Понг) - Futuristic orbital Pong
3. **Rotatris** (Ротатрис) - Rotating Tetris variant
4. **Nucleon** (Нуклеон) - Atom-splitting physics puzzler
5. **Mozgoput** (Мозгопут) - Russian word association game
6. **Lest** (Лестница) - Russian word ladder puzzle

---

## 📤 How to Upload to itch.io

### Prerequisites
- Create a free account at https://itch.io

### Steps for Each Game

1. **Log in to itch.io** and go to your [Dashboard](https://itch.io/dashboard)

2. **Create New Project**
   - Click "Create new project"
   - Fill in project details:
     - **Title**: Use titles from `LISTINGS.md`
     - **Project URL**: Choose a unique URL slug
     - **Classification**: Game
     - **Kind of project**: HTML

3. **Upload Game Files**
   - Under "Uploads", click "Upload files"
   - Choose the corresponding ZIP from `zips/itch/[GameName].zip`
   - Check ✅ "This file will be played in the browser"
   - The ZIP will be automatically extracted by itch.io

4. **Add Details**
   - **Short description**: Copy from `LISTINGS.md`
   - **Tags**: Use tags from `LISTINGS.md`
   - **Screenshots**: Upload preview images from the game folder
   - **Pricing**: 
     - For free games: Select "Free" and enable "This is a Pay What You Want game" if desired
     - For PWYW games: Use suggested prices from `LISTINGS.md`

5. **Configure Embed Options**
   - **Viewport dimensions**: 
     - Most games: 800×600 or "Automatically detect"
     - OrbitaPong/MeduzaMaze: May prefer fullscreen or larger
   - **Mobile friendly**: ✅ Check this (all games support touch)
   - **Orientation**: Landscape

6. **Publish**
   - Set visibility (Public/Restricted/Draft)
   - Click "Save & view page"

### Testing
After upload, click "Run game" on your project page to test in browser before making it public.

---

## 📤 How to Upload to GameMonetize

### Prerequisites
- Create account at https://gamemonetize.com
- Verify your account

### Steps for Each Game

#### 1. Create Game Entry
1. Log in to [GameMonetize Dashboard](https://gamemonetize.com/dashboard)
2. Click "Add New Game"
3. Fill in game details:
   - **Title**: Use titles from `LISTINGS.md`
   - **Description**: Copy from `LISTINGS.md`
   - **Category**: Choose appropriate category (Puzzle, Arcade, etc.)
   - **Tags**: Use tags from `LISTINGS.md`
4. Submit to receive your **Game ID** (e.g., `abc123def456`)

#### 2. Configure Game ID
⚠️ **IMPORTANT**: Before uploading the game files:

1. Navigate to `gamemonetize/[GameName]/`
2. Open `gm-config.js` in a text editor
3. Replace `REPLACE_WITH_GAMEMONETIZE_GAME_ID` with your actual Game ID
4. Save the file

Example:
```javascript
// Before
window.GM_GAME_ID = 'REPLACE_WITH_GAMEMONETIZE_GAME_ID';

// After
window.GM_GAME_ID = 'abc123def456';
```

#### 3. Create New ZIP (After Configuration)
After updating `gm-config.js`, create a fresh ZIP:
- **Windows**: Select all files in the game folder → Right-click → Send to → Compressed folder
- **macOS**: Select all files → Right-click → Compress
- **Linux**: `cd gamemonetize/[GameName] && zip -r ../[GameName]-configured.zip .`

⚠️ **Important**: Make sure `index.html` is at the ROOT of the ZIP, not in a subfolder.

#### 4. Upload to GameMonetize
1. Return to GameMonetize dashboard
2. Find your game entry
3. Upload the newly created ZIP file
4. Wait for processing (usually a few minutes)
5. Test the game preview to ensure ads work correctly

### Testing GameMonetize Integration
- Ads should appear automatically 3 seconds after page load
- Ads should display after game over
- Game should pause when ads play
- If ads don't appear, verify your Game ID is correct in `gm-config.js`

### Monitoring
- Check GameMonetize dashboard for impression/revenue stats
- Note: Real ads only appear on approved games; test mode may show placeholders

---

## 🎯 Game-Specific Notes

### Mozgoput & Lest
- These are **Russian language games**
- Best marketed to Russian-speaking audiences
- Tags should emphasize "russian" and "language"

### Rotatris
- Previously attempted on CrazyGames (impression issues)
- Should work fine on GameMonetize and itch.io
- Unique rotating mechanic - highlight in description

### Nucleon
- Educational aspect (chemistry/physics) is a selling point
- Consider tagging as "educational" for broader reach

---

## ✅ Verification Checklist

Before making games public, verify:

### For itch.io:
- [ ] Game loads and plays correctly in browser
- [ ] All controls work (keyboard + touch/mouse)
- [ ] Preview screenshots uploaded
- [ ] Description and tags set
- [ ] Pricing configured correctly
- [ ] Mobile-friendly option enabled

### For GameMonetize:
- [ ] Game ID configured in `gm-config.js`
- [ ] Fresh ZIP created after configuration
- [ ] Ads display after ~3 seconds
- [ ] Ads display after game over
- [ ] Game pauses during ads
- [ ] Game resumes after ads

---

## 🧪 Local Testing

To test games locally before upload:

1. **Simple HTTP Server** (Python 3):
   ```bash
   cd publish/itch/[GameName]
   python3 -m http.server 8000
   ```
   Open: http://localhost:8000

2. **Node.js** (if available):
   ```bash
   npx http-server publish/itch/[GameName] -p 8000
   ```

3. **VS Code**: Install "Live Server" extension, right-click `index.html` → "Open with Live Server"

⚠️ **Note**: Simply opening `index.html` as a file (`file://`) may not work due to browser security restrictions.

---

## 💰 Monetization Notes

### itch.io
- Pay What You Want (PWYW) recommended for most games
- Donation button available for free games
- Suggested minimums in `LISTINGS.md`
- itch.io takes 10% by default (adjustable)

### GameMonetize
- Requires account with valid payment details
- Revenue based on ad impressions/clicks
- Payment threshold typically $50-100
- Ads must not be intrusive (already implemented appropriately)

---

## ⚠️ Important Reminders

### DO NOT
- ❌ Upload placeholder Game IDs (`REPLACE_WITH_GAMEMONETIZE_GAME_ID`)
- ❌ Mix up itch.io and GameMonetize builds
- ❌ Forget to test after upload
- ❌ Make games public before verification

### DO
- ✅ Use pre-made ZIPs from `zips/` for itch.io
- ✅ Configure Game ID before creating GameMonetize ZIPs
- ✅ Test in browser before making public
- ✅ Use metadata from `LISTINGS.md`
- ✅ Upload preview images/GIFs

---

## 📧 Support

If games don't work after upload:
1. Check browser console for errors (F12)
2. Verify ZIP structure (index.html must be at root)
3. For GameMonetize: Verify Game ID is correct
4. For itch.io: Check embed settings and viewport dimensions

---

## 🎉 Ready to Publish!

All games are tested and ready. Follow the platform-specific instructions above, and your games will be live and monetized. Good luck! 🚀
