/* Threaded WebAssembly needs isolation on its host pages and worker responses. */
module.exports=url=>{
 const path=String(url).split('?')[0];
 if(/^\/(?:en\/|es\/|zh\/)?(?:analysis|settings)(?:\/index\.html|\/)?$/.test(path))return {'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'};
 if(path.startsWith('/engine/'))return {'Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin'};
 return {};
};
