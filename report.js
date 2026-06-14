import { percentSeen } from './discovery.js';

export function buildReport(books, seenMap, commits) {
  return books
    .map((b) => ({
      id: b.id,
      title: b.title,
      total: b.paragraphs.length,
      percent: Math.round(percentSeen(b, seenMap.get(b.id) || new Set()) * 100),
      commits: commits.get(b.id) || 0,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) {
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}

export function renderReport(mount, rows, onBack) {
  const list = el('ul', { className: 'report-list' });
  if (!rows.length) {
    list.append(el('li', { className: 'empty' }, 'Nothing imported yet.'));
  }
  for (const r of rows) {
    list.append(el('li', { className: 'report-row' }, [
      el('span', { className: 'report-title' }, r.title),
      el('span', { className: 'report-stat' }, `${r.percent}% read · ${r.commits} ${r.commits === 1 ? 'read' : 'reads'}`),
    ]));
  }
  const bar = el('header', { className: 'bar' }, [
    el('span', { className: 'wordmark' }, 'Progress'),
    el('button', { className: 'bar-link', onclick: onBack }, 'Done'),
  ]);
  const content = el('section', { className: 'content report' }, list);
  mount.replaceChildren(el('div', { className: 'screen' }, [bar, content]));
}
