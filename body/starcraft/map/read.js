import { mapPlayers } from "./players.js";
import { mapResources } from "./resources.js";
import { mapUnitTypes } from "./units.js";

export default function(model, gameInfo, observation) {
  mapPlayers(model, gameInfo, observation);
  mapResources(model, gameInfo, observation);
  mapUnitTypes(model);
}
