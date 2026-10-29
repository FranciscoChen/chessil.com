// Public bot identity and versioned difficulty contract, shared by all services.
const swift = Object.freeze({ id:'swift', version:1, minDifficulty:1, maxDifficulty:8, defaultDifficulty:3 });
function difficulty(value = swift.defaultDifficulty) {
  const level=Number(value);
  if (!Number.isInteger(level) || level<swift.minDifficulty || level>swift.maxDifficulty) {
    throw Object.assign(new Error('Choose a difficulty from 1 to 8.'),{status:400});
  }
  return level;
}
module.exports={swift,difficulty};
