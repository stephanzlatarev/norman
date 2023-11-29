import { observeUnits } from "./units.js";

export default function(model, observation) {
  observeBasics(model, observation);

  const units = observeUnits(model, observation);

  observeHeatmap(model, observation);

  return units;
}

function observeBasics(model, observation) {
  model.add("Game")
    .set("time", observation.gameLoop)
    .set("minerals", observation.playerCommon.minerals)
    .set("vespene", observation.playerCommon.vespene)
    .set("foodUsed", observation.playerCommon.foodUsed)
    .set("foodCap", observation.playerCommon.foodCap);
}
