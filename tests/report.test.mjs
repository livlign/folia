import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReport } from '../report.js';

const book = (id, title, n) => ({ id, title, paragraphs: Array.from({ length: n }, (_, i) => ({ id: `p${i}`, text: '' })) });

test('report shows correct % seen and commit counts', () => {
  const books = [book('a', 'Alpha', 4), book('b', 'Beta', 10)];
  const seenMap = new Map([
    ['a', new Set(['p0', 'p1', 'p2'])], // 3/4 = 75%
    ['b', new Set(['p0'])],             // 1/10 = 10%
  ]);
  const commits = new Map([['a', 2]]); // b has none
  const rows = buildReport(books, seenMap, commits);
  assert.deepEqual(rows, [
    { id: 'a', title: 'Alpha', total: 4, percent: 75, commits: 2 },
    { id: 'b', title: 'Beta', total: 10, percent: 10, commits: 0 },
  ]);
});

test('report rows are sorted by title', () => {
  const books = [book('z', 'Zed', 1), book('a', 'Able', 1)];
  const rows = buildReport(books, new Map(), new Map());
  assert.deepEqual(rows.map((r) => r.title), ['Able', 'Zed']);
});
