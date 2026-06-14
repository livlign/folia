import { fill, domMeasurer } from './pagination.js';
import { pickDiscovery } from './discovery.js';
import { buildReport, renderReport } from './report.js';

const CHUNK = 16; // paragraphs appended per scroll load-more

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) {
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}

const paraEl = (p) => el('p', { className: 'para' }, p.text);

function onSwipe(target, handler) {
  let x0 = 0, y0 = 0, t0 = 0;
  target.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0]; x0 = t.clientX; y0 = t.clientY; t0 = e.timeStamp;
  }, { passive: true });
  target.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    if (e.timeStamp - t0 < 600 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) handler();
  }, { passive: true });
}

export function createLoop(ctx) {
  const { mount, rng = Math.random } = ctx;

  // batched persistence of seen paragraphs
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

  // animated swap between screens
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

  function shuffle() { transitionTo(toDiscovery); }

  function toReport() {
    transitionTo(() => {
      renderReport(mount, buildReport(ctx.books, ctx.seenMap, ctx.commits), () => transitionTo(toDiscovery));
      const screen = mount.querySelector('.screen');
      screen.classList.add('entering');
      requestAnimationFrame(() => screen.classList.remove('entering'));
    });
  }

  function toDiscovery() {
    const pick = pickDiscovery(ctx.books, ctx.seenMap, rng);
    if (!pick) return renderEmpty();
    openAt(pick.book, pick.startIndex);
  }

  function renderEmpty() {
    const msg = ctx.books.length
      ? "You've read everything in your library. Import more, push, and reopen."
      : 'Your shelf is empty. Import a book with the CLI, push it, and reopen.';
    const screen = el('div', { className: 'screen entering' }, [
      el('section', { className: 'content' }, el('p', { className: 'empty' }, msg)),
    ]);
    mount.replaceChildren(screen);
    requestAnimationFrame(() => screen.classList.remove('entering'));
  }

  function openAt(book, start) {
    const total = book.paragraphs.length;
    const title = el('span', { className: 'bar-title' }, book.title);
    const pct = el('span', { className: 'bar-pct' });
    const bar = el('header', { className: 'bar' }, [
      title, pct,
      el('button', { className: 'bar-btn', title: 'Progress', onclick: toReport }, '≡'),
      el('button', { className: 'bar-btn', title: 'Another page', onclick: shuffle }, '↻'),
    ]);
    const progress = el('div', { className: 'progress' });
    const content = el('section', { className: 'content reading' });
    const screen = el('div', { className: 'screen entering' }, [bar, progress, content]);
    mount.replaceChildren(screen);
    requestAnimationFrame(() => screen.classList.remove('entering'));

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

    // initial screenful via paginate-at-render
    const end = fill(book.paragraphs, start, domMeasurer(content, paraEl));
    let loadedEnd = end;
    [...content.children].forEach((node, k) => { node.dataset.idx = start + k; seenObserver.observe(node); });
    setPosition(start);

    const sentinel = el('div', { className: 'sentinel' });
    content.append(sentinel);

    let committed = false;
    const loadObserver = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      if (!committed) { committed = true; ctx.persist.incCommit(book.id); }
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

    onSwipe(screen, shuffle);
  }

  window.addEventListener('pagehide', flushSeen);
  return { toDiscovery };
}
