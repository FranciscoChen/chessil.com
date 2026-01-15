const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const stateDir = path.join(rootDir, 'state');

function readConfig() {
  const configPath = path.join(rootDir, 'config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw);
}

function writeStateFile(name, contents) {
  const filePath = path.join(stateDir, name);
  fs.writeFileSync(filePath, contents, 'utf8');
  return filePath;
}

function readStateFile(name) {
  const filePath = path.join(stateDir, name);
  return fs.readFileSync(filePath, 'utf8').trim();
}

module.exports = {
  rootDir,
  stateDir,
  readConfig,
  writeStateFile,
  readStateFile
};
