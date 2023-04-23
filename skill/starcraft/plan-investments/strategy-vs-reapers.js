import Strategy from "./strategy.js";

const UNITS = [
  "pylons", "gateways", "stalkers", "sentries", "probes"
];

const CONDITION = {
  pylons: (situation) => (situation.resources.food < 10),
  gateways: (situation) => (situation.progress.zealots + situation.progress.stalkers >= situation.complete.gateways),
};

const LIMIT = {
  pylons: 12,
  gateways: 4,
  probes: 22,
};

const PARALLEL = {
  pylons: 1,
  gateways: 1,
};

const RATIO = {
  stalkers: 3,
  sentries: 1,
};

export default class CounterReapersRush extends Strategy {

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
