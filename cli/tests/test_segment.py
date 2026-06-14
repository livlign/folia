import unittest

import _path  # noqa: F401
from segment import segment_paragraphs


def line(text, y0, y1):
    return {"bbox": (50.0, y0, 500.0, y1), "text": text}


def block(lines):
    ys = [l["bbox"][1] for l in lines] + [l["bbox"][3] for l in lines]
    return {"page": 0, "bbox": (50.0, min(ys), 500.0, max(ys)), "page_height": 800.0,
            "lines": lines, "text": "\n".join(l["text"] for l in lines)}


class TestSegment(unittest.TestCase):
    def test_ids_are_sequential_and_padded(self):
        paras = segment_paragraphs([block([line("First.", 100, 112)]),
                                    block([line("Second.", 200, 212)])])
        self.assertEqual([p["id"] for p in paras], ["p0001", "p0002"])

    def test_block_boundary_breaks_paragraphs(self):
        paras = segment_paragraphs([block([line("One.", 100, 112)]),
                                    block([line("Two.", 130, 142)])])
        self.assertEqual([p["text"] for p in paras], ["One.", "Two."])

    def test_tight_lines_merge_into_one_paragraph(self):
        b = block([line("A sentence that", 100, 112), line("wraps to a line.", 114, 126)])
        paras = segment_paragraphs([b])
        self.assertEqual([p["text"] for p in paras], ["A sentence that wraps to a line."])

    def test_large_vertical_gap_breaks_within_block(self):
        b = block([line("End of one.", 100, 112), line("Start of next.", 180, 192)])
        paras = segment_paragraphs([b])
        self.assertEqual([p["text"] for p in paras], ["End of one.", "Start of next."])

    def test_blank_line_breaks_within_block(self):
        b = block([line("Above.", 100, 112), line("   ", 113, 125), line("Below.", 126, 138)])
        paras = segment_paragraphs([b])
        self.assertEqual([p["text"] for p in paras], ["Above.", "Below."])

    def test_does_not_break_mid_sentence_on_tight_wrap(self):
        b = block([line("The quick brown fox", 100, 112),
                   line("jumps over the lazy dog.", 114, 126)])
        paras = segment_paragraphs([b])
        self.assertEqual(len(paras), 1)
        self.assertIn("fox jumps over", paras[0]["text"])


if __name__ == "__main__":
    unittest.main()
