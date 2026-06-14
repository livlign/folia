# Folia — PRD (v1)

## 1. Problem & bet

I open Facebook and watch short videos by reflex in idle moments. The pull is the mechanic, not the content: thumb to a known location, one tap, content already there, zero decision, never-ends.

Folia occupies that slot with curated long-form books delivered one screen at a time. The bet: it wins on **convenience in the reflex moment**, not willpower. If it is not the path of least resistance the instant I would open Facebook, it fails.

Folia keeps two feed properties (zero latency, zero decision) and breaks the third (never-ends): every committed read has a natural end, and the library is finite and curated by me. The name (plural of *folium*, leaf/page) reflects what it is: a shelf of leaves I slowly read through.

## 2. Non-goals

- Not an engagement-maximizing feed. A good session is short, ends, and returns me to the world.
- No willpower mechanics, streaks, or gamification.
- No sync, accounts, social features, or multi-user platform in v1.
- Not a general PDF viewer. A reflowed-text reader with a discovery front door.
- Ships no content. The library is supplied by me.

## 3. Core mechanic (the loop)

1. Open → a **random unseen page** from any book in the library is shown as a discovery snippet.
2. **Not intrigued** → scroll/reroll → another random unseen page. No reroll ceiling; curation is the quality floor that makes rerolling rarely needed.
3. **Intrigued** → *read more* → reader continues **sequentially forward** through that book.
4. **Swipe back** → return to discovery. **No resume pointer** — next entry is another random unseen page anywhere.
5. A book leaves the discovery pool when **all pages are seen** (retire-on-finish). When nothing is eligible: "you've read everything, import more."

Content is **non-fiction only** in v1 (random out-of-order sampling assumes coherence without prior context). Personal import rule, not code-enforced.

Random entry routinely lands mid-thought — accepted as the texture of discovery.

## 4. Content model

- **Page** = one screenful of reflowed text, computed at render time against the live viewport. A render unit, not a property of the file.
- **Seen-state** tracked at **paragraph** granularity. A paragraph is seen once shown on screen; a page is seen when its paragraphs are. Stable across font/device changes (page numbers would not be).
- **Progress %** per book = seen paragraphs / total. Accumulates across sessions to 100% (retired).
- **Read-more commit count** per book = how many times I tapped *read more*. Signals which books pull me.
- **Report** = static per-book list of % seen + commit count, read by hand to decide re-imports. **No adaptive bias** — discovery is flat random over unseen pages. Biasing toward committed books would starve the rest and make the report self-fulfilling. The tuning lever is human re-import.

## 5. Pipeline (local Python CLI)

Messy work runs once at import, on my computer, separated from the fast reader.

1. **Extract** — PyMuPDF.
2. **Clean** — de-hyphenate, strip headers/footers/page numbers, drop noise. Quality-determining stage.
3. **Segment** — emit ordered paragraphs with stable ids. No pagination here.
4. **Quality gate** — preview cleaned text; I accept or reject. Rejected PDFs never enter the library. This protects the comfort bar against bad PDFs.
5. **Emit** — write book JSON into the repo + update `books.json`.

Local for v1 (vs. server): extraction is on-demand, infrequent, done at a desk, so a running server earns little; local has no timeout/cold-start/size limits. CLI logic is reusable as a v2 server's core.

PDF reality: clean single-column digital PDFs reflow well; scanned/two-column/heavy-layout reflow badly. The gate is the net for the bad ones.

## 6. Source & hosting (locked)

- **Source:** HTTP, served by **GitHub Pages** (public repo `folia`). Chosen over raw repo fetch because Pages updates predictably; `raw.githubusercontent.com` has uncontrolled CDN caching that would delay newly pushed books.
- **Add a book:** CLI writes `books/<id>.json` and updates `books/books.json`; commit and push; it appears on next open.
- **Public-repo consequence:** extracted text is on the open web (free Pages requires public). Acceptable for v1 personal reading; keep the library to books where that is fine. Private repo + authed fetch is backlog.
- **Adapter seam preserved:** the reader talks to a `Source` interface so local-file / authed-HTTP / server can slot in later without touching the reader.

## 7. Reader (PWA, Android)

- **Installable PWA** — home-screen icon in the reflex slot, instant open from cache, no app store. v1 is manual icon-open only (no widgets/notifications).
- **Paginate at render** against the live viewport; CSS controls font to fit.
- **Comfortable reflow** ("Kindle-like") is the acceptance bar and the reason the pipeline outputs clean text, not page images.
- **Offline-first** — all reading from IndexedDB; network only to discover/fetch new books.

## 8. Success measurement

Inverted from normal metrics:
- Good = short session that ends, no immediate re-open.
- Bad = long, many rerolls without commit, or re-opening seconds later (it became a feed).
- **Substitution** (the real goal) is read **externally** via Android Digital Wellbeing weekly: did Facebook minutes drop. Not instrumentable from inside Folia.

In-app, v1 ships only the §4 report. No engagement analytics.

## 9. MVP & required non-code step

The unproven thing is whether random-page discovery displaces the reflex; everything else is known-buildable.

In: the loop, paginate-at-render reader, paragraph seen-state, progress %, commit count, report, HTTP/Pages source, 2–3 hand-imported non-fiction PDFs.

**Required, not built:** remove Facebook from its dock/home slot and place Folia there. Without this the bet is not fairly tested.

## 10. Risks

- Reflow quality is the make-or-break variable, per book; the gate bounds it, better cleanup raises the pass rate (backlog).
- No reroll ceiling means low-focus moments can feel feed-like; low-frequency, n=1, accepted.
- Read-more measures snippet-pull, not book value; the report is a heuristic.
- Copyright: v1 (own books, personal reading, public-repo-for-self) is defensible. "It's just a framework" is not a shield — extraction is the less-neutral capability and the README/framing set posture. Any future "point it at book repos" multi-user push is a deliberate v2 decision, not a v1 ride-along. Keep v1 personal.

## 11. Out of scope (backlog)

v2 extraction server; authed/private sources; EPUB and other formats; adaptive bias; notifications; widgets; accounts; cross-device sync; font-size control; the multi-user BYO-source framing.
