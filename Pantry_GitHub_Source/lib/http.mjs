import { applyCommand, emptyState, DomainError } from "./inventory.ts";
export const json=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
async function load(db,owner){
  await db.prepare("INSERT INTO restaurants(owner_id,revision,document) VALUES(?,0,?) ON CONFLICT(owner_id) DO NOTHING").bind(owner,JSON.stringify(emptyState())).run();
  const row=await db.prepare("SELECT revision,document FROM restaurants WHERE owner_id=?").bind(owner).first();
  if(!row)throw new DomainError("Restaurant could not be opened.",503);
  return {state:JSON.parse(row.document),revision:row.revision};
}
export async function handleState(request,db,owner){
  try{
    if(!owner)throw new DomainError("Sign in to open your restaurant.",401);
    if(!db)throw new DomainError("Database is not available.",503);
    if(request.method==="GET")return json(await load(db,owner));
    if(request.method!=="POST")throw new DomainError("Method not allowed.",405);
    const origin=request.headers.get("origin");
    if(origin&&origin!==new URL(request.url).origin)throw new DomainError("Invalid request origin.",403);
    if(!request.headers.get("content-type")?.includes("application/json"))throw new DomainError("Send JSON.",415);
    const raw=await request.text();if(raw.length>30000)throw new DomainError("Request is too large.",413);
    let command;try{command=JSON.parse(raw);}catch{throw new DomainError("Invalid JSON.");}
    if(!command||typeof command!=="object"||Array.isArray(command))throw new DomainError("Invalid command.");
    // A failed compare-and-swap retries against freshly loaded stock.
    // A successful single-row UPDATE atomically saves stock + order + ledger.
    for(let attempt=0;attempt<8;attempt++){
      const {state,revision}=await load(db,owner);
      const next=applyCommand(state,command);
      const result=await db.prepare("UPDATE restaurants SET document=?,revision=revision+1 WHERE owner_id=? AND revision=?").bind(JSON.stringify(next),owner,revision).run();
      if(result.meta.changes===1)return json({state:next,revision:revision+1});
    }
    throw new DomainError("Another order is being saved. Retry this request.",409);
  }catch(e){return json({error:e instanceof DomainError?e.message:"Unable to save. Please try again."},e instanceof DomainError?e.status:500);}
}
