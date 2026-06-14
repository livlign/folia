from clean import join_lines


def _split_on_gaps(lines, gap_factor=0.6):
    groups = []
    current = []
    prev = None
    for ln in lines:
        if not ln["text"].strip():
            if current:
                groups.append(current)
                current = []
            prev = None
            continue
        if prev is not None:
            line_height = ln["bbox"][3] - ln["bbox"][1]
            gap = ln["bbox"][1] - prev["bbox"][3]
            if line_height > 0 and gap > line_height * gap_factor and current:
                groups.append(current)
                current = []
        current.append(ln)
        prev = ln
    if current:
        groups.append(current)
    return groups


def segment_paragraphs(blocks, gap_factor=0.6):
    texts = []
    for b in blocks:
        for group in _split_on_gaps(b["lines"], gap_factor):
            text = join_lines([l["text"] for l in group])
            if text:
                texts.append(text)
    return [{"id": "p%04d" % (i + 1), "text": t} for i, t in enumerate(texts)]
