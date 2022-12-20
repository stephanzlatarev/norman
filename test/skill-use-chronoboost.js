import assert from "assert";
import fs from "fs";
import Memory from "../code/memory.js";

const PATTERN = JSON.parse(fs.readFileSync("./skill/starcraft/use-chronoboost/mapping.json")).memory;
const GOAL = null;

describe("Skill 'use chronoboost'. List chronoboost options", function() {

  it("when chronoboost is not used", function() {
    const memory = new Memory();
    const nexus = memory.get("game/nexus");

    for (let i = 1; i <= 10; i++) memory.get("game/mineral-" + i);

    assertEqual(memory, memory.layers(GOAL, nexus, PATTERN), [
      { "BODY": nexus.path }
    ]);
  });

  it("when chronoboost is used", function() {
    const memory = new Memory();
    const nexus = memory.get("game/nexus");

    nexus.set("chronoboost", nexus);

    for (let i = 1; i <= 10; i++) memory.get("game/mineral-" + i);

    assertEqual(memory, memory.layers(GOAL, nexus, PATTERN), [
      { "BODY": nexus.path }
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
