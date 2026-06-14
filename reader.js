import { fill, domMeasurer } from './pagination.js';
import { pickDiscovery } from './discovery.js';
import { buildReport } from './report.js';
import { THEMES, getTheme, setTheme } from './theme.js';
import { FONTS, WEIGHTS, STYLES, SIZES, getType, setType } from './typography.js';
import { canInstall, isStandalone, promptInstall } from './install.js';

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

  function header(book, start, total, { left, shuffleBtn }) {
    const pct = el('span', { className: 'bar-pct' }, Math.round(((start + 1) / total) * 100) + '%');
    const right = [pct, el('button', { className: 'bar-btn', title: 'Progress', onclick: openSettings }, '≡')];
    if (shuffleBtn) right.push(el('button', { className: 'bar-btn', title: 'Another page', onclick: reroll }, '↻'));
    const bar = el('header', { className: 'bar' }, [
      left || el('span', {}, ''),
      el('span', { className: 'bar-title' }, book.title),
      ...right,
    ]);
    return { bar, pct };
  }

  // ---- navigation (history-backed, so Android back/edge-swipe maps to in-app back) ----
  function reroll() { history.replaceState({ view: 'discovery' }, ''); transitionTo(toDiscovery); }
  function goBack() { history.back(); }

  function themePicker() {
    const wrap = el('div', { className: 'themes' });
    const sync = () => wrap.querySelectorAll('.theme-chip').forEach((c) =>
      c.classList.toggle('active', c.dataset.theme === getTheme()));
    THEMES.forEach((t) => {
      const swatch = el('span', { className: 'sw' });
      swatch.style.background = `linear-gradient(135deg, ${t.swatch} 0 50%, ${t.accent} 50% 100%)`;
      const chip = el('button', { className: 'theme-chip',
        onclick: () => { setTheme(t.id); sync(); } }, [swatch, el('span', {}, t.name)]);
      chip.dataset.theme = t.id;
      wrap.append(chip);
    });
    sync();
    return wrap;
  }

  // shared chooser for font / weight / style; `face` renders each chip in its own typeface
  function chipGroup(items, current, onPick, { face } = {}) {
    const wrap = el('div', { className: 'chips' });
    const sync = () => wrap.querySelectorAll('.chip').forEach((c) =>
      c.classList.toggle('active', c.dataset.id === current()));
    items.forEach((it) => {
      const chip = el('button', { className: 'chip',
        onclick: () => { onPick(it.id); sync(); } }, it.name);
      chip.dataset.id = it.id;
      if (face) chip.style.fontFamily = it.stack;
      wrap.append(chip);
    });
    sync();
    return wrap;
  }

  function typeControls() {
    const preview = el('p', { className: 'type-preview' },
      'A leaf, read one page at a time, then carried off by the wind.');
    return [
      el('h2', { className: 'sec' }, 'Reading font'),
      chipGroup(FONTS, () => getType().font, (id) => setType({ font: id }), { face: true }),
      el('h2', { className: 'sec' }, 'Weight'),
      chipGroup(WEIGHTS, () => getType().weight, (id) => setType({ weight: id })),
      el('h2', { className: 'sec' }, 'Style'),
      chipGroup(STYLES, () => getType().style, (id) => setType({ style: id })),
      el('h2', { className: 'sec' }, 'Size'),
      chipGroup(SIZES, () => getType().size, (id) => setType({ size: id })),
      preview,
    ];
  }

  // Wipe persisted progress, then mirror the reset into the in-memory state so
  // the report and discovery reflect it without a reload. Cancels any pending
  // seen-flush so it can't re-write cleared ids.
  async function resetProgress() {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    pending = new Set();
    pendingBook = null;
    await ctx.persist.clearProgress();
    ctx.seenMap.clear();
    ctx.commits.clear();
  }

  function resetSection() {
    const wrap = el('div', { className: 'danger' });
    const arm = el('button', { className: 'danger-btn', type: 'button' }, 'Reset reading progress');
    arm.onclick = () => wrap.replaceChildren(confirmPanel(wrap));
    wrap.append(arm);
    return wrap;
  }

  function confirmPanel(wrap) {
    const WORD = 'RESET';
    const msg = el('p', { className: 'danger-msg' },
      `This permanently erases every book's read progress and counts. It can't be undone. Type ${WORD} to confirm.`);
    const input = el('input', { className: 'danger-input', type: 'text',
      placeholder: WORD, autocapitalize: 'characters', autocorrect: 'off', spellcheck: false });
    const go = el('button', { className: 'danger-btn', type: 'button', disabled: true }, 'Erase');
    const cancel = el('button', { className: 'bar-link', type: 'button',
      onclick: () => wrap.replaceChildren(resetSection().firstChild) }, 'Cancel');
    input.oninput = () => { go.disabled = input.value.trim().toUpperCase() !== WORD; };
    go.onclick = async () => {
      go.disabled = true; go.textContent = 'Erasing…';
      await resetProgress();
      renderSettings();
    };
    requestAnimationFrame(() => input.focus());
    return el('div', { className: 'danger-confirm' }, [msg, el('div', { className: 'danger-row' }, [input, go, cancel])]);
  }

  function installSection() {
    const wrap = el('div', { className: 'install' });
    if (isStandalone()) {
      wrap.append(el('p', { className: 'install-note' }, 'Folia is installed — open it from your home screen.'));
    } else if (canInstall()) {
      const status = el('span', { className: 'install-note' });
      const btn = el('button', { className: 'install-btn', type: 'button' }, 'Install Folia');
      btn.onclick = async () => {
        btn.disabled = true;
        const outcome = await promptInstall();
        if (outcome === 'accepted') { btn.remove(); status.textContent = 'Installing… check your home screen.'; }
        else { btn.disabled = false; status.textContent = outcome === 'dismissed' ? 'Install dismissed.' : ''; }
      };
      wrap.append(btn, status);
    } else {
      wrap.append(el('p', { className: 'install-note' },
        'To install, open Folia in Chrome and choose menu ⋮ → “Install app”. On iPhone, use Share → “Add to Home Screen”. If nothing happens, your launcher may need to allow home-screen shortcuts.'));
    }
    return wrap;
  }

  function renderSettings() {
    const bar = el('header', { className: 'bar' }, [
      el('span', { className: 'wordmark' }, 'Folia'),
      el('span', { className: 'bar-spacer' }),
      el('button', { className: 'done', onclick: goBack }, 'Done'),
    ]);
    const content = el('section', { className: 'content settings' });
    if (!isStandalone()) content.append(el('h2', { className: 'sec' }, 'Install'), installSection());
    content.append(el('h2', { className: 'sec' }, 'Theme'), themePicker());
    content.append(...typeControls());
    content.append(el('h2', { className: 'sec' }, 'Progress'));
    const list = el('ul', { className: 'report-list' });
    const rows = buildReport(ctx.books, ctx.seenMap, ctx.commits);
    if (!rows.length) list.append(el('li', { className: 'empty' }, 'Nothing imported yet.'));
    for (const r of rows) {
      list.append(el('li', { className: 'report-row' }, [
        el('span', { className: 'report-title' }, r.title),
        el('span', { className: 'report-stat' }, `${r.percent}% read · ${r.commits} ${r.commits === 1 ? 'read' : 'reads'}`),
      ]));
    }
    content.append(list);
    content.append(el('h2', { className: 'sec' }, 'Reset'), resetSection());
    mountScreen(el('div', { className: 'screen' }, [bar, content]));
  }
  function openSettings() { history.pushState({ view: 'settings' }, ''); transitionTo(renderSettings); }

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
    const pill = el('span', { className: 'mode-pill' }, 'Discover');
    const { bar } = header(book, start, total, { left: pill, shuffleBtn: true });
    const content = el('section', { className: 'content' });
    const hint = el('div', { className: 'hint' }, 'Tap to read · swipe for another');
    const screen = el('div', { className: 'screen discover' }, [bar, content, hint]);
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
        swiped = true; reroll();
      }
    }, { passive: true });
    let wheelLock = false;
    content.addEventListener('wheel', (e) => {
      if (wheelLock || Math.abs(e.deltaY) < 8) return;
      wheelLock = true; setTimeout(() => { wheelLock = false; }, 500);
      reroll();
    }, { passive: true });
  }

  // ---- READING: continuous scroll-to-load-more within the book ----
  function enterReading(book, start) {
    ctx.persist.incCommit(book.id);
    ctx.commits.set(book.id, (ctx.commits.get(book.id) || 0) + 1);
    history.pushState({ view: 'reading', id: book.id, start }, '');
    transitionTo(() => renderReading(book, start));
  }

  function renderReading(book, start) {
    const total = book.paragraphs.length;
    const back = el('button', { className: 'bar-btn', title: 'Discover', onclick: goBack }, '←');
    const { bar, pct } = header(book, start, total, { left: back, shuffleBtn: false });
    const progress = el('div', { className: 'progress' });
    const content = el('section', { className: 'content reading' });
    const screen = el('div', { className: 'screen read' }, [bar, progress, content]);
    mountScreen(screen);

    // left-swipe returns to discovery (mirrors the Android back gesture)
    let sx = 0, sy = 0, st = 0;
    content.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; st = e.timeStamp;
    }, { passive: true });
    content.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (e.timeStamp - st < 600 && dx < -55 && Math.abs(dx) > Math.abs(dy) * 2) goBack();
    }, { passive: true });

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
    let loadedStart = start;
    let loadedEnd = end;
    [...content.children].forEach((node, k) => { node.dataset.idx = start + k; seenObserver.observe(node); });
    setPosition(start);

    const topSentinel = el('div', { className: 'sentinel' });
    const botSentinel = el('div', { className: 'sentinel' });
    content.insertBefore(topSentinel, content.firstChild);
    content.append(botSentinel);

    // scroll up loads the preceding context, preserving the reading position
    const topObserver = new IntersectionObserver(() => {
      if (loadedStart <= 0) return;
      const from = Math.max(0, loadedStart - CHUNK);
      const before = content.scrollHeight;
      const anchor = topSentinel.nextSibling;
      for (let i = from; i < loadedStart; i++) {
        const node = paraEl(book.paragraphs[i]); node.dataset.idx = i;
        content.insertBefore(node, anchor); seenObserver.observe(node);
      }
      content.scrollTop += content.scrollHeight - before;
      loadedStart = from;
      if (loadedStart === 0) {
        topObserver.disconnect();
        topSentinel.replaceWith(el('div', { className: 'book-end' }, '· beginning ·'));
      }
    }, { root: content, rootMargin: '400px' });

    // scroll down continues the book
    const botObserver = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      const to = Math.min(total - 1, loadedEnd + CHUNK);
      for (let i = loadedEnd + 1; i <= to; i++) {
        const node = paraEl(book.paragraphs[i]); node.dataset.idx = i;
        content.insertBefore(node, botSentinel); seenObserver.observe(node);
      }
      loadedEnd = to;
      if (loadedEnd >= total - 1) {
        botObserver.disconnect();
        botSentinel.replaceWith(el('div', { className: 'book-end' }, '· end ·'));
      }
    }, { root: content, rootMargin: '400px' });

    // seed some preceding context so the landing sits mid-page (scroll up to read above)
    if (loadedStart > 0) {
      const from = Math.max(0, loadedStart - CHUNK);
      for (let i = from; i < loadedStart; i++) {
        const node = paraEl(book.paragraphs[i]); node.dataset.idx = i;
        content.insertBefore(node, topSentinel.nextSibling); seenObserver.observe(node);
      }
      const seeded = loadedStart - from;
      loadedStart = from;
      requestAnimationFrame(() => {
        let h = 0, n = topSentinel.nextSibling;
        for (let k = 0; k < seeded && n; k++) { h += n.offsetHeight; n = n.nextSibling; }
        content.scrollTop = Math.max(0, h - 56); // landing near top, a peek of context above
        if (loadedStart === 0) { topObserver.disconnect(); topSentinel.replaceWith(el('div', { className: 'book-end' }, '· beginning ·')); }
        else topObserver.observe(topSentinel);
      });
    } else {
      topSentinel.replaceWith(el('div', { className: 'book-end' }, '· beginning ·'));
    }
    if (loadedEnd < total - 1) botObserver.observe(botSentinel);
    else botSentinel.replaceWith(el('div', { className: 'book-end' }, '· end ·'));
  }

  // System back (Android gesture/button) and forward replay route here.
  window.addEventListener('popstate', (e) => {
    const s = e.state || { view: 'discovery' };
    if (s.view === 'reading') {
      const book = ctx.books.find((b) => b.id === s.id);
      transitionTo(book ? () => renderReading(book, s.start) : toDiscovery);
    } else if (s.view === 'settings') {
      transitionTo(renderSettings);
    } else {
      transitionTo(toDiscovery);
    }
  });
  window.addEventListener('pagehide', flushSeen);

  function start() {
    history.replaceState({ view: 'discovery' }, '');
    toDiscovery();
  }
  return { start };
}
