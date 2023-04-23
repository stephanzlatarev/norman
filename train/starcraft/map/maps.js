import fs from "fs";
import Map from "../../../body/starcraft/map/map.js";

const MAPS_FILE = "./train/starcraft/map/maps.json";

export const MAPS = [
  "BerlingradAIE",
  "HardwireAIE",
  "WaterfallAIE",
  "StargazersAIE",
  "MoondanceAIE",
  "InsideAndOutAIE",
];

export function read() {
  return JSON.parse(fs.readFileSync(MAPS_FILE));
}

export function map(mapName) {
  const data = read()[mapName];

  return new Map(
    { startRaw: { placementGrid: data.grid } },
    { rawData: { units: data.units },
  });
}

export function store(mapName, data) {
  const maps = read();

  if (!maps[mapName]) maps[mapName] = {};

  for (const key in data) {
    maps[mapName][key] = data[key];
  }

  fs.writeFileSync(MAPS_FILE, JSON.stringify(maps));

  console.log("Successfully updated map", MAP);
}
