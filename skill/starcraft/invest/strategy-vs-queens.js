import Strategy from "./strategy.js";

const UNITS = [
  "pylons", "nexuses", "assimilators", "probes",
  "gateways", "cybernetics", "stalkers", "sentries", "zealots",
  "councils", "shrines", "templars",
  "forges", "upgradeGroundWeapons", "upgradeGroundArmor", "upgradeShields"
];

const CONDITION = {
  nexuses: (situation) => ((situation.total.nexuses <= situation.inventory.probes / 20) || (situation.resources.minerals >= 2000)),
  pylons: (situation) => (situation.progress.bases || (situation.resources.food < 10) || (situation.resources.psi >= 100)),
  gateways: (situation) => (situation.progress.zealots + situation.progress.stalkers + situation.progress.templars >= situation.complete.gateways),
  forges: (situation) => (situation.inventory.zealots + situation.inventory.stalkers + situation.progress.templars > 20),
  probes: (situation) => (situation.progress.zealots + situation.progress.stalkers + situation.progress.templars >= situation.complete.gateways),
};

const LIMIT = {
  pylons: (situation) => Math.min(situation.inventory.bases * 4, (220 - situation.complete.nexuses * 15) / 8),
  assimilators: (situation) => (situation.complete.nexuses * 2),
  gateways: (situation) => (situation.inventory.shrines ? Math.min(situation.total.nexuses * 2, 5) : 2),
  forges: 1,
  cybernetics: 1,
  councils: 1,
  shrines: 1,
  probes: (situation) => Math.min(situation.complete.nexuses * 22, 82),
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
  zealots: 1,
  stalkers: 1,
  sentries: 1,
  templars: 2,
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

  isAllowed(unit) {
    return this.get(CONDITION, unit, true);
  }

}
