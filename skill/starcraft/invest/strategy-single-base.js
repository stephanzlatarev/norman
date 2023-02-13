import Strategy from "./strategy.js";

const UNITS = ["pylons", "probes", "assimilators", "gateways", "forges", "zealots"];

const CONDITION = {
  forges: (situation) => (situation.inventory.zealots > 10),
};

const LIMIT = {
  pylons: 8,
  probes: 22,
  assimilators: 2,
  gateways: 4,
  forges: 1,
};

const PARALLEL = {
  pylons: 1,
  probes: 1,
  assimilators: 1,
  gateways: 2,
};

export default class SingleBase extends Strategy {

  units() {
    return UNITS;
  }

  parallel(unit) {
    return PARALLEL[unit] ? PARALLEL[unit] : Infinity;
  }

  limit(unit) {
    return LIMIT[unit];
  }

  isAllowed(unit) {
    return this.get(CONDITION, unit, true);
  }

}
