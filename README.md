# Folia

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
- **Reader** — a buildless vanilla-JS PWA, served by GitHub Pages, offline after
  first load. (Phases 2–4.)

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
`books/books.json`; commit and push to publish.

## Reader

The reader is buildless — no install step. Deploy by committing these files to a
public `folia` repo and enabling GitHub Pages from `main` root. It then serves
itself at `https://<user>.github.io/folia/`, syncs `books/` into IndexedDB, and
runs fully offline after the first load. Open it on Android and *Add to Home
screen* to put it in the reflex slot.

To run locally, serve the repo root over HTTP (a service worker and ES modules
need a real origin, not `file://`):

```sh
python3 -m http.server 8000   # then open http://localhost:8000/
```

## Tests

```sh
.venv/bin/python -m unittest discover -s cli/tests -t cli/tests   # CLI (Python)
node --test tests/*.test.mjs                                      # reader logic (JS)
```

The JS tests cover the pure cores — pagination, the discovery picker, seen-state,
and the report — with no browser or dependencies.
