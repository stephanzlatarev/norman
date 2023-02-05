import { MAP, map } from "./maps.js";

const it = map();

for (const line of it.map()) {
  console.log(line);
}

console.log();
console.log("Map", MAP, "with", it.clusters.length, "clusters", it.nexuses.length, "nexuses", it.bases.length, "bases");
