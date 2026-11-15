const test=require('node:test'),assert=require('node:assert/strict'),headers=require('../isolation');
test('analysis/settings and engine workers are isolated while other site pages retain their normal policy',()=>{
 for(const path of ['/en/training/tutorial','/es/training/endgames/','/zh/training/openings/index.html','/en/analysis?game=verify001','/analysis','/es/settings/','/zh/settings/index.html']){assert.equal(headers(path)['Cross-Origin-Opener-Policy'],'same-origin');assert.equal(headers(path)['Cross-Origin-Embedder-Policy'],'require-corp');}
 assert.equal(headers('/engine/release/worker.js?v=123')['Cross-Origin-Resource-Policy'],'same-origin');for(const path of ['/en/training','/en','/en/login','/game/verify001','/en/engine-source','/analysis-extra'])assert.deepEqual(headers(path),{});
});
