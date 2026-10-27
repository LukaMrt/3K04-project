#!/usr/bin/env bash
# Builds the PDF of a Part B deliverable from the Markdown files of docs/part-b.
# Usage: scripts/build-pdf.sh [1|2]   (default: 2)
# Output: build/part-b-deliverable-<n>.pdf
set -euo pipefail

DELIVERABLE="${1:-2}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/docs/part-b"
BUILD="$ROOT/build/deliverable-$DELIVERABLE"
OUTPUT="$ROOT/build/part-b-deliverable-$DELIVERABLE.pdf"

# Mermaid renders through Puppeteer: use the installed Chrome when Puppeteer has none of its own
MAC_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [[ -z "${PUPPETEER_EXECUTABLE_PATH:-}" && -x "$MAC_CHROME" && ! -d "$HOME/.cache/puppeteer/chrome-headless-shell" ]]; then
  export PUPPETEER_EXECUTABLE_PATH="$MAC_CHROME"
fi

# Files in document order, relative to docs/part-b.
# "@part:<title>" inserts a title page (used to open the appendices).
case "$DELIVERABLE" in
  1)
    # Order of the requirements document (deliverable-1.pdf, §4)
    FILES=(
      deliverable-1/cover.md
      deliverable-1/introduction-and-system-context.md
      deliverable-1/stakeholders.md
      deliverable-1/functional-requirements.md
      deliverable-1/non-functional-requirements.md
      deliverable-1/user-stories.md
      deliverable-1/diagrams/high-level-architecture.md
      deliverable-1/diagrams/class-model.md
      deliverable-1/diagrams/use-case-diagram.md
      deliverable-1/diagrams/activity-diagram.md
      deliverable-1/diagrams/state-machine-diagrams.md
      deliverable-1/diagrams/sequence-diagram.md
      deliverable-1/traceability.md
      deliverable-1/assumptions-and-decisions.md
      deliverable-1/appendix-methodology-and-ai-use.md
    )
    ;;
  2)
    # Order of the design document (deliverable-2.pdf, §4); the interface contract with
    # Part A follows as an appendix. The D1 document is submitted on its own (option 1).
    FILES=(
      deliverable-2/cover.md
      deliverable-2/introduction.md
      deliverable-2/precise-specification.md
      deliverable-2/safety-critical-specifications.md
      deliverable-2/modular-decomposition.md
      deliverable-2/modular-design-and-interfaces.md
      deliverable-2/implementation-notes.md
      deliverable-2/traceability.md
      deliverable-2/assumptions-and-decisions.md
      "@part:Appendix A - ADC ↔ Monitoring Interface Contract"
      interface-adc-monitoring.md
    )
    ;;
  *)
    echo "Usage: $0 [1|2]" >&2
    exit 1
    ;;
esac

rm -rf "$BUILD"
mkdir -p "$BUILD"

# 1. Concatenate, one page break between files (none after the last one: it would add a blank page)
for i in "${!FILES[@]}"; do
  entry="${FILES[$i]}"
  if [[ "$entry" == @part:* ]]; then
    printf '<div class="part-title"><h1>%s</h1></div>\n' "${entry#@part:}"
  else
    cat "$SRC/$entry"
  fi
  if (( i < ${#FILES[@]} - 1 )); then
    printf '\n\n<div class="page-break"></div>\n\n'
  fi
done > "$BUILD/full.md"

# Links to other .md files do not work in a single PDF: keep only their text
sed -E -i '' 's/\[([^]]*)\]\([^)]*\.md[^)]*\)/\1/g' "$BUILD/full.md"

# 2. Render the Mermaid blocks as SVG images
npx -y -p @mermaid-js/mermaid-cli mmdc \
  -i "$BUILD/full.md" -o "$BUILD/full-rendered.md" -e svg

# The architecture diagram is too wide for A4: A3 landscape page.
# Its title moves onto the same page, and the following page break is dropped
# (the change of page size already starts a new page; keeping it adds a blank page).
perl -0pi -e 's{^# (High-Level Architecture[^\n]*)\n\s*!\[[^\]]*\]\(\./(full-rendered-\d+\.svg)\)\s*<div class="page-break"></div>}{<div class="wide"><h1>$1</h1><img src="./$2"></div>}m' \
  "$BUILD/full-rendered.md"
if grep -q '^# High-Level Architecture' "$BUILD/full.md"; then
  grep -q '<div class="wide">' "$BUILD/full-rendered.md" || { echo "Architecture diagram not found" >&2; exit 1; }
fi

# 3. Markdown -> PDF (preferCSSPageSize: honour the @page sizes of pdf.css, A3 page included)
npx -y md-to-pdf "$BUILD/full-rendered.md" \
  --stylesheet "$ROOT/docs/pdf.css" \
  --pdf-options '{"format": "A4", "preferCSSPageSize": true, "printBackground": true}'

mv "$BUILD/full-rendered.pdf" "$OUTPUT"
echo "PDF: $OUTPUT"
