// Relative URLs keep the same build working at a custom domain or /bazi/.
const VERSION='bazi-workspace-v3-clinical-20261004';
const base=new URL('./',self.location.href);
const files=['./','app/','assets/bazi-logo.png','assets/fonts/HankenGrotesk.woff','assets/brand.css','assets/website.css','assets/website.js','assets/workspace.css','assets/workspace-ui.js','packages/engagement/model.js','packages/engagement/cohort.js','packages/engagement/workspace.js','packages/engagement/interpretation.js','pilot/model-artifact.js','sdk/src/validation.js','sdk/src/utils.js','sdk/src/errors.js','privacy.html','terms.html'];
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(files.map(path=>new URL(path,base).href))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('bazi-workspace-')&&key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;
  // Network first lets published fixes take effect, with an offline cached fallback.
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(VERSION).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request,{ignoreSearch:true}).then(response=>response||Response.error())));
});
