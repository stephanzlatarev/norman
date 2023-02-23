import Strategy from "./strategy.js";

const UNITS = [
  "pylons", "nexuses", "assimilators", "probes",
  "gateways", "cybernetics", "stalkers", "zealots", "upgradeAirWeapons",
  "stargates", "beacons", "carriers",
  "forges", "upgradeGroundWeapons", "upgradeGroundArmor", "upgradeShields"
];

const CONDITION = {
  nexuses: (situation) => ((situation.complete.nexuses <= situation.inventory.probes / 19) || (situation.resources.minerals >= 2000)),
  pylons: (situation) => (situation.progress.bases || (situation.resources.food < 10) || (situation.resources.psi >= 100)),
  gateways: (situation) => (situation.progress.zealots + situation.progress.stalkers >= situation.complete.gateways),
  forges: (situation) => (situation.inventory.zealots > 20),
  stargates: (situation) => ((situation.inventory.gateways >= 5) && (situation.resources.minerals >= 450) && (situation.resources.vespene >= 450)),
  probes: (situation) => (situation.progress.zealots + situation.progress.stalkers >= situation.complete.gateways),
};

const LIMIT = {
  pylons: (situation) => Math.min(situation.inventory.bases * 4, (220 - situation.complete.nexuses * 15) / 8),
  assimilators: (situation) => (situation.complete.nexuses),
  gateways: (situation) => Math.min(situation.complete.nexuses * 3, 6),
  forges: 1,
  beacons: 1,
  stargates: 2,
  cybernetics: 1,
  probes: (situation) => Math.min(situation.complete.nexuses * 19, 82),
  upgradeAirWeapons: 1,
  upgradeGroundWeapons: 1,
  upgradeGroundArmor: 1,
  upgradeShields: 1,
};

const PARALLEL = {
  nexuses: 1,
  pylons: 1,
  assimilators: 1,
  gateways: 2,
  stargates: 1,
};

const RATIO = {
  zealots: 4,
  stalkers: 1,
  carriers: 6,
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
