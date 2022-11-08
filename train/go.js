import train from "./train.js";

async function run() {
  while (true) await train();
}

run().catch(error => console.log("ERROR:", error));
