import Map from "./map.js";
import { syncAlerts } from "./alert.js";
import { createDepots } from "./depot.js";
import { syncTiers } from "./tier.js";
import { createWalls } from "./wall.js";
import { createZones } from "./zone.js";
import Units from "../units.js";

export function createMap(gameInfo) {
  Map.create(gameInfo);

  const base = Units.buildings().values().next().value;

  createDepots(Map.board, Units.resources().values(), base);
  createZones(Map.board);

  syncAlerts();
  syncTiers();

  createWalls(Map.board);
}

export function syncMap(gameInfo) {
  Map.sync(gameInfo);

  syncAlerts();
  syncTiers();
}
