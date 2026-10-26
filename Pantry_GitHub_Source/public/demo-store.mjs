import { applyCommand, sampleState, emptyState } from "./domain.mjs";
const KEY="pantry.demo.v2";
export function createDemoStore(storage,locks){
 const locked=callback=>locks?.request?locks.request("pantry-demo-write",callback):Promise.resolve().then(callback);
 const read=()=>{
  const raw=storage.getItem(KEY);
  if(raw){try{const data=JSON.parse(raw);if(data&&Number.isInteger(data.revision)&&data.state?.ingredients&&data.state?.orders)return data;}catch{}throw Error("The saved demo could not be read. Export or reset this browser's demo to continue.");}
  const data={revision:0,state:sampleState()};storage.setItem(KEY,JSON.stringify(data));return data;
 };
 return {
  async request(options={}){
   return locked(()=>{
    const previous=read();
    if(options.method==="POST"){
     let command;try{command=JSON.parse(options.body);}catch{return Response.json({error:"Invalid action."},{status:400});}
     try{const next={revision:previous.revision+1,state:applyCommand(previous.state,command)};storage.setItem(KEY,JSON.stringify(next));return Response.json(next);}
     catch(e){return Response.json({error:e.message},{status:e.status||400});}
    }
    return Response.json(previous);
   });
  },
  async reset(blank=false){return locked(()=>{const next={revision:0,state:blank?emptyState():sampleState()};storage.setItem(KEY,JSON.stringify(next));return next;});}
 };
}
