import Map from "./map.js";
import { mapPlayers } from "./players.js";
import { mapResources } from "./resources.js";
import { mapUnitTypes } from "./units.js";

export default function(model, gameInfo, observation, homebase) {
  const map = new Map(gameInfo, observation);

  mapPlayers(model, gameInfo, observation);
  mapResources(model, map, homebase);
  mapUnitTypes(model);

  return map;
}
