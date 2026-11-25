#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
assets="../web/web/engine/cb2770c9fa3a4234"
eval_file="nn-c9e480e92425.nnue"
policy_file="v5-7a702165ba92.policy"
build_id=$(sha256sum build-hybrid.sh hybrid-native.patch "$assets/source.zip" | sha256sum)
if [[ -x stockfish-hybrid && -f .stockfish-hybrid-build && "$(< .stockfish-hybrid-build)" == "$build_id" ]]; then
  exit 0
fi

work=$(mktemp -d .hybrid-build.XXXXXX)
trap 'rm -r -- "$work"' EXIT
python3 -m zipfile -e "$assets/source.zip" "$work"
patch --batch --forward -d "$work" -p1 < hybrid-native.patch
mkdir -p "$work/weights" "$work/stockfish/scripts"
cp -- "$assets/$policy_file" "$work/weights/"
gzip -dc -- "$assets/$eval_file.gz" > "$work/stockfish/src/$eval_file"
(
  cd "$work"
  sha256sum --check <<'SUMS'
c9e480e92425f887df6ab9b05c6180fbd762b07879df9d9845f1aa75440caa73  stockfish/src/nn-c9e480e92425.nnue
7a702165ba92072006f99708a16aeb60508130d9044412a17a29ad526b04008e  weights/v5-7a702165ba92.policy
SUMS
)
# The source's make target expects this helper. The bundled network was already
# verified above, so this build never needs to fetch weights.
cat > "$work/stockfish/scripts/net.sh" <<'NET'
test -s nn-c9e480e92425.nnue
NET
nice -n 10 make -C "$work/stockfish/src" -j1 build ARCH=x86-64 EXTRACXXFLAGS=-DCHESSIL_EMBED_POLICY
printf '%s\n' "$build_id" > "$work/build-id"
mv -f -- "$work/stockfish/src/stockfish" stockfish-hybrid
mv -f -- "$work/build-id" .stockfish-hybrid-build
