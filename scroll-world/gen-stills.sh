#!/bin/bash
# Krave Kulture scroll-world: scene stills via Codex image_gen (subscription-billed).
# Usage: bash scroll-world/gen-stills.sh [name ...]   (no args = all six)
# Prompts live in scroll-world/prompts/still_<name>.txt; output in scroll-world/work/still_<name>.png
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$ROOT/scroll-world/work"
PROMPTS="$ROOT/scroll-world/prompts"
mkdir -p "$WORK"
ALL="market kitchen truck plate wings finale"
NAMES="${*:-$ALL}"

gen_still_codex() { # name   (< /dev/null REQUIRED for parallel calls)
  local n="$1"
  rm -f "$WORK/still_$n.png"
  codex exec -C "$WORK" -s workspace-write --skip-git-repo-check \
    'Use the image generation tool ($imagegen) to generate: '"$(cat "$PROMPTS/still_$n.txt")"' Wide 3:2 landscape, high resolution. Save it as ./still_'"$n"'.png. Do not do anything else.' \
    > "$WORK/still_$n.codex.log" 2>&1 < /dev/null
  if [ -f "$WORK/still_$n.png" ]; then echo "still $n ok (codex)"; else echo "still $n FAIL (see work/still_$n.codex.log)"; fi
}

# Batches of three: parallel codex calls beyond that get flaky.
set -- $NAMES
while [ $# -gt 0 ]; do
  batch="$1"; shift
  [ $# -gt 0 ] && { batch="$batch $1"; shift; }
  [ $# -gt 0 ] && { batch="$batch $1"; shift; }
  for n in $batch; do gen_still_codex "$n" & done
  wait
done
echo "DONE $(date +%H:%M:%S)"
