import argparse
import os
import sys

from extract import extract_blocks
from clean import strip_headers_footers
from segment import segment_paragraphs
from prune import prune
from emit import slugify, load_manifest, emit_book, remove_book

DEFAULT_BOOKS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "books")


def build_paragraphs(pdf_path):
    blocks = extract_blocks(pdf_path)
    blocks = strip_headers_footers(blocks)
    return prune(segment_paragraphs(blocks))


def preview(paragraphs, head=8, sample=5):
    print("\n--- first %d paragraphs ---\n" % head)
    for p in paragraphs[:head]:
        print(p["text"], end="\n\n")
    mid = len(paragraphs) // 2
    if mid > head:
        print("--- mid-book sample (around paragraph %d of %d) ---\n" % (mid, len(paragraphs)))
        for p in paragraphs[mid:mid + sample]:
            print(p["text"], end="\n\n")


def cmd_add(args):
    paragraphs = build_paragraphs(args.pdf)
    if not paragraphs:
        print("No text extracted from %s." % args.pdf, file=sys.stderr)
        return 1
    preview(paragraphs)
    answer = input("accept / reject? ").strip().lower()
    if answer not in ("a", "accept", "y", "yes"):
        print("Rejected. Nothing written.")
        return 0
    book_id = args.id or slugify(args.title)
    emit_book(args.books_dir, book_id, args.title, paragraphs)
    print("Wrote %s (%d paragraphs)." % (book_id, len(paragraphs)))
    return 0


def cmd_list(args):
    books = load_manifest(args.books_dir).get("books", [])
    if not books:
        print("No books in library.")
        return 0
    for b in sorted(books, key=lambda x: x["id"]):
        print("%-28s %6d  %s" % (b["id"], b.get("paragraphCount", 0), b["title"]))
    return 0


def cmd_remove(args):
    if remove_book(args.books_dir, args.id):
        print("Removed %s." % args.id)
        return 0
    print("No book with id %s." % args.id, file=sys.stderr)
    return 1


def main(argv=None):
    parser = argparse.ArgumentParser(prog="folia", description="Folia import CLI")
    parser.add_argument("--books-dir", default=DEFAULT_BOOKS_DIR, help="library directory (default: repo books/)")
    sub = parser.add_subparsers(dest="command", required=True)

    p_add = sub.add_parser("add", help="extract a PDF into the library")
    p_add.add_argument("pdf")
    p_add.add_argument("--title", required=True)
    p_add.add_argument("--id")
    p_add.set_defaults(func=cmd_add)

    p_list = sub.add_parser("list", help="list books in the library")
    p_list.set_defaults(func=cmd_list)

    p_remove = sub.add_parser("remove", help="remove a book by id")
    p_remove.add_argument("id")
    p_remove.set_defaults(func=cmd_remove)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
