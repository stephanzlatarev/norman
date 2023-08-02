import Strategy from "./strategy.js";

export default class ZealotsOnly extends Strategy {

  units() {
    return ["zealots"];
  }

}
