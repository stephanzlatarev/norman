import { observeUnits } from "./units.js";

export default function(model, observation) {
  observeBasics(model, observation);

  return observeUnits(model, observation);
}

function observeBasics(model, observation) {
  model.add("Game")
    .set("time", observation.gameLoop)
    .set("minerals", observation.playerCommon.minerals)
    .set("vespene", observation.playerCommon.vespene)
    .set("foodUsed", observation.playerCommon.foodUsed)
    .set("foodCap", observation.playerCommon.foodCap);
}
