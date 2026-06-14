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
