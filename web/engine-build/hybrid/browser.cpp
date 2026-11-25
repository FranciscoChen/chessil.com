// Browser entry point for the Stockfish hybrid. SPDX-License-Identifier: GPL-3.0-or-later
#include <emscripten.h>
#include <memory>
#include <sstream>

#include "attacks.h"
#include "position.h"
#include "tune.h"
#include "uci.h"

namespace {
std::unique_ptr<Stockfish::UCIEngine> engine;
}

extern "C" {
EMSCRIPTEN_KEEPALIVE void hybrid_init() {
    Stockfish::Attacks::init();
    Stockfish::Position::init();
    engine = std::make_unique<Stockfish::UCIEngine>(Stockfish::CommandLine(0, nullptr));
    Stockfish::Tune::init(engine->engine_options());
}

EMSCRIPTEN_KEEPALIVE void hybrid_command(const char* command) {
    engine->process_command(command);
}

EMSCRIPTEN_KEEPALIVE void hybrid_stop() {
    engine->stop();
}
}
