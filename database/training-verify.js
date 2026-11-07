#!/usr/bin/env node
'use strict';

// Read-only live verification by default; --offline uses archived raw responses.
// Neither mode changes curriculum, fixtures, databases, or production services.
const assert = require('node:assert/strict');
const curriculum = require('../web/training/curriculum');
const fixtures = require('./training-tablebase-fixtures.json');
const { validateFen, normalizeTablebase, requestTablebase } = require('../web/training-api');

async function verify({ offline = false } = {}) {
  const seeds = new Map(fixtures.positions.map(seed => [seed.fen, seed]));
  const targets = [...fixtures.positions, ...curriculum.endgames.map(lesson => ({
    id: lesson.id, principle: lesson.title, fen: lesson.fen, teachingMove: lesson.moves[0],
    // Every endgame teaching seed currently promises a single principle move.
    category: lesson.category ?? lesson.tablebase?.category ?? seeds.get(lesson.fen)?.category
  }))];
  const responses = new Map();
  const results = [];
  for (const seed of targets) {
    const fen = validateFen(seed.fen);
    if (!responses.has(fen)) {
      const raw = offline ? seeds.get(fen)?.response : await requestTablebase(fen);
      assert.ok(raw, 'No archived response for ' + (seed.id || seed.principle) + ': ' + fen);
      responses.set(fen, normalizeTablebase(raw, fen));
    }
    const result = responses.get(fen);
    assert.equal(result.certainty, 'exact', seed.id || seed.principle);
    assert.equal(result.uniqueOptimal, true, (seed.id || seed.principle) + ' has equivalent alternatives');
    assert.deepEqual(result.optimalMoves, [seed.teachingMove], seed.id || seed.principle);
    if (seed.category) assert.equal(result.category, seed.category, seed.id || seed.principle);
    results.push({ id: seed.id || seed.principle, fen, teachingMove: seed.teachingMove,
      category: result.category, optimalMoves: result.optimalMoves, uniqueOptimal: true });
  }
  return results;
}

if (require.main === module) {
  if (process.argv.slice(2).some(arg => arg !== '--offline')) {
    console.error('Usage: node database/training-verify.js [--offline]');
    process.exitCode = 1;
  } else verify({ offline: process.argv.includes('--offline') })
    .then(results => console.log(JSON.stringify(results, null, 2)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { verify };
