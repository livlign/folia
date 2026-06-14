import unittest

import _path  # noqa: F401
from clean import is_page_number, in_margin_band, strip_headers_footers, join_lines


def block(text, page, y0, y1, page_height=800.0):
    return {"page": page, "bbox": (50.0, y0, 500.0, y1), "page_height": page_height,
            "lines": [{"bbox": (50.0, y0, 500.0, y1), "text": text}], "text": text}


class TestDehyphenate(unittest.TestCase):
    def test_rejoins_split_word(self):
        self.assertEqual(join_lines(["exam-", "ple sentence"]), "example sentence")

    def test_leaves_real_hyphenated_word_intact(self):
        self.assertEqual(join_lines(["well-being is", "important here"]),
                         "well-being is important here")

    def test_does_not_merge_when_next_starts_uppercase(self):
        self.assertEqual(join_lines(["the North-", "South divide"]),
                         "the North- South divide")

    def test_plain_lines_joined_with_space(self):
        self.assertEqual(join_lines(["a quiet", "morning"]), "a quiet morning")

    def test_blank_lines_dropped(self):
        self.assertEqual(join_lines(["one", "   ", "two"]), "one two")


class TestPageNumbers(unittest.TestCase):
    def test_bare_number(self):
        self.assertTrue(is_page_number("42"))

    def test_page_n(self):
        self.assertTrue(is_page_number("Page 7"))

    def test_n_pipe_title(self):
        self.assertTrue(is_page_number("12 | Atomic Habits"))

    def test_title_pipe_n(self):
        self.assertTrue(is_page_number("Atomic Habits | 12"))

    def test_real_text_is_not_a_page_number(self):
        self.assertFalse(is_page_number("Chapter one begins with a question."))


class TestMarginBand(unittest.TestCase):
    def test_top_and_bottom_in_band(self):
        self.assertTrue(in_margin_band(block("h", 0, 10, 30)))
        self.assertTrue(in_margin_band(block("f", 0, 770, 790)))

    def test_body_not_in_band(self):
        self.assertFalse(in_margin_band(block("body", 0, 400, 420)))


class TestStripHeadersFooters(unittest.TestCase):
    def test_repeating_margin_block_stripped(self):
        blocks = [block("Atomic Habits", p, 10, 28) for p in range(4)]
        blocks += [block("Real body paragraph on this page.", p, 400, 420) for p in range(4)]
        kept = strip_headers_footers(blocks)
        self.assertTrue(all(b["text"] != "Atomic Habits" for b in kept))
        self.assertEqual(sum(1 for b in kept if b["text"].startswith("Real body")), 4)

    def test_page_numbers_stripped(self):
        blocks = [block(str(p + 1), p, 775, 792) for p in range(3)]
        blocks += [block("4 | Atomic Habits", 3, 775, 792)]
        self.assertEqual(strip_headers_footers(blocks), [])

    def test_repeating_text_in_body_is_kept(self):
        blocks = [block("This sentence recurs.", p, 400, 420) for p in range(5)]
        self.assertEqual(len(strip_headers_footers(blocks)), 5)

    def test_unique_margin_text_is_kept(self):
        blocks = [block("A one-off note in the margin band area here.", 0, 10, 28)]
        self.assertEqual(len(strip_headers_footers(blocks)), 1)


if __name__ == "__main__":
    unittest.main()
