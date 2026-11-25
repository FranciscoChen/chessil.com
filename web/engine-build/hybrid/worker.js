// Browser UCI transport for the Stockfish hybrid. SPDX-License-Identifier: GPL-3.0-or-later
'use strict';

const output = line => self.postMessage(line);
const command = (module, text) => module.ccall('hybrid_command', null, ['string'], [text], { async: true });

async function loadWeights(file, compressed = false) {
 if (compressed && !self.DecompressionStream) throw new Error('This browser cannot unpack the hybrid value network');
 const response = await fetch(file.url, compressed ? {} : { integrity: file.integrity });
 if (!response.ok) throw new Error('Could not download ' + file.name);
 if (!compressed) return new Uint8Array(await response.arrayBuffer());
 const reader = response.body.pipeThrough(new DecompressionStream('gzip')).getReader();
 const bytes = new Uint8Array(file.size);
 let offset = 0;
 while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  bytes.set(value, offset);
  offset += value.length;
 }
 if (offset !== bytes.length) throw new Error('Incomplete hybrid value weights');
 return bytes;
}

async function boot() {
 const response = await fetch('weights.json');
 if (!response.ok) throw new Error('Hybrid weights manifest unavailable');
 const weights = await response.json();
 importScripts('hybrid-simd.js');
 const [module, value, policy] = await Promise.all([
  ChessilHybrid({ print: output, printErr: output }),
  loadWeights(weights.value, true).catch(error => { throw Error('Value NNUE: ' + error.message); }),
  loadWeights(weights.policy).catch(error => { throw Error('V5 policy: ' + error.message); }),
 ]);
 if (value.length !== weights.value.size || policy.length !== weights.policy.size) {
  throw new Error('Incomplete hybrid weights');
 }
 // Adopt the decoded arrays in MEMFS and release the value file once loaded.
 module.FS.mkdir('/value');
 module.FS.mkdir('/policy');
 module.FS.writeFile('/value/' + weights.value.name, value, { canOwn: true });
 module.FS.writeFile('/policy/' + weights.policy.name, policy, { canOwn: true });
 module.FS.chdir('/value');
 module._hybrid_init();
 module.FS.chdir('/');
 module.FS.unlink('/value/' + weights.value.name);
 await command(module, 'setoption name CompactPolicyFile value /policy/' + weights.policy.name);
 return module;
}

let module, running = false;
let queue = boot().then(instance => { module = instance; });
queue.catch(error => output('ERROR: ' + error.message));
self.onmessage = ({ data }) => {
 if (data === 'stop') {
  if (running) module._hybrid_stop();
  return;
 }
 if (typeof data !== 'string') return;
 queue = queue.then(async () => {
  running = /^go(?: |$)/.test(data);
  try {
   await command(module, data);
  } finally {
   running = false;
  }
 }).catch(error => {
  output('ERROR: ' + error.message);
  self.close();
 });
};
