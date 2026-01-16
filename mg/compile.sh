#!/bin/sh
clang -march=native -std=c++20 -lstdc++ -O3 Gigantua.cpp -flto -o mg
