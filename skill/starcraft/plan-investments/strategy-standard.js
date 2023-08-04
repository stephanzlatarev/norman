import Strategy from "./strategy.js";

const UNITS = [
  "pylons",
  "gateways", "cybernetics", "stalkers", "sentries", "zealots", "airWeapons", "airArmor",
  "robotics", "observers",
  "stargates", "beacons", "motherships", "carriers", "voidrays", "phoenixes",
  "forges", "groundWeapons", "groundArmor", "shields"
];

const CONDITION = {
  pylons: (situation) => ((situation.resources.food < 10) || (situation.resources.psi >= 100)),
  forges: (situation) => (situation.inventory.zealots + situation.inventory.sentries + situation.inventory.stalkers > 10),
  stargates: (situation) => ((situation.inventory.gateways >= 3) && (situation.resources.minerals > 350) && (situation.resources.vespene > 250)),
  robotics: (situation) => (situation.complete.nexuses >= 2),
};

const LIMIT = {
  pylons: (situation) => ((220 - situation.complete.nexuses * 15) / 8),
  gateways: (situation) => Math.ceil(situation.total.probes / 15 - situation.total.stargates),
  forges: 1,
  beacons: 1,
  stargates: (situation) => Math.ceil(situation.total.probes / 15 - situation.total.gateways),
  cybernetics: 1,
  robotics: 1,
  motherships: 1,
  observers: 1,
  airWeapons: 1,
  airArmor: 1,
  groundWeapons: 1,
  groundArmor: 1,
  shields: 1,
};

const PARALLEL = {
  pylons: 1,
  gateways: 1,
  stargates: 1,
};

const RATIO = {
  zealots: 1,
  stalkers: 4,
  sentries: 1,
  phoenixes: 2,
  carriers: 6,
  voidrays: 2,
};

export default class Standard extends Strategy {

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
