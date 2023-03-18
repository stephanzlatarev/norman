import Strategy from "./strategy.js";

const UNITS = ["zealots"];

export default class SingleBase extends Strategy {

  units() {
    return UNITS;
  }

}
