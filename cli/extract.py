import fitz


def extract_blocks(pdf_path):
    doc = fitz.open(pdf_path)
    try:
        blocks = []
        for pno, page in enumerate(doc):
            d = page.get_text("dict")
            page_height = d.get("height", page.rect.height)
            page_width = d.get("width", page.rect.width)
            page_blocks = []
            for b in d.get("blocks", []):
                if b.get("type", 0) != 0:
                    continue
                lines = []
                for ln in b.get("lines", []):
                    text = "".join(s.get("text", "") for s in ln.get("spans", []))
                    lines.append({"bbox": tuple(ln["bbox"]), "text": text})
                if not lines:
                    continue
                page_blocks.append({
                    "page": pno,
                    "bbox": tuple(b["bbox"]),
                    "page_height": page_height,
                    "page_width": page_width,
                    "lines": lines,
                    "text": "\n".join(l["text"] for l in lines),
                })
            page_blocks.sort(key=lambda blk: (round(blk["bbox"][1], 1), round(blk["bbox"][0], 1)))
            blocks.extend(page_blocks)
        return blocks
    finally:
        doc.close()
