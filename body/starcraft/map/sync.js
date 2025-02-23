import Map from "./map.js";
import { syncAlerts } from "./alert.js";
import { createDepots } from "./depot.js";
import { createRoutes, syncRoutes } from "./route.js";
import { syncTiers } from "./tier.js";
import { createZones } from "./zone.js";

export function createMap(gameInfo) {
  const time = Date.now();

  Map.create(gameInfo);

  createDepots();
  createZones();

  syncAlerts();
  createRoutes();
  syncTiers();

  console.log("Map created in", Date.now() - time, "ms");
}

export function syncMap(gameInfo) {
  Map.sync(gameInfo);

  syncAlerts();
  syncRoutes();
  syncTiers();
}
