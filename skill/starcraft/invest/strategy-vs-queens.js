import Strategy from "./strategy.js";

const UNITS = [
  "pylons", "nexuses", "probes",
  "gateways", "zealots",
];

const CONDITION = {
  pylons: (situation) => (situation.progress.bases || (situation.resources.food < 8 + situation.complete.nexuses + situation.complete.gateways * 2)),
};

const LIMIT = {
  nexuses: 4,
  pylons: (situation) => Math.min(situation.inventory.bases * 4, 20),
  probes: (situation) => (Math.min(situation.total.nexuses * 16, 48) + situation.complete.assimilators * 3),
  gateways: gatewaysSupportedByHarvest,
};

const PARALLEL = {
  nexuses: 1,
  pylons: 1,
  gateways: 2,
  zealots: gatewaysSupportedByHarvest,
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

function harvestPerMinute(situation) {
  return (situation.complete.probes - situation.complete.assimilators * 3) * 60;
}

function gatewaysSupportedByHarvest(situation) {
  return Math.floor((harvestPerMinute(situation) - 300) / 200);
}
