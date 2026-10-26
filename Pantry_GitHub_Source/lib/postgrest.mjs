/**
 * D1-compatible prepared statements backed by Supabase's Data API.
 * Only this adapter handles secrets; it is imported by server-side functions.
 */
export function createSupabaseDatabase(url,key,fetcher=fetch){
 const root=new URL("/rest/v1/pantry_workspaces",url).href;
 if(!url.startsWith("https://"))throw Error("SUPABASE_URL must use HTTPS.");
 async function call(method,query="",body,prefer){
  const headers={apikey:key,"Content-Type":"application/json"};
  // Modern secret keys belong only in apikey; legacy service-role JWTs also use Bearer.
  if(!key.startsWith("sb_secret_"))headers.Authorization="Bearer "+key;
  if(prefer)headers.Prefer=prefer;
  const response=await fetcher(root+query,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  if(!response.ok){console.error("Pantry database request failed:",response.status);throw Error("Database unavailable.");}
  if(response.status===204)return [];
  const text=await response.text();return text?JSON.parse(text):[];
 }
 return {
  prepare(sql){return {bind(...args){return {
   async run(){
    if(sql.startsWith("INSERT INTO restaurants")){await call("POST","?on_conflict=owner_id",{owner_id:args[0],revision:0,document:args[1]},"resolution=ignore-duplicates,return=minimal");return {meta:{changes:0}};}
    if(sql.startsWith("UPDATE restaurants")){
     const rows=await call("PATCH","?owner_id=eq."+encodeURIComponent(args[1])+"&revision=eq."+args[2],{document:args[0],revision:args[2]+1,updated_at:new Date().toISOString()},"return=representation");
     return {meta:{changes:rows.length}};
    }
    throw Error("Unsupported database command.");
   },
   async first(){
    if(!sql.startsWith("SELECT revision,document"))throw Error("Unsupported database query.");
    const rows=await call("GET","?owner_id=eq."+encodeURIComponent(args[0])+"&select=revision,document&limit=1");return rows[0]||null;
   }
  };}};}
 };
}
