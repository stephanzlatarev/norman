import Board from "./board.js";
import { syncAlerts } from "./alert.js";
import { createDepots } from "./depot.js";
import { createRoutes, syncRoutes } from "./route.js";
import { createSites } from "./site.js";
import { syncTiers } from "./tier.js";
import { createZones } from "./zone.js";

export function createMap(gameInfo) {
  const time = Date.now();

  Board.create(gameInfo);

  createDepots();
  createZones();
  createSites();

  syncAlerts();
  createRoutes();
  syncTiers();

  console.log("Board created in", Date.now() - time, "ms");
}

export function syncMap(gameInfo) {
  Board.sync(gameInfo);

  syncAlerts();
  syncRoutes();
  syncTiers();
}
