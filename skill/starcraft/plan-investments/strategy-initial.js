import Strategy from "./strategy.js";

const BUILDORDER = [
  "bases", "gateways", "cybernetics", "zealots",
  "gateways", "zealots",
  "pylons", "robotics",
  "stalkers", "stalkers", "sentries", "sentries", "observers", "stalkers",
  "pylons",
  "stalkers", "stalkers", "stalkers", "stalkers", "stalkers",
];

export default class Initial extends Strategy {

  constructor() {
    super();
    this.expected = { nexuses: 1, probes: 12 };

    expect(this.expected, BUILDORDER[0]);
  }

  set(situation) {
    super.set(situation);

    while (BUILDORDER.length && isBuilt(this.situation, this.expected, BUILDORDER[0])) {
      BUILDORDER.splice(0, 1);

      if (BUILDORDER.length) {
        expect(this.expected, BUILDORDER[0]);
      } else {
        console.log("Initial build order is complete.");
      }
    }
  }

  units() {
    return BUILDORDER.length ? [BUILDORDER[0]] : [];
  }

}

function expect(expected, unit) {
  if (expected[unit]) {
    expected[unit]++;
  } else {
    expected[unit] = 1;
  }
}

function isBuilt(situation, expected, unit) {
  return situation.inventory[unit] >= expected[unit];
}
