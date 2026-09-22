#!/bin/bash
# Convert generated stills (scroll-world/work/still_<name>.png) into the site's posters
# (site/world/<name>.webp, 1800px wide). Run after the six PNGs exist.
#   bash scroll-world/build-stills.sh
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$ROOT/scroll-world/work"
OUT="$ROOT/site/world"
mkdir -p "$OUT"
missing=0
for n in market kitchen truck plate wings finale; do
  src="$WORK/still_$n.png"
  if [ ! -f "$src" ]; then echo "MISSING $src"; missing=1; continue; fi
  ffmpeg -v error -y -i "$src" -vf "scale=1800:-2:flags=lanczos" -c:v libwebp -quality 84 -compression_level 6 "$OUT/$n.webp"
  echo "$n.webp $(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$OUT/$n.webp") $(du -h "$OUT/$n.webp" | cut -f1)"
done
[ $missing -eq 0 ] && echo "ALL SIX POSTERS READY" || echo "some stills missing; generate them first"
