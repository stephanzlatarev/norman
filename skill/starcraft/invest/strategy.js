
export default class Strategy {

  units() { return []; }
  ratio() { return Infinity; }
  parallel() { return Infinity; }
  limit() { return Infinity; }
  isAllowed() { return true; }

  set(situation) {
    this.situation = situation;

    this.currentRatio = {};
    for (const one of this.units()) {
      if (!this.isAllowed(one)) continue;

      const ratio = this.ratio(one);
      if (ratio) this.currentRatio[one] = ratio;
    }
  }

  get(data, unit, defaultValue) {
    const number = data[unit];

    if (typeof(number) === "number") {
      return number;
    } else if (typeof(number) === "function") {
      return number(this.situation);
    }

    return defaultValue;
  }

  isCapped(unit) {
    for (const other in this.currentRatio) {
      if (other !== unit) {
        if (this.situation.progress[other] >= this.situation.factories[other]) continue; // The other unit is produced at the factory limit, so it cannot cap others
        if (this.situation.total[other] >= this.limit(other)) continue; // The other unit reached its limit, so it cannot cap others
        if (this.situation.progress[other] >= this.parallel(other)) continue; // The other unit is produced at the parallel limit, so it cannot cap others
        if (this.situation.total[unit] * this.currentRatio[other] > this.situation.total[other] * this.currentRatio[unit]) return true;
      }
    }

    return false;
  }

}
