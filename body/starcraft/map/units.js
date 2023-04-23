import { CLASS, OWN_UNITS, IS_PRODUCED_BY } from "../units.js";

export function mapUnitTypes(model) {
  for (const code in OWN_UNITS) {
    const type = model.add(OWN_UNITS[code]).set("isUnitType", true);

    if (CLASS[code] === "building") {
      type.set("isBuildingType", true);
    }
  }
  for (const unit in IS_PRODUCED_BY) {
    model.add(unit).set("isUnitType", true).set("isProducedBy", model.add(IS_PRODUCED_BY[unit]).set("isUnitType", true));
  }
}
