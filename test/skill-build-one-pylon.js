import assert from "assert";
import fs from "fs";
import Memory from "../code/memory.js";

const PATTERN = JSON.parse(fs.readFileSync("./skill/starcraft/build-one-pylon/mapping.json")).memory;

describe("Skill 'build one pylon'", function() {

  it("when no builder or location have been selected", function() {
    const memory = new Memory();
    const game = memory.get("game").set("is-game", true);
    const goalBuildPylon = memory.get("goal/build-a-pylon");

    assertEqual(memory, memory.layers(goalBuildPylon, game, PATTERN), []);
  });

  it("when a builder and a location have been selected", function() {
    const memory = new Memory();
    const game = memory.get("game").set("is-game", true);
    const goalBuildPylon = memory.get("goal/build-a-pylon");
    const probe = memory.get("body/probe-1").set("unitType", "probe").set("x", 101).set("y", 102);
    const location = memory.get(goalBuildPylon.path + "/location").set("x", 201).set("y", 202);

    goalBuildPylon.set("builder", probe);
    goalBuildPylon.set("location", location);

    assertEqual(memory, memory.layers(goalBuildPylon, game, PATTERN), [
      { "PROBE": probe.path, "LOCATION": location.path }
    ]);
  });

  it("when the pylon is built", function() {
    const memory = new Memory();
    const game = memory.get("game").set("is-game", true);
    const goalBuildPylon = memory.get("goal/build-a-pylon");
    const probe = memory.get("body/probe-1").set("unitType", "probe").set("x", 101).set("y", 102);
    const location = memory.get(goalBuildPylon.path + "/location").set("x", 201).set("y", 202);
    const pylon1 = memory.get("body/pylon-1").set("unitType", "pylon").set("x", 201).set("y", 202);
    const pylon2 = memory.get("body/pylon-2").set("unitType", "pylon").set("x", 301).set("y", 302);

    goalBuildPylon.set("builder", probe);
    goalBuildPylon.set("location", location);

    assertEqual(memory, memory.layers(goalBuildPylon, game, PATTERN), [
      { "PROBE": probe.path, "LOCATION": location.path, "PYLON": pylon1.path },
      { "PROBE": probe.path, "LOCATION": location.path, "PYLON": pylon2.path },
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
