/*
 * V5 — Full-screen X backdrop (2 red up, 2 black down per segment).
 */
(function initDesignV5() {
  function start() {
    const backdrop = document.querySelector('.x-backdrop');
    if (!backdrop) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let redTracks = [];
    let blackTracks = [];
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

    function getSegmentWidth() {
      const mark = getMarkSize();
      const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--v4-gap')) || 3;
      return mark * 2 + gap;
    }

    function estimateUnit(bandWidth) {
      const markW = Math.min(48, Math.max(34, bandWidth));
      const gap = Math.min(18, Math.max(10, markW * 0.28));
      return markW + gap;
    }

    function computeCount(viewHeight, unit) {
      return Math.max(14, Math.ceil((viewHeight * 3) / unit));
    }

    function computeSegments(viewWidth) {
      const segmentW = getSegmentWidth();
      return Math.max(2, Math.ceil(viewWidth / segmentW) + 1);
    }

    function fillTrack(track, count) {
      track.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const mark = document.createElement('span');
        mark.className = 'x-mark x-mark--lg';
        track.appendChild(mark);
      }
    }

    function buildBand(count, col, bandIndex) {
      const band = document.createElement('div');
      band.className = `x-roll-band ${bandIndex % 2 === 0 ? 'x-roll-band--red-top' : 'x-roll-band--black-top'}`;

      const red = document.createElement('div');
      red.className = `x-track x-track--red x-track--col-${col}`;
      fillTrack(red, count);

      const black = document.createElement('div');
      black.className = `x-track x-track--black x-track--col-${col}`;
      fillTrack(black, count);

      band.appendChild(red);
      band.appendChild(black);
      return { band, red, black };
    }

    function buildBackdrop() {
      if (reduced) {
        backdrop.classList.add('x-backdrop--static');
      }

      let lane = backdrop.querySelector('.x-rail-lane');
      if (!lane) {
        lane = document.createElement('div');
        lane.className = 'x-rail-lane';
        backdrop.appendChild(lane);
      } else {
        lane.innerHTML = '';
      }

      const bandWidth = getMarkSize();
      const count = computeCount(window.innerHeight, estimateUnit(bandWidth));
      const segments = computeSegments(window.innerWidth);
      redTracks = [];
      blackTracks = [];
      let bandIndex = 0;

      for (let s = 0; s < segments; s++) {
        const segment = document.createElement('div');
        segment.className = 'x-backdrop-segment';

        [1, 2].forEach((col) => {
          const { band, red, black } = buildBand(count, col, bandIndex);
          bandIndex += 1;
          segment.appendChild(band);
          redTracks.push(red);
          blackTracks.push(black);
        });

        lane.appendChild(segment);
      }
    }

    function trackHeight(tracks) {
      const track = tracks[0];
      if (!track) return 0;
      return track.scrollHeight || track.getBoundingClientRect().height || 0;
    }

    function rebuildAll() {
      buildBackdrop();
      update();
    }

    function ensureCoverage() {
      const viewH = window.innerHeight;
      const trackH = trackHeight(redTracks);
      const viewW = window.innerWidth;
      const lane = backdrop.querySelector('.x-rail-lane');
      const laneW = lane?.scrollWidth || 0;
      const needsHeight = viewH > 0 && trackH < viewH * 2;
      const needsWidth = viewW > 0 && laneW < viewW * 1.05;
      if (needsHeight || needsWidth) rebuildAll();
    }

    buildBackdrop();

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

    /** 0 at page top, 1 at page bottom. */
    function pageProgress() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return 0;
      return clamp(window.scrollY / max, 0, 1);
    }

    function setTransformY(el, y) {
      el.style.transform = `translate3d(-50%, ${y}px, 0)`;
    }

    function update() {
      ticking = false;
      const t = smooth(pageProgress());
      const viewH = window.innerHeight;
      const trackH = trackHeight(redTracks);
      if (!viewH || !trackH) return;

      const redStart = viewH - trackH * 0.85;
      const redEnd = -trackH * 0.15;
      const blackStart = -trackH * 0.15;
      const blackEnd = viewH - trackH * 0.85;

      const redY = lerp(redStart, redEnd, t);
      const blackY = lerp(blackStart, blackEnd, t);

      redTracks.forEach((track) => setTransformY(track, redY));
      blackTracks.forEach((track) => setTransformY(track, blackY));
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
      ro.observe(backdrop);
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
