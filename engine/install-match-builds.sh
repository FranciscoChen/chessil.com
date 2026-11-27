#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

assets=../web/web/engine/cb2770c9fa3a4234
destination=match-builds-installed
work=$(mktemp -d .match-builds.XXXXXX)
trap 'rm -rf -- "$work"' EXIT

verify() {
  (cd "$1" && sha256sum --check <<'SUMS'
b75d83809713b2b5072e204e232ed7820089a109b4bce40e19665e065118cc12  stockfish
46a0bd48ad6ffa0b0c36acca287bedb2328df7120fd9f4000b7f6b020ea057fc  stockfish-hybrid
7a702165ba92072006f99708a16aeb60508130d9044412a17a29ad526b04008e  champion.policy
SUMS
  )
}

if [[ -d "$destination" ]]; then
  verify "$destination"
  exit
fi

mkdir "$work/runtime"
tar -xzf match-builds/runtime.tar.gz -C "$work/runtime"
gzip -dc -- "$assets/nn-c9e480e92425.nnue.gz" > "$work/eval.nnue"
cp -- "$assets/v5-7a702165ba92.policy" "$work/champion.policy"

# Both archived executables embed the same NNUE. Insert the verified release
# bytes at their original offsets to recover each full ELF byte for byte.
restore() {
  local name=$1 offset=$2
  gzip -dc -- "match-builds/$name.code.gz" > "$work/code"
  {
    head -c "$offset" "$work/code"
    cat "$work/eval.nnue"
    tail -c "+$((offset + 1))" "$work/code"
  } > "$work/$name"
  chmod 0755 "$work/$name"
}
restore stockfish "$((0x84040))"
restore stockfish-hybrid "$((0x6a040))"
verify "$work"

for name in stockfish stockfish-hybrid; do
  printf 'uci\nquit\n' | "$work/runtime/ld-linux-x86-64.so.2" --library-path "$work/runtime" "$work/$name" > "$work/uci"
  grep -qx uciok "$work/uci"
done

rm -- "$work/eval.nnue" "$work/code" "$work/uci"
mv -T -- "$work" "$destination"
