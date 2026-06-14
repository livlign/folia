# Folia — Build Spec (v1)

Implementation-ready companion to the PRD. Read the PRD for *why*; this is *how*, in build order.

## 1. Architecture

Two halves with opposite requirements:

- **Import** — local Python CLI (PyMuPDF). Slow/messy work, runs at a desk a few times.
- **Reader** — buildless vanilla-JS PWA, served by GitHub Pages, fully offline after first load.

Bridge: static JSON committed into the repo, served by Pages. No backend, no accounts, no sync.

**Tech choices (and why):**
- CLI: Python 3 + PyMuPDF (`fitz`). Best PDF text extraction with positional data needed for header/footer detection.
- Reader: vanilla JS, no bundler, no framework. The logic is modest; buildless deploys to Pages by committing files and matches the lowest-friction path. A framework is a later option that does not change any contract here.
- Storage: IndexedDB (book cache + seen-state); Cache API via service worker (app shell).

## 2. Repo layout

```
folia/
  cli/
    folia.py            entry: add | list | remove
    extract.py          fitz -> positioned blocks
    clean.py            de-hyphenate, strip headers/footers
    segment.py          blocks -> ordered paragraphs
    emit.py             write book json + manifest
    tests/
  books/                committed, served by Pages
    books.json
    <id>.json
  index.html
  app.js                bootstrap, sync
  source.js             Source adapter (HTTP/Pages)
  store.js              IndexedDB
  discovery.js          random-unseen picker
  reader.js             sequential read + read-more
  pagination.js         paginate-at-render
  report.js             %seen + commit list
  sw.js                 service worker (app shell cache)
  manifest.webmanifest
  styles.css
  CLAUDE.md
  README.md
```

GitHub Pages: deploy from `main` root. Fetch base `https://<user>.github.io/folia/`; manifest at `books/books.json`.

## 3. Data contracts

**Book JSON** `books/<id>.json`:
```json
{ "id": "atomic-habits", "title": "Atomic Habits",
  "paragraphs": [ { "id": "p0001", "text": "..." }, { "id": "p0002", "text": "..." } ] }
```

**Manifest** `books/books.json`:
```json
{ "books": [ { "id": "atomic-habits", "title": "Atomic Habits", "paragraphCount": 1240 } ] }
```

**IndexedDB** (device-local, never committed):
- `books` — cached Book JSON, key `id`.
- `seen` — key `id`, value array of seen paragraph ids.
- `commits` — key `id`, value integer read-more count.
- `config` — `{ sourceBaseUrl }`.

## 4. CLI spec

Commands:
- `python folia.py add <pdf> --title "<title>" [--id <id>]`
- `python folia.py list`
- `python folia.py remove <id>`

`add` pipeline:
1. **extract** — `fitz.open(pdf)`, per page `page.get_text("dict")` → blocks with `bbox`, lines, spans. Keep text + position + page number.
2. **clean**
   - Header/footer strip: a block is a header/footer candidate if its bbox sits in the top or bottom margin band. Remove a candidate when its normalized text repeats across many pages, or matches a page-number pattern (bare number, `Page N`, `N | Title`).
   - De-hyphenate: join `prefix-` at line end with the next line's leading token when it forms a lowercase word.
   - Drop empty/whitespace blocks.
3. **segment** — merge lines into paragraphs (break on blank line, large vertical gap, or block boundary). Assign ids `p0001`, `p0002`, ... in reading order.
4. **preview (gate)** — print the first ~8 paragraphs plus a mid-book sample to the terminal. Prompt `accept / reject`. Reject → exit without writing.
5. **emit** — write `books/<id>.json`; upsert the entry in `books/books.json` (`paragraphCount` = paragraph count). `id` from `--id` or slug of title; ensure uniqueness.

Reading order note: multi-column pages need column-aware ordering (sort blocks by column then vertical). Single-column is the v1 happy path; the gate rejects books where order comes out wrong.

## 5. Reader spec

**Bootstrap (`app.js`)** on load: register SW; open IndexedDB; read `config.sourceBaseUrl` (settings field, default the Pages URL); run sync; show discovery.

**Sync (`source.js` + `store.js`)**: if online, `loadManifest()` → for each manifest book not cached, `loadBook(id)` → store. Offline → skip, use cache. Reading always from cache.

`Source` interface:
```
loadManifest() -> [{ id, title, paragraphCount }]
loadBook(id)   -> { id, title, paragraphs }
```
v1 implementation = HTTP GET against `sourceBaseUrl + 'books/...'`.

**Discovery (`discovery.js`)**:
```
eligible = books where unseenCount(book) > 0
if eligible empty -> empty state
book = uniformRandom(eligible)
para = uniformRandom(unseenParagraphs(book))
render one screenful starting at para; markSeen(book, shownParagraphIds)
```
Uniform over books then over that book's unseen paragraphs (books equal regardless of length). Reroll = repeat the pick. Affordance: scroll/swipe for reroll; a `read more` control to commit.

**Read-more (`reader.js`)**: `commits[book] += 1`; enter sequential reading at the snippet's start paragraph; paginate forward page by page; `markSeen` each page as shown; swipe-back → discovery (new random pick). Continues to book end or swipe-back.

**Pagination (`pagination.js`)** — paginate at render:
```
fill(containerHeight, paragraphs, startIndex):
  append paragraphs from startIndex into a measuring node
  until adding the next would exceed containerHeight
  return [startIndex .. lastFitIndex]   // one page
```
Next page starts at lastFitIndex + 1. Font fixed in v1 so a page is stable within a session.

**Seen-state**:
```
markSeen(bookId, ids): seen[bookId] = union(seen[bookId], ids); persist
unseenCount(book): book.paragraphs.length - seen[book.id].size
percentSeen(book): seen[book.id].size / book.paragraphs.length
retired(book): unseenCount(book) === 0   // excluded from eligible
```

**Report (`report.js`)**: list each book with title, % seen, commit count. Static, read-only.

**Service worker (`sw.js`)**: cache app shell (html/js/css/manifest) for offline launch. Book JSON lives in IndexedDB, not the SW cache.

## 6. Build phases & acceptance

**Phase 1 — CLI (the only genuinely new thing).**
Done when: a clean single-column non-fiction PDF produces paragraph JSON with headers/footers/page-numbers removed, hyphenated line-breaks rejoined, paragraphs in reading order; the preview reads comfortably; `books.json` updated.

**Phase 2 — PWA shell + sync.**
Done when: installs to the Android home screen; launches offline; fetches manifest from Pages and caches books in IndexedDB; cached books survive reload and airplane mode.

**Phase 3 — the loop.**
Done when: open shows a random unseen page; reroll yields a different unseen page; read-more enters sequential reading and paginates forward comfortably; swipe-back returns to a fresh random discovery; seen-state persists across reloads.

**Phase 4 — report + retire.**
Done when: report shows correct % seen and commit counts; a fully-seen book disappears from discovery; with no eligible books the empty state shows.

**Phase 5 — non-code.**
Move Facebook out of its slot, place Folia there. Run for a week, check Digital Wellbeing.

## 7. Testing (against spec, not implementation)

Pure-function logic, tested in isolation, order-independent:
- **CLI:** de-hyphenation rejoins split words and leaves real hyphenated words intact; a block repeating across pages in the margin band is stripped; bare page numbers and `N | Title` lines removed; paragraph segmentation breaks on gaps not mid-sentence. Use small fixture inputs (sample block dicts / tiny PDFs).
- **Discovery picker:** returns only unseen paragraphs; only from books with unseen pages; never returns a retired book.
- **Seen-state:** markSeen is idempotent; unseenCount and percentSeen match the spec formulas; retired flips exactly at 100%.
- **Pagination:** a page never overflows the container; pages are contiguous and cover all paragraphs with no gaps or repeats.

Do not assert internal call counts or current behavior — assert the rules above. No arbitrary sleeps in any async test; await real conditions.

## 8. Explicitly out of scope (do not build in v1)

Server-side extraction; authed/private sources; EPUB or non-PDF formats; adaptive/personalized discovery; notifications; widgets; accounts; cross-device sync; font-size control; multi-user BYO-source framing.
