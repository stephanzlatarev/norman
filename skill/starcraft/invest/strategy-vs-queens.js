import Strategy from "./strategy.js";

const UNITS = [
  "pylons", "nexuses", "probes",
  "gateways", "zealots",
];

const CONDITION = {
  nexuses: (situation) => (situation.resources.minerals >= 600),
  pylons: (situation) => (situation.progress.bases || (situation.resources.food < 12)),
  gateways: (situation) => (situation.progress.zealots >= situation.complete.gateways),
};

const LIMIT = {
  nexuses: 3,
  pylons: (situation) => Math.min(situation.inventory.bases * 4, 20),
  probes: (situation) => (Math.min(situation.complete.nexuses * 16, 48) + situation.complete.assimilators * 3),
  gateways: (situation) => (situation.total.nexuses * 4),
};

const PARALLEL = {
  nexuses: 1,
  pylons: 1,
  gateways: 2,
};

export default class CounterQueensRush extends Strategy {

  units() {
    return UNITS;
  }

  parallel(unit) {
    return this.get(PARALLEL, unit, Infinity);
  }

  limit(unit) {
    return this.get(LIMIT, unit, Infinity);
  }

  isAllowed(unit) {
    return this.get(CONDITION, unit, true);
  }

}
