import {readFile,mkdir,writeFile,rename,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import fetch from 'node-fetch';
import {HttpsProxyAgent} from 'https-proxy-agent';
const manifest=JSON.parse(await readFile(new URL('./bottle-model.json',import.meta.url),'utf8'));
const root=new URL('../public/models/bottle/',import.meta.url);
const proxy=process.env.HTTPS_PROXY || process.env.https_proxy;
const agent=proxy?new HttpsProxyAgent(proxy):undefined;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
try{
  await mkdir(root,{recursive:true});
  // Install shards first; expose the model manifest only when every shard is verified.
  const entries=Object.entries(manifest.files).sort(([a],[b])=>(a==='model.json')-(b==='model.json'));
  for(const [name,expected] of entries){
    const target=new URL(name,root);
    try{if(hash(await readFile(target))===expected)continue;}catch{}
    const response=await fetch(manifest.baseUrl+name,{agent,timeout:45000});
    if(!response.ok)throw new Error(`Model download returned HTTP ${response.status}`);
    const bytes=await response.buffer();
    if(hash(bytes)!==expected)throw new Error('Model checksum mismatch');
    const temporary=new URL(name+'.tmp',root);await writeFile(temporary,bytes);await rename(temporary,target);
  }
  console.log('Bottle recognition model ready locally (SHA-256 verified).');
}catch(error){
  await unlink(new URL('model.json',root)).catch(()=>{});
  console.warn(`Local bottle model was not prepared: ${error.message}. Run npm run prepare:model to retry. The app can try the official online model; manual selection and OCR remain available.`);
  if(process.argv.includes('--strict'))process.exitCode=1;
}
