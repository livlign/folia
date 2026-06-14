# CLAUDE.md — Folia

## What this is
Folia: a personal reading app that occupies the idle-moment reflex slot (the one Facebook usually takes) with curated non-fiction books, shown one screenful at a time. Open → random unseen page → not intrigued, reroll → intrigued, read more → sequential read → swipe back → another random page. Finite, curated, ends naturally. See `folia-prd.md` (product) and `folia-build-spec.md` (implementation).

## Stack
- CLI (import): Python 3 + PyMuPDF (`fitz`). Local only.
- Reader: buildless vanilla JS PWA (no framework, no bundler). IndexedDB + service worker.
- Hosting: GitHub Pages, public repo. Content is static JSON under `books/`.
- No backend, no accounts, no sync.

## Build order
Phase 1 CLI → Phase 2 PWA shell + sync → Phase 3 the loop → Phase 4 report + retire. Each phase has acceptance criteria in the build spec; meet them before moving on. Phase 1 is the only genuinely new work (PDF clean-up quality is the make-or-break); everything else is wiring known capabilities.

## Conventions
- No comments in code unless the logic is genuinely non-obvious; code should be self-explanatory.
- No new dependencies without a clear reason. Vanilla JS in the reader; standard library + PyMuPDF in the CLI.
- Keep the two halves decoupled. The only contract between them is the JSON shape in the build spec §3.
- The reader talks to content only through the `Source` interface — do not hardcode fetch logic outside `source.js`.
- Tests assert spec behavior (build spec §7), not current implementation. No asserting internal call counts. No arbitrary sleeps in async tests; await real conditions. Tests are order-independent.
- Concise output. Don't over-explain written code.

## Hard rules
- Paginate at render against the live viewport. Seen-state is tracked at paragraph granularity; page is derived. Do not store page numbers as state.
- Discovery is flat random over unseen pages. Do NOT add adaptive bias, personalization, ranking, or recommendation logic — it is explicitly cut and would break the design.
- A good session is short and ends. Do not add streaks, engagement metrics, infinite autoload past a chapter/book, notifications, or anything that maximizes time-in-app.
- v1 is non-fiction, PDF, single device, public Pages. Do not add EPUB, other formats, private/authed sources, a server, font controls, widgets, or multi-user features — these are backlog (build spec §8). Flag if a task seems to require one instead of silently adding it.

## When unsure
- Don't invent PyMuPDF or Web API methods/signatures. If unsure one exists, verify or say so.
- For grooming/design questions, surface gaps and ambiguities rather than filling them silently.
- For code changes, change only what's asked; mention separately if you spot something else.
