# Orbit Pong - GameMonetize Build

This build includes GameMonetize SDK integration for ad monetization.

## Configuration Required

Before uploading to GameMonetize, you need to:

1. Create a new game on the [GameMonetize Dashboard](https://gamemonetize.com/dashboard)
2. Get your Game ID from the dashboard
3. Open `gm-config.js` in this folder
4. Replace `REPLACE_WITH_GAMEMONETIZE_GAME_ID` with your actual Game ID

Example:
```javascript
window.GM_GAME_ID = 'abc123def456';
```

## Features

- Ads pause/resume game automatically
- Banner ads display after game over
- No changes to core gameplay

## Upload

After configuring the Game ID, zip all files in this folder and upload to GameMonetize.
