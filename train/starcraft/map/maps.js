import fs from "fs";
import Map from "../../../body/starcraft/map.js";

const MAPS_FILE = "./train/starcraft/map/maps.json";

export const MAP = "StargazersAIE";

export function read() {
  return JSON.parse(fs.readFileSync(MAPS_FILE));
}

export function map() {
  const data = read()[MAP];

  return new Map(
    { startRaw: { placementGrid: data.grid } },
    { rawData: { units: data.units },
  });
}

export function store(data) {
  const maps = read();

  if (!maps[MAP]) maps[MAP] = {};

  for (const key in data) {
    maps[MAP][key] = data[key];
  }

  fs.writeFileSync(MAPS_FILE, JSON.stringify(maps));

  console.log("Successfully updated map", MAP);
}
