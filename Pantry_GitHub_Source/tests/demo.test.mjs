import test from "node:test";
import assert from "node:assert/strict";
import {createDemoStore} from "../public/demo-store.mjs";
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
test("static demo persists orders, rejects shortages and retries safely",async()=>{
 const storage=memory();const store=createDemoStore(storage);
 let data=await (await store.request()).json();assert.equal(data.state.dishes.length,4);
 const command={type:"order",operationId:crypto.randomUUID(),orderType:"Dine-in",items:[{dishId:"latte",quantity:3}]};
 const options={method:"POST",body:JSON.stringify(command)};
 assert.equal((await store.request(options)).status,200);
 await store.request(options);
 const reopened=createDemoStore(storage);data=await(await reopened.request()).json();
 assert.equal(data.state.orders.length,1);assert.equal(data.state.ingredients.find(i=>i.id==="milk").stock,7400000);
 const tooMany=await store.request({method:"POST",body:JSON.stringify({...command,operationId:crypto.randomUUID(),items:[{dishId:"latte",quantity:99}]})});
 assert.equal(tooMany.status,409);await store.reset(true);
 assert.equal((await(await store.request()).json()).state.ingredients.length,0);
});
test("demo storage failures are reported rather than pretending to save",async()=>{
 const store=createDemoStore({getItem:()=>null,setItem:()=>{throw Error("Storage full");}});
 await assert.rejects(()=>store.request(),/Storage full/);
});
