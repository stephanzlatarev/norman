import Strategy from "./strategy.js";

const UNITS = [
  "nexuses", "pylons", "probes",
  "gateways", "zealots", "sentries",
  "forges", "upgradeGroundWeapons", "upgradeGroundArmor", "upgradeShields",
];

const LIMIT = {
  nexuses: 4,
  pylons: (situation) => ((situation.total.nexuses >= 4) ? 18 : 0),
  probes: (situation) => ((situation.total.nexuses >= 4) ? 70 : 0),
  forges: (situation) => ((situation.complete.nexuses >= 4) ? 1 : 0),
  gateways: limitGateways,
  upgradeGroundWeapons: 1,
  upgradeGroundArmor: 1,
  upgradeShields: 1,
};

const PARALLEL = {
  pylons: 1,
  zealots: limitZealots,
  sentries: limitSentries,
};

const RATIO = {
  zealots: 6,
  sentries: 1,
};

export default class CounterQueensRush extends Strategy {

  units() {
    return UNITS;
  }

  ratio(unit) {
    return RATIO[unit];
  }

  parallel(unit) {
    return this.get(PARALLEL, unit, Infinity);
  }

  limit(unit) {
    return this.get(LIMIT, unit, Infinity);
  }

}

function isMaxedOut(situation) {
  return (situation.inventory.probes >= 62);
}

function harvestPerMinute(situation) {
  return (situation.complete.probes - situation.complete.assimilators * 3) * 60;
}

function limitGateways(situation) {
  return isMaxedOut(situation) ? Math.floor(harvestPerMinute(situation) / 200) : 0;
}

function limitSentries(situation) {
  return limitGateways(situation) / 6;
}

function limitZealots(situation) {
  return limitGateways(situation);
}
