import Strategy from "./strategy.js";

const UNITS = [
  "pylons", "nexuses", "assimilators", "probes",
  "gateways", "cybernetics", "stalkers", "sentries", "zealots", "airWeapons", "airArmor",
  "robotics", "observers",
  "stargates", "beacons", "motherships", "carriers", "voidrays", "phoenixes",
  "forges", "groundWeapons", "groundArmor", "shields"
];

const CONDITION = {
  nexuses: (situation) => ((situation.total.nexuses < situation.inventory.probes / 20) || (situation.resources.minerals >= 2000)),
  pylons: (situation) => ((situation.resources.food < 10) || (situation.resources.psi >= 100)),
  assimilators: (situation) => (situation.resources.minerals > situation.resources.vespene),
  forges: (situation) => (situation.inventory.zealots + situation.inventory.sentries + situation.inventory.stalkers > 10),
  stargates: (situation) => ((situation.inventory.gateways >= 3) && (situation.resources.minerals >= 450) && (situation.resources.vespene >= 450)),
  robotics: (situation) => (situation.complete.nexuses >= 2),
  probes: (situation) => (situation.inventory.pylons || (situation.total.probes <= 12)),
};

const LIMIT = {
  pylons: (situation) => ((220 - situation.complete.nexuses * 15) / 8),
  assimilators: (situation) => (situation.complete.nexuses * 2),
  gateways: (situation) => Math.min(situation.total.nexuses * 2, 5),
  forges: 1,
  beacons: 1,
  stargates: (situation) => Math.min(situation.complete.nexuses, 4),
  cybernetics: 1,
  robotics: 1,
  motherships: 1,
  observers: 1,
  probes: (situation) => Math.min(situation.complete.nexuses * 22, 82),
  airWeapons: 1,
  airArmor: 1,
  groundWeapons: 1,
  groundArmor: 1,
  shields: 1,
};

const PARALLEL = {
  nexuses: 1,
  pylons: 1,
  assimilators: 1,
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
