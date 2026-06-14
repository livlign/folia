// Pure seen-state and discovery logic. No DOM, no storage — books and seen-sets
// are passed in, so this is testable in isolation and reused by reader/report.

export function unseenIndices(book, seen) {
  const out = [];
  book.paragraphs.forEach((p, i) => { if (!seen.has(p.id)) out.push(i); });
  return out;
}

export function unseenCount(book, seen) {
  return unseenIndices(book, seen).length;
}

export function percentSeen(book, seen) {
  const total = book.paragraphs.length;
  return total ? (total - unseenCount(book, seen)) / total : 0;
}

export function retired(book, seen) {
  return unseenCount(book, seen) === 0;
}

export function eligibleBooks(books, seenMap) {
  return books.filter((b) => unseenCount(b, seenMap.get(b.id) || new Set()) > 0);
}

// Uniform over eligible books, then uniform over that book's unseen paragraphs
// (books weigh equally regardless of length). Returns null when nothing is eligible.
export function pickDiscovery(books, seenMap, rng = Math.random) {
  const eligible = eligibleBooks(books, seenMap);
  if (!eligible.length) return null;
  const book = eligible[Math.floor(rng() * eligible.length)];
  const unseen = unseenIndices(book, seenMap.get(book.id) || new Set());
  const startIndex = unseen[Math.floor(rng() * unseen.length)];
  return { book, startIndex };
}

export function mergeSeen(seen, ids) {
  const next = new Set(seen);
  for (const id of ids) next.add(id);
  return next;
}
