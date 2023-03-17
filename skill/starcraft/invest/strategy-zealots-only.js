import Strategy from "./strategy.js";

const UNITS = ["pylons", "zealots"];

const CONDITION = {
  pylons: (situation) => (situation.progress.bases || (situation.resources.food < 10)),
};

const PARALLEL = {
  pylons: 1,
};

export default class SingleBase extends Strategy {

  units() {
    return UNITS;
  }

  parallel(unit) {
    return PARALLEL[unit] ? PARALLEL[unit] : Infinity;
  }

  isAllowed(unit) {
    return this.get(CONDITION, unit, true);
  }

}
