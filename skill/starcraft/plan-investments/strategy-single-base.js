import Strategy from "./strategy.js";

const UNITS = ["pylons", "gateways", "zealots", "stalkers", "robotics", "observers"];

const LIMIT = {
  pylons: 6,
  gateways: 3,
  robotics: (situation) => ((situation.complete.assimilators && (situation.total.zealots + situation.total.stalkers >= 24)) ? 1 : 0),
  observers: 1,
};

const PARALLEL = {
  pylons: 1,
  probes: 1,
  gateways: 2,
  robotics: 1,
};

const RATIO = {
  zealots: 5,
  stalkers: 1,
};

export default class SingleBase extends Strategy {

  units() {
    return UNITS;
  }

  ratio(unit) {
    return RATIO[unit];
  }

  parallel(unit) {
    return PARALLEL[unit] ? PARALLEL[unit] : Infinity;
  }

  limit(unit) {
    return this.get(LIMIT, unit, Infinity);
  }

}
