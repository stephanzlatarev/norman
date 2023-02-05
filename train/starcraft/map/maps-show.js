import { MAPS, map } from "./maps.js";

for (const mapName of MAPS) {
  const time = new Date().getTime();
  const it = map(mapName);
  const millis = (new Date().getTime() - time);

  for (const line of it.map()) {
    console.log(line);
  }

  console.log();
  console.log("Map", mapName, "with", it.clusters.length, "clusters", it.nexuses.length, "nexuses", it.bases.length, "bases", millis, "millis");
  console.log();
}
