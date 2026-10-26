
"use strict";
const icons={
grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
box:'<path d="m3 7 9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10M7 5l10 4"/>',
menu:'<path d="M4 3h13a3 3 0 0 1 3 3v15H7a3 3 0 0 1-3-3V3ZM7 17h13M8 7h8M8 11h5"/>',
order:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h3"/>',
activity:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',
plus:'<path d="M12 5v14M5 12h14"/>',
arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
chevron:'<path d="m9 5 7 7-7 7"/>',
down:'<path d="M12 4v16m-6-6 6 6 6-6"/>',
check:'<path d="m5 12 4 4L19 6"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
edit:'<path d="m14 5 5 5M4 20l5-1L20 8a3 3 0 0 0-4-4L5 15z"/>',
close:'<path d="m6 6 12 12M6 18 18 6"/>',
leaf:'<path d="M20 3C9 2 2 9 5 16c7 6 15-1 15-13ZM4 21 15 10"/>',
cup:'<path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 9h2a3 3 0 0 1 0 6h-2M7 3v2M12 3v2"/>',
alert:'<path d="m12 3 10 18H2zM12 9v5M12 17h.01"/>',
download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
settings:'<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
refresh:'<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>',
rupee:'<path d="M6 4h12M6 8h12M8 4c8 0 8 8 0 8H6l10 8"/>',
store:'<path d="M3 9 5 3h14l2 6M4 13v8h16v-8M9 21v-6h6v6"/><path d="M3 9v1a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V9"/>',
spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>'
};
const icon=(name)=>'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">'+(icons[name]||icons.box)+'</svg>';
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=paise=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(paise/100);
const num=n=>new Intl.NumberFormat("en-IN",{maximumFractionDigits:3}).format(n);
const qty=(ticks,unit,compact=true)=>{const value=ticks/1000;return compact&&unit!=="pcs"&&Math.abs(value)>=1000?num(value/1000)+" "+(unit==="g"?"kg":"L"):num(value)+" "+unit;};
const todayKey=d=>new Date(d).toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
const dateTime=d=>new Date(d).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Kolkata"});
const capacity=d=>Math.min(...d.recipe.map(r=>Math.floor((state.ingredients.find(i=>i.id===r.ingredientId)?.stock||0)/r.quantity)));
const baseUnit=u=>u==="kg"?"g":u==="L"?"ml":u;
function ticks(value,unit){const n=Number(value);if(!Number.isFinite(n)||n<0||!["g","kg","ml","L","pcs"].includes(unit))throw Error("Enter a valid quantity.");if(unit==="pcs"&&!Number.isInteger(n))throw Error("Pieces must be whole numbers.");return Math.round(n*(unit==="kg"||unit==="L"?1000000:1000));}
const costDivisor=i=>i.unit==="pcs"?1000:1000000;
const ingredientIcon=i=>'<span class="item-icon '+(i.category==="Dairy"?"dairy":i.category==="Produce"?"produce":"")+'">'+icon(i.category==="Produce"?"leaf":i.category==="Dairy"?"cup":"box")+'</span>';
const statusPill=i=>i.stock===0?'<span class="pill out">Out of stock</span>':i.stock<=i.low?'<span class="pill low">Low stock</span>':'<span class="pill">In stock</span>';
let state=null,revision=0,tab="overview",ordersTab="history",search="",category="All categories",stockFilter="All stock",cart={},busy=false,errorMessage="",pending=null,toastTimer;
try{pending=JSON.parse(sessionStorage.getItem("pantry.pending")||"null");}catch{}
const modal=document.getElementById("modal");
function toast(message){const el=document.getElementById("toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3500);}
async function refresh(showToast=false){
  try{const res=await window.PantryStorage.request();const data=await res.json();if(res.status===401&&window.PantryStorage.requiresCode){showLogin();return;}if(!res.ok)throw Error(data.error||"Could not open your restaurant.");if(data.revision>=revision){state=data.state;revision=data.revision;}errorMessage="";render();if(showToast)toast("Inventory is up to date.");}
  catch(e){errorMessage=e.message;if(state)render();else document.getElementById("app").innerHTML='<div class="loading">'+icon("alert")+'<h2>Couldn’t open your pantry</h2><p>'+esc(e.message)+'</p><button class="button" data-action="refresh">Try again</button></div>';}
}
async function mutate(command,success){
  if(busy)return false;
  if(pending){toast("Finish saving the pending change first.");return false;}
  pending={...command,operationId:crypto.randomUUID()};sessionStorage.setItem("pantry.pending",JSON.stringify(pending));
  return sendPending(success);
}
async function sendPending(success="Change saved."){
  if(!pending||busy)return false;
  busy=true;updateBusy();
  try{
    const res=await window.PantryStorage.request({method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(pending)});
    const data=await res.json();
    if(!res.ok){
      if(res.status<500){pending=null;sessionStorage.removeItem("pantry.pending");}
      throw Error(data.error||"Unable to save.");
    }
    if(pending.type==="order"){cart={};window.orderCustomer="";ordersTab="history";}if(modal.open)modal.close();state=data.state;revision=data.revision;pending=null;sessionStorage.removeItem("pantry.pending");errorMessage="";busy=false;render();toast(success);return true;
  }catch(e){
    busy=false;errorMessage=e.message;
    const formError=modal.querySelector(".form-error");if(modal.open&&formError)formError.textContent=e.message;else toast(e.message);
    await refresh();errorMessage=e.message;render();return false;
  }finally{busy=false;updateBusy();}
}
function updateBusy(){document.querySelectorAll('[data-save], [data-action="retry"]').forEach(b=>{b.disabled=busy||b.hasAttribute("data-blocked");});}
function heading(title,subtitle,buttons=""){return '<div class="heading"><div><h1>'+title+'</h1><p>'+subtitle+'</p></div><div class="heading-buttons">'+buttons+'</div></div>';}
function button(action,label,kind="",ico="plus",extra=""){return '<button class="button '+kind+'" data-action="'+action+'" '+extra+'>'+icon(ico)+label+'</button>';}
function empty(title,description,action="",label="",ico="box"){return '<div class="empty"><div class="empty-icon">'+icon(ico)+'</div><h3>'+title+'</h3><p>'+description+'</p>'+(action?button(action,label,"small","plus"):"")+'</div>';}
function metric(label,value,sub,ico){return '<div class="metric"><div class="metric-top">'+label+icon(ico)+'</div><div class="metric-number">'+value+'</div><div class="metric-sub">'+sub+'</div></div>';}
function render(){
  if(!state)return;
  const focused=document.activeElement,focusId=focused?.id,selection=focused instanceof HTMLInputElement?focused.selectionStart:null;
  const low=state.ingredients.filter(i=>i.stock<=i.low);
  const names={overview:"Overview",inventory:"Inventory",menu:"Menu & recipes",orders:"Orders",activity:"Stock activity"};
  const nav=[["overview","grid","Overview"],["inventory","box","Inventory"],["menu","menu","Menu & recipes"],["orders","order","Orders"],["activity","activity","Stock activity"]];
  document.getElementById("app").innerHTML='<div class="shell"><aside class="sidebar"><div class="brand"><span class="logo-mark">p</span>pantry<small>·</small></div><div class="workspace"><span class="workspace-icon">'+icon("store")+'</span><div><strong>'+esc(state.name)+'</strong><span class="tiny">Restaurant workspace</span></div></div><p class="eyebrow">WORKSPACE</p><nav class="nav" aria-label="Main navigation">'+nav.map(([id,ico,label])=>'<button data-tab="'+id+'" class="'+(tab===id?"active":"")+'" '+(tab===id?'aria-current="page"':"")+'>'+icon(ico)+'<span class="nav-label">'+label+'</span>'+(id==="inventory"&&low.length?'<span class="badge">'+low.length+'</span>':"")+'</button>').join("")+'</nav><div class="side-bottom"><div class="note">'+icon("leaf")+'<strong> A little less waste.</strong><p>Know what’s in your kitchen before the next order.</p></div><button class="utility" data-action="settings">'+icon("settings")+'Restaurant settings</button><button class="utility" data-action="export">'+icon("download")+'Export your data</button></div></aside><main class="main"><header class="topbar"><div class="breadcrumb">Workspace '+icon("chevron")+'<strong>'+names[tab]+'</strong></div><div class="top-actions"><span class="date">'+new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Kolkata"})+'</span><span><i class="live-dot"></i>'+(window.PantryStorage.mode==="demo"?"Browser demo":window.PantryStorage.mode==="cloud"?"Cloud workspace":"Local workspace")+'</span><button class="refresh" data-action="refresh" title="Refresh stock" aria-label="Refresh stock">'+icon("refresh")+'</button>'+(window.PantryStorage.mode==="demo"?button("reset-demo","Reset demo","small","refresh"):window.PantryStorage.mode==="cloud"?button("logout","Lock","small","close"):"")+'<span class="avatar" title="'+esc(state.name)+'">'+esc(state.name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase())+'</span></div></header><div class="content">'+
  (pending?'<div class="banner">'+icon("clock")+'<div class="grow"><b>A change is waiting to finish saving.</b> Retry safely; it will only apply once.</div>'+button("retry","Retry save","small","refresh")+'</div>':"")+
  (errorMessage&&!pending?'<div class="banner error">'+icon("alert")+'<span class="grow">'+esc(errorMessage)+'</span><button class="icon-button" data-action="dismiss" aria-label="Dismiss error">'+icon("close")+'</button></div>':"")+
  (window.PantryStorage.mode==="demo"?'<div class="demo-note">Interactive demo · Your changes stay in this browser. Try an order, edit a recipe, or reset to start again.</div>':"")+({overview:overview,inventory:inventory,menu:menu,orders:orders,activity:activity}[tab])()+
  '<footer class="bottom-caption"><span>Made for a well-run kitchen.</span><span>Quantities per serving · Prices in INR · Times in IST</span></footer></div></main></div>';
  if(focusId){const field=document.getElementById(focusId);if(field){field.focus();if(selection!==null&&field.setSelectionRange)field.setSelectionRange(selection,selection);}}
  updateBusy();
}
function overview(){
  const today=state.orders.filter(o=>todayKey(o.createdAt)===todayKey(Date.now())&&o.status==="placed");
  const low=state.ingredients.filter(i=>i.stock<=i.low).sort((a,b)=>a.stock/Math.max(a.low,1)-b.stock/Math.max(b.low,1));
  const recent=state.orders.slice(-4).reverse();
  return heading("Your kitchen, at a glance.","A little order. A lot less guesswork.",button("new-order","New order","primary","plus"))+
  (!state.ingredients.length?'<div class="welcome">'+icon("spark")+'<div class="grow"><h2>Let’s get your kitchen ready.</h2><p>Start with your ingredients, add a recipe, then take your first order.</p></div>'+button("sample","Explore a sample café","","cup")+button("add-ingredient","Add ingredients","primary")+'</div>':"")+
  '<div class="metrics">'+metric("Ingredients tracked",state.ingredients.length,low.length?'<span style="color:#ae8546">'+low.length+' need attention</span>':"Your stock, in one place","box")+metric("Active menu items",state.dishes.filter(d=>d.active).length,"Recipes ready for service","menu")+metric("Orders today",today.length,"Confirmed orders, excluding cancellations","order")+metric("Sales today",money(today.reduce((n,o)=>n+o.total,0)),"Before taxes, discounts & delivery fees","rupee")+'</div>'+
  '<div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Needs a little attention</h2><p>Keep the essentials topped up.</p></div><span class="pill '+(low.length?"low":"")+'">'+low.length+' low stock</span></div>'+
  (low.length?low.slice(0,4).map(i=>'<div class="attention-row">'+ingredientIcon(i)+'<div class="grow"><div class="item-name">'+esc(i.name)+'</div><div class="item-sub">'+esc(i.category)+'</div></div><div><div class="stock-amount">'+qty(i.stock,i.unit)+'</div><div class="stock-threshold">Min. '+qty(i.low,i.unit)+'</div><div class="stock-bar"><span style="width:'+Math.min(i.stock/Math.max(i.low,1)*100,100)+'%"></span></div></div><button class="icon-button" data-action="restock" data-id="'+i.id+'" aria-label="Restock '+esc(i.name)+'">'+icon("plus")+'</button></div>').join(""):empty(state.ingredients.length?"All stocked up.":"Your shelves are a blank slate.",state.ingredients.length?"Every ingredient is above its low stock threshold.":"Add your ingredients and we’ll keep an eye on them.",state.ingredients.length?"":"add-ingredient","Add your first ingredient","leaf"))+
  '<div class="panel-footer">'+icon("alert")+'Alerts follow the minimum stock you set.'+button("view-inventory","View inventory","link","arrow")+'</div></section>'+
  '<section class="panel"><div class="panel-head"><div><h2>Recent orders</h2><p>Fresh from your counter.</p></div>'+button("view-orders","View all","link","arrow")+'</div>'+
  (recent.length?recent.map(o=>'<div class="attention-row"><span class="item-icon">'+icon("order")+'</span><div class="grow"><div class="item-name">#'+String(o.number).padStart(4,"0")+' <span class="tiny">· '+esc(o.customer)+'</span></div><div class="item-sub">'+o.items.reduce((n,i)=>n+i.quantity,0)+' items · '+dateTime(o.createdAt)+'</div></div><div class="text-right"><div class="item-name">'+money(o.total)+'</div><span class="pill '+(o.status==="cancelled"?"neutral":"")+'">'+(o.status==="cancelled"?"Cancelled":"Confirmed")+'</span></div></div>').join(""):empty("Your first order is up next.","Choose a dish and we’ll take care of the ingredients.","new-order","Take an order","order"))+'</section>'+
  '<section class="flow-card"><div class="flow-copy"><p class="eyebrow">LESS ADMIN. MORE SERVICE.</p><h2>Every dish tells your stock a story.</h2><p>Define a recipe once. Every order deducts exactly what your kitchen needs, down to the last gram.</p></div><div class="flow-steps"><div class="flow-step"><span>'+icon("menu")+'</span>Your recipe</div><div class="flow-arrow">'+icon("arrow")+'</div><div class="flow-step"><span>'+icon("order")+'</span>An order</div><div class="flow-arrow">'+icon("arrow")+'</div><div class="flow-step"><span>'+icon("box")+'</span>Stock updated</div></div></section></div>';
}
function inventory(){
  let items=state.ingredients.filter(i=>i.name.toLowerCase().includes(search.toLowerCase())&&(category==="All categories"||i.category===category)&&(stockFilter==="All stock"||(stockFilter==="Low stock"?i.stock<=i.low:stockFilter==="Out of stock"?i.stock===0:i.stock>i.low)));
  const value=state.ingredients.reduce((n,i)=>n+i.stock/costDivisor(i)*i.cost,0);
  return heading("A place for every ingredient.","Know what’s on your shelves, and what needs a refill.",button("export-csv","Export CSV","secondary-action","download")+button("add-ingredient","Add ingredient","primary"))+
  '<div class="metrics">'+metric("All ingredients",state.ingredients.length,"Across your kitchen","box")+metric("Low stock",state.ingredients.filter(i=>i.stock>0&&i.stock<=i.low).length,"Ready for a refill","alert")+metric("Out of stock",state.ingredients.filter(i=>i.stock===0).length,"Restock before taking orders","box")+metric("Stock value",money(Math.round(value)),"At the purchase cost you entered","rupee")+'</div>'+
  '<div class="filters"><div class="search">'+icon("search")+'<input id="search" class="input" placeholder="Find an ingredient…" aria-label="Search ingredients" value="'+esc(search)+'"></div><select id="category" aria-label="Ingredient category"><option>All categories</option>'+[...new Set(state.ingredients.map(i=>i.category))].map(c=>'<option '+(category===c?"selected":"")+'>'+esc(c)+'</option>').join("")+'</select><select id="stock-filter" aria-label="Stock status">'+["All stock","In stock","Low stock","Out of stock"].map(c=>'<option '+(stockFilter===c?"selected":"")+'>'+c+'</option>').join("")+'</select></div>'+
  '<section class="panel">'+(state.ingredients.length?'<div class="table-wrap"><table><thead><tr><th>Ingredient</th><th>In stock</th><th>Min. stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+items.map(i=>'<tr><td><div class="ingredient-cell">'+ingredientIcon(i)+'<div><div class="item-name">'+esc(i.name)+'</div><div class="item-sub">'+esc(i.category)+'</div></div></div></td><td><strong>'+qty(i.stock,i.unit)+'</strong></td><td class="muted">'+qty(i.low,i.unit)+'</td><td>'+statusPill(i)+'</td><td><div class="row-actions">'+button("restock","Adjust stock","small","plus",'data-id="'+i.id+'"')+'<button class="icon-button" data-action="edit-ingredient" data-id="'+i.id+'" aria-label="Edit '+esc(i.name)+'">'+icon("edit")+'</button></div></td></tr>').join("")+'</tbody></table></div>'+(!items.length?'<div class="no-results">No ingredients match these filters.</div>':"")+'<div class="table-note">'+items.length+' of '+state.ingredients.length+' ingredients · Stock changes are recorded in your activity log.</div>':empty("Start with what’s in your kitchen.","Add an ingredient, its opening stock and your low stock threshold.","add-ingredient","Add ingredient"))+'</section>';
}
function menu(){
  const dishes=state.dishes.filter(d=>d.name.toLowerCase().includes(search.toLowerCase())&&(category==="All categories"||d.category===category));
  return heading("Good food starts with a recipe.","Set the ingredients for one serving. We’ll do the rest.",button("add-dish","Add menu item","primary"))+
  '<div class="filters"><div class="search">'+icon("search")+'<input id="search" class="input" aria-label="Search menu" placeholder="Find a menu item…" value="'+esc(search)+'"></div><select id="category" aria-label="Menu category"><option>All categories</option>'+[...new Set(state.dishes.map(d=>d.category))].map(c=>'<option '+(category===c?"selected":"")+'>'+esc(c)+'</option>').join("")+'</select></div>'+
  (state.dishes.length?'<div class="menu-grid">'+dishes.map(d=>{const servings=capacity(d);return '<article class="dish-card '+(!d.active?"archived":"")+'"><div class="dish-top"><span class="dish-symbol '+(d.category==="Coffee"?"coffee":"")+'">'+icon(d.category==="Coffee"?"cup":"menu")+'</span><span class="pill '+(!d.active?"neutral":servings===0?"out":"")+'">'+(!d.active?"Archived":servings===0?"Unavailable":servings+" servings left")+'</span></div><h2>'+esc(d.name)+'</h2><div class="dish-meta">'+esc(d.category)+'<strong>'+money(d.price)+'</strong></div><div class="recipe-preview">'+d.recipe.map(r=>{const i=state.ingredients.find(i=>i.id===r.ingredientId);return '<p><span>'+esc(i?.name||"Missing ingredient")+'</span><span>'+qty(r.quantity,i?.unit||"g")+'</span></p>';}).join("")+'</div><div class="dish-bottom"><span class="tiny">For 1 serving</span><div class="row-actions">'+button("edit-dish","Edit recipe","small","edit",'data-id="'+d.id+'"')+'<button class="icon-button" data-action="archive" data-id="'+d.id+'" title="'+(d.active?"Archive dish":"Restore dish")+'" aria-label="'+(d.active?"Archive ":"Restore ")+esc(d.name)+'">'+icon(d.active?"close":"refresh")+'</button></div></div></article>';}).join("")+'</div>'+(!dishes.length?'<div class="no-results">No menu items match your search.</div>':""):'<section class="panel">'+empty("What’s cooking?","Create a dish with its price and ingredients per serving.","add-dish","Create your first recipe","menu")+'</section>');
}
function cartUsage(){
  const used={};for(const [id,count] of Object.entries(cart)){const dish=state.dishes.find(d=>d.id===id&&d.active);if(!dish)continue;dish.recipe.forEach(r=>used[r.ingredientId]=(used[r.ingredientId]||0)+r.quantity*count);}return used;
}
function orders(){
  let html=heading("From the counter to the kitchen.","Every confirmed order keeps your stock in sync.",ordersTab==="history"?button("new-order","New order","primary"):button("view-orders","Order history","","clock"));
  html+='<div class="orders-top"><div class="orders-tabs"><button data-order-tab="history" class="'+(ordersTab==="history"?"active":"")+'">Order history</button><button data-order-tab="new" class="'+(ordersTab==="new"?"active":"")+'">New order</button></div><span class="tiny">'+state.orders.filter(o=>o.status==="placed").length+' confirmed orders</span></div>';
  if(ordersTab==="history")return html+'<section class="panel">'+(state.orders.length?'<div class="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>'+state.orders.slice().reverse().map(o=>'<tr><td><div class="order-number">#'+String(o.number).padStart(4,"0")+'</div><div class="item-sub">'+dateTime(o.createdAt)+'</div></td><td>'+esc(o.customer)+'<div class="item-sub">'+esc(o.type)+'</div></td><td>'+o.items.reduce((n,i)=>n+i.quantity,0)+'</td><td><strong>'+money(o.total)+'</strong></td><td><span class="pill '+(o.status==="cancelled"?"neutral":"")+'">'+(o.status==="cancelled"?"Cancelled":"Confirmed")+'</span></td><td>'+button("order-detail","View order","small","order",'data-id="'+o.id+'"')+'</td></tr>').join("")+'</tbody></table></div>':empty("The counter is open.","Your confirmed orders and their stock deductions will appear here.","new-order","New order","order"))+'</section>';
  const used=cartUsage();const lines=Object.entries(cart).map(([id,count])=>({dish:state.dishes.find(d=>d.id===id),count})).filter(l=>l.dish);
  const shortage=Object.entries(used).some(([id,q])=>(state.ingredients.find(i=>i.id===id)?.stock||0)<q);
  return html+'<div class="order-layout"><div><div class="filters"><div class="search">'+icon("search")+'<input class="input" id="search" aria-label="Find a dish" placeholder="Find a dish to add…" value="'+esc(search)+'"></div></div><div class="order-menu">'+state.dishes.filter(d=>d.active&&d.name.toLowerCase().includes(search.toLowerCase())).map(d=>'<button class="order-dish" data-action="cart-add" data-id="'+d.id+'" '+(capacity(d)<1?"disabled":"")+'><span class="tiny">'+esc(d.category)+'</span><h3>'+esc(d.name)+'</h3><span class="tiny">'+(capacity(d)>0?capacity(d)+" servings available":"Out of ingredients")+'</span><div class="price">'+money(d.price)+'<span>'+icon("plus")+'</span></div></button>').join("")+'</div>'+(!state.dishes.some(d=>d.active)?'<section class="panel">'+empty("Add a recipe first.","Orders use the ingredients defined in each dish.","add-dish","Add a menu item","menu")+'</section>':"")+'</div>'+
  '<section class="panel basket"><div class="panel-head"><div><h2>Current order</h2><p>Review before sending to the kitchen.</p></div>'+icon("order")+'</div><div class="basket-content">'+
  (lines.length?lines.map(({dish:d,count})=>'<div class="basket-row"><div><h3>'+esc(d.name)+'</h3><div class="stepper"><button data-action="cart-minus" data-id="'+d.id+'" aria-label="Remove one '+esc(d.name)+'">−</button><span>'+count+'</span><button data-action="cart-add" data-id="'+d.id+'" aria-label="Add one '+esc(d.name)+'">+</button></div></div><strong>'+money(d.price*count)+'</strong></div>').join(""):empty("Nothing on the ticket yet.","Tap a dish to add it to this order.","","","order"))+
  '<div class="field"><label for="customer">Customer or table <small>optional</small></label><input class="input" id="customer" placeholder="Walk-in / Table 4" maxlength="80" value="'+esc(window.orderCustomer||"")+'"></div><div class="field"><label for="order-type">Order type</label><select id="order-type">'+["Dine-in","Takeaway","Delivery"].map(t=>'<option '+(window.orderType===t?"selected":"")+'>'+t+'</option>').join("")+'</select></div>'+
  (lines.length?'<div class="usage"><h3>Ingredients to deduct</h3>'+Object.entries(used).map(([id,q])=>{const i=state.ingredients.find(i=>i.id===id);return '<div class="usage-line '+(i.stock<q?"short":"")+'"><span>'+esc(i.name)+'</span><b>'+qty(q,i.unit)+' <span title="Remaining after order">→ '+qty(i.stock-q,i.unit)+'</span></b></div>';}).join("")+'</div>':"")+
  (shortage?'<p class="form-error" style="margin:10px 0">Not enough stock for this order. Reduce quantities or restock.</p>':"")+
  '<div class="basket-total"><span>Total</span><span>'+money(lines.reduce((n,{dish,count})=>n+dish.price*count,0))+'</span></div><button class="button primary full" data-save data-action="place-order" '+(!lines.length||shortage||pending?'data-blocked ':'')+(!lines.length||shortage||busy||pending?"disabled":"")+'>'+icon("check")+'Confirm order & deduct stock</button><p class="tiny" style="text-align:center;margin-top:10px">Stock changes only when you confirm.</p></div></section></div>';
}
function activity(){
  const moves=state.movements.slice().reverse().filter(m=>{const i=state.ingredients.find(i=>i.id===m.ingredientId);return (i?.name||"").toLowerCase().includes(search.toLowerCase())&&(category==="All categories"||m.reason===category);});
  return heading("Every gram, accounted for.","Your record of deliveries, orders, wastage and returns.",button("export","Export records","","download"))+
  '<div class="filters"><div class="search">'+icon("search")+'<input class="input" id="search" aria-label="Search stock activity" placeholder="Find an ingredient…" value="'+esc(search)+'"></div><select id="category" aria-label="Activity type"><option>All categories</option>'+[...new Set(state.movements.map(m=>m.reason))].map(c=>'<option '+(category===c?"selected":"")+'>'+esc(c)+'</option>').join("")+'</select></div>'+
  '<section class="panel">'+(state.movements.length?'<div class="table-wrap"><table><thead><tr><th>Ingredient</th><th>Change</th><th>Reason</th><th>Reference / note</th><th>When</th></tr></thead><tbody>'+moves.slice(0,200).map(m=>{const i=state.ingredients.find(i=>i.id===m.ingredientId);return '<tr><td><strong>'+esc(i?.name||"Ingredient")+'</strong></td><td class="delta '+(m.delta>=0?"positive":"negative")+'">'+(m.delta>=0?"+":"−")+qty(Math.abs(m.delta),i?.unit||"g")+'</td><td><span class="pill '+(m.reason==="Wastage"?"out":m.delta<0?"neutral":"")+'">'+esc(m.reason)+'</span></td><td>'+esc(m.reference)+'<div class="item-sub">'+esc(m.note)+'</div></td><td class="muted">'+dateTime(m.at)+'</td></tr>';}).join("")+'</tbody></table></div>'+(!moves.length?'<div class="no-results">No stock activity matches your search.</div>':"")+'<div class="table-note">Showing the latest '+Math.min(moves.length,200)+' matching entries. Export includes your full history.</div>':empty("A fresh start.","Your first ingredient or order will start the stock log.","add-ingredient","Add ingredient","activity"))+'</section>';
}
function openModal(title,subtitle,body,footer,formType=""){
  modal.innerHTML='<form id="modal-form" data-type="'+formType+'"><div class="modal-head"><div><h2>'+title+'</h2><p>'+subtitle+'</p></div><button type="button" class="icon-button" data-action="close" aria-label="Close dialog">'+icon("close")+'</button></div><div class="modal-body">'+body+'</div><p class="form-error" role="alert"></p><div class="modal-footer"><button type="button" class="button" data-action="close">Cancel</button>'+footer+'</div></form>';
  if(!modal.open)modal.showModal();
}
function field(name,label,value="",type="text",extra=""){return '<div class="field"><label for="f-'+name+'">'+label+'</label><input class="input" id="f-'+name+'" name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+extra+'></div>';}
function selectField(name,label,options,value=""){return '<div class="field"><label for="f-'+name+'">'+label+'</label><select id="f-'+name+'" name="'+name+'">'+options.map(([v,l])=>'<option value="'+esc(v)+'" '+(v===value?"selected":"")+'>'+esc(l)+'</option>').join("")+'</select></div>';}
const saveButton=label=>'<button class="button primary" type="submit" data-save>'+icon("check")+label+'</button>';
const unitOptions=unit=>unit==="g"?[["g","g"],["kg","kg"]]:unit==="ml"?[["ml","ml"],["L","L"]]:[["pcs","pcs"]];
function ingredientModal(id){
  const i=state.ingredients.find(i=>i.id===id);
  const unit=i?.unit||"g";
  openModal(i?"Edit ingredient":"Add an ingredient",i?"Stock changes belong in Adjust stock.":"A little detail now makes service easier later.",
    field("name","Ingredient name",i?.name||"","text",'required maxlength="100" placeholder="e.g. Coffee beans"')+
    '<div class="fields-2">'+field("category","Category",i?.category||"Dry goods","text",'required maxlength="100" list="categories"')+'<datalist id="categories">'+["Dry goods","Dairy","Produce","Bakery","Meat & seafood","Beverages","Other"].map(c=>'<option>'+c+'</option>').join("")+'</datalist>'+
    selectField("unit","Base unit",[["g","Weight · grams"],["ml","Volume · millilitres"],["pcs","Count · pieces"]],unit)+'</div>'+
    (!i?'<div class="fields-2">'+field("stock","Opening stock",0,"number",'min="0" step="0.001" required')+selectField("stockUnit","Stock unit",unitOptions(unit),unit)+'</div>':"")+
    '<div class="fields-2">'+field("low","Low stock threshold",i?i.low/1000:0,"number",'min="0" step="0.001" required')+selectField("lowUnit","Threshold unit",unitOptions(unit),unit)+'</div>'+
    field("cost","Purchase cost (₹ per "+(unit==="g"?"kg":unit==="ml"?"litre":"piece")+")",i?i.cost/100:0,"number",'min="0" step="0.01" required')+
    '<p class="help">Recipes use the base unit. Kilograms and litres are converted automatically. Set the threshold to the amount at which you want a refill reminder.</p>'+
    (i?'<input type="hidden" name="id" value="'+i.id+'">':""),
    saveButton(i?"Save ingredient":"Add ingredient"),i?"edit-ingredient":"ingredient");
  if(i)modal.querySelector('[name="unit"]').disabled=true;
}
function recipeRow(r){
  const i=state.ingredients.find(i=>i.id===r?.ingredientId)||state.ingredients[0];
  return '<div class="recipe-row"><select class="recipe-ingredient" aria-label="Recipe ingredient" required>'+state.ingredients.map(v=>'<option value="'+v.id+'" '+(v.id===i?.id?"selected":"")+'>'+esc(v.name)+'</option>').join("")+'</select><input class="recipe-quantity" type="number" aria-label="Quantity per serving" min="0.001" step="0.001" required value="'+(r?r.quantity/1000:"")+'" placeholder="Qty"><select class="recipe-unit" aria-label="Recipe quantity unit">'+unitOptions(i?.unit||"g").map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join("")+'</select><button type="button" class="icon-button" data-action="remove-row" aria-label="Remove ingredient">'+icon("close")+'</button></div>';
}
function dishModal(id){
  if(!state.ingredients.length){toast("Add ingredients before creating your first recipe.");tab="inventory";render();ingredientModal();return;}
  const d=state.dishes.find(d=>d.id===id);
  openModal(d?"Edit your recipe":"Add a menu item","All ingredient amounts are for exactly one serving.",
    field("name","Dish name",d?.name||"","text",'required maxlength="100" placeholder="e.g. Café latte"')+
    '<div class="fields-2">'+field("category","Menu category",d?.category||"Kitchen","text",'required maxlength="100"')+field("price","Selling price (₹)",d?d.price/100:"","number",'min="0.01" step="0.01" required')+'</div>'+
    '<div class="recipe-head"><strong>Ingredients per serving</strong><button class="button link" type="button" data-action="add-row">'+icon("plus")+'Add ingredient</button></div><div id="recipe-rows">'+(d?d.recipe.map(recipeRow).join(""):recipeRow())+'</div><p class="help" style="margin-top:16px">For 1 latte, for example: 18 g coffee + 200 ml milk. An order of 3 lattes will deduct 54 g coffee and 600 ml milk.</p>'+
    (d?'<input type="hidden" name="id" value="'+d.id+'">':""),saveButton(d?"Save recipe":"Add menu item"),"dish");
}
function stockModal(id){
  const i=state.ingredients.find(i=>i.id===id);if(!i)return;
  openModal("Adjust stock","Record a delivery or ingredients that couldn’t be used.",'<div class="help"><strong>'+esc(i.name)+'</strong> · Currently '+qty(i.stock,i.unit)+'</div><input type="hidden" name="ingredientId" value="'+i.id+'">'+
    selectField("kind","Stock change",[["Restock","Restock · add to inventory"],["Wastage","Wastage · remove from inventory"]],"Restock")+
    '<div class="fields-2">'+field("quantity","Quantity","","number",'min="0.001" step="0.001" required')+selectField("quantityUnit","Unit",unitOptions(i.unit),i.unit)+'</div>'+field("note","Note / reason","","text",'maxlength="150" placeholder="e.g. Morning delivery or spilled milk"'),
    saveButton("Save adjustment"),"stock");
}
function detailModal(id){
  const o=state.orders.find(o=>o.id===id);if(!o)return;
  openModal("Order #"+String(o.number).padStart(4,"0"),dateTime(o.createdAt)+" · "+esc(o.type),'<div class="help">'+esc(o.customer)+' · '+(o.status==="placed"?"Confirmed":"Cancelled — stock restored")+'</div>'+
    o.items.map(i=>'<div class="detail-item"><span>'+i.quantity+' × '+esc(i.name)+'</span><strong>'+money(i.price*i.quantity)+'</strong></div>').join("")+
    '<div class="basket-total"><span>Total</span><span>'+money(o.total)+'</span></div><p class="detail-label">Ingredients deducted at the time of this order</p>'+
    o.usage.map(r=>{const i=state.ingredients.find(i=>i.id===r.ingredientId);return '<div class="detail-item"><span>'+esc(i?.name)+'</span><span>'+qty(r.quantity,i?.unit||"g")+'</span></div>';}).join("")+
    (o.status==="placed"?'<p class="help" style="margin-top:20px">Cancel only if the ingredients have not been used. Cancellation returns every deducted ingredient to stock.</p>':""),
    o.status==="placed"?'<button type="button" class="button danger" data-action="cancel-order" data-id="'+o.id+'">Cancel & restore stock</button>':"");
}
function download(filename,content,type){const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([content],{type}));link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}
function exportState(){download("pantry-records-"+todayKey(Date.now())+".json",JSON.stringify({exportedAt:new Date().toISOString(),revision,...state},null,2),"application/json");toast("Your full records have been exported.");}
function csvCell(v){const s=String(v??"");return '"'+((/^[=+\-@\t\r]/.test(s)?"'":"")+s).replaceAll('"','""')+'"';}
document.addEventListener("click",async e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.tab){tab=b.dataset.tab;search="";category="All categories";stockFilter="All stock";render();return;}
  if(b.dataset.orderTab){ordersTab=b.dataset.orderTab;search="";render();return;}
  const action=b.dataset.action,id=b.dataset.id;
  switch(action){
    case "refresh":await refresh(true);break;
    case "reset-demo":openModal("Reset your demo?","This replaces only the data saved in this browser.",'<p class="help">Export your records first if you want to keep them. This cannot be undone.</p>'+selectField("start","Start with",[["sample","Sample café"],["empty","An empty restaurant"]],"sample"),saveButton("Reset demo"),"reset-demo");break;
    case "logout":await window.PantryStorage.logout();state=null;revision=0;showLogin();break;
    case "dismiss":errorMessage="";render();break;
    case "retry":await sendPending();break;
    case "close":modal.close();break;
    case "new-order":tab="orders";ordersTab="new";search="";render();break;
    case "view-orders":tab="orders";ordersTab="history";search="";render();break;
    case "view-inventory":tab="inventory";search="";category="All categories";render();break;
    case "add-ingredient":ingredientModal();break;
    case "edit-ingredient":ingredientModal(id);break;
    case "add-dish":dishModal();break;
    case "edit-dish":dishModal(id);break;
    case "restock":stockModal(id);break;
    case "order-detail":detailModal(id);break;
    case "add-row":modal.querySelector("#recipe-rows").insertAdjacentHTML("beforeend",recipeRow());break;
    case "remove-row":b.closest(".recipe-row").remove();break;
    case "sample":if(await mutate({type:"sample"},"Your sample café is ready. Place an order to try it."))render();break;
    case "settings":openModal("Your restaurant","Give this workspace a name.",field("name","Restaurant / café name",state.name,"text",'required maxlength="80"'),saveButton("Save name"),"name");break;
    case "export":exportState();break;
    case "export-csv":{
      const rows=[["Ingredient","Category","Stock (base unit)","Unit","Low stock threshold","Purchase cost (INR per kg/L/piece)"],...state.ingredients.map(i=>[i.name,i.category,i.stock/1000,i.unit,i.low/1000,i.cost/100])];
      download("pantry-inventory.csv","\uFEFF"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n"),"text/csv;charset=utf-8");break;
    }
    case "archive":await mutate({type:"archive",id},"Menu item updated.");break;
    case "cart-add":{const d=state.dishes.find(d=>d.id===id);if(!d?.active)return;if((cart[id]||0)>=999){toast("Maximum 999 servings per line.");return;}cart[id]=(cart[id]||0)+1;render();break;}
    case "cart-minus":if(cart[id]>1)cart[id]--;else delete cart[id];render();break;
    case "place-order":{
      const items=Object.entries(cart).map(([dishId,quantity])=>({dishId,quantity}));
      if(await mutate({type:"order",items,customer:window.orderCustomer||"",orderType:window.orderType||"Dine-in"},"Order confirmed. Ingredient stock updated.")){cart={};window.orderCustomer="";ordersTab="history";render();}break;
    }
    case "cancel-order":openModal("Cancel this order?","Use this only before ingredients have been used.",'<input type="hidden" name="id" value="'+id+'"><p class="help">All ingredients from this order will return to inventory. For prepared food, keep the order and record any wastage separately.</p>'+field("note","Cancellation reason","","text",'required maxlength="150" placeholder="e.g. Customer cancelled before preparation"'),saveButton("Cancel & restore stock"),"cancel");break;
  }
});
document.addEventListener("input",e=>{
  if(e.target.id==="search"){search=e.target.value;render();}
  if(e.target.id==="customer")window.orderCustomer=e.target.value;
});
document.addEventListener("change",e=>{
  if(e.target.id==="category"){category=e.target.value;render();}
  if(e.target.id==="stock-filter"){stockFilter=e.target.value;render();}
  if(e.target.id==="order-type")window.orderType=e.target.value;
  if(e.target.name==="unit"&&modal.open){
    const unit=e.target.value;
    for(const name of ["stockUnit","lowUnit"]){const sel=modal.querySelector('[name="'+name+'"]');if(sel)sel.innerHTML=unitOptions(unit).map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join("");}
    modal.querySelector('[for="f-cost"]').textContent="Purchase cost (₹ per "+(unit==="g"?"kg":unit==="ml"?"litre":"piece")+")";
  }
  if(e.target.classList.contains("recipe-ingredient")){
    const i=state.ingredients.find(i=>i.id===e.target.value);
    e.target.closest(".recipe-row").querySelector(".recipe-unit").innerHTML=unitOptions(i.unit).map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join("");
  }
});
modal.addEventListener("submit",async e=>{
  e.preventDefault();const form=e.target,data=Object.fromEntries(new FormData(form)),type=form.dataset.type;if(!type)return;
  const err=modal.querySelector(".form-error");err.textContent="";
  try{
    if(type==="login"){const res=await window.PantryStorage.login(data.code);const result=await res.json();if(!res.ok)throw Error(result.error||"Unable to unlock workspace.");modal.close();await refresh();return;}
    if(type==="reset-demo"){const result=await window.PantryStorage.reset(data.start==="empty");state=result.state;revision=result.revision;cart={};pending=null;sessionStorage.removeItem("pantry.pending");errorMessage="";modal.close();render();toast("A fresh demo is ready.");return;}
    let command={type,...data};
    if(type==="ingredient")command={type,name:data.name,category:data.category,unit:data.unit,stock:ticks(data.stock,data.stockUnit),low:ticks(data.low,data.lowUnit),cost:Math.round(Number(data.cost)*100)};
    if(type==="edit-ingredient"){const i=state.ingredients.find(i=>i.id===data.id);command={type,id:data.id,name:data.name,category:data.category,low:ticks(data.low,data.lowUnit),cost:Math.round(Number(data.cost)*100)};}
    if(type==="stock")command={type,ingredientId:data.ingredientId,kind:data.kind,quantity:ticks(data.quantity,data.quantityUnit),note:data.note};
    if(type==="dish"){
      const recipe=[...form.querySelectorAll(".recipe-row")].map(row=>({ingredientId:row.querySelector(".recipe-ingredient").value,quantity:ticks(row.querySelector(".recipe-quantity").value,row.querySelector(".recipe-unit").value)}));
      command={type,id:data.id,name:data.name,category:data.category,price:Math.round(Number(data.price)*100),recipe};
    }
    if(await mutate(command,type==="cancel"?"Order cancelled. Stock restored.":"Saved to your pantry."))modal.close();
  }catch(ex){err.textContent=ex.message;}
});
modal.addEventListener("click",e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});
function showLogin(){
 document.getElementById("app").innerHTML='<div class="loading"><span class="logo-mark">p</span><h2>Your kitchen workspace</h2><p>Enter your access code to open the saved restaurant.</p><button class="button primary" id="unlock">Unlock workspace</button></div>';
 document.getElementById("unlock").onclick=()=>openModal("Open your workspace","Your restaurant data stays on the server.",field("code","Workspace access code","","password",'required autocomplete="current-password"'),saveButton("Unlock workspace"),"login");
 document.getElementById("unlock").click();
}
window.addEventListener("storage",e=>{if(e.key==="pantry.demo.v2"&&window.PantryStorage.mode==="demo"&&!busy){revision=0;refresh();}});
window.addEventListener("focus",()=>{if(state&&!busy&&!modal.open)refresh();});
refresh();
