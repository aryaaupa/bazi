import { mkdir, rm, cp, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
// Explicit deployment allowlist: no credentials, SQL, datasets, or source metadata.
for (const path of ['index.html','app','patient','assets','packages/engagement','pilot/model-artifact.js','sdk/src','privacy.html','terms.html','404.html','sw.js','robots.txt','_headers']) {
  await mkdir(dirname(resolve(dist,path)),{recursive:true});
  await cp(resolve(root,path),resolve(dist,path),{recursive:true});
}
const redirects = {
  'app.html':'app/', 'demo.html':'app/#patient/BZ-001?guided=1', 'dell-demo.html':'app/#patient/BZ-001?guided=1',
  'pilot/validate.html':'../app/#analytics',
  'company.html':'index.html#product','companies.html':'index.html#product','individuals.html':'index.html#product',
  'research.html':'app/#analytics','resources.html':'app/#integrations','careers.html':'index.html#pilot'
};
for (const [path,target] of Object.entries(redirects)) {
  const content=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${target}"><title>Bazi workspace</title></head><body><p>Bazi has one connected workspace. <a href="${target}">Continue to Bazi</a>.</p></body></html>`;
  await mkdir(dirname(resolve(dist,path)),{recursive:true});await writeFile(resolve(dist,path),content);
}
await writeFile(resolve(dist,'.nojekyll'),'');
console.log(JSON.stringify({built:true,directory:dist,entrypoints:['/','/app/'],legacyAliases:Object.keys(redirects).length}));
