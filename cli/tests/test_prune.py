import unittest

import _path  # noqa: F401
from prune import is_junk, backmatter_cut, content_start, prune

PROSE = ("This is a genuinely substantial paragraph of running prose that carries "
         "real meaning and comfortably exceeds the fragmentation threshold used by the cleaner.")


class TestIsJunk(unittest.TestCase):
    def test_watermark_and_bare_urls(self):
        self.assertTrue(is_junk("OceanofPDF.com"))
        self.assertTrue(is_junk("thuviensach.vn"))
        self.assertTrue(is_junk("www.newriders.com"))

    def test_dotted_toc_line(self):
        self.assertTrue(is_junk("Introduction . . . . . . . . . . 12"))

    def test_index_like_number_heavy_line(self):
        self.assertTrue(is_junk("Agile, 12, 45, 78, 102, 233"))

    def test_real_prose_is_kept(self):
        self.assertFalse(is_junk(PROSE))

    def test_url_inside_sentence_is_kept(self):
        self.assertFalse(is_junk("You can read more about this at www.example.com later in the book."))


class TestBackmatterCut(unittest.TestCase):
    def test_cuts_trailing_references_with_fragmented_tail(self):
        body = [PROSE] * 10
        tail = ["References"] + ["Smith, J. (2009). A Paper. Journal, 1(2)."] * 8
        texts = body + tail
        cut = backmatter_cut(texts)
        self.assertEqual(cut, 10)

    def test_does_not_cut_midbook_heading_followed_by_prose(self):
        # "References" appears mid-book but real chapters (prose) follow it
        texts = [PROSE] * 10 + ["References"] + [PROSE] * 30
        self.assertIsNone(backmatter_cut(texts))


class TestContentStart(unittest.TestCase):
    def test_skips_copyright_front_matter(self):
        texts = ["Copyright © 2020 Publisher", "ISBN 978-0-00-000000-0", PROSE, PROSE]
        self.assertEqual(content_start(texts), 2)


class TestPrune(unittest.TestCase):
    def test_reassigns_contiguous_ids(self):
        paras = [{"id": "p0001", "text": "OceanofPDF.com"},
                 {"id": "p0002", "text": PROSE},
                 {"id": "p0003", "text": PROSE}]
        out = prune(paras)
        self.assertEqual([p["id"] for p in out], ["p0001", "p0002"])
        self.assertTrue(all(p["text"] == PROSE for p in out))


if __name__ == "__main__":
    unittest.main()
