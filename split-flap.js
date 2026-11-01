// Vanilla port of React Bits <SplitFlapText /> ("minimal" style, single phrase, intro from blank).
// Usage: splitFlap(element, 'TEXT', { flipMs, staggerMs, flips, delayMs })
(function () {
  const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const glyph = c => (c === ' ' ? ' ' : c);

  const part = (kind, pos, c) =>
    `<span class="split-flap-text__${kind} split-flap-text__${kind}--${pos}"><span class="split-flap-text__char">${glyph(c)}</span></span>`;

  // Rebuilding the halves/flaps on every step restarts their CSS animations (the React version does it via keys).
  const paint = (tile, current, next, flipping) => {
    tile.classList.toggle('is-flipping', flipping);
    tile.innerHTML =
      `<span class="split-flap-text__spacer">${glyph(tile.dataset.target)}</span>` +
      part('half', 'top', flipping ? next : current) +
      part('half', 'bottom', current) +
      (flipping ? part('flap', 'front', current) + part('flap', 'back', next) : '');
  };

  window.splitFlap = function (el, text, { flipMs = 120, staggerMs = 60, flips = 8, delayMs = 0 } = {}) {
    el.classList.add('split-flap-text', 'split-flap-text--minimal');
    el.style.setProperty('--split-flap-flip-duration', `${flipMs / 1000}s`);

    const tiles = [...text].map(ch => {
      const tile = document.createElement('span');
      tile.className = 'split-flap-text__tile';
      tile.dataset.target = ch;
      el.appendChild(tile);
      paint(tile, reduce ? ch : ' ', ' ', false);
      return tile;
    });
    if (reduce) return;

    const plans = tiles.map((tile, i) => ({
      tile,
      start: delayMs + i * staggerMs,
      sequence: Array.from({ length: flips }, () => CHARSET[Math.floor(Math.random() * CHARSET.length)]).concat(tile.dataset.target),
      step: -1,
      done: false
    }));
    const startedAt = performance.now();

    const tick = now => {
      let running = false;
      plans.forEach(plan => {
        if (plan.done) return;
        const step = Math.floor((now - startedAt - plan.start) / flipMs);
        if (step < 0) {
          running = true;
        } else if (step < plan.sequence.length) {
          running = true;
          if (step !== plan.step) {
            plan.step = step;
            paint(plan.tile, step === 0 ? ' ' : plan.sequence[step - 1], plan.sequence[step], true);
          }
        } else {
          plan.done = true;
          paint(plan.tile, plan.tile.dataset.target, plan.tile.dataset.target, false);
        }
      });
      if (running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
})();
