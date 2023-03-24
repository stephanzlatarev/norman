import Strategy from "./strategy.js";

const UNITS = [
  "pylons", "nexuses", "assimilators", "probes",
  "gateways", "cybernetics", "stalkers", "zealots",
  "forges", "upgradeGroundWeapons", "upgradeGroundArmor", "upgradeShields"
];

const CONDITION = {
  nexuses: (situation) => ((situation.complete.nexuses <= situation.inventory.probes / 19) || (situation.resources.minerals >= 2000)),
  pylons: (situation) => (situation.progress.bases || (situation.resources.food < 10) || (situation.resources.psi >= 100)),
  gateways: (situation) => (situation.progress.zealots + situation.progress.stalkers >= situation.complete.gateways),
  forges: (situation) => (situation.inventory.zealots + situation.inventory.stalkers > 20),
  probes: (situation) => (situation.progress.zealots + situation.progress.stalkers >= situation.complete.gateways),
};

const LIMIT = {
  pylons: (situation) => Math.min(situation.inventory.bases * 4, (220 - situation.complete.nexuses * 15) / 8),
  assimilators: (situation) => (situation.complete.nexuses),
  gateways: (situation) => Math.min(situation.complete.nexuses * 3, 6),
  forges: 1,
  cybernetics: 1,
  probes: (situation) => Math.min(situation.complete.nexuses * 19 + 3, 82), // First nexus usually has 2 assimilators
  upgradeGroundWeapons: 1,
  upgradeGroundArmor: 1,
  upgradeShields: 1,
};

const PARALLEL = {
  nexuses: 1,
  pylons: 1,
  assimilators: 1,
  gateways: 1,
};

const RATIO = {
  zealots: 4,
  stalkers: 1,
};

export default class CounterZerlingsRush extends Strategy {

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

  isAllowed(unit) {
    return this.get(CONDITION, unit, true);
  }

}
