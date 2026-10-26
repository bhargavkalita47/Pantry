import {spawnSync} from "node:child_process";
const commands=[["scripts/build.mjs"],["--test","tests/inventory.test.mjs","tests/http.test.mjs","tests/hosting.test.mjs","tests/demo.test.mjs"],["--check","public/pantry.js"],["--check","public/storage.mjs"],["--check","scripts/local-server.mjs"],["--check","api/state.mjs"],["--check","netlify/functions/pantry.mjs"]];
for(const args of commands){const r=spawnSync(process.execPath,args,{stdio:"inherit"});if(r.status!==0)process.exit(r.status||1);}
