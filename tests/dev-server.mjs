// Servidor local mínimo: estáticos + /api/vision (handler real). Uso: npm run dev
import http from 'http';import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import handler from '../api/vision.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const port=Number(process.env.PORT||5173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
http.createServer((req,res)=>{const u=new URL(req.url,'http://x');
  if(u.pathname==='/api/vision'){let b='';req.on('data',d=>b+=d);req.on('end',async()=>{req.body=b?JSON.parse(b):{};const r={setHeader:(k,v)=>res.setHeader(k,v),status(c){res.statusCode=c;return this},json(o){res.setHeader('content-type','application/json');res.end(JSON.stringify(o))}};await handler(req,r)});return}
  let f=path.join(root,u.pathname==='/'?'index.html':u.pathname);if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.statusCode=404;return res.end('404')}
  res.setHeader('content-type',types[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res)}).listen(port,()=>console.log('Lázaro dev en http://localhost:'+port));
