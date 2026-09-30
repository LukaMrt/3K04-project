#!/usr/bin/env bash
# Builds the Deliverable 1 PDF (Part B) from the Markdown files of docs/part-b.
# Output: build/part-b-deliverable-1.pdf
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/docs/part-b"
BUILD="$ROOT/build"

# Order of the requirements document (deliverable-1.pdf, §4)
FILES=(
  cover.md
  introduction-and-system-context.md
  stakeholders.md
  functional-requirements.md
  non-functional-requirements.md
  user-stories.md
  diagrams/high-level-architecture.md
  diagrams/class-model.md
  diagrams/use-case-diagram.md
  diagrams/activity-diagram.md
  diagrams/state-machine-diagrams.md
  diagrams/sequence-diagram.md
  traceability.md
  assumptions-and-decisions.md
  appendix-methodology-and-ai-use.md
)

rm -rf "$BUILD"
mkdir -p "$BUILD"

# 1. Concatenate, one page break between files
for f in "${FILES[@]}"; do
  cat "$SRC/$f"
  printf '\n\n<div class="page-break"></div>\n\n'
done > "$BUILD/full.md"

# Links to other .md files do not work in a single PDF: keep only their text
sed -E -i '' 's/\[([^]]*)\]\([^)]*\.md[^)]*\)/\1/g' "$BUILD/full.md"

# 2. Render the Mermaid blocks as SVG images
npx -y -p @mermaid-js/mermaid-cli mmdc \
  -i "$BUILD/full.md" -o "$BUILD/full-rendered.md" -e svg

# The architecture diagram (first Mermaid block) is too wide for A4: A3 landscape page
sed -E -i '' 's#^!\[[^]]*\]\(\./full-rendered-1\.svg\)$#<div class="wide"><img src="./full-rendered-1.svg"></div>#' \
  "$BUILD/full-rendered.md"

# 3. Markdown -> PDF
npx -y md-to-pdf "$BUILD/full-rendered.md" \
  --stylesheet "$ROOT/docs/pdf.css" \
  --pdf-options '{"format": "A4", "margin": {"top": "18mm", "bottom": "18mm", "left": "15mm", "right": "15mm"}, "printBackground": true}'

mv "$BUILD/full-rendered.pdf" "$BUILD/part-b-deliverable-1.pdf"
echo "PDF: $BUILD/part-b-deliverable-1.pdf"
