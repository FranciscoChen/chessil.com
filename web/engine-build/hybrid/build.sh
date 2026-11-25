#!/usr/bin/env bash
# Emscripten 6.0.9. Apply browser.patch to the Stockfish source first.
set -euo pipefail
src=$(realpath "$1")
output=$(realpath -m "$2")
variant=${3:-simd}
here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$output"
cd "$src"
flags=(-mno-simd128 -fno-vectorize -fno-slp-vectorize)
if [[ "$variant" == simd ]]; then
    flags=(-msimd128 -msse4.1 -DUSE_SSE41 -DUSE_SSSE3 -DUSE_SSE2)
elif [[ "$variant" != scalar ]]; then
    echo "Expected simd or scalar" >&2
    exit 2
fi
sources=(attacks.cpp benchmark.cpp bitboard.cpp evaluate.cpp misc.cpp leela_policy.cpp
         movegen.cpp movepick.cpp position.cpp search.cpp thread.cpp timeman.cpp tt.cpp
         uci.cpp ucioption.cpp tune.cpp syzygy/tbprobe.cpp nnue/nnue_accumulator.cpp
         nnue/nnue_misc.cpp nnue/network.cpp nnue/features/k32q2.cpp
         nnue/features/full_threats.cpp nnue/features/pp_3wide.cpp engine.cpp score.cpp memory.cpp)
em++ "${flags[@]}" -std=c++17 -O2 -DNDEBUG -DIS_64BIT -DNNUE_EMBEDDING_OFF -fno-exceptions \
    -I. "${sources[@]}" "$here/browser.cpp" --no-entry -lworkerfs.js \
    -sMODULARIZE=1 -sEXPORT_NAME=ChessilHybrid -sENVIRONMENT=worker -sEXPORTED_RUNTIME_METHODS=ccall,FS \
    -sASYNCIFY=1 -sASYNCIFY_STACK_SIZE=8388608 -sSTACK_SIZE=8388608 \
    -sINITIAL_MEMORY=67108864 -sALLOW_MEMORY_GROWTH=1 -sMAXIMUM_MEMORY=805306368 \
    -sMIN_SAFARI_VERSION=150000 -o "$output/hybrid-$variant.js"
