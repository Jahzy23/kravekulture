#!/bin/bash
# Fallback: generate the six stills through the OpenAI Image API (gpt-image-2) using the
# Codex imagegen CLI. Needs OPENAI_API_KEY in the environment (set it yourself; never paste it in chat).
#   bash scroll-world/gen-stills-api.sh
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE_GEN="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/image_gen.py"
[ -n "${OPENAI_API_KEY:-}" ] || { echo "OPENAI_API_KEY is not set"; exit 1; }
[ -f "$IMAGE_GEN" ] || { echo "image_gen.py not found at $IMAGE_GEN"; exit 1; }
python "$IMAGE_GEN" generate-batch --input "$ROOT/scroll-world/work/batch.jsonl" \
  --out-dir "$ROOT/scroll-world/work" --concurrency 3 --force --no-augment
ls -la "$ROOT"/scroll-world/work/still_*.png 2>/dev/null
