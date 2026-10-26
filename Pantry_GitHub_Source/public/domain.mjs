/**
 * Pure domain layer. Quantities are integer thousandths of a gram / ml / piece.
 * Currency is integer paise. No browser, SQL or HTTP dependencies.
 */
                                      
                                                                                                                       
                                                                  
                                                                                                                  
                                                                                                                                                                                                                                                          
                                                                                                                                 
                                                                                                                                          
export class DomainError extends Error { status       ; constructor(message       ,status=400){super(message);this.status=status;} }
const fail = (message       )       => {throw new DomainError(message);};
function label(v        , field       , max=100)        {if(typeof v!=="string"||!v.trim()||v.trim().length>max) return fail(field+" is required (maximum "+max+" characters).");return v.trim();}
function integer(v        ,field       ,min=0,max=1e12)        {if(typeof v!=="number"||!Number.isSafeInteger(v)||v<min||v>max)return fail(field+" is invalid.");return v;}
function text(v        ,max=150)        {if(v===undefined)return "";if(typeof v!=="string"||v.length>max)return fail("Text is too long.");return v.trim();}
const ticks=(value       )=>Math.round(value*1000);
export function toTicks(value       ,unit       )        {
  if(!Number.isFinite(value)||value<0) return fail("Enter a valid positive quantity.");
  if(!["g","kg","ml","L","pcs"].includes(unit))return fail("Choose a valid unit.");
  if(unit==="pcs"&&!Number.isInteger(value))return fail("Pieces must be whole numbers.");
  return integer(Math.round(value*(unit==="kg"||unit==="L"?1e6:1000)),"Quantity");
}
export function emptyState()       {return {name:"My restaurant",ingredients:[],dishes:[],orders:[],movements:[],operationIds:[]};}
export function sampleState()       {
  const s=emptyState();s.name="The Daily Grind";
  s.ingredients=[
    {id:"coffee",name:"Coffee beans",category:"Dry goods",unit:"g",stock:ticks(2400),low:ticks(500),cost:120000},
    {id:"milk",name:"Whole milk",category:"Dairy",unit:"ml",stock:ticks(8000),low:ticks(3000),cost:6000},
    {id:"bread",name:"Sourdough bread",category:"Bakery",unit:"pcs",stock:ticks(32),low:ticks(10),cost:1200},
    {id:"cheese",name:"Cheddar cheese",category:"Dairy",unit:"g",stock:ticks(420),low:ticks(500),cost:75000},
    {id:"tomato",name:"Tomatoes",category:"Produce",unit:"g",stock:ticks(3200),low:ticks(1000),cost:6000},
    {id:"pasta",name:"Penne pasta",category:"Dry goods",unit:"g",stock:ticks(4500),low:ticks(1000),cost:18000},
    {id:"butter",name:"Butter",category:"Dairy",unit:"g",stock:ticks(180),low:ticks(250),cost:60000},
    {id:"cream",name:"Fresh cream",category:"Dairy",unit:"ml",stock:ticks(1200),low:ticks(400),cost:30000},
  ];
  s.dishes=[
    {id:"latte",name:"Café latte",category:"Coffee",price:16000,active:true,recipe:[{ingredientId:"coffee",quantity:ticks(18)},{ingredientId:"milk",quantity:ticks(200)}]},
    {id:"americano",name:"Americano",category:"Coffee",price:12000,active:true,recipe:[{ingredientId:"coffee",quantity:ticks(18)}]},
    {id:"toastie",name:"Cheese & tomato toastie",category:"Kitchen",price:22000,active:true,recipe:[{ingredientId:"bread",quantity:ticks(2)},{ingredientId:"cheese",quantity:ticks(40)},{ingredientId:"tomato",quantity:ticks(60)},{ingredientId:"butter",quantity:ticks(10)}]},
    {id:"penne",name:"Creamy tomato penne",category:"Kitchen",price:29000,active:true,recipe:[{ingredientId:"pasta",quantity:ticks(120)},{ingredientId:"tomato",quantity:ticks(100)},{ingredientId:"cream",quantity:ticks(60)},{ingredientId:"cheese",quantity:ticks(20)},{ingredientId:"butter",quantity:ticks(10)}]},
  ];
  const at=new Date().toISOString();
  s.movements=s.ingredients.map(i=>({id:crypto.randomUUID(),ingredientId:i.id,delta:i.stock,at,reason:"Opening stock",reference:"Sample setup",note:"Editable sample ingredients"}));
  return s;
}
function checkQuantity(quantity       ,ingredient           ) {integer(quantity,"Quantity",1);if(ingredient.unit==="pcs"&&quantity%1000!==0)fail("Use whole pieces for "+ingredient.name+".");}
export function requirements(s      ,items                                  ) {
  if(!Array.isArray(items)||!items.length||items.length>50)fail("Add between 1 and 50 dishes to the order.");
  const usage=new Map               ();
  const lines=items.map(item=>{
    if(!item||typeof item!=="object")fail("Invalid order item.");
    integer(item.quantity,"Servings",1,999);
    const dish=s.dishes.find(d=>d.id===item.dishId&&d.active);
    if(!dish) return fail("A dish is no longer available. Refresh the menu.");
    dish.recipe.forEach(r=>usage.set(r.ingredientId,(usage.get(r.ingredientId)||0)+r.quantity*item.quantity));
    return {dishId:dish.id,name:dish.name,price:dish.price,quantity:item.quantity};
  });
  const needed=Array.from(usage,([ingredientId,quantity])=>({ingredientId,quantity}));
  for(const r of needed){const i=s.ingredients.find(i=>i.id===r.ingredientId);if(!i)fail("A recipe ingredient is missing.");if(i .stock<r.quantity)throw new DomainError("Not enough "+i .name+". Restock or reduce the order.",409);}
  return {lines,usage:needed,total:lines.reduce((n,i)=>n+i.price*i.quantity,0)};
}
                                                                                
export function applyCommand(previous      ,command        ,now=new Date().toISOString())       {
  const s=structuredClone(previous);
  const op=label(command.operationId,"Request ID",100);
  if(s.operationIds.includes(op))return s;
  // Retain keys for the lifetime of this bounded MVP, never silently evict them.
  if(s.operationIds.length>=10000)fail("Workspace limit reached. Export data before archiving this pilot.");
  const addMovement=(i           ,delta       ,reason       ,reference       ,note="")=>{
    i.stock+=delta;
    if(i.stock<0)fail("Stock cannot go below zero.");
    s.movements.push({id:crypto.randomUUID(),ingredientId:i.id,delta,at:now,reason,reference,note});
  };
  switch(command.type){
    case "sample": {
      if(s.ingredients.length||s.dishes.length||s.orders.length)fail("Sample setup is available only in an empty restaurant.");
      const sample=sampleState();sample.operationIds=[...s.operationIds,op];return sample;
    }
    case "name":s.name=label(command.name,"Restaurant name",80);break;
    case "ingredient": {
      const unit=command.unit        ;if(!["g","ml","pcs"].includes(unit))fail("Choose grams, millilitres or pieces.");
      const name=label(command.name,"Ingredient name");
      if(s.ingredients.some(i=>i.name.toLowerCase()===name.toLowerCase()))fail("An ingredient with this name already exists.");
      if(s.ingredients.length>=200)fail("This pilot supports up to 200 ingredients.");
      const stock=integer(command.stock,"Opening stock");const low=integer(command.low,"Low stock threshold");
      if(unit==="pcs"&&(stock%1000||low%1000))fail("Pieces must be whole numbers.");
      const i           ={id:crypto.randomUUID(),name,category:label(command.category,"Category"),unit,stock:0,low,cost:integer(command.cost,"Cost per base unit",0,1e8)};
      s.ingredients.push(i);addMovement(i,stock,"Opening stock","Ingredient added");break;
    }
    case "edit-ingredient": {
      const i=s.ingredients.find(i=>i.id===command.id);if(!i)fail("Ingredient not found.");
      const name=label(command.name,"Ingredient name");
      if(s.ingredients.some(v=>v.id!==i .id&&v.name.toLowerCase()===name.toLowerCase()))fail("An ingredient with this name already exists.");
      const low=integer(command.low,"Low stock threshold");
      if(i .unit==="pcs"&&low%1000)fail("Pieces must be whole numbers.");
      i .name=name;i .category=label(command.category,"Category");i .low=low;i .cost=integer(command.cost,"Purchase cost",0,1e8);
      break;
    }
    case "dish": {
      const old=s.dishes.find(d=>d.id===command.id);
      if(command.id&&!old)fail("Dish not found.");
      const name=label(command.name,"Dish name");
      if(s.dishes.some(d=>d.id!==old?.id&&d.name.toLowerCase()===name.toLowerCase()))fail("A dish with this name already exists.");
      if(!old&&s.dishes.length>=100)fail("This pilot supports up to 100 dishes.");
      const input=command.recipe                ;
      if(!Array.isArray(input)||!input.length||input.length>30)fail("Add at least one ingredient (maximum 30).");
      const seen=new Set        ();
      const recipe=input.map(r=>{if(!r||typeof r!=="object")fail("Invalid recipe ingredient.");const i=s.ingredients.find(i=>i.id===r.ingredientId);if(!i) return fail("Choose an existing ingredient.");if(seen.has(i.id))fail("Use each ingredient once per recipe.");seen.add(i.id);checkQuantity(r.quantity,i);return {ingredientId:i.id,quantity:r.quantity};});
      const dish      ={id:old?.id??crypto.randomUUID(),name,category:label(command.category,"Category"),price:integer(command.price,"Selling price",1,1e8),active:true,recipe};
      if(old)s.dishes[s.dishes.indexOf(old)]=dish;else s.dishes.push(dish);break;
    }
    case "archive":{const d=s.dishes.find(d=>d.id===command.id);if(!d)fail("Dish not found.");d .active=!d .active;break;}
    case "stock": {
      const i=s.ingredients.find(i=>i.id===command.ingredientId);if(!i)fail("Ingredient not found.");
      const quantity=integer(command.quantity,"Quantity",1);checkQuantity(quantity,i );
      const kind=command.kind;if(!["Restock","Wastage"].includes(kind          ))fail("Choose restock or wastage.");
      if(kind==="Wastage"&&!text(command.note))fail("Add a reason for wastage.");
      addMovement(i ,kind==="Wastage"?-quantity:quantity,kind          ,"Manual adjustment",text(command.note));break;
    }
    case "order": {
      const {lines,usage,total}=requirements(s,command.items                                     );
      const order      ={id:op,number:s.orders.length+1,createdAt:now,customer:text(command.customer,80)||"Walk-in",type:label(command.orderType,"Order type"),status:"placed",items:lines,usage,total};
      if(!["Dine-in","Takeaway","Delivery"].includes(order.type))fail("Choose a valid order type.");
      for(const r of usage)addMovement(s.ingredients.find(i=>i.id===r.ingredientId) ,-r.quantity,"Order","#"+String(order.number).padStart(4,"0"));
      s.orders.push(order);break;
    }
    case "cancel": {
      const order=s.orders.find(o=>o.id===command.id);if(!order)fail("Order not found.");
      if(order .status==="cancelled")break;
      const note=label(command.note,"Cancellation reason",150);
      order .status="cancelled";order .cancelledAt=now;
      for(const r of order .usage)addMovement(s.ingredients.find(i=>i.id===r.ingredientId) ,r.quantity,"Cancellation","#"+String(order .number).padStart(4,"0"),note);
      break;
    }
    default:fail("Unknown action.");
  }
  s.operationIds.push(op);
  if(JSON.stringify(s).length>1500000)fail("Pilot storage limit reached. Export your records before archiving.");
  return s;
}
