import os
import tempfile
import unittest

import _path  # noqa: F401
import fitz

from extract import extract_blocks
from clean import strip_headers_footers
from segment import segment_paragraphs


def make_pdf(path, pages):
    doc = fitz.open()
    for lines in pages:
        page = doc.new_page(width=400, height=800)
        for text, x, y in lines:
            page.insert_text((x, y), text, fontsize=11)
    doc.save(path)
    doc.close()


class TestExtractPipeline(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.pdf = os.path.join(self.dir, "tiny.pdf")

    def test_full_pipeline_strips_chrome_and_keeps_body(self):
        body = "The body of the chapter sits in the middle of the page."
        pages = []
        for n in range(4):
            pages.append([
                ("Atomic Habits", 50, 30),       # running header (margin band, repeats)
                (body, 50, 400),                  # body text
                (str(n + 1), 190, 770),           # page number (margin band)
            ])
        make_pdf(self.pdf, pages)

        blocks = extract_blocks(self.pdf)
        self.assertEqual({b["page"] for b in blocks}, {0, 1, 2, 3})

        paras = segment_paragraphs(strip_headers_footers(blocks))
        texts = [p["text"] for p in paras]
        self.assertEqual(texts, [body] * 4)
        self.assertTrue(all(t["id"].startswith("p") for t in paras))

    def test_blocks_returned_in_reading_order(self):
        make_pdf(self.pdf, [[("First line up top.", 50, 200),
                             ("Second line lower.", 50, 400)]])
        blocks = extract_blocks(self.pdf)
        joined = " ".join(b["text"] for b in blocks)
        self.assertLess(joined.index("First"), joined.index("Second"))


if __name__ == "__main__":
    unittest.main()
