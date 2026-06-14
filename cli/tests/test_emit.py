import json
import os
import tempfile
import unittest

import _path  # noqa: F401
from emit import slugify, load_manifest, emit_book, remove_book


class TestSlugify(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(slugify("Atomic Habits"), "atomic-habits")

    def test_punctuation_and_case(self):
        self.assertEqual(slugify("Thinking, Fast and Slow!"), "thinking-fast-and-slow")

    def test_empty_falls_back(self):
        self.assertEqual(slugify("---"), "book")


class TestEmit(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()

    def _paras(self, n):
        return [{"id": "p%04d" % (i + 1), "text": "para %d" % (i + 1)} for i in range(n)]

    def test_writes_book_and_manifest(self):
        emit_book(self.dir, "atomic-habits", "Atomic Habits", self._paras(3))
        with open(os.path.join(self.dir, "atomic-habits.json"), encoding="utf-8") as f:
            book = json.load(f)
        self.assertEqual(book["id"], "atomic-habits")
        self.assertEqual(len(book["paragraphs"]), 3)
        entry = load_manifest(self.dir)["books"][0]
        self.assertEqual(entry, {"id": "atomic-habits", "title": "Atomic Habits", "paragraphCount": 3})

    def test_upsert_replaces_entry_not_duplicates(self):
        emit_book(self.dir, "x", "X", self._paras(2))
        emit_book(self.dir, "x", "X v2", self._paras(5))
        books = load_manifest(self.dir)["books"]
        self.assertEqual(len(books), 1)
        self.assertEqual(books[0]["paragraphCount"], 5)
        self.assertEqual(books[0]["title"], "X v2")

    def test_remove_deletes_file_and_entry(self):
        emit_book(self.dir, "a", "A", self._paras(1))
        emit_book(self.dir, "b", "B", self._paras(1))
        self.assertTrue(remove_book(self.dir, "a"))
        self.assertFalse(os.path.exists(os.path.join(self.dir, "a.json")))
        ids = [b["id"] for b in load_manifest(self.dir)["books"]]
        self.assertEqual(ids, ["b"])

    def test_remove_missing_returns_false(self):
        self.assertFalse(remove_book(self.dir, "nope"))


if __name__ == "__main__":
    unittest.main()
