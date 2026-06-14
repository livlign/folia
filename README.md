# Folia

**Live:** <https://folia-erf.pages.dev>

A personal reading app for the idle-moment reflex slot. Open it where Facebook
used to be: it shows one screenful of a curated non-fiction book, picked at
random from pages you haven't seen. Not intrigued — reroll. Intrigued — read on,
sequentially. Every committed read has a natural end; the library is finite and
curated by hand. See [`folia-prd.md`](folia-prd.md) for the *why* and
[`folia-build-spec.md`](folia-build-spec.md) for the *how*.

This is a personal project for reading my own books on my own device. It ships
no content. It is not a multi-user platform or a general book pipeline.

## Two halves

- **Import** — a local Python CLI (`cli/`) that extracts a PDF into clean,
  reflowable paragraph JSON. Run at a desk, a few times.
- **Reader** — a buildless vanilla-JS PWA: IndexedDB, a service worker, offline
  after first load. Deployed to Cloudflare Pages.

The only contract between them is the JSON in the library (`books/`).

## CLI

Requires Python 3 and [PyMuPDF](https://pymupdf.readthedocs.io/) (`fitz`).

```sh
python3 -m venv .venv
.venv/bin/pip install PyMuPDF
```

```sh
python cli/folia.py add path/to/book.pdf --title "Atomic Habits"
python cli/folia.py list
python cli/folia.py remove atomic-habits
```

`add` extracts, strips headers/footers/page-numbers, rejoins hyphenated line
breaks, segments into ordered paragraphs, then **previews the result and asks you
to accept or reject** before writing anything. Rejected PDFs never enter the
library — the gate is what protects the comfort bar against badly-reflowing PDFs
(scanned, two-column, heavy-layout). `add` writes `books/<id>.json` and updates
`books/books.json`.

## Reader

Buildless — no bundler, no framework, no build step. Pages are computed at render
against the live viewport; seen-state is tracked per paragraph (never page
numbers). Discovery is flat random over unseen pages — no ranking or
personalization. A session is meant to be short and to end.

Settings (the `≡` menu) cover theme, reading typography (font / weight / style /
size), per-book progress, a typed-confirm progress reset, and an install button.

### Deploy

The reader serves itself at a **root origin** via Cloudflare Pages, which is what
makes the PWA reliably installable on Android — WebAPK minting is flaky for PWAs
served from a shared-host **subpath** like `https://<user>.github.io/folia/`.

```sh
npx wrangler login   # once
npm run deploy       # runs deploy.sh
```

`deploy.sh` stages only the runtime files (HTML/CSS/JS, manifest, `icons/`,
`fonts/`, `books/`) into `.deploy/` and runs `wrangler pages deploy` — keeping
the Python venv, CLI, tests, and docs out of the upload. The manifest uses
relative paths, so the same files also work if served from a subpath.

Open it on Android via Chrome's *Install app*; it syncs `books/` into IndexedDB
and runs fully offline after first load.

### Run locally

A service worker and ES modules need a real origin, not `file://`:

```sh
python3 -m http.server 8000   # then open http://localhost:8000/
```

## Tests

```sh
.venv/bin/python -m unittest discover -s cli/tests -t cli/tests   # CLI (Python)
npm test                                                          # reader logic (JS)
```

The JS tests cover the pure cores — pagination, the discovery picker, seen-state,
and the report — with no browser or dependencies.

## License

[MIT](LICENSE) © livlign
