
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {openDatabase} from "../lib/sqlite.mjs";
import {handleState} from "../lib/http.mjs";
const schema=await readFile(new URL("../drizzle/0000_restaurants.sql",import.meta.url),"utf8");
const req=(command,options={})=>new Request("http://localhost/api/state",{method:"POST",headers:{"content-type":"application/json",...options.headers},body:JSON.stringify({operationId:crypto.randomUUID(),...command})});
async function setup(){const db=openDatabase(":memory:");db.exec(schema);const seed=await handleState(req({type:"sample"}),db,"owner-a");assert.equal(seed.status,200);return db;}
test("HTTP: missing identity rejected, owners have independent restaurants",async()=>{
 const db=await setup();
 assert.equal((await handleState(new Request("http://localhost/api/state"),db,null)).status,401);
 const a=await (await handleState(new Request("http://localhost/api/state"),db,"owner-a")).json();
 const b=await (await handleState(new Request("http://localhost/api/state"),db,"owner-b")).json();
 assert.equal(a.state.dishes.length,4);assert.equal(b.state.dishes.length,0);db.close();
});
test("HTTP: simultaneous requests do not overwrite deductions",async()=>{
 const db=await setup();
 const make=()=>req({type:"order",items:[{dishId:"latte",quantity:1}],orderType:"Takeaway"});
 const results=await Promise.all([handleState(make(),db,"owner-a"),handleState(make(),db,"owner-a"),handleState(make(),db,"owner-a")]);
 assert.deepEqual(results.map(r=>r.status),[200,200,200]);
 const {state}=await (await handleState(new Request("http://localhost/api/state"),db,"owner-a")).json();
 assert.equal(state.orders.length,3);assert.equal(state.ingredients.find(i=>i.id==="milk").stock,7400000);db.close();
});
test("HTTP: concurrent duplicate request creates only one order",async()=>{
 const db=await setup();const command={type:"order",operationId:crypto.randomUUID(),items:[{dishId:"latte",quantity:1}],orderType:"Dine-in"};
 const results=await Promise.all([handleState(req(command),db,"owner-a"),handleState(req(command),db,"owner-a")]);
 assert.deepEqual(results.map(r=>r.status),[200,200]);
 const {state}=await (await handleState(new Request("http://localhost/api/state"),db,"owner-a")).json();
 assert.equal(state.orders.length,1);assert.equal(state.ingredients.find(i=>i.id==="milk").stock,7800000);db.close();
});
test("HTTP: concurrent last-serving orders cannot oversell",async()=>{
 const db=await setup();
 await handleState(req({type:"stock",ingredientId:"milk",kind:"Wastage",quantity:7800000,note:"Test last serving"}),db,"owner-a");
 const make=()=>req({type:"order",items:[{dishId:"latte",quantity:1}],orderType:"Dine-in"});
 const results=await Promise.all([handleState(make(),db,"owner-a"),handleState(make(),db,"owner-a")]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const {state}=await (await handleState(new Request("http://localhost/api/state"),db,"owner-a")).json();
 assert.equal(state.orders.length,1);assert.equal(state.ingredients.find(i=>i.id==="milk").stock,0);db.close();
});
test("HTTP: rejects cross-origin writes, malformed JSON and invalid payloads",async()=>{
 const db=await setup();
 assert.equal((await handleState(req({type:"name",name:"Other"},{headers:{origin:"https://other.example"}}),db,"owner-a")).status,403);
 assert.equal((await handleState(new Request("http://localhost/api/state",{method:"POST",headers:{"content-type":"application/json"},body:"{"}),db,"owner-a")).status,400);
 assert.equal((await handleState(req({type:"dish",name:"Bad",category:"Food",price:100,recipe:[null]}),db,"owner-a")).status,400);
 assert.equal((await handleState(req({type:"order",orderType:"Dine-in",items:[null]}),db,"owner-a")).status,400);
 db.close();
});
test("SQLite: saved orders survive closing and reopening the database",async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),"pantry-test-"));const file=path.join(dir,"pantry.sqlite");
 let db=openDatabase(file);db.exec(schema);
 await handleState(req({type:"sample"}),db,"owner");
 await handleState(req({type:"order",items:[{dishId:"latte",quantity:2}],orderType:"Dine-in"}),db,"owner");
 db.close();db=openDatabase(file);
 const {state}=await (await handleState(new Request("http://localhost/api/state"),db,"owner")).json();
 assert.equal(state.orders.length,1);assert.equal(state.ingredients.find(i=>i.id==="milk").stock,7600000);
 db.close();await rm(dir,{recursive:true,force:true});
});
