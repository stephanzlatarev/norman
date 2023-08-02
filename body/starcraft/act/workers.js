import command from "./command.js";
import { ACTIONS } from "../units.js";

export default async function(model, client, units) {
  for (const unit of units) {
    const currentAbilityId = unit.get("orderAbilityId");

    const product = unit.get("produce");
    const location = unit.get("produceAt");

    if (product && location) {
      const action = ACTIONS.probe[product.label];
      let isPerformingTheAction = false;

      if (!action) {
        console.log("Unknown building for probe to build:", product.label);
        continue;
      }

      if (currentAbilityId !== action) {
        const produceUnitTypeNode = unit.get("produceUnitType");
        const produceUnitType = produceUnitTypeNode ? produceUnitTypeNode.label : null;

        if (produceUnitType !== product.label) {
          isPerformingTheAction = await command(client, unit, action, location);

          if (isPerformingTheAction) {
            unit.set("produceUnitType", model.add(product.label));
          } else if (!location.get("type")) {
            model.memory.remove(location);
          }
        }
      } else {
        isPerformingTheAction = true;
      }

      if (!isPerformingTheAction) {
        unit.clear("isProducer");
        unit.clear("produce");
        unit.clear("produceAt");
        unit.clear("produceUnitType");
      }

      continue;
    }
  }
}
