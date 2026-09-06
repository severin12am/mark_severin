#!/usr/bin/env python3
"""Copy localized Mozgoput/Lest into publish packs and rebuild GameMonetize zips."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GAMES = ROOT / "games"
PUB = ROOT / "publish"

MOZG_SDK = """
<script src="gm-config.js"></script>
<script>
window.SDK_OPTIONS = {
  gameId: window.GM_GAME_ID || 'REPLACE_WITH_GAMEMONETIZE_GAME_ID',
  onEvent: function(event) {
    if (!event || !event.name) return;
    try {
      if (event.name === 'SDK_GAME_PAUSE') {
        if (typeof YM !== 'undefined') {
          YM.isAdShowing = true;
          if (typeof YM.pauseAudio === 'function') YM.pauseAudio();
        }
      } else if (event.name === 'SDK_GAME_START') {
        if (typeof YM !== 'undefined') {
          YM.isAdShowing = false;
          if (typeof YM.resumeAudio === 'function') YM.resumeAudio();
        }
      }
    } catch (e) {}
  }
};
window.gmShowBanner = function() {
  try {
    if (typeof sdk !== 'undefined' && sdk && typeof sdk.showBanner === 'function') {
      sdk.showBanner();
    }
  } catch (e) {}
};
window.addEventListener('load', function() {
  setTimeout(function() { window.gmShowBanner(); }, 3000);
});
</script>
<script src="https://api.gamemonetize.com/sdk.js"></script>
"""

LEST_SDK = """
<script src="gm-config.js"></script>
<script>
window.SDK_OPTIONS = {
  gameId: window.GM_GAME_ID || 'REPLACE_WITH_GAMEMONETIZE_GAME_ID',
  onEvent: function(event) {
    if (!event || !event.name) return;
    try {
      if (event.name === 'SDK_GAME_PAUSE') {
        if (typeof window.gmPauseGame === 'function') window.gmPauseGame();
      } else if (event.name === 'SDK_GAME_START') {
        if (typeof window.gmResumeGame === 'function') window.gmResumeGame();
      }
    } catch (e) {}
  }
};
window.gmShowBanner = function() {
  try {
    if (typeof sdk !== 'undefined' && sdk && typeof sdk.showBanner === 'function') {
      sdk.showBanner();
    }
  } catch (e) {}
};
window.addEventListener('load', function() {
  setTimeout(function() { window.gmShowBanner(); }, 3000);
});
</script>
<script src="https://api.gamemonetize.com/sdk.js"></script>
"""


def copy_tree(src: Path, dst: Path) -> None:
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns(".DS_Store", "__MACOSX"))


def inject_sdk(index_path: Path, snippet: str) -> None:
    html = index_path.read_text(encoding="utf-8")
    if "api.gamemonetize.com/sdk.js" in html:
        return
    if "</body>" not in html:
        raise SystemExit(f"no </body> in {index_path}")
    html = html.replace("</body>", snippet.strip() + "\n</body>", 1)
    index_path.write_text(html, encoding="utf-8")


def zip_dir(src: Path, zip_path: Path) -> None:
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    if zip_path.exists():
        zip_path.unlink()
    subprocess.check_call(
        ["zip", "-r", str(zip_path), ".", "-x", "*.DS_Store", "-x", "__MACOSX/*"],
        cwd=src,
    )


def main() -> None:
    for game in ("Mozgoput", "Lest"):
        src = GAMES / game
        itch = PUB / "itch" / game
        gm = PUB / "gamemonetize" / game
        cfg = gm / "gm-config.js"
        readme = gm / "README.md"
        saved_cfg = cfg.read_text(encoding="utf-8") if cfg.exists() else "window.GM_GAME_ID = 'REPLACE_WITH_GAMEMONETIZE_GAME_ID';\n"
        saved_readme = readme.read_text(encoding="utf-8") if readme.exists() else ""

        copy_tree(src, itch)
        copy_tree(src, gm)
        cfg.write_text(saved_cfg, encoding="utf-8")
        if saved_readme:
            readme.write_text(saved_readme, encoding="utf-8")

        snippet = MOZG_SDK if game == "Mozgoput" else LEST_SDK
        inject_sdk(gm / "index.html", snippet)
        zip_dir(gm, PUB / "zips" / "gamemonetize" / f"{game}.zip")
        zip_dir(itch, PUB / "zips" / "itch" / f"{game}.zip")
        print("refreshed", game)

    # sanity: index.html at zip root
    for game in ("Mozgoput", "Lest"):
        out = subprocess.check_output(
            ["unzip", "-l", str(PUB / "zips" / "gamemonetize" / f"{game}.zip")],
            text=True,
        )
        if "index.html" not in out.splitlines()[3] and " index.html" not in out:
            print(out)
        print(game, "zip has index.html:", "index.html" in out)


if __name__ == "__main__":
    main()
