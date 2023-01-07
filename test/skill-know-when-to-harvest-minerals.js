import assert from "assert";
import fs from "fs";
import Memory from "../code/memory.js";

const PATTERN = JSON.parse(fs.readFileSync("./skill/starcraft/know-when-to-harvest-minerals/mapping.json")).memory;

describe("Skill 'know when to harvest minerals'", function() {

  it("when there is an idle probe", function() {
    const memory = new Memory();
    const game = memory.get("game").set("is-game", true);
    const goal = memory.get("goal/collect-minerals-1");
    const mineral = memory.get("body/mineral").set("unitType", "mineral");
    const probe1 = memory.get("body/probe-1").set("unitType", "probe").set("harvest", mineral);
    const probe2 = memory.get("body/probe-2").set("unitType", "probe");
    const probe3 = memory.get("body/probe-3").set("unitType", "probe").set("harvest", mineral);

    assertEqual(memory, memory.layers(goal, game, PATTERN), [
      { "PROBE": probe1.path, "MINERAL": mineral.path },
      { "PROBE": probe2.path, "MINERAL": undefined },
      { "PROBE": probe3.path, "MINERAL": mineral.path },
    ]);
  });

  it("when there is no idle probe", function() {
    const memory = new Memory();
    const game = memory.get("game").set("is-game", true);
    const goal = memory.get("goal/collect-minerals-2");
    const mineral = memory.get("body/mineral").set("unitType", "mineral");
    const probe1 = memory.get("body/probe-1").set("unitType", "probe").set("harvest", mineral);
    const probe2 = memory.get("body/probe-2").set("unitType", "probe").set("harvest", mineral);
    const probe3 = memory.get("body/probe-3").set("unitType", "probe").set("harvest", mineral);

    assertEqual(memory, memory.layers(goal, game, PATTERN), [
      { "PROBE": probe1.path, "MINERAL": mineral.path },
      { "PROBE": probe2.path, "MINERAL": mineral.path },
      { "PROBE": probe3.path, "MINERAL": mineral.path },
    ]);
  });

});

function assertEqual(memory, actualLayers, expectedLayers) {
  assert.equal(actualLayers.length, expectedLayers.length, "Number of memory layers expected " + expectedLayers.length + " but were " + actualLayers.length);

  for (let i = 0; i < expectedLayers.length; i++) {
    const actualLayer = actualLayers[i];
    const expectedLayer = expectedLayers[i];

    for (const key in expectedLayer) {
      const actual = actualLayer.get(key);
      const actualRef = actual ? "[" + actual.path + " #" + actual.ref + "]" : "none";
      const expected = expectedLayer[key] ? memory.get(expectedLayer[key]) : null;
      const expectedRef = expected ? "[" + expected.path + " #" + expected.ref + "]" : "none";
      assert.equal(actual, expected, key + " in memory layer #" + i + " expected to be " + expectedRef + " but was " + actualRef);
    }
  }
}
