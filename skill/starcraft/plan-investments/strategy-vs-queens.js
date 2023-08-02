import Strategy from "./strategy.js";

const UNITS = [
  "pylons", "gateways", "zealots",
  "forges", "groundWeapons", "groundArmor", "shields",
];

const LIMIT = {
  pylons: 18,
  gateways: 18,
  forges: 1,
  groundWeapons: 1,
  groundArmor: 1,
  shields: 1,
};

const CONDITION = {
  pylons: canBuildPylon,
  gateways: canBuildGateway,
  zealots: canTrainZealot,
  forges: canBuildForge,
  groundArmor: canUpgradeGroundArmor,
  shields: canUpgradeShields,
};

export default class CounterQueensRush extends Strategy {

  units() {
    return UNITS;
  }

  limit(unit) {
    return this.get(LIMIT, unit, Infinity);
  }

  isAllowed(unit) {
    return this.get(CONDITION, unit, true);
  }

}

function hasAllNexuses(situation) {
  return (situation.inventory.nexuses >= 4);
}

function canBuildPylon(situation) {
  return hasAllNexuses(situation) && (situation.progress.pylons + situation.ordered.pylons < 1);
}

function canBuildGateway(situation) {
  return hasAllNexuses(situation) && !canTrainZealot(situation) && !canBuildPylon(situation);
}

function canTrainZealot(situation) {
  return hasAllNexuses(situation) && (situation.progress.zealots < situation.complete.gateways);
}

function canBuildForge(situation) {
  return hasAllNexuses(situation) && !canBuildPylon(situation);
}

function canUpgradeGroundArmor(situation) {
  return (situation.complete.groundWeapons >= 1);
}

function canUpgradeShields(situation) {
  return (situation.complete.groundArmor >= 1);
}
