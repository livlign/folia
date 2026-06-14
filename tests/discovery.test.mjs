import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  unseenIndices, unseenCount, percentSeen, retired,
  eligibleBooks, pickDiscovery, mergeSeen,
} from '../discovery.js';

const book = (id, n) => ({ id, paragraphs: Array.from({ length: n }, (_, i) => ({ id: `p${i}`, text: `t${i}` })) });
const seenOf = (...ids) => new Set(ids);

// rng that yields a fixed sequence of values in [0,1).
const seq = (values) => { let k = 0; return () => values[k++ % values.length]; };

test('unseenCount and percentSeen match the spec formulas', () => {
  const b = book('a', 4);
  const seen = seenOf('p0', 'p1');
  assert.equal(unseenCount(b, seen), 2);
  assert.equal(percentSeen(b, seen), 0.5);
});

test('retired flips exactly at 100%', () => {
  const b = book('a', 3);
  assert.equal(retired(b, seenOf('p0', 'p1')), false);
  assert.equal(retired(b, seenOf('p0', 'p1', 'p2')), true);
});

test('markSeen (mergeSeen) is idempotent', () => {
  const once = mergeSeen(seenOf('p0'), ['p1', 'p2']);
  const twice = mergeSeen(once, ['p1', 'p2']);
  assert.deepEqual([...once].sort(), [...twice].sort());
  assert.equal(twice.size, 3);
});

test('discovery returns only unseen paragraphs', () => {
  const b = book('a', 5);
  const seenMap = new Map([['a', seenOf('p0', 'p1', 'p2')]]);
  // unseen indices are [3,4]; rng picks book 0 then unseen[0]
  const pick = pickDiscovery([b], seenMap, seq([0, 0]));
  assert.equal(pick.startIndex, 3);
  assert.ok(!seenMap.get('a').has(b.paragraphs[pick.startIndex].id));
});

test('discovery only picks from books with unseen pages, never a retired book', () => {
  const retiredBook = book('done', 2);
  const liveBook = book('live', 2);
  const seenMap = new Map([['done', seenOf('p0', 'p1')], ['live', new Set()]]);
  assert.deepEqual(eligibleBooks([retiredBook, liveBook], seenMap).map((b) => b.id), ['live']);
  // even if rng would index past the retired book, only the live book is eligible
  for (const r of [0, 0.99]) {
    const pick = pickDiscovery([retiredBook, liveBook], seenMap, seq([r, 0]));
    assert.equal(pick.book.id, 'live');
  }
});

test('discovery returns null when nothing is eligible', () => {
  const b = book('a', 2);
  const seenMap = new Map([['a', seenOf('p0', 'p1')]]);
  assert.equal(pickDiscovery([b], seenMap, seq([0, 0])), null);
});
