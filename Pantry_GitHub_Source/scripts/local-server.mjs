/**
 * Node 24+ single-restaurant development server, bound to loopback.
 * Hosted requests use Cloudflare D1 and platform identity, via the same handler.
 */
import http from "node:http";
import { readFile,mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "../lib/sqlite.mjs";
import { handleState } from "../lib/http.mjs";
const root=fileURLToPath(new URL("../",import.meta.url));
const dataDirectory=process.env.PANTRY_DATA_DIR||path.join(root,".pantry-local");
await mkdir(dataDirectory,{recursive:true});
const db=openDatabase(path.join(dataDirectory,"pantry.sqlite"));
db.exec(await readFile(path.join(root,"drizzle/0000_restaurants.sql"),"utf8"));
const port=Number(process.env.PORT||4317);
const allowed=new Set(["127.0.0.1:"+port,"localhost:"+port]);
const assets={"/":"app.html","/app.html":"app.html","/pantry.css":"pantry.css","/pantry.js":"pantry.js","/favicon.svg":"favicon.svg","/storage.mjs":"storage.mjs","/domain.mjs":"domain.mjs"};
const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".svg":"image/svg+xml"};
const server=http.createServer(async(req,res)=>{
 try{
  if(!allowed.has(req.headers.host)){res.writeHead(403);res.end("Invalid host.");return;}
  const url=new URL(req.url,"http://"+req.headers.host);
  if(url.pathname==="/api/config"){res.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store"});res.end(JSON.stringify({mode:"local"}));return;}
  if(url.pathname==="/api/state"){
   let body="";
   if(req.method!=="GET"&&req.method!=="HEAD"){
    for await(const chunk of req){body+=chunk;if(body.length>30000){res.writeHead(413,{"Content-Type":"application/json"});res.end(JSON.stringify({error:"Request is too large."}));return;}}
   }
   const request=new Request(url,{method:req.method,headers:req.headers,body:["GET","HEAD"].includes(req.method)?undefined:body});
   const response=await handleState(request,db,"local-owner");
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
  }
  if(req.method!=="GET"&&req.method!=="HEAD"){res.writeHead(405);res.end();return;}
  if(url.pathname==="/signin-with-chatgpt"){res.writeHead(302,{Location:"/"});res.end();return;}
  const filename=assets[url.pathname];if(!filename){res.writeHead(404);res.end("Not found");return;}
  const content=await readFile(path.join(root,"public",filename));
  res.writeHead(200,{"Content-Type":types[path.extname(filename)],"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"same-origin","Content-Security-Policy":"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; frame-ancestors 'self' https://chatgpt.com"});
  res.end(req.method==="HEAD"?undefined:content);
 }catch{res.writeHead(500,{"Content-Type":"application/json"});res.end(JSON.stringify({error:"Unable to complete the request."}));}
});
server.listen(port,"127.0.0.1",()=>console.log("Pantry is ready: http://127.0.0.1:"+port));
function stop(){server.close(()=>{db.close();process.exit(0);});}
process.on("SIGTERM",stop);process.on("SIGINT",stop);
