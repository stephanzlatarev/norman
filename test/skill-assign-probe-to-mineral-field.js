import assert from "assert";
import fs from "fs";
import Memory from "../code/memory.js";

const PATTERN = JSON.parse(fs.readFileSync("./test/skill-assign-probe-to-mineral-field.json")).memory;
const GOAL = null;

describe("Skill 'assign probe to mineral field'. List assignment options for", function() {

  it("probe #1", function() {
    const memory = situation();
    const probe = memory.get("game/probe-1");

    const layers = memory.layers(GOAL, probe, PATTERN);

    assertEqual(memory, layers, [
      { "BODY": "game/probe-1", "NEW-MINERAL": "game/mineral-1", "OLD-MINERAL": null, "PROBE-1": "game/probe-2", "PROBE-2": "game/probe-2" },
      { "BODY": "game/probe-1", "NEW-MINERAL": "game/mineral-2", "OLD-MINERAL": null, "PROBE-1": null, "PROBE-2": null },
      { "BODY": "game/probe-1", "NEW-MINERAL": "game/mineral-3", "OLD-MINERAL": null, "PROBE-1": null, "PROBE-2": null },
      { "BODY": "game/probe-1", "NEW-MINERAL": "game/mineral-4", "OLD-MINERAL": null, "PROBE-1": "game/probe-3", "PROBE-2": "game/probe-4" },
      { "BODY": "game/probe-1", "NEW-MINERAL": "game/mineral-4", "OLD-MINERAL": null, "PROBE-1": "game/probe-3", "PROBE-2": "game/probe-5" },
      { "BODY": "game/probe-1", "NEW-MINERAL": "game/mineral-4", "OLD-MINERAL": null, "PROBE-1": "game/probe-4", "PROBE-2": "game/probe-5" },
      { "BODY": "game/probe-1", "NEW-MINERAL": "game/mineral-5", "OLD-MINERAL": null, "PROBE-1": null, "PROBE-2": null },
    ]);
  });

  it("probe #2", function() {
    const memory = situation();
    const probe = memory.get("game/probe-2");

    const layers = memory.layers(GOAL, probe, PATTERN);

    assertEqual(memory, layers, [
      { "BODY": "game/probe-2", "NEW-MINERAL": "game/mineral-2", "OLD-MINERAL": "game/mineral-1", "PROBE-1": null, "PROBE-2": null },
      { "BODY": "game/probe-2", "NEW-MINERAL": "game/mineral-3", "OLD-MINERAL": "game/mineral-1", "PROBE-1": null, "PROBE-2": null },
      { "BODY": "game/probe-2", "NEW-MINERAL": "game/mineral-4", "OLD-MINERAL": "game/mineral-1", "PROBE-1": "game/probe-3", "PROBE-2": "game/probe-4" },
      { "BODY": "game/probe-2", "NEW-MINERAL": "game/mineral-4", "OLD-MINERAL": "game/mineral-1", "PROBE-1": "game/probe-3", "PROBE-2": "game/probe-5" },
      { "BODY": "game/probe-2", "NEW-MINERAL": "game/mineral-4", "OLD-MINERAL": "game/mineral-1", "PROBE-1": "game/probe-4", "PROBE-2": "game/probe-5" },
      { "BODY": "game/probe-2", "NEW-MINERAL": "game/mineral-5", "OLD-MINERAL": "game/mineral-1", "PROBE-1": null, "PROBE-2": null },
    ]);
  });

  it("probe #3", function() {
    const memory = situation();
    const probe = memory.get("game/probe-3");

    const layers = memory.layers(GOAL, probe, PATTERN);

    assertEqual(memory, layers, [
      { "BODY": "game/probe-3", "NEW-MINERAL": "game/mineral-1", "OLD-MINERAL": "game/mineral-4", "PROBE-1": "game/probe-2", "PROBE-2": "game/probe-2" },
      { "BODY": "game/probe-3", "NEW-MINERAL": "game/mineral-2", "OLD-MINERAL": "game/mineral-4", "PROBE-1": null, "PROBE-2": null },
      { "BODY": "game/probe-3", "NEW-MINERAL": "game/mineral-3", "OLD-MINERAL": "game/mineral-4", "PROBE-1": null, "PROBE-2": null },
      { "BODY": "game/probe-3", "NEW-MINERAL": "game/mineral-5", "OLD-MINERAL": "game/mineral-4", "PROBE-1": null, "PROBE-2": null },
    ]);
  });

  it("probe #4", function() {
    const memory = situation();
    const probe = memory.get("game/probe-4");

    const layers = memory.layers(GOAL, probe, PATTERN);

    assertEqual(memory, layers, [
      { "BODY": "game/probe-4", "NEW-MINERAL": "game/mineral-1", "OLD-MINERAL": "game/mineral-4", "PROBE-1": "game/probe-2", "PROBE-2": "game/probe-2" },
      { "BODY": "game/probe-4", "NEW-MINERAL": "game/mineral-2", "OLD-MINERAL": "game/mineral-4", "PROBE-1": null, "PROBE-2": null },
      { "BODY": "game/probe-4", "NEW-MINERAL": "game/mineral-3", "OLD-MINERAL": "game/mineral-4", "PROBE-1": null, "PROBE-2": null },
      { "BODY": "game/probe-4", "NEW-MINERAL": "game/mineral-5", "OLD-MINERAL": "game/mineral-4", "PROBE-1": null, "PROBE-2": null },
    ]);
  });

  it("probe #5", function() {
    const memory = situation();
    const probe = memory.get("game/probe-5");

    const layers = memory.layers(GOAL, probe, PATTERN);

    assertEqual(memory, layers, [
      { "BODY": "game/probe-5", "NEW-MINERAL": "game/mineral-1", "OLD-MINERAL": "game/mineral-4", "PROBE-1": "game/probe-2", "PROBE-2": "game/probe-2" },
      { "BODY": "game/probe-5", "NEW-MINERAL": "game/mineral-2", "OLD-MINERAL": "game/mineral-4", "PROBE-1": null, "PROBE-2": null },
      { "BODY": "game/probe-5", "NEW-MINERAL": "game/mineral-3", "OLD-MINERAL": "game/mineral-4", "PROBE-1": null, "PROBE-2": null },
      { "BODY": "game/probe-5", "NEW-MINERAL": "game/mineral-5", "OLD-MINERAL": "game/mineral-4", "PROBE-1": null, "PROBE-2": null },
    ]);
  });

});

function situation() {
  const memory = new Memory();

  for (let i = 1; i <= 2; i++) {
    memory.get("game/nexus-" + i).set("unitType", "nexus");
  }

  for (let i = 1; i <= 5; i++) {
    memory.get("game/mineral-" + i).set("unitType", "mineral").set("nexus", memory.get("game/nexus-" + (2-i%2)));
  }

  for (let i = 1; i <= 5; i++) {
    memory.get("game/probe-" + i).set("unitType", "probe");
  }

  memory.get("game/probe-2").set("harvest", memory.get("game/mineral-1"));
  memory.get("game/probe-3").set("harvest", memory.get("game/mineral-4"));
  memory.get("game/probe-4").set("harvest", memory.get("game/mineral-4"));
  memory.get("game/probe-5").set("harvest", memory.get("game/mineral-4"));

  return memory;
}

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
