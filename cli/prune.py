import re

# Short heading lines that mark the start of non-reading back matter. Matched as
# a prefix on a short paragraph found in the latter half of the book. English +
# Vietnamese, since the library is bilingual.
_BACKMATTER_PREFIXES = (
    "references", "bibliography", "selected bibliography", "works cited",
    "index", "notes", "endnotes", "footnotes", "glossary", "appendix",
    "about the author", "about the authors", "acknowledgment", "acknowledgement",
    "further reading", "credits", "colophon",
    "tài liệu tham khảo", "thư mục", "chỉ mục", "phụ lục", "chú thích",
    "chú giải", "về tác giả", "lời cảm ơn", "danh mục",
)

# Front-matter lines (copyright/publisher boilerplate) dropped from the head.
_FRONTMATTER_RE = re.compile(
    r"(copyright|all rights reserved|isbn|first published|published by|"
    r"library of congress|cataloging|printed in|table of contents|"
    r"\bedition\b|nhà xuất bản|bản quyền|in lần thứ|mục lục)",
    re.I,
)

_DOTTED_TOC = re.compile(r"\.{4,}\s*\d+\s*$")

# A paragraph that is essentially just a URL/domain — source-site watermarks
# (oceanofpdf.com, thuviensach.vn, publisher URLs) that repeat on every page.
_URL_ONLY = re.compile(r"^\s*(https?://|www\.)?[\w.-]+\.(com|vn|org|net|io|co)(/\S*)?\s*$", re.I)


def _norm(text):
    return re.sub(r"\s+", " ", text).strip().lower().rstrip(":.")


def is_junk(text):
    s = text.strip()
    if not s:
        return True
    if _DOTTED_TOC.search(s) or _URL_ONLY.match(s):
        return True
    letters = sum(c.isalpha() for c in s)
    digits = sum(c.isdigit() for c in s)
    if letters < len(s) * 0.4:
        return True
    if len(s) < 140 and digits >= max(2, letters * 0.5):
        return True
    return False


def _is_heading(text):
    if len(text) >= 40:
        return False
    norm = _norm(text)
    return any(norm == p or norm.startswith(p + " ") or norm == p.rstrip("s")
               for p in _BACKMATTER_PREFIXES)


def _backmatter_like(tail):
    # A real trailing back-matter section (references/index/appendix) is mostly
    # short or fragmented lines; a mid-book chapter subsection that happens to be
    # titled "References" is followed by genuine prose, so it fails this test.
    if not tail:
        return False
    fragmented = sum(1 for t in tail if is_junk(t) or len(t.strip()) < 120)
    return fragmented >= len(tail) * 0.55


def backmatter_cut(texts, after_frac=0.45):
    start = int(len(texts) * after_frac)
    for i in range(start, len(texts)):
        if _is_heading(texts[i]) and _backmatter_like(texts[i:]):
            return i
    return None


def content_start(texts, scan=60):
    for i, t in enumerate(texts[:scan]):
        if _FRONTMATTER_RE.search(t) or _DOTTED_TOC.search(t) or is_junk(t) or len(t.strip()) < 30:
            continue
        return i
    return 0


def prune(paragraphs):
    texts = [p["text"] for p in paragraphs]
    cut = backmatter_cut(texts)
    if cut is not None:
        texts = texts[:cut]
    texts = texts[content_start(texts):]
    texts = [t for t in texts if not is_junk(t)]
    return [{"id": "p%04d" % (i + 1), "text": t} for i, t in enumerate(texts)]
