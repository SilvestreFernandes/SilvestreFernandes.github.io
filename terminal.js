// Types the hero terminal once, when it scrolls into view. The full text is already in the HTML,
// so without JS or with reduced motion it simply shows as written.
(function () {
  const term = document.querySelector('[data-term]');
  if (!term || matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

  const body = term.querySelector('.term__body');
  const lines = [...body.children].map(el => {
    const text = el.textContent;
    const typed = document.createElement('span');
    const rest = Object.assign(document.createElement('span'), { textContent: text });
    el.replaceChildren(typed, rest);
    el.style.visibility = 'hidden'; // keeps the box at full height, so nothing jumps
    return { el, text, typed, rest, cmd: el.classList.contains('term__cmd') };
  });

  // Screen readers get the whole text at once, not half-typed spans.
  body.setAttribute('aria-hidden', 'true');
  body.before(Object.assign(document.createElement('p'), {
    className: 'sr-only',
    textContent: lines.map(l => l.text).filter(Boolean).join('. '),
  }));

  const cur = Object.assign(document.createElement('i'), { className: 'term__cur' });
  const wait = ms => new Promise(r => setTimeout(r, ms));

  async function play() {
    for (const l of lines) {
      l.el.style.visibility = 'visible';
      l.typed.after(cur);
      if (l.cmd) {
        for (let i = 1; i <= l.text.length; i++) {
          l.typed.textContent = l.text.slice(0, i);
          l.rest.textContent = l.text.slice(i);
          await wait(45 + Math.random() * 40);
        }
        await wait(350);
      } else {
        l.typed.textContent = l.text;
        l.rest.textContent = '';
        await wait(260);
      }
    }
  }

  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    setTimeout(play, 500); // let the entrance fade finish first
  }, { threshold: 0.5 });
  io.observe(term);
})();
