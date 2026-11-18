import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
const base=resolve(fileURLToPath(new URL('.',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
const port=Number(process.env.PORT||4173);
createServer(async(req,res)=>{
 try{
  const pathName=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const path=resolve(base,`.${pathName==='/'?'/index.html':pathName}`);
  if(path!==base && !path.startsWith(base+sep)){res.writeHead(403);res.end('Forbidden');return;}
  const info=await stat(path);if(!info.isFile()){res.writeHead(404);res.end('Not Found');return;}
  res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache'});
  res.end(await readFile(path));
 }catch{res.writeHead(404);res.end('Not Found');}
}).listen(port,'127.0.0.1',()=>console.log(`ELMA365 Explorer: http://localhost:${port}`));
