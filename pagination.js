// Paginate at render: fill a page from startIndex until the next item would
// overflow the container. `measurer` abstracts the container so the algorithm
// is the same in the browser (DOM) and under test (fake heights).
export function fill(items, startIndex, measurer) {
  measurer.reset();
  let i = startIndex;
  for (; i < items.length; i++) {
    measurer.add(items[i], i);
    if (i > startIndex && measurer.overflows()) {
      measurer.removeLast();
      break;
    }
  }
  return i - 1;
}

export function paginate(items, measurer) {
  const pages = [];
  for (let start = 0; start < items.length; ) {
    const end = fill(items, start, measurer);
    pages.push([start, end]);
    start = end + 1;
  }
  return pages;
}

// Browser measurer: adding renders the item into the live container; overflow
// is read from the real layout. After fill() the container holds exactly the page.
export function domMeasurer(container, renderItem) {
  const nodes = [];
  return {
    reset() { container.replaceChildren(); nodes.length = 0; },
    add(item) { const n = renderItem(item); container.append(n); nodes.push(n); },
    removeLast() { const n = nodes.pop(); if (n) n.remove(); },
    overflows() { return container.scrollHeight > container.clientHeight; },
  };
}
