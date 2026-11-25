/* Resolve public downloads through the installed engine catalog. */
document.addEventListener('DOMContentLoaded', async () => {
 const name = document.querySelector('[data-engine-source-name]');
 if (!name) return;
 const variant = document.querySelector('[data-source-variant]');
 const selector = document.querySelector('[data-source-engine]');
 const downloads = document.querySelector('[data-engine-source-downloads]');
 const assets = downloads.querySelectorAll('[data-source-asset]');
 let epoch = 0, engine;
 const get = async url => {
  const response = await fetch(url);
  if (!response.ok) throw Error();
  return response.json();
 };
 const local = url => {
  const parsed = new URL(url, location.origin);
  if (parsed.origin !== location.origin || !parsed.pathname.startsWith('/engine/')) throw Error();
  return parsed.href;
 };
 async function load() {
  const run = ++epoch;
  downloads.hidden = true;
  try {
   const manifest = await get(variant.value === 'scalar' ? engine.scalarManifest :
    variant.value === '2' ? engine.threadedManifest : engine.manifest);
   if (run !== epoch) return;
   const hybrid = !!manifest.weights;
   document.querySelector('[data-source-hybrid-build]').hidden = !hybrid;
   document.querySelector('[data-source-lite-build]').hidden = hybrid;
   name.textContent = engine.name + (manifest.revision ? ' · ' + manifest.revision : '');
   downloads.querySelector('[data-source-download]').href = local(manifest.source);
   downloads.querySelector('[data-source-license]').href = local(manifest.license);
   const urls = [manifest.wasm || manifest.worker.replace(/\.js$/, '.wasm'), manifest.binary,
    manifest.weights?.policy.url, manifest.weights?.value.url, manifest.networks?.[0]?.url];
   assets.forEach((link, index) => {
    link.hidden = !urls[index];
    if (urls[index]) link.href = local(urls[index]);
    else link.removeAttribute('href');
   });
   downloads.hidden = false;
  } catch (_) {
   if (run === epoch) name.textContent = name.dataset.sourceError;
  }
 }
 try {
  const catalog = await get('/engine/catalog.json');
  const query = new URLSearchParams(location.search);
  const id = query.get('engine') || catalog.defaultEngine || catalog.engines[0]?.id;
  selector.replaceChildren(...catalog.engines.map(item => new Option(item.name, item.id)));
  selector.value = id;
  const select = (choice = '1') => {
   engine = catalog.engines.find(item => item.id === selector.value);
   if (!engine) throw Error();
   variant.querySelector('[value="2"]').disabled = !engine.threadedManifest;
   variant.querySelector('[value="scalar"]').disabled = !engine.scalarManifest;
   variant.value = choice === 'scalar' && engine.scalarManifest ? 'scalar' :
    Number(choice) > 1 && engine.threadedManifest ? '2' : '1';
   return load();
  };
  selector.onchange = () => select();
  variant.onchange = () => load();
  await select(query.get('variant') === 'scalar' ? 'scalar' : String(query.get('threads') || '1'));
 } catch (_) {
  name.textContent = name.dataset.sourceError;
 }
});
