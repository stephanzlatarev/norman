import Strategy from "./strategy.js";

const UNITS = [
  "pylons",
  "gateways", "cybernetics", "stalkers", "zealots",
  "councils", "shrines", "templars",
  "forges", "groundWeapons", "groundArmor", "shields"
];

const CONDITION = {
  pylons: (situation) => ((situation.resources.food < 10) || (situation.resources.psi >= 100)),
  gateways: (situation) => (situation.progress.zealots + situation.progress.stalkers + situation.progress.templars >= situation.complete.gateways),
  forges: (situation) => (situation.inventory.zealots + situation.inventory.stalkers + situation.progress.templars > 20),
};

const LIMIT = {
  pylons: (situation) => ((220 - situation.complete.nexuses * 15) / 8),
  gateways: (situation) => Math.min(situation.complete.nexuses * 3, 6),
  forges: 1,
  cybernetics: 1,
  councils: 1,
  shrines: 1,
  groundWeapons: 1,
  groundArmor: 1,
  shields: 1,
};

const PARALLEL = {
  pylons: 1,
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
