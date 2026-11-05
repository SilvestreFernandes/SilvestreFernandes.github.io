// Curved row of site screenshots (vanilla port of the TiltedGridHero React component).
// Tiles ride the inside of a cylinder; each tile is cut into SLICES strips so the image bends along its length.
// Images come from the [data-shot] links in the page, so the list below the band stays the single source.
(function () {
  const root = document.querySelector('[data-tgh]');
  const links = [...document.querySelectorAll('[data-shot]')];
  const images = links.map(a => a.dataset.shot);
  if (!root || !images.length || !('ResizeObserver' in window)) return;

  const SLICES = 16;   // strips per tile: fewer shows corners on the top and bottom edges
  const CAMERA = 1.6;  // camera distance as a multiple of the cylinder radius
  const MAX_WIDTH = 55; // a tile never exceeds this % of the width, so phones still show neighbours

  const num = (k, d) => parseFloat(root.dataset[k]) || d;
  const tileH = num('tile', 40);   // tile height, % of the band's height
  const aspect = num('aspect', 1.6);
  const gap = num('gap', 6);       // % of a tile's height
  const axis = num('axis', 50);    // vertical centre, % of height
  const speed = num('speed', 5);   // seconds per tile
  const fade = num('fade', 12);    // % of width faded at each end
  const bend = (Math.min(85, Math.max(5, num('curve', 80))) * Math.PI) / 180;

  const arc = b => (CAMERA - 1 + Math.cos(b)) / (2 * CAMERA * Math.sin(b));
  const deg = rad => (rad * 180) / Math.PI;
  const round = n => +n.toFixed(4);

  function measure(width, height) {
    const h = Math.min((tileH / 100) * height, ((MAX_WIDTH / 100) * width) / aspect);
    const radius = width * arc(bend);
    if (!(h > 0) || !(radius > 0)) return { columns: 2, sweep: 0, unit: 0, limit: 0 };
    const unit = deg(h / radius);
    const pitch = (aspect + gap / 100) * unit;
    const limit = deg(bend) + (aspect * unit) / 2;
    const columns = Math.min(60, Math.max(2, Math.ceil((2 * limit) / pitch)));
    const sweep = round((columns * pitch) / 2);
    return { columns, sweep, unit: round(unit), limit: round(Math.min(sweep, limit)) };
  }

  const band = Object.assign(document.createElement('div'), { className: 'tgh__band' });
  band.setAttribute('aria-hidden', 'true');
  const style = document.createElement('style');
  root.append(style, band);

  const mask = `linear-gradient(90deg,transparent,#000 ${fade}%,#000 ${100 - fade}%,transparent)`;
  const r = 100 * arc(bend);
  band.style.cssText = `perspective:${+(r * CAMERA).toFixed(3)}cqw;perspective-origin:50% ${axis}%;mask-image:${mask};-webkit-mask-image:${mask}`;

  // Every length is a multiple of the tile's height.
  const u = n => `calc(${round(n)} * min(${tileH}cqh, ${round(MAX_WIDTH / aspect)}cqw))`;
  const turn = d => `translateZ(${+r.toFixed(3)}cqw) rotateY(${round(d)}deg) translateZ(-${+r.toFixed(3)}cqw)`;
  const share = aspect / SLICES;

  // Which image each tile shows; changes only when the tile wraps out of sight.
  const shown = {};
  const pic = i => images[i % images.length];

  let last = null;
  function build(l) {
    const { columns, sweep, unit, limit } = l;
    const duration = columns * speed;
    const hide = +(((sweep - limit) / (2 * sweep || 1)) * 100).toFixed(4);
    style.textContent =
      `@keyframes tgh-orbit{from{transform:${turn(-sweep)}}to{transform:${turn(sweep)}}` +
      `0%,${hide}%,${100 - hide}%,100%{visibility:hidden}` +
      `${hide + 0.001}%,${100 - hide - 0.001}%{visibility:visible}}`;

    const tiles = [];
    for (let t = 0; t < columns; t++) {
      const first = columns - 1 - t;
      let cur = shown[t] ?? first;
      const src = pic(cur);
      const tile = document.createElement('div');
      tile.className = 'tgh__tile';
      tile.style.cssText =
        `left:calc(50% - ${u(aspect / 2)});top:calc(${axis}% - ${u(0.5)});width:${u(aspect)};height:${u(1)};` +
        `animation:tgh-orbit ${duration}s linear ${-t * speed}s infinite`;
      for (let k = 0; k < SLICES; k++) {
        const slice = document.createElement('div');
        slice.className = 'tgh__slice';
        slice.style.cssText =
          `left:${u((aspect - share) / 2)};width:${k === SLICES - 1 ? u(share) : `calc(${u(share)} + 1px)`};` +
          `height:${u(1)};transform:${turn((aspect / 2 - (k + 0.5) * share) * unit)}`;
        const img = document.createElement('img');
        img.alt = '';
        img.draggable = false;
        img.src = src;
        img.style.cssText = `left:${u(-k * share)};width:${u(aspect)};height:${u(1)}`;
        slice.append(img);
        tile.append(slice);
      }
      tile.addEventListener('animationiteration', e => {
        if (e.target !== tile) return;
        // elapsedTime counts whole loops, missed events included.
        const next = Math.round(e.elapsedTime / duration) * columns + first;
        if (shown[t] === next) return;
        shown[t] = cur = next;
        tile.querySelectorAll('img').forEach(i => { i.src = pic(next); });
      });
      // The band is aria-hidden; the list below holds the real links, so a click here just opens the same one.
      tile.addEventListener('click', () => window.open(links[cur % links.length].href, '_blank', 'noopener'));
      tiles.push(tile);
    }
    band.replaceChildren(...tiles);
    root.classList.add('is-ready');
  }

  // Fetch everything up front: a tile gets its next image just before it re-enters.
  images.forEach(s => { new Image().src = s; });

  new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    const l = measure(width, height);
    if (last && ['columns', 'sweep', 'unit', 'limit'].every(k => last[k] === l[k])) return;
    last = l;
    build(l);
  }).observe(root);

  // Off-screen: pause, so nothing animates unseen.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => root.classList.toggle('is-off', !e.isIntersecting)).observe(root);
  }
})();
