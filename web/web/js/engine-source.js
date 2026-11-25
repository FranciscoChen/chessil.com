/* Resolve public downloads through the installed engine catalog. */
document.addEventListener('DOMContentLoaded', async () => {
 const name = document.querySelector('[data-engine-source-name]');
 if (!name) return;
 const variant = document.querySelector('[data-source-variant]');
 const selector = document.querySelector('[data-source-engine]');
 const policy = document.querySelector('[data-source-policy]');
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
   document.querySelector('[data-source-lite-build]').hidden = hybrid || !!manifest.policy;
   document.querySelector('[data-source-policy-lite-build]').hidden = !manifest.policy;
   name.textContent = engine.name + (manifest.revision ? ' · ' + manifest.revision : '');
   downloads.querySelector('[data-source-download]').href = local(manifest.source);
   downloads.querySelector('[data-source-license]').href = local(manifest.license);
   const urls = [manifest.wasm || manifest.worker.replace(/\.js$/, '.wasm'), manifest.binary,
    manifest.weights?.policy.url || manifest.policy?.url, manifest.weights?.value.url, manifest.networks?.[0]?.url];
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
  const selectBuild = (choice = variant.value) => {
   const selected = catalog.engines.find(item => item.id === selector.value);
   const chosen = selected.policies?.find(item => item.id === policy.value);
   engine = chosen?.manifest
    ? { name: chosen.engineName, manifest: chosen.manifest, scalarManifest: chosen.scalarManifest,
       threadedManifest: chosen.threadedManifest }
    : selected;
   variant.querySelector('[value="2"]').disabled = !engine.threadedManifest;
   variant.querySelector('[value="scalar"]').disabled = !engine.scalarManifest;
   variant.value = choice === 'scalar' && engine.scalarManifest ? 'scalar' :
    Number(choice) > 1 && engine.threadedManifest ? '2' : '1';
   return load();
  };
  const selectEngine = (policyId, choice) => {
   const selected = catalog.engines.find(item => item.id === selector.value);
   if (!selected) throw Error();
   policy.replaceChildren(...(selected.policies || []).map(item =>
    new Option(item.labels?.[document.documentElement.lang] || item.name, item.id)));
   if (policyId && Array.from(policy.options).some(option => option.value === policyId)) policy.value = policyId;
   return selectBuild(choice);
  };
  selector.onchange = () => selectEngine();
  policy.onchange = () => selectBuild();
  variant.onchange = () => load();
  await selectEngine(query.get('policy'), query.get('variant') === 'scalar' ? 'scalar' : String(query.get('threads') || '1'));
 } catch (_) {
  name.textContent = name.dataset.sourceError;
 }
});
