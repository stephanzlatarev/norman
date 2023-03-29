import Strategy from "./strategy.js";

const UNITS = [
  "pylons", "nexuses", "probes",
  "gateways", "zealots",
];

const CONDITION = {
  pylons: (situation) => (situation.progress.bases || (situation.resources.food < 8 + situation.complete.nexuses + situation.complete.gateways * 2)),
  gateways: (situation) => (situation.progress.zealots >= Math.min(situation.complete.gateways, situation.complete.nexuses * 2)),
};

const LIMIT = {
  nexuses: 4,
  pylons: (situation) => Math.min(situation.inventory.bases * 4, 20),
  probes: (situation) => (Math.min(situation.total.nexuses * 16, 64) + situation.complete.assimilators * 3),
  gateways: (situation) => (situation.total.nexuses * 2),
};

const PARALLEL = {
  nexuses: 1,
  pylons: 1,
  gateways: 2,
  zealots: (situation) => (situation.complete.nexuses * 2),
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
