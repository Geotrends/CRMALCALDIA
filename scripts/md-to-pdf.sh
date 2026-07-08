#!/usr/bin/env bash
# Convierte todos los archivos Markdown del repo a PDF (pandoc + weasyprint).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV_BIN="$ROOT/.venv-pdf/bin"
CSS="$ROOT/docs/pdf/pdf-style.css"
OUT_DIR="$ROOT/docs/pdf"

if [[ ! -x "$VENV_BIN/weasyprint" ]]; then
  echo "Error: falta el entorno .venv-pdf con weasyprint."
  echo "  python3 -m venv .venv-pdf && .venv-pdf/bin/pip install weasyprint"
  exit 1
fi

export PATH="$VENV_BIN:$PATH"

convert() {
  local src="$1"
  local dest="$2"
  mkdir -p "$(dirname "$dest")"
  echo "→ $src"
  pandoc "$src" \
    -o "$dest" \
    --pdf-engine=weasyprint \
    --css="$CSS" \
    -V lang=es \
    --standalone \
    2>/dev/null || pandoc "$src" -o "$dest" --pdf-engine=weasyprint --css="$CSS" -V lang=es --standalone
}

mkdir -p "$OUT_DIR/handoff"

# Raíz del repo
convert "$ROOT/README.md" "$OUT_DIR/README.pdf"

# docs/*.md (excepto handoff/)
for f in "$ROOT"/docs/*.md; do
  [[ -f "$f" ]] || continue
  base="$(basename "$f" .md)"
  convert "$f" "$OUT_DIR/${base}.pdf"
done

# docs/handoff/*.md
for f in "$ROOT"/docs/handoff/*.md; do
  [[ -f "$f" ]] || continue
  base="$(basename "$f" .md)"
  convert "$f" "$OUT_DIR/handoff/${base}.pdf"
done

echo ""
echo "PDFs generados en: $OUT_DIR"
find "$OUT_DIR" -name '*.pdf' -type f | sort | while read -r pdf; do
  ls -lh "$pdf"
done
