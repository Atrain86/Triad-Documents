#!/bin/bash
# PaintBrain auto-convert Markdown → Word and PDF

SOURCE_DIR="documentation"
DEST_DIR="documentation/word doc"

mkdir -p "$DEST_DIR"

for file in "$SOURCE_DIR"/*.md; do
  [ -e "$file" ] || continue
  base=$(basename "$file" .md)
  pandoc "$file" -o "$DEST_DIR/$base.docx"
  pandoc "$file" -o "$DEST_DIR/$base.pdf"
  echo "✅ Updated $DEST_DIR/$base.docx"
  echo "✅ Updated $DEST_DIR/$base.pdf"
done
