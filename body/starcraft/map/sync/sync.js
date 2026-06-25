import Board from "../board.js";
import Depot from "../depot.js";
import { routeZones } from "../routes.js";
import { syncAlerts } from "./alert.js";
import { syncCorridors } from "./corridors.js";
import { syncEffects } from "./effects.js";
import { syncZones } from "./zones.js";

let loop;
let bases;

export default async function(client, gameInfo, observation) {
  Board.sync(gameInfo);

  syncEffects(observation);
  syncZones();
  syncAlerts();

  await syncCorridors(client);

  if ((loop !== Board.refreshLoop) || (bases !== countBases())) {
    routeZones();

    loop = Board.refreshLoop;
    bases = countBases();
  }
}

function countBases() {
  return Depot.list().filter(zone => !!zone.depot).length;
}
