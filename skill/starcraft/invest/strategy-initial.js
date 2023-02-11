import Strategy from "./strategy.js";

const BUILDORDER = [
  "pylons", "probes", "probes", "gateways", "probes",
  "assimilators", "probes", "probes", "probes", "probes",
  "zealots", "cybernetics", "gateways", "pylons",
  "assimilators", "probes", "zealots", "probes", "probes",
  "stalkers", "stalkers", "pylons", "stalkers", "stalkers",
  "nexuses", "sentries", "probes", "pylons", "stalkers", "probes",
  "stalkers", "probes", "probes", "stalkers", "stalkers", "stalkers",
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
