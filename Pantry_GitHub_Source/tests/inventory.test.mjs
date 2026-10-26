import test from "node:test";
import assert from "node:assert/strict";
import {applyCommand,sampleState,emptyState,toTicks,requirements} from "../lib/inventory.ts";
const cmd=(type,extra={})=>({type,operationId:crypto.randomUUID(),...extra});
const order=(extra={})=>cmd("order",{items:[{dishId:"latte",quantity:3}],orderType:"Dine-in",...extra});
test("3 lattes deduct 54g coffee and 600ml milk, exactly once",()=>{
 const start=sampleState(),command=order();const next=applyCommand(start,command);
 assert.equal(next.ingredients.find(i=>i.id==="coffee").stock,2346000);
 assert.equal(next.ingredients.find(i=>i.id==="milk").stock,7400000);
 assert.equal(next.orders[0].total,48000);
 assert.deepEqual(applyCommand(next,command),next);
 assert.equal(start.ingredients.find(i=>i.id==="milk").stock,8000000);
});
test("shared ingredients aggregate across different dishes",()=>{
 const s=sampleState();const result=requirements(s,[{dishId:"latte",quantity:2},{dishId:"americano",quantity:1}]);
 assert.equal(result.usage.find(r=>r.ingredientId==="coffee").quantity,54000);
});
test("insufficient stock rejects the entire order, including ledger writes",()=>{
 const s=sampleState(),before=JSON.stringify(s);
 assert.throws(()=>applyCommand(s,order({items:[{dishId:"latte",quantity:41}]})),/Not enough/);
 assert.equal(JSON.stringify(s),before);
});
test("two orders competing for last milk: only one can consume it",()=>{
 let s=sampleState();s.ingredients.find(i=>i.id==="milk").stock=200000;
 s=applyCommand(s,order({items:[{dishId:"latte",quantity:1}]}));
 assert.throws(()=>applyCommand(s,order({items:[{dishId:"latte",quantity:1}]})),/Not enough/);
 assert.equal(s.orders.length,1);assert.equal(s.ingredients.find(i=>i.id==="milk").stock,0);
});
test("cancel restores the original recipe snapshot even after recipe edits",()=>{
 const s=sampleState();let n=applyCommand(s,order());
 n=applyCommand(n,cmd("dish",{id:"latte",name:"Café latte",category:"Coffee",price:18000,recipe:[{ingredientId:"coffee",quantity:50000}]}));
 const cancel=cmd("cancel",{id:n.orders[0].id,note:"Cancelled before preparation"});
 n=applyCommand(n,cancel);assert.deepEqual(n.ingredients,s.ingredients);
 const again=applyCommand(n,cmd("cancel",{id:n.orders[0].id,note:"Repeated cancellation"}));
 assert.deepEqual(again.ingredients,s.ingredients);assert.equal(again.movements.length,n.movements.length);
});
test("restock and wastage use bounded, validated quantities",()=>{
 let s=sampleState();const before=s.ingredients[0].stock;
 s=applyCommand(s,cmd("stock",{ingredientId:"coffee",kind:"Restock",quantity:1000000,note:"Delivery"}));
 assert.equal(s.ingredients[0].stock,before+1000000);
 assert.throws(()=>applyCommand(s,cmd("stock",{ingredientId:"coffee",kind:"Wastage",quantity:1,note:""})),/reason/);
 assert.throws(()=>applyCommand(s,cmd("stock",{ingredientId:"coffee",kind:"Wastage",quantity:1e10,note:"Spilled"})),/below zero/);
});
test("kilograms, litres and pieces convert without floating point stock drift",()=>{
 assert.equal(toTicks(1.5,"kg"),1500000);assert.equal(toTicks(.25,"L"),250000);
 assert.equal(toTicks(.125,"g"),125);assert.throws(()=>toTicks(1.5,"pcs"),/whole/);
 let s=sampleState();const initial=s.ingredients[0].stock;
 for(let i=0;i<100;i++)s=applyCommand(s,cmd("stock",{ingredientId:"coffee",kind:"Restock",quantity:125}));
 assert.equal(s.ingredients[0].stock,initial+12500);
});
test("empty / duplicate / fractional piece recipes and invalid orders are rejected",()=>{
 const s=sampleState();
 const base={name:"Test",category:"Kitchen",price:10000};
 for(const recipe of [[],[{ingredientId:"coffee",quantity:1000},{ingredientId:"coffee",quantity:1000}],[{ingredientId:"bread",quantity:500}]]){
  assert.throws(()=>applyCommand(s,cmd("dish",{...base,recipe})));
 }
 for(const quantity of [0,-1,1.5,Infinity])assert.throws(()=>applyCommand(s,order({items:[{dishId:"latte",quantity}]})));
 assert.throws(()=>applyCommand(s,order({items:[{dishId:"missing",quantity:1}]})),/no longer available/);
});
test("new restaurants start empty; sample is explicit and cannot overwrite real data",()=>{
 const s=emptyState();assert.equal(s.ingredients.length,0);
 const n=applyCommand(s,cmd("sample"));assert.equal(n.dishes.length,4);
 assert.throws(()=>applyCommand(n,cmd("sample")),/empty restaurant/);
});
test("archive prevents new orders and history survives",()=>{
 let s=applyCommand(sampleState(),order());s=applyCommand(s,cmd("archive",{id:"latte"}));
 assert.throws(()=>applyCommand(s,order()),/no longer available/);assert.equal(s.orders.length,1);
});
test("ingredient unit cannot change when editing threshold and name",()=>{
 const s=sampleState(),n=applyCommand(s,cmd("edit-ingredient",{id:"coffee",name:"Coffee",category:"Dry goods",low:800000,cost:140000,unit:"ml"}));
 assert.equal(n.ingredients[0].unit,"g");assert.equal(n.ingredients[0].stock,s.ingredients[0].stock);
 assert.equal(n.ingredients[0].low,800000);
});
