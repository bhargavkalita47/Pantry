import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";
import {hostedConfig,hostedRequest} from "../lib/hosted.mjs";
import {openDatabase} from "../lib/sqlite.mjs";
import {createSupabaseDatabase} from "../lib/postgrest.mjs";
import {sampleState} from "../lib/inventory.ts";
const env={SUPABASE_URL:"https://example.supabase.co",SUPABASE_SECRET_KEY:"sb_secret_test_not_real",SESSION_SECRET:"a".repeat(40),PANTRY_ACCESS_CODE:"testing-access-code"};
test("hosting config: no secrets means demo; partial config fails closed",()=>{
 assert.equal(hostedConfig({}).mode,"demo");
 assert.equal(hostedConfig({SUPABASE_URL:env.SUPABASE_URL}).mode,"error");
 assert.equal(hostedConfig(env).mode,"cloud");
 assert.equal(hostedConfig({...env,SESSION_SECRET:"short"}).mode,"error");
});
test("hosted workspace requires signed session; correct code opens persistent state",async()=>{
 const db=openDatabase(":memory:");db.exec(await readFile(new URL("../drizzle/0000_restaurants.sql",import.meta.url),"utf8"));
 const unauth=await hostedRequest(new Request("https://example.test/api/state"),env,db);assert.equal(unauth.status,401);
 const login=await hostedRequest(new Request("https://example.test/api/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:env.PANTRY_ACCESS_CODE})}),env,db);
 assert.equal(login.status,200);const cookie=login.headers.get("set-cookie").split(";")[0];
 const response=await hostedRequest(new Request("https://example.test/api/state",{headers:{cookie}}),env,db);
 assert.equal(response.status,200);assert.equal((await response.json()).state.ingredients.length,0);
 const forged=await hostedRequest(new Request("https://example.test/api/state",{headers:{cookie:cookie+"x"}}),env,db);assert.equal(forged.status,401);db.close();
});
test("hosted login rejects incorrect codes and cross-origin writes",async()=>{
 const make=(headers,code)=>new Request("https://example.test/api/session",{method:"POST",headers:{"Content-Type":"application/json",...headers},body:JSON.stringify({code})});
 assert.equal((await hostedRequest(make({},"incorrect"),env)).status,401);
 assert.equal((await hostedRequest(make({origin:"https://other.test"},env.PANTRY_ACCESS_CODE),env)).status,403);
});
test("Supabase adapter sends secrets only to backend and uses revision-guarded updates",async()=>{
 const requests=[];
 const db=createSupabaseDatabase(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY,async(url,options)=>{requests.push({url,options});return Response.json(options.method==="PATCH"?[{owner_id:"main"}]:[{revision:2,document:"{}"}]);});
 const row=await db.prepare("SELECT revision,document FROM restaurants WHERE owner_id=?").bind("main").first();assert.equal(row.revision,2);
 const result=await db.prepare("UPDATE restaurants SET document=?,revision=revision+1 WHERE owner_id=? AND revision=?").bind("{}", "main",2).run();
 assert.equal(result.meta.changes,1);assert.match(requests[1].url,/revision=eq.2/);
 assert.equal(JSON.parse(requests[1].options.body).revision,3);
 assert.equal(requests[0].options.headers.apikey,env.SUPABASE_SECRET_KEY);
 assert.equal(requests[0].options.headers.Authorization,undefined);
});
test("browser dashboard and order preview render with actual recipe deductions",async()=>{
 const nodes={app:{innerHTML:""},modal:{open:false,querySelector:()=>null},toast:{textContent:"",classList:{add(){},remove(){}}}};
 const data={state:sampleState(),revision:0};
 const context=vm.createContext({
  window:{PantryStorage:{mode:"demo",request:async()=>Response.json(data)},addEventListener(){}},
  document:{getElementById:id=>nodes[id],activeElement:null,addEventListener(){},querySelectorAll:()=>[]},
  sessionStorage:{getItem:()=>null},HTMLInputElement:class{},Intl,Date,Response,crypto,setTimeout,clearTimeout,console
 });
 nodes.modal.addEventListener=()=>{};
 vm.runInContext(await readFile(new URL("../public/pantry.js",import.meta.url),"utf8"),context);
 await new Promise(resolve=>setImmediate(resolve));
 assert.match(nodes.app.innerHTML,/Browser demo/);assert.match(nodes.app.innerHTML,/The Daily Grind/);
 vm.runInContext('tab="orders";ordersTab="new";cart={latte:3};render();',context);
 assert.match(nodes.app.innerHTML,/54 g/);assert.match(nodes.app.innerHTML,/600 ml/);assert.match(nodes.app.innerHTML,/7.4 L/);
 vm.runInContext('cart={latte:41};render();',context);
 assert.match(nodes.app.innerHTML,/Not enough stock/);assert.match(nodes.app.innerHTML,/data-blocked/);
});
