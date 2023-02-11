import Strategy from "./strategy.js";

const UNITS = [
  "pylons", "probes", "assimilators",
  "gateways", "cybernetics", "stalkers", "sentries", "zealots",
];

const LIMIT = {
  pylons: 4,
  probes: 22,
  assimilators: 2,
  gateways: 2,
  cybernetics: 1,
};

const PARALLEL = {
  pylons: 1,
  probes: 1,
  assimilators: 1,
  gateways: 2,
};

const RATIO = {
  stalkers: 4,
  sentries: 1,
  zealots: 1,
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
    return LIMIT[unit];
  }

}
