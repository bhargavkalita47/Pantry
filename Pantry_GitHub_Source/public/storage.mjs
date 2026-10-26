import {createDemoStore} from "./demo-store.mjs";
let demo;
const transport={
 mode:"loading",requiresCode:false,
 async init(){
  let res;
  try{res=await fetch("/api/config",{cache:"no-store"});}
  catch{throw Error("Could not check the connection. Reconnect and try again.");}
  let config;
  if(res.status===404){config={mode:"demo"};}
  else{
   if(!res.ok)throw Error("The server configuration is incomplete. Check the deployment environment.");
   try{config=await res.json();}catch{throw Error("The hosting setup returned an invalid API response.");}
  }
  if(!["demo","cloud","local"].includes(config.mode))throw Error("Unknown storage mode.");
  this.mode=config.mode;this.requiresCode=!!config.requiresCode;
  if(this.mode==="demo")demo=createDemoStore(localStorage,navigator.locks);
 },
 async request(options={}){return this.mode==="demo"?demo.request(options):fetch("/api/state",{cache:"no-store",...options});},
 async reset(blank=false){if(this.mode!=="demo")throw Error("Only the browser demo can be reset.");return demo.reset(blank);},
 async login(code){return fetch("/api/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});},
 async logout(){return fetch("/api/session",{method:"DELETE"});}
};
window.PantryStorage=transport;
try{await transport.init();await import("./pantry.js");}
catch(e){
 const app=document.getElementById("app");app.textContent="";
 const box=document.createElement("div");box.className="loading";
 const title=document.createElement("h2");title.textContent="Couldn’t open Pantry";
 const message=document.createElement("p");message.textContent=e.message;
 const retry=document.createElement("button");retry.className="button";retry.textContent="Try again";retry.onclick=()=>location.reload();
 box.append(title,message,retry);app.append(box);
}
