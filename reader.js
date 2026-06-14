import { fill, domMeasurer } from './pagination.js';
import { pickDiscovery } from './discovery.js';
import { buildReport, renderReport } from './report.js';

const CHUNK = 16; // paragraphs appended per scroll load-more while reading

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) {
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}

const paraEl = (p) => el('p', { className: 'para' }, p.text);

export function createLoop(ctx) {
  const { mount, rng = Math.random } = ctx;

  // ---- batched persistence of seen paragraphs ----
  let pending = new Set();
  let pendingBook = null;
  let flushTimer = null;
  function flushSeen() {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (!pending.size || !pendingBook) return;
    ctx.persist.markSeen(pendingBook, [...pending]);
    pending = new Set();
  }
  function see(book, idx) {
    const id = book.paragraphs[idx].id;
    const set = ctx.seenMap.get(book.id) || new Set();
    if (set.has(id)) return;
    set.add(id); ctx.seenMap.set(book.id, set);
    pendingBook = book.id; pending.add(id);
    if (!flushTimer) flushTimer = setTimeout(flushSeen, 600);
  }

  // ---- animated screen swap ----
  function transitionTo(render) {
    const current = mount.querySelector('.screen');
    if (!current) { render(); return; }
    flushSeen();
    current.classList.add('leaving');
    let done = false;
    const finish = () => { if (done) return; done = true; render(); };
    current.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, 240);
  }
  function mountScreen(screen) {
    screen.classList.add('entering');
    mount.replaceChildren(screen);
    requestAnimationFrame(() => screen.classList.remove('entering'));
  }

  function header(book, start, total, leftBtn) {
    const pct = el('span', { className: 'bar-pct' }, Math.round(((start + 1) / total) * 100) + '%');
    const right = [
      pct,
      el('button', { className: 'bar-btn', title: 'Progress', onclick: toReport }, '≡'),
    ];
    if (!leftBtn) right.push(el('button', { className: 'bar-btn', title: 'Another page', onclick: shuffle }, '↻'));
    const bar = el('header', { className: 'bar' }, [
      leftBtn || el('span', {}, ''),
      el('span', { className: 'bar-title' }, book.title),
      ...right,
    ]);
    return { bar, pct };
  }

  // ---- navigation ----
  function shuffle() { transitionTo(toDiscovery); }

  function toReport() {
    transitionTo(() => {
      renderReport(mount, buildReport(ctx.books, ctx.seenMap, ctx.commits), shuffle);
      const screen = mount.querySelector('.screen');
      screen.classList.add('entering');
      requestAnimationFrame(() => screen.classList.remove('entering'));
    });
  }

  function toDiscovery() {
    const pick = pickDiscovery(ctx.books, ctx.seenMap, rng);
    if (!pick) return renderEmpty();
    renderDiscovery(pick.book, pick.startIndex);
  }

  function renderEmpty() {
    const msg = ctx.books.length
      ? "You've read everything in your library. Import more, push, and reopen."
      : 'Your shelf is empty. Import a book with the CLI, push it, and reopen.';
    mountScreen(el('div', { className: 'screen' }, [
      el('section', { className: 'content' }, el('p', { className: 'empty' }, msg)),
    ]));
  }

  // ---- DISCOVERY: one random page; swipe/scroll jumps to another; tap reads ----
  function renderDiscovery(book, start) {
    const total = book.paragraphs.length;
    const { bar } = header(book, start, total, null);
    const content = el('section', { className: 'content' });
    const hint = el('div', { className: 'hint' }, 'Tap to read · swipe for another');
    const screen = el('div', { className: 'screen' }, [bar, content, hint]);
    mountScreen(screen);

    const end = fill(book.paragraphs, start, domMeasurer(content, paraEl));
    for (let i = start; i <= end; i++) see(book, i);

    let swiped = false;
    content.addEventListener('click', () => {
      if (swiped) { swiped = false; return; }
      enterReading(book, start);
    });
    let x0 = 0, y0 = 0, t0 = 0;
    content.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0]; x0 = t.clientX; y0 = t.clientY; t0 = e.timeStamp;
    }, { passive: true });
    content.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      if (e.timeStamp - t0 < 700 && Math.hypot(t.clientX - x0, t.clientY - y0) > 45) {
        swiped = true; shuffle();
      }
    }, { passive: true });
    let wheelLock = false;
    content.addEventListener('wheel', (e) => {
      if (wheelLock || Math.abs(e.deltaY) < 8) return;
      wheelLock = true; setTimeout(() => { wheelLock = false; }, 500);
      shuffle();
    }, { passive: true });
  }

  // ---- READING: continuous scroll-to-load-more within the book ----
  function enterReading(book, start) {
    ctx.persist.incCommit(book.id);
    ctx.commits.set(book.id, (ctx.commits.get(book.id) || 0) + 1);
    transitionTo(() => renderReading(book, start));
  }

  function renderReading(book, start) {
    const total = book.paragraphs.length;
    const back = el('button', { className: 'bar-btn', title: 'Discover', onclick: shuffle }, '←');
    const { bar, pct } = header(book, start, total, back);
    const progress = el('div', { className: 'progress' });
    const content = el('section', { className: 'content reading' });
    const screen = el('div', { className: 'screen' }, [bar, progress, content]);
    mountScreen(screen);

    let maxIdx = start;
    const setPosition = (i) => {
      maxIdx = Math.max(maxIdx, i);
      const p = Math.round(((maxIdx + 1) / total) * 100);
      pct.textContent = p + '%';
      progress.style.width = p + '%';
    };

    const seenObserver = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const i = Number(e.target.dataset.idx);
          see(book, i); setPosition(i);
          seenObserver.unobserve(e.target);
        }
      }
    }, { root: content });

    const end = fill(book.paragraphs, start, domMeasurer(content, paraEl));
    let loadedEnd = end;
    [...content.children].forEach((node, k) => { node.dataset.idx = start + k; seenObserver.observe(node); });
    setPosition(start);
    progress.style.width = Math.round(((start + 1) / total) * 100) + '%';

    const sentinel = el('div', { className: 'sentinel' });
    content.append(sentinel);
    const loadObserver = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      const from = loadedEnd + 1;
      const to = Math.min(total - 1, loadedEnd + CHUNK);
      for (let i = from; i <= to; i++) {
        const node = paraEl(book.paragraphs[i]); node.dataset.idx = i;
        content.insertBefore(node, sentinel); seenObserver.observe(node);
      }
      loadedEnd = to;
      if (loadedEnd >= total - 1) {
        loadObserver.disconnect();
        sentinel.replaceWith(el('div', { className: 'book-end' }, '· end ·'));
      }
    }, { root: content, rootMargin: '300px' });
    if (loadedEnd < total - 1) loadObserver.observe(sentinel);
  }

  window.addEventListener('pagehide', flushSeen);
  return { toDiscovery };
}
