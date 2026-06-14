import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fill, paginate } from '../pagination.js';

// Fake measurer: a page "overflows" when the summed heights exceed capacity.
function fakeMeasurer(heights, capacity) {
  let used = 0;
  const stack = [];
  return {
    reset() { used = 0; stack.length = 0; },
    add(_item, i) { stack.push(heights[i]); used += heights[i]; },
    removeLast() { used -= stack.pop(); },
    overflows() { return used > capacity; },
  };
}

const items = (n) => Array.from({ length: n }, (_, i) => i);

test('a page never overflows the container', () => {
  const heights = [30, 30, 30, 30, 30, 30];
  const pages = paginate(items(6), fakeMeasurer(heights, 100)); // 3 per page
  for (const [s, e] of pages) {
    const sum = heights.slice(s, e + 1).reduce((a, b) => a + b, 0);
    assert.ok(sum <= 100 || s === e, `page ${s}..${e} sums ${sum}`);
  }
});

test('pages are contiguous and cover all paragraphs with no gaps or repeats', () => {
  const heights = [40, 25, 25, 90, 10, 10, 10];
  const pages = paginate(items(7), fakeMeasurer(heights, 100));
  assert.equal(pages[0][0], 0);
  assert.equal(pages[pages.length - 1][1], 6);
  for (let k = 1; k < pages.length; k++) {
    assert.equal(pages[k][0], pages[k - 1][1] + 1, 'no gap or overlap between pages');
  }
});

test('a paragraph taller than the container still gets its own page', () => {
  const heights = [200, 30, 30];
  const pages = paginate(items(3), fakeMeasurer(heights, 100));
  assert.deepEqual(pages[0], [0, 0]); // oversized para alone, never merged forward
});

test('fill places at least one paragraph even at the boundary', () => {
  const heights = [100, 100];
  assert.equal(fill(items(2), 0, fakeMeasurer(heights, 100)), 0);
});
