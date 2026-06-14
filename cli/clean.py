import re

_PAGE_NUMBER_PATTERNS = [
    re.compile(r"^\d+$"),
    re.compile(r"^page\s+\d+$", re.I),
    re.compile(r"^\d+\s*[|:]\s*\S"),
    re.compile(r"\S\s*[|:]\s*\d+$"),
    re.compile(r"^[-‒–—]\s*\d+\s*[-‒–—]$"),
]

_DEHYPHEN = re.compile(r"[A-Za-z][-‐]$")


def is_page_number(text):
    t = text.strip()
    return bool(t) and any(p.search(t) for p in _PAGE_NUMBER_PATTERNS)


def _normalize_repeat(text):
    t = re.sub(r"\d+", "", text.lower())
    return re.sub(r"\s+", " ", t).strip()


def in_margin_band(block, top_frac=0.08, bottom_frac=0.92):
    ph = block.get("page_height")
    if not ph:
        return False
    return block["bbox"][3] <= ph * top_frac or block["bbox"][1] >= ph * bottom_frac


def strip_headers_footers(blocks, top_frac=0.08, bottom_frac=0.92, repeat_min=3):
    pages_by_norm = {}
    for b in blocks:
        if in_margin_band(b, top_frac, bottom_frac):
            norm = _normalize_repeat(b["text"])
            if norm:
                pages_by_norm.setdefault(norm, set()).add(b["page"])
    kept = []
    for b in blocks:
        if in_margin_band(b, top_frac, bottom_frac):
            if is_page_number(b["text"]):
                continue
            norm = _normalize_repeat(b["text"])
            if norm and len(pages_by_norm.get(norm, ())) >= repeat_min:
                continue
        kept.append(b)
    return kept


def join_lines(lines):
    out = ""
    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        if not out:
            out = line
        elif _DEHYPHEN.search(out) and line[:1].islower():
            out = out[:-1] + line
        else:
            out = out + " " + line
    return out
