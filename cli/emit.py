import json
import os
import re


def slugify(title):
    s = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return re.sub(r"-+", "-", s) or "book"


def manifest_path(books_dir):
    return os.path.join(books_dir, "books.json")


def load_manifest(books_dir):
    path = manifest_path(books_dir)
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {"books": []}


def _write_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def _write_manifest(books_dir, manifest):
    manifest["books"].sort(key=lambda b: b["id"])
    _write_json(manifest_path(books_dir), manifest)


def emit_book(books_dir, book_id, title, paragraphs):
    os.makedirs(books_dir, exist_ok=True)
    book = {"id": book_id, "title": title, "paragraphs": paragraphs}
    _write_json(os.path.join(books_dir, "%s.json" % book_id), book)

    manifest = load_manifest(books_dir)
    manifest["books"] = [b for b in manifest.get("books", []) if b.get("id") != book_id]
    manifest["books"].append({"id": book_id, "title": title, "paragraphCount": len(paragraphs)})
    _write_manifest(books_dir, manifest)
    return book


def remove_book(books_dir, book_id):
    manifest = load_manifest(books_dir)
    before = len(manifest.get("books", []))
    manifest["books"] = [b for b in manifest.get("books", []) if b.get("id") != book_id]
    _write_manifest(books_dir, manifest)

    book_path = os.path.join(books_dir, "%s.json" % book_id)
    removed_file = os.path.exists(book_path)
    if removed_file:
        os.remove(book_path)
    return removed_file or len(manifest["books"]) != before
