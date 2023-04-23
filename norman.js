import fs from "fs";
import Norman from "./code/norman.js";

const print = console.log;

console.log = function() {
  print(`[${new Date().toISOString()}]`, ...arguments);
}

const norman = new Norman(JSON.parse(fs.readFileSync("./norman.env").toString()));

norman.start().catch(error => { console.log("ERROR:", error.message); console.log(error); });

process.on('SIGINT', async () => await norman.stop());
process.on('SIGQUIT', async () => await norman.stop());
process.on('SIGTERM', async () => await norman.stop());
