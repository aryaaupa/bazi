import { readFile, readdir, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const files=[];
async function walk(path){for(const item of await readdir(resolve(root,path),{withFileTypes:true})){const child=`${path}/${item.name}`;if(item.isDirectory())await walk(child);else files.push(child);}}
for(const path of ['assets','packages','scripts','test'])await walk(path);
let checked=0;
for(const path of files.filter(path=>/\.(js|mjs)$/.test(path))){
  const result=spawnSync(process.execPath,['--check',resolve(root,path)],{encoding:'utf8'});
  if(result.status!==0)throw new Error(result.stderr);
  const source=await readFile(resolve(root,path),'utf8');
  for(const match of source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g))if(match[1].startsWith('.'))await access(resolve(dirname(resolve(root,path)),match[1]));
  checked++;
}
for(const path of ['index.html','app/index.html','privacy.html','terms.html']){
  const source=await readFile(resolve(root,path),'utf8');
  if(!source.includes('lang="en"')||!source.includes('name="viewport"'))throw new Error(`${path}: missing language or viewport`);
  for(const match of source.matchAll(/(?:href|src)="([^"]+)"/g)){
    const link=match[1];if(link.startsWith('#')||/^(https?:|data:|mailto:)/.test(link))continue;
    await access(resolve(dirname(resolve(root,path)),link.split('#')[0].split('?')[0]));
  }
}
console.log(JSON.stringify({syntaxFiles:checked,localLinks:'passed',imports:'passed'}));
