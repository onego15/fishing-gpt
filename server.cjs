const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4','.json':'application/json'};
http.createServer((req,res)=>{
  let name;
  try { name = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if(!file.startsWith(root + path.sep) || /(?:^|[\\/])\./.test(path.relative(root,file))) {res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);});
}).listen(Number(process.env.PORT)||4187,'127.0.0.1',()=>console.log(`LUMENLAKE · http://127.0.0.1:${Number(process.env.PORT)||4187}`));
