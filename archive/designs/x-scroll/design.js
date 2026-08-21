/*
 * V4 — Side X rails + checkered strips (up/down) beside main content.
 */
(function initDesignV4() {
  function start() {
    const rails = document.querySelectorAll('.x-rail');
    const checkerRails = document.querySelectorAll('.checker-rail');
    if (!rails.length) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const railData = [];
    const checkerTracks = { up: [], down: [] };
    let resizeTimer = 0;

    let markProbe = null;

    function getMarkSize() {
      if (!markProbe) {
        markProbe = document.createElement('span');
        markProbe.className = 'x-mark x-mark--lg';
        markProbe.setAttribute('aria-hidden', 'true');
        markProbe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;top:0;left:0;';
        document.body.appendChild(markProbe);
      }
      return markProbe.offsetWidth || 40;
    }

    function getUnitSize() {
      const unit = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--v4-unit'));
      return Number.isFinite(unit) && unit > 0 ? unit : 3;
    }

    function getCheckerRunSize() {
      const run = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--v4-checker-run'));
      if (Number.isFinite(run) && run > 0) return run;
      return getUnitSize() * 3;
    }

    function estimateUnit(bandWidth) {
      const markW = Math.min(48, Math.max(34, bandWidth));
      const gap = Math.min(18, Math.max(10, markW * 0.28));
      return markW + gap;
    }

    function computeCount(viewHeight, unit) {
      return Math.max(14, Math.ceil((viewHeight * 3) / unit));
    }

    function computeCheckerCount(viewHeight, runSize) {
      const cycle = runSize * 2;
      return Math.max(20, Math.ceil((viewHeight * 3) / cycle) * 2);
    }

    function fillTrack(track, count) {
      track.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const mark = document.createElement('span');
        mark.className = 'x-mark x-mark--lg';
        track.appendChild(mark);
      }
    }

    function fillCheckerTrack(track, count, startBlack) {
      track.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const cell = document.createElement('span');
        const isBlack = startBlack ? i % 2 === 0 : i % 2 === 1;
        cell.className = `checker-cell ${isBlack ? 'checker-cell--black' : 'checker-cell--white'}`;
        track.appendChild(cell);
      }
    }

    function buildRail(rail) {
      if (reduced) {
        rail.classList.add('x-rail--static');
      }

      let lane = rail.querySelector('.x-rail-lane');
      if (!lane) {
        lane = document.createElement('div');
        lane.className = 'x-rail-lane';
        rail.appendChild(lane);
      } else {
        lane.innerHTML = '';
      }

      const bandWidth = getMarkSize();
      const count = computeCount(window.innerHeight, estimateUnit(bandWidth));
      const redTracks = [];
      const blackTracks = [];

      [1, 2].forEach((col) => {
        const band = document.createElement('div');
        band.className = 'x-roll-band';

        const red = document.createElement('div');
        red.className = `x-track x-track--red x-track--col-${col}`;
        fillTrack(red, count);

        const black = document.createElement('div');
        black.className = `x-track x-track--black x-track--col-${col}`;
        fillTrack(black, count);

        band.appendChild(red);
        band.appendChild(black);
        lane.appendChild(band);

        redTracks.push(red);
        blackTracks.push(black);
      });

      const existing = railData.findIndex((d) => d.rail === rail);
      const entry = { rail, redTracks, blackTracks };
      if (existing >= 0) railData[existing] = entry;
      else railData.push(entry);
    }

    function buildCheckerRail(checkerRail) {
      let track = checkerRail.querySelector('.checker-track');
      if (!track) {
        track = document.createElement('div');
        track.className = 'checker-track';
        checkerRail.appendChild(track);
      } else {
        track.innerHTML = '';
      }

      const runSize = getCheckerRunSize();
      const count = computeCheckerCount(window.innerHeight, runSize);
      const isUp = checkerRail.classList.contains('checker-rail--up');
      fillCheckerTrack(track, count, isUp);

      if (isUp) checkerTracks.up.push(track);
      else checkerTracks.down.push(track);

      return track;
    }

    function trackHeight(tracks) {
      const track = tracks[0];
      if (!track) return 0;
      return track.scrollHeight || track.getBoundingClientRect().height || 0;
    }

    function rebuildAll() {
      checkerTracks.up = [];
      checkerTracks.down = [];
      rails.forEach(buildRail);
      checkerRails.forEach(buildCheckerRail);
      update();
    }

    function ensureCoverage() {
      let needsRebuild = false;
      railData.forEach(({ redTracks }) => {
        const viewH = window.innerHeight;
        const trackH = trackHeight(redTracks);
        if (viewH > 0 && trackH < viewH * 2) needsRebuild = true;
      });

      const checkerH = trackHeight(checkerTracks.up.length ? checkerTracks.up : checkerTracks.down);
      if (window.innerHeight > 0 && checkerH < window.innerHeight * 2) needsRebuild = true;

      if (needsRebuild) rebuildAll();
    }

    rails.forEach(buildRail);
    checkerRails.forEach(buildCheckerRail);

    if (reduced) return;

    let ticking = false;

    function clamp(v, min, max) {
      return Math.min(max, Math.max(min, v));
    }

    function smooth(t) {
      return t * t * (3 - 2 * t);
    }

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function pageProgress() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return 0;
      return clamp(window.scrollY / max, 0, 1);
    }

    function setTransformY(el, y, centered) {
      if (centered) {
        el.style.transform = `translate3d(-50%, ${y}px, 0)`;
      } else {
        el.style.transform = `translate3d(0, ${y}px, 0)`;
      }
    }

    function motionY(viewH, trackH, t) {
      const upStart = viewH - trackH * 0.85;
      const upEnd = -trackH * 0.15;
      const downStart = -trackH * 0.15;
      const downEnd = viewH - trackH * 0.85;
      return {
        upY: lerp(upStart, upEnd, t),
        downY: lerp(downStart, downEnd, t),
      };
    }

    function update() {
      ticking = false;
      const t = smooth(pageProgress());
      const viewH = window.innerHeight;

      railData.forEach(({ redTracks, blackTracks }) => {
        const trackH = trackHeight(redTracks);
        if (!viewH || !trackH) return;

        const { upY, downY } = motionY(viewH, trackH, t);

        redTracks.forEach((track) => setTransformY(track, upY, true));
        blackTracks.forEach((track) => setTransformY(track, downY, true));
      });

      const checkerH = trackHeight(checkerTracks.up.length ? checkerTracks.up : checkerTracks.down);
      if (!viewH || !checkerH) return;

      const { upY, downY } = motionY(viewH, checkerH, t);

      checkerTracks.up.forEach((track) => setTransformY(track, upY, false));
      checkerTracks.down.forEach((track) => setTransformY(track, downY, false));
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(rebuildAll, 120);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(onResize);
      rails.forEach((rail) => ro.observe(rail));
      checkerRails.forEach((rail) => ro.observe(rail));
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        rebuildAll();
        ensureCoverage();
      });
    });

    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
