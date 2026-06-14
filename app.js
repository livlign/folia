import * as store from './store.js';
import { HttpSource } from './source.js';
import { createLoop } from './reader.js';
import { applyTheme, getTheme } from './theme.js';

const app = () => document.getElementById('app');

function defaultBaseUrl() {
  return new URL('.', location.href).href;
}

async function getSource() {
  const cfg = await store.getConfig();
  return new HttpSource(cfg.sourceBaseUrl || defaultBaseUrl());
}

async function sync(source) {
  if (!navigator.onLine) return { skipped: true };
  let manifest;
  try {
    manifest = await source.loadManifest();
  } catch (err) {
    return { error: err };
  }
  const cached = new Map((await store.getAllBooks()).map((b) => [b.id, b]));
  let synced = 0;
  for (const entry of manifest) {
    const have = cached.get(entry.id);
    if (have && have.paragraphs && have.paragraphs.length === entry.paragraphCount) continue;
    try {
      await store.putBook(await source.loadBook(entry.id));
      synced += 1;
    } catch (err) {
      // keep any cached copy; a failed fetch must not blank the library
    }
  }
  return { synced, total: manifest.length };
}

async function loadMap(books, getter) {
  const map = new Map();
  await Promise.all(books.map(async (b) => map.set(b.id, await getter(b.id))));
  return map;
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

async function boot() {
  registerServiceWorker();
  applyTheme(getTheme());
  await sync(await getSource());
  const books = await store.getAllBooks();
  const seenMap = await loadMap(books, store.getSeen);
  const commits = await loadMap(books, store.getCommits);
  const loop = createLoop({
    mount: app(),
    books,
    seenMap,
    commits,
    rng: Math.random,
    persist: { markSeen: store.markSeen, incCommit: store.incCommit },
  });
  loop.start();
}

boot();
