import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { handleState } from "./http.mjs";
import { createSupabaseDatabase } from "./postgrest.mjs";
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...headers}});
const names=["SUPABASE_URL","SUPABASE_SECRET_KEY","SESSION_SECRET","PANTRY_ACCESS_CODE"];
export function hostedConfig(env){
 const configured=names.filter(k=>env[k]);
 if(!configured.length)return {mode:"demo",requiresCode:false};
 if(configured.length!==names.length||env.SESSION_SECRET.length<32||env.PANTRY_ACCESS_CODE.length<12)return {mode:"error"};
 try{const url=new URL(env.SUPABASE_URL);if(url.protocol!=="https:")return {mode:"error"};}catch{return {mode:"error"};}
 return {mode:"cloud",requiresCode:true};
}
function sign(value,secret){return createHmac("sha256",secret).update(value).digest("base64url");}
function equal(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function newSession(secret,now=Date.now()){
 const payload=Buffer.from(JSON.stringify({owner:"main",expires:now+7*86400000,nonce:randomBytes(12).toString("hex")})).toString("base64url");
 return payload+"."+sign(payload,secret);
}
function owner(request,secret,now=Date.now()){
 const cookie=request.headers.get("cookie")||"";
 const token=cookie.split(";").map(s=>s.trim()).find(s=>s.startsWith("pantry_session="))?.slice(15);
 if(!token)return null;
 const [payload,sig]=token.split(".");
 if(!payload||!sig||!equal(sign(payload,secret),sig))return null;
 try{const data=JSON.parse(Buffer.from(payload,"base64url").toString());return data.owner==="main"&&data.expires>now?"main":null;}catch{return null;}
}
export async function hostedRequest(request,env=process.env,dbOverride){
 const url=new URL(request.url);const config=hostedConfig(env);
 if(url.pathname==="/api/config")return config.mode==="error"?json({error:"Complete the server environment configuration."},503):json(config);
 if(config.mode!=="cloud")return json({error:config.mode==="demo"?"This deployment uses browser demo storage.":"Server configuration is incomplete."},503);
 const origin=request.headers.get("origin");
 if(request.method!=="GET"&&origin&&origin!==url.origin)return json({error:"Invalid origin."},403);
 if(url.pathname==="/api/session"){
  if(request.method==="DELETE")return json({ok:true},200,{"Set-Cookie":"pantry_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"});
  if(request.method!=="POST")return json({error:"Method not allowed."},405);
  if(!request.headers.get("content-type")?.includes("application/json"))return json({error:"Send JSON."},415);
  const raw=await request.text();if(raw.length>1024)return json({error:"Request too large."},413);
  let data;try{data=JSON.parse(raw);}catch{return json({error:"Invalid JSON."},400);}
  const supplied=typeof data?.code==="string"?data.code:"";
  if(!equal(sign(supplied,env.SESSION_SECRET),sign(env.PANTRY_ACCESS_CODE,env.SESSION_SECRET)))return json({error:"That access code is incorrect."},401);
  return json({ok:true},200,{"Set-Cookie":"pantry_session="+newSession(env.SESSION_SECRET)+"; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800"});
 }
 if(url.pathname!=="/api/state")return json({error:"Not found."},404);
 const user=owner(request,env.SESSION_SECRET);
 if(!user)return json({error:"Enter your workspace access code."},401);
 try{return await handleState(request,dbOverride||createSupabaseDatabase(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY),user);}
 catch{return json({error:"The database is unavailable. Please try again."},503);}
}
