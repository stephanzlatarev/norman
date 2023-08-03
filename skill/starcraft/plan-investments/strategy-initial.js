import Strategy from "./strategy.js";

const BUILDORDER = [
  "bases", "gateways",
  "bases", "cybernetics", "zealots", "gateways", "zealots",
  "robotics", "pylons",
  "stalkers", "stalkers", "sentries", "observers",
  "nexuses",
];

export default class Initial extends Strategy {

  constructor() {
    super();

    this.index = 0;
    this.order = [BUILDORDER[this.index]];
  }

  set(situation) {
    super.set(situation);

    const expected = { nexuses: 1, probes: 12 };

    for (let index = 0; index < BUILDORDER.length; index++) {
      const unit = BUILDORDER[index];
      const previousExpectedCount = expected[unit];
      const newExpectedCount = previousExpectedCount ? previousExpectedCount + 1 : 1;

      if (situation.inventory[unit] < newExpectedCount) {
        if (this.index !== index) {
          console.log("Initial build order", index, "for", unit, "at", situation.resources);
        }

        this.index = index;
        this.order = [unit];
        return;
      }

      expected[unit] = newExpectedCount;
    }

    console.log("Initial build order list is complete.");
    this.order = [];
  }

  units() {
    return this.order;
  }

}
