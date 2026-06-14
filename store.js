import { mergeSeen } from './discovery.js';

const DB_NAME = 'folia';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('books')) db.createObjectStore('books', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('seen')) db.createObjectStore('seen');
      if (!db.objectStoreNames.contains('commits')) db.createObjectStore('commits');
      if (!db.objectStoreNames.contains('config')) db.createObjectStore('config');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function reqAsync(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(name, mode, fn) {
  const db = await openDB();
  const t = db.transaction(name, mode);
  const out = await fn(t.objectStore(name));
  await new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
  return out;
}

export const getBook = (id) => withStore('books', 'readonly', (s) => reqAsync(s.get(id)));
export const putBook = (book) => withStore('books', 'readwrite', (s) => reqAsync(s.put(book)));
export const getAllBooks = () => withStore('books', 'readonly', (s) => reqAsync(s.getAll()));

export const getSeen = (id) =>
  withStore('seen', 'readonly', (s) => reqAsync(s.get(id))).then((v) => new Set(v || []));
export const setSeen = (id, ids) =>
  withStore('seen', 'readwrite', (s) => reqAsync(s.put([...ids], id)));

export const getCommits = (id) =>
  withStore('commits', 'readonly', (s) => reqAsync(s.get(id))).then((v) => v || 0);
export const setCommits = (id, n) =>
  withStore('commits', 'readwrite', (s) => reqAsync(s.put(n, id)));

export const getConfig = () =>
  withStore('config', 'readonly', (s) => reqAsync(s.get('config'))).then((v) => v || {});
export const setConfig = (cfg) =>
  withStore('config', 'readwrite', (s) => reqAsync(s.put(cfg, 'config')));

export async function markSeen(bookId, ids) {
  const merged = mergeSeen(await getSeen(bookId), ids);
  await setSeen(bookId, merged);
  return merged;
}

export async function incCommit(bookId) {
  const n = (await getCommits(bookId)) + 1;
  await setCommits(bookId, n);
  return n;
}
