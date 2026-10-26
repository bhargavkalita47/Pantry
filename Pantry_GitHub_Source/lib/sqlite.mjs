import { DatabaseSync } from "node:sqlite";
// The same prepared-statement contract as Cloudflare D1, for local use and tests.
export function openDatabase(filename){
 const sqlite=new DatabaseSync(filename);
 sqlite.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
 return {
   exec:sql=>sqlite.exec(sql),
   close:()=>sqlite.close(),
   prepare(sql){
     return {bind(...values){return {
       async run(){const r=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(r.changes)}};},
       async first(){return sqlite.prepare(sql).get(...values)||null;}
     }}};
   }
 };
}
