// Scroll behaviour for the sections below the hero: entrances, rolling figures, the held project frame and the departure board.
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;

  // Rolling figures: the real number stays in the text for screen readers.
  const rolls = [...document.querySelectorAll('[data-roll]')];
  rolls.forEach(el => {
    const value = el.textContent.trim();
    const said = Object.assign(document.createElement('span'), { className: 'sr-only', textContent: value });
    const shown = Object.assign(document.createElement('span'), { className: 'roll__digits' });
    shown.setAttribute('aria-hidden', 'true');
    let i = 0;
    for (const ch of value) {
      if (!/\d/.test(ch)) { shown.append(ch); continue; }
      const col = Object.assign(document.createElement('span'), { className: 'roll__col' });
      const strip = Object.assign(document.createElement('span'), { className: 'roll__strip' });
      strip.style.setProperty('--d', ch);
      strip.style.setProperty('--i', i++);
      col.append(strip);
      shown.append(col);
    }
    el.classList.add('roll');
    el.replaceChildren(said, shown);
  });

  // Entrances, once each.
  const entering = document.querySelectorAll('[data-reveal], .lines, .shutter, .roll');
  if (!hasIO) {
    entering.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
    entering.forEach(el => io.observe(el));
  }

  // Calls pick(item) for the item crossing the middle of the screen, and on hover, focus or click.
  const follow = (items, pick) => {
    items.forEach(item => {
      const target = item.querySelector('button') || item;
      target.addEventListener('click', () => pick(item));
      target.addEventListener('focus', () => pick(item));
      if (matchMedia('(hover: hover) and (pointer: fine)').matches) target.addEventListener('pointerenter', () => pick(item));
    });
    if (!hasIO) return;
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) pick(e.target);
    }, { rootMargin: '-50% 0px -50% 0px' });
    items.forEach(item => io.observe(item));
  };

  // Projects: the held square shows the fragment of the name crossing it.
  const frags = [...document.querySelectorAll('.frag')];
  const works = [...document.querySelectorAll('.work__item[data-frag]')];
  const showWork = item => {
    works.forEach(w => w.classList.toggle('is-on', w === item));
    frags.forEach(f => f.classList.toggle('is-on', f.dataset.frag === item.dataset.frag));
  };
  // On a phone the names would cover the held square, so each project also gets its own copy under its name.
  works.forEach(item => {
    const frag = frags.find(f => f.dataset.frag === item.dataset.frag);
    if (!frag) return;
    const inline = Object.assign(document.createElement('div'), { className: 'work__inline' });
    inline.setAttribute('aria-hidden', 'true');
    const copy = frag.cloneNode(true);
    copy.classList.add('is-on');
    inline.append(copy);
    item.append(inline);
  });
  if (works.length) {
    showWork(works[0]);
    follow(works, showWork);
  }

  // Path: the departure board flips to the active step.
  const steps = [...document.querySelectorAll('.step')];
  const boardA = document.getElementById('board-a');
  const boardB = document.getElementById('board-b');
  const width = Math.max(...steps.flatMap(s => s.dataset.board.split('|').map(t => t.length)));
  let current = null;
  const flip = (el, text) => {
    el.replaceChildren();
    window.splitFlap(el, text.padEnd(width), { flipMs: 70, staggerMs: 28, flips: reduce ? 0 : 5 });
  };
  const showStep = step => {
    if (step === current) return;
    current = step;
    steps.forEach(s => {
      s.classList.toggle('is-on', s === step);
      s.querySelector('.step__head').setAttribute('aria-expanded', String(s === step));
    });
    const [a, b] = step.dataset.board.split('|');
    flip(boardA, a);
    flip(boardB, b);
  };
  if (steps.length && window.splitFlap) {
    showStep(steps[0]);
    follow(steps, showStep);
  }

  // Studio: the scroll scrubs the video and shows the beat that owns the current second.
  const studio = document.querySelector('.studio');
  if (studio && !reduce) {
    const video = studio.querySelector('video');
    const beats = [...studio.querySelectorAll('.studio__beat')];
    const duration = Number(video.dataset.duration);
    studio.classList.add('is-scrub');
    // The video is ~29 MB, so it only starts loading when the section is a screen away.
    // Played from memory: seeking then works even on servers without Range support, where Chrome refuses to seek.
    const load = () => {
      fetch(video.dataset.src)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); })
        .then(blob => { video.src = URL.createObjectURL(blob); })
        .catch(() => { video.src = video.dataset.src; });
    };
    if (hasIO) {
      const near = new IntersectionObserver(([e]) => { if (e.isIntersecting) { load(); near.disconnect(); } }, { rootMargin: '100% 0px' });
      near.observe(studio);
    } else load();
    let queued = false;
    const update = () => {
      queued = false;
      const box = studio.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -box.top / (box.height - innerHeight)));
      // The last tenth of the scroll holds the final frame.
      const t = Math.min(1, progress / 0.9) * duration;
      if (video.readyState >= 1 && !video.seeking && Math.abs(video.currentTime - t) > 0.02) video.currentTime = Math.min(t, duration - 0.05);
      const on = beats.findLast(b => t >= Number(b.dataset.from));
      beats.forEach(b => b.classList.toggle('is-on', b === on));
    };
    const ask = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener('scroll', ask, { passive: true });
    addEventListener('resize', ask);
    video.addEventListener('loadedmetadata', ask);
    video.addEventListener('seeked', ask);
    update();
  }
})();
