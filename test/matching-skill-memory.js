import assert from "assert";
import Memory from "../code/memory.js";

describe("Matching skill to memory", function() {

  it("matching parent goal", function() {
    const memory = new Memory();
    const parent = memory.get("goal/build-a-pylon").set("type", "goal");
    const child = memory.get(parent.path + "/1").set("type", "goal");

    const pattern = {
      nodes: { PARENT: { "type": "goal" } },
      paths: [{ path: ["PARENT", "*", "GOAL"] }]
    };

    assertEqual(memory, memory.layers(child, child, pattern), [
      { "PARENT": parent.path }
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
