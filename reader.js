import { fill, domMeasurer } from './pagination.js';
import { pickDiscovery } from './discovery.js';
import { buildReport, renderReport } from './report.js';

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
    const t = e.changedTouches[0];
    x0 = t.clientX; y0 = t.clientY; t0 = e.timeStamp;
  }, { passive: true });
  target.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    if (e.timeStamp - t0 < 600 && Math.hypot(dx, dy) > 50) handler(dx, dy);
  }, { passive: true });
}

export function createLoop(ctx) {
  const { mount, rng = Math.random } = ctx;

  function frame(header) {
    const content = el('section', { className: 'content' });
    const controls = el('nav', { className: 'controls' });
    const screen = el('div', { className: 'screen' }, header ? [header, content, controls] : [content, controls]);
    mount.replaceChildren(screen);
    return { screen, content, controls };
  }

  function markSeen(book, start, end) {
    const shown = book.paragraphs.slice(start, end + 1).map((p) => p.id);
    const set = ctx.seenMap.get(book.id) || new Set();
    shown.forEach((id) => set.add(id));
    ctx.seenMap.set(book.id, set);
    ctx.persist.markSeen(book.id, shown);
  }

  function toDiscovery() {
    const pick = pickDiscovery(ctx.books, ctx.seenMap, rng);
    const bar = el('header', { className: 'bar' }, [
      el('span', { className: 'wordmark' }, 'Folia'),
      el('button', { className: 'bar-link', onclick: toReport }, 'Progress'),
    ]);
    const { screen, content, controls } = frame(bar);
    if (!pick) {
      const msg = ctx.books.length
        ? "You've read everything in your library. Import more, push, and reopen."
        : 'Your shelf is empty. Import a book with the CLI, push it, and reopen.';
      content.append(el('p', { className: 'empty' }, msg));
      return;
    }
    const { book, startIndex } = pick;
    const end = fill(book.paragraphs, startIndex, domMeasurer(content, paraEl));
    markSeen(book, startIndex, end);
    controls.append(
      el('button', { className: 'btn ghost', onclick: toDiscovery }, 'Another'),
      el('button', { className: 'btn primary', onclick: () => toReading(book, startIndex) }, 'Read more'),
    );
    onSwipe(screen, (dx, dy) => { if (Math.abs(dy) >= Math.abs(dx)) toDiscovery(); });
  }

  function toReading(book, startIndex) {
    ctx.commits.set(book.id, (ctx.commits.get(book.id) || 0) + 1);
    ctx.persist.incCommit(book.id);
    renderPage(book, startIndex);
  }

  function toReport() {
    renderReport(mount, buildReport(ctx.books, ctx.seenMap, ctx.commits), toDiscovery);
  }

  function renderPage(book, start) {
    const { screen, content, controls } = frame();
    const end = fill(book.paragraphs, start, domMeasurer(content, paraEl));
    content.scrollTop = 0;
    markSeen(book, start, end);
    const atEnd = end >= book.paragraphs.length - 1;
    controls.append(
      el('button', { className: 'btn ghost', onclick: toDiscovery }, '← Discover'),
      el('button', {
        className: 'btn primary',
        onclick: atEnd ? toDiscovery : () => renderPage(book, end + 1),
      }, atEnd ? 'Finish' : 'Next'),
    );
    onSwipe(screen, (dx, dy) => { if (dx > Math.abs(dy)) toDiscovery(); });
  }

  return { toDiscovery, toReading };
}
