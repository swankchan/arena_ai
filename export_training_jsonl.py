#!/usr/bin/env python3
"""
Export SQLite Q&A + ratings to JSONL for supervised fine-tuning or downstream preference training.

Examples:
  python export_training_jsonl.py -o training.jsonl
  python export_training_jsonl.py -o likes.jsonl --rating like
  python export_training_jsonl.py -o sft.jsonl --format sft_messages --collection my_kb
"""
from __future__ import annotations

import argparse
import os
import sys

from dotenv import load_dotenv

load_dotenv(override=True)

# Ensure project root on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import db  # noqa: E402


def main() -> None:
    p = argparse.ArgumentParser(description="Export training JSONL from rag_app.db")
    p.add_argument("-o", "--output", required=True, help="Output .jsonl path")
    p.add_argument("--collection", default=None, help="Filter by Chroma collection name (omit = all)")
    p.add_argument(
        "--rating",
        choices=("all", "like", "dislike", "rated"),
        default="all",
        help="all | like | dislike | rated (any rating)",
    )
    p.add_argument(
        "--format",
        choices=("record", "sft_messages", "sft_alpaca"),
        default="record",
        dest="fmt",
        help="Output line shape",
    )
    args = p.parse_args()

    rating_filter = None
    require_rating = False
    if args.rating == "like":
        rating_filter = "like"
    elif args.rating == "dislike":
        rating_filter = "dislike"
    elif args.rating == "rated":
        require_rating = True

    data = db.export_training_jsonl_bytes(
        collection_name=args.collection,
        rating_filter=rating_filter,
        require_rating=require_rating,
        format_name=args.fmt,
    )
    out_path = os.path.abspath(args.output)
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(data)
    lines = len([ln for ln in data.splitlines() if ln.strip()])
    print(f"Wrote {out_path} ({lines} lines)")


if __name__ == "__main__":
    main()
