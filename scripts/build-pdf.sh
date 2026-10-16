#!/usr/bin/env bash
# Builds the Deliverable 1 PDF (Part B) from the Markdown files of docs/part-b.
# Output: build/part-b-deliverable-1.pdf
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/docs/part-b/deliverable-1"
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

# 1. Concatenate, one page break between files (none after the last one: it would add a blank page)
for i in "${!FILES[@]}"; do
  cat "$SRC/${FILES[$i]}"
  if (( i < ${#FILES[@]} - 1 )); then
    printf '\n\n<div class="page-break"></div>\n\n'
  fi
done > "$BUILD/full.md"

# Links to other .md files do not work in a single PDF: keep only their text
sed -E -i '' 's/\[([^]]*)\]\([^)]*\.md[^)]*\)/\1/g' "$BUILD/full.md"

# 2. Render the Mermaid blocks as SVG images
npx -y -p @mermaid-js/mermaid-cli mmdc \
  -i "$BUILD/full.md" -o "$BUILD/full-rendered.md" -e svg

# The architecture diagram (first Mermaid block) is too wide for A4: A3 landscape page.
# Its title moves onto the same page, and the following page break is dropped
# (the change of page size already starts a new page; keeping it adds a blank page).
perl -0pi -e 's{^# (High-Level Architecture[^\n]*)\n\s*!\[[^\]]*\]\(\./full-rendered-1\.svg\)\s*<div class="page-break"></div>}{<div class="wide"><h1>$1</h1><img src="./full-rendered-1.svg"></div>}m' \
  "$BUILD/full-rendered.md"
grep -q '<div class="wide">' "$BUILD/full-rendered.md" || { echo "Architecture diagram not found" >&2; exit 1; }

# 3. Markdown -> PDF (preferCSSPageSize: honour the @page sizes of pdf.css, A3 page included)
npx -y md-to-pdf "$BUILD/full-rendered.md" \
  --stylesheet "$ROOT/docs/pdf.css" \
  --pdf-options '{"format": "A4", "preferCSSPageSize": true, "printBackground": true}'

mv "$BUILD/full-rendered.pdf" "$BUILD/part-b-deliverable-1.pdf"
echo "PDF: $BUILD/part-b-deliverable-1.pdf"
