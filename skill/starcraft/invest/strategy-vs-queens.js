import Strategy from "./strategy.js";

const UNITS = [
  "pylons", "nexuses", "probes",
  "gateways", "zealots",
  "forges", "upgradeGroundWeapons", "upgradeGroundArmor", "upgradeShields"
];

const CONDITION = {
  nexuses: (situation) => ((situation.total.nexuses <= situation.inventory.probes / 16) || (situation.resources.minerals >= 2000)),
  pylons: (situation) => (situation.progress.bases || (situation.resources.food < 12)),
  probes: (situation) => (situation.progress.zealots >= situation.complete.gateways),
  gateways: (situation) => (situation.progress.zealots >= situation.complete.gateways),
  forges: (situation) => (situation.inventory.zealots > 20),
};

const LIMIT = {
  nexuses: 3,
  pylons: (situation) => Math.min(situation.inventory.bases * 4, 20),
  probes: (situation) => (Math.min(situation.complete.nexuses * 16, 48) + situation.complete.assimilators * 3),
  gateways: (situation) => Math.min(situation.total.nexuses * 2, 6),
  forges: 1,
  upgradeGroundWeapons: 1,
  upgradeGroundArmor: 1,
  upgradeShields: 1,
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
