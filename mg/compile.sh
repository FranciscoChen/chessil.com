#!/bin/sh
set -eu
cd "$(dirname "$0")"
# Require only the move generator intrinsics, avoiding host-specific CPU flags.
compiler="${CXX:-c++}"
"$compiler" -march=x86-64 -mbmi -mbmi2 -mpopcnt -std=c++20 -O3 Gigantua.cpp -o mg.new
chmod 755 mg.new
mv mg.new mg
cp mg ../game/mg
