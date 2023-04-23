import Strategy from "./strategy.js";

const UNITS = [
  "pylons", "nexuses", "assimilators", "probes",
  "gateways", "cybernetics", "stalkers", "zealots",
  "councils", "shrines", "templars",
  "forges", "groundWeapons", "groundArmor", "shields"
];

const CONDITION = {
  nexuses: (situation) => ((situation.complete.nexuses <= situation.inventory.probes / 19) || (situation.resources.minerals >= 2000)),
  pylons: (situation) => ((situation.resources.food < 10) || (situation.resources.psi >= 100)),
  gateways: (situation) => (situation.progress.zealots + situation.progress.stalkers + situation.progress.templars >= situation.complete.gateways),
  forges: (situation) => (situation.inventory.zealots + situation.inventory.stalkers + situation.progress.templars > 20),
  probes: (situation) => (situation.progress.zealots + situation.progress.stalkers + situation.progress.templars >= situation.complete.gateways),
};

const LIMIT = {
  pylons: (situation) => ((220 - situation.complete.nexuses * 15) / 8),
  assimilators: (situation) => (situation.complete.nexuses),
  gateways: (situation) => Math.min(situation.complete.nexuses * 3, 6),
  forges: 1,
  cybernetics: 1,
  councils: 1,
  shrines: 1,
  probes: (situation) => Math.min(situation.complete.nexuses * 19 + 3, 82), // First nexus usually has 2 assimilators
  groundWeapons: 1,
  groundArmor: 1,
  shields: 1,
};

const PARALLEL = {
  nexuses: 1,
  pylons: 1,
  assimilators: 1,
  gateways: 1,
};

const RATIO = {
  zealots: 1,
  stalkers: 2,
  templars: 2,
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
