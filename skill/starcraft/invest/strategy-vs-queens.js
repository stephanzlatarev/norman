import Strategy from "./strategy.js";

const UNITS = [
  "nexuses", "pylons", "probes",
  "gateways", "zealots",
  "forges", "upgradeGroundWeapons", "upgradeGroundArmor", "upgradeShields",
];

const LIMIT = {
  nexuses: 3,
  pylons: 20,
  probes: (situation) => (isMaxedOut(situation) ? 54 : 0),
  forges: (situation) => (isMaxedOut(situation) ? 1 : 0),
  gateways: limitGateways,
  upgradeGroundWeapons: 1,
  upgradeGroundArmor: 1,
  upgradeShields: 1,
};

const PARALLEL = {
  pylons: 1,
  zealots: limitGateways,
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

}

function isMaxedOut(situation) {
  return (situation.total.nexuses >= 3);
}

function harvestPerMinute(situation) {
  return (situation.complete.probes - situation.complete.assimilators * 3) * 60;
}

function limitGateways(situation) {
  return (isMaxedOut(situation) && situation.total.forges) ? Math.floor(harvestPerMinute(situation) / 200) : 0;
}
