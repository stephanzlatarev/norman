import assert from "assert";
import Memory from "../code/memory/memory.js";
import layers from "../code/memory/layers.js";

describe("Memory layers", function() {

  describe("matching nodes", function() {

    describe("by property", function() {
      const PATTERN = {
        nodes: { OBJECT: { label: "object" } },
        paths: [{ path: ["OBJECT"] }]
      };

      it("when there are no matches", function() {
        const memory = getMemory("object", 0);
  
        assertEqual(memory, layers(memory, PATTERN), []);
      });

      it("when there is exactly one match", function() {
        const memory = getMemory("object", 1);

        assertEqual(memory, layers(memory, PATTERN), [
          { OBJECT: "object-1" }
        ]);
      });

      it("when there are three matches", function() {
        const memory = getMemory("object", 3);

        assertEqual(memory, layers(memory, PATTERN), [
          { OBJECT: "object-1" },
          { OBJECT: "object-2" },
          { OBJECT: "object-3" },
        ]);
      });
    });

    describe("by path", function() {
      it("when selecting the parent", function() {
        const memory = getMemory("goal", 3);
        const parent = memory.get("goal-1");
        const child = memory.get("goal-2");
        parent.set("1", child);
    
        const PATTERN = {
          nodes: { GOAL: child, PARENT: { label: "goal" } },
          paths: [{ path: ["PARENT", "*", "GOAL"] }]
        };
    
        assertEqual(memory, layers(memory, PATTERN), [
          { PARENT: parent.path }
        ]);
      });
    });
  });

  describe("matching optional paths", function() {

    const PATTERN = {
      nodes: {
        PROBE: { label: "probe" },
        MINERAL: { label: "mineral" },
      },
      paths: [
        { path: ["PROBE"] },
        { path: ["PROBE", "harvest", "MINERAL"], optional: true }
      ]
    };

    it("when nothing is matched", function() {
      const memory = getMemory("probe", 3, "mineral", 3);
      const probe1 = memory.get("probe-1");
      const probe2 = memory.get("probe-2");
      const probe3 = memory.get("probe-3");

      assertEqual(memory, layers(memory, PATTERN), [
        { PROBE: probe1.path, MINERAL: null },
        { PROBE: probe2.path, MINERAL: null },
        { PROBE: probe3.path, MINERAL: null },
      ]);
    });

    it("when some but not everything is matched", function() {
      const memory = getMemory("probe", 3, "mineral", 1);
      const mineral = memory.get("mineral-1");
      const probe1 = memory.get("probe-1");
      const probe2 = memory.get("probe-2");
      const probe3 = memory.get("probe-3");

      probe1.set("harvest", mineral);
      probe3.set("harvest", mineral);

      assertEqual(memory, layers(memory, PATTERN), [
        { PROBE: probe1.path, MINERAL: mineral.path },
        { PROBE: probe2.path, MINERAL: null },
        { PROBE: probe3.path, MINERAL: mineral.path },
      ]);
    });

    it("when everything is matched", function() {
      const memory = getMemory("probe", 3, "mineral", 2);
      const mineral1 = memory.get("mineral-1");
      const mineral2 = memory.get("mineral-2");
      const probe1 = memory.get("probe-1");
      const probe2 = memory.get("probe-2");
      const probe3 = memory.get("probe-3");

      probe1.set("harvest", mineral1);
      probe2.set("harvest", mineral1);
      probe3.set("harvest", mineral2);

      assertEqual(memory, layers(memory, PATTERN), [
        { PROBE: probe1.path, MINERAL: mineral1.path },
        { PROBE: probe2.path, MINERAL: mineral1.path },
        { PROBE: probe3.path, MINERAL: mineral2.path },
      ]);
    });
  });

  describe("matching provisional paths", function() {

    describe("matching a new path", function() {
      const PATTERN = {
        nodes: {
          GOAL: { label: "goal" },
          PROBE: { label: "probe" },
          LOCATION: { label: "location" },
        },
        paths: [
          { path: ["GOAL", "builder", "PROBE"] },
          { path: ["GOAL", "location", "LOCATION"] },
          { path: ["PROBE", "go-to", "LOCATION"], provisional: true }
        ]
      };

      it("when nothing is matched", function() {
        const memory = getMemory("goal", 3, "probe", 3, "location", 3);
  
        assertEqual(memory, layers(memory, PATTERN), []);
      });

      it("when only left side is matched", function() {
        const memory = getMemory("goal", 3, "probe", 3, "location", 3);
        memory.get("goal-2").set("builder", memory.get("probe-3"));

        assertEqual(memory, layers(memory, PATTERN), []);
      });

      it("when only right side is matched", function() {
        const memory = getMemory("goal", 3, "probe", 3, "location", 3);
        memory.get("goal-2").set("location", memory.get("location-1"));

        assertEqual(memory, layers(memory, PATTERN), []);
      });

      it("when both sides are matched once", function() {
        const memory = getMemory("goal", 3, "probe", 3, "location", 3);
        memory.get("goal-2").set("builder", memory.get("probe-3"));
        memory.get("goal-2").set("location", memory.get("location-1"));

        assertEqual(memory, layers(memory, PATTERN), [
          { PROBE: "probe-3", LOCATION: "location-1" }
        ]);
      });

      it("when both sides are matched multiple times", function() {
        const memory = getMemory("goal", 3, "probe", 3, "location", 3);
        memory.get("goal-1").set("builder", memory.get("probe-3"));
        memory.get("goal-1").set("location", memory.get("location-2"));
        memory.get("goal-2").set("builder", memory.get("probe-2"));
        memory.get("goal-2").set("location", memory.get("location-2"));
        memory.get("goal-3").set("builder", memory.get("probe-1"));
        memory.get("goal-3").set("location", memory.get("location-1"));

        assertEqual(memory, layers(memory, PATTERN), [
          { GOAL: "goal-1", PROBE: "probe-3", LOCATION: "location-2" },
          { GOAL: "goal-2", PROBE: "probe-2", LOCATION: "location-2" },
          { GOAL: "goal-3", PROBE: "probe-1", LOCATION: "location-1" },
        ]);
      });
    });

    describe("matching a path which depends on an optional path", function() {
      const PATTERN = {
        nodes: {
          GOAL: { label: "goal" },
          PROBE: { label: "probe" },
          LOCATION: { label: "location" },
        },
        paths: [
          { path: ["GOAL", "builder", "PROBE"] },
          { path: ["GOAL", "location", "LOCATION"], optional: true },
          { path: ["PROBE", "go-to", "LOCATION"], provisional: true }
        ]
      };

      it("when the optional path is not matched", function() {
        const memory = getMemory("goal", 3, "probe", 3, "location", 0);
        memory.get("goal-2").set("builder", memory.get("probe-3"));

        assertEqual(memory, layers(memory, PATTERN), [
          { GOAL: "goal-2", PROBE: "probe-3" }
        ]);
      });

      it("when the optional path is not matched but the nodes are there", function() {
        const memory = getMemory("goal", 3, "probe", 3, "location", 3);
        memory.get("goal-2").set("builder", memory.get("probe-3"));

        assertEqual(memory, layers(memory, PATTERN), [
          { GOAL: "goal-2", PROBE: "probe-3" }
        ]);
      });

      it("when the optional path is matched", function() {
        const memory = getMemory("goal", 3, "probe", 3, "location", 3);
        memory.get("goal-2").set("builder", memory.get("probe-3"));
        memory.get("goal-2").set("location", memory.get("location-1"));

        assertEqual(memory, layers(memory, PATTERN), [
          { GOAL: "goal-2", PROBE: "probe-3", LOCATION: "location-1" }
        ]);
      });
    });
  });

  describe("matching with constraints", function() {

    describe("pick mineral fields for five probes", function() {
      const PATTERN = {
        nodes: {
          "NEW-MINERAL": { "label": "mineral" },
          "NEW-NEXUS": { "label": "nexus" },
          "OLD-MINERAL": { "label": "mineral" },
          "PROBE-1": { "label": "probe" },
          "PROBE-2": { "label": "probe" }
        },

        constraints: [
          [ "NEW-MINERAL", "≠", "OLD-MINERAL" ],
          [ "BODY", "≠", "PROBE-1" ],
          [ "BODY", "≠", "PROBE-2" ],
          [ "PROBE-1", "~", "PROBE-2" ]
        ],

        paths: [
          {
            label: "NEW-ASSIGNMENT",
            path: ["BODY", "harvest", "NEW-MINERAL"],
            provisional: true
          },
          {
            path: ["NEW-MINERAL", "nexus", "NEW-NEXUS"]
          },
          {
            label: "OLD-ASSIGNMENT",
            path: ["BODY", "harvest", "OLD-MINERAL"],
            optional: true
          },
          {
            path: ["PROBE-1", "harvest", "NEW-MINERAL"],
            optional: true
          },
          {
            path: ["PROBE-2", "harvest", "NEW-MINERAL"],
            optional: true
          }
        ]
      };
      const getSituation = function() {
        const memory = getMemory("nexus", 2, "probe", 5, "mineral", 5);
        memory.get("mineral-1").set("nexus", memory.get("nexus-1"));
        memory.get("mineral-2").set("nexus", memory.get("nexus-2"));
        memory.get("mineral-3").set("nexus", memory.get("nexus-1"));
        memory.get("mineral-4").set("nexus", memory.get("nexus-2"));
        memory.get("mineral-5").set("nexus", memory.get("nexus-1"));
        memory.get("probe-2").set("harvest", memory.get("mineral-1"));
        memory.get("probe-3").set("harvest", memory.get("mineral-4"));
        memory.get("probe-4").set("harvest", memory.get("mineral-4"));
        memory.get("probe-5").set("harvest", memory.get("mineral-4"));
        return memory;
      };
      const getPattern = function(memory, probe) {
        const pattern = JSON.parse(JSON.stringify(PATTERN));
        pattern.nodes.BODY = memory.get("probe-" + probe);
        return pattern;
      };

      it("probe #1", function() {
        const memory = getSituation();

        assertEqual(memory, layers(memory, getPattern(memory, 1)), [
          { "BODY": "probe-1", "NEW-MINERAL": "mineral-1", "OLD-MINERAL": null, "PROBE-1": "probe-2", "PROBE-2": "probe-2" },
          { "BODY": "probe-1", "NEW-MINERAL": "mineral-2", "OLD-MINERAL": null, "PROBE-1": null, "PROBE-2": null },
          { "BODY": "probe-1", "NEW-MINERAL": "mineral-3", "OLD-MINERAL": null, "PROBE-1": null, "PROBE-2": null },
          { "BODY": "probe-1", "NEW-MINERAL": "mineral-4", "OLD-MINERAL": null, "PROBE-1": "probe-3", "PROBE-2": "probe-4" },
          { "BODY": "probe-1", "NEW-MINERAL": "mineral-4", "OLD-MINERAL": null, "PROBE-1": "probe-3", "PROBE-2": "probe-5" },
          { "BODY": "probe-1", "NEW-MINERAL": "mineral-4", "OLD-MINERAL": null, "PROBE-1": "probe-4", "PROBE-2": "probe-5" },
          { "BODY": "probe-1", "NEW-MINERAL": "mineral-5", "OLD-MINERAL": null, "PROBE-1": null, "PROBE-2": null },
        ]);
      });

      it("probe #2", function() {
        const memory = getSituation();

        assertEqual(memory, layers(memory, getPattern(memory, 2)), [
          { "BODY": "probe-2", "NEW-MINERAL": "mineral-2", "OLD-MINERAL": "mineral-1", "PROBE-1": null, "PROBE-2": null },
          { "BODY": "probe-2", "NEW-MINERAL": "mineral-3", "OLD-MINERAL": "mineral-1", "PROBE-1": null, "PROBE-2": null },
          { "BODY": "probe-2", "NEW-MINERAL": "mineral-4", "OLD-MINERAL": "mineral-1", "PROBE-1": "probe-3", "PROBE-2": "probe-4" },
          { "BODY": "probe-2", "NEW-MINERAL": "mineral-4", "OLD-MINERAL": "mineral-1", "PROBE-1": "probe-3", "PROBE-2": "probe-5" },
          { "BODY": "probe-2", "NEW-MINERAL": "mineral-4", "OLD-MINERAL": "mineral-1", "PROBE-1": "probe-4", "PROBE-2": "probe-5" },
          { "BODY": "probe-2", "NEW-MINERAL": "mineral-5", "OLD-MINERAL": "mineral-1", "PROBE-1": null, "PROBE-2": null },
        ]);
      });

      it("probe #3", function() {
        const memory = getSituation();

        assertEqual(memory, layers(memory, getPattern(memory, 3)), [
          { "BODY": "probe-3", "NEW-MINERAL": "mineral-1", "OLD-MINERAL": "mineral-4", "PROBE-1": "probe-2", "PROBE-2": "probe-2" },
          { "BODY": "probe-3", "NEW-MINERAL": "mineral-2", "OLD-MINERAL": "mineral-4", "PROBE-1": null, "PROBE-2": null },
          { "BODY": "probe-3", "NEW-MINERAL": "mineral-3", "OLD-MINERAL": "mineral-4", "PROBE-1": null, "PROBE-2": null },
          { "BODY": "probe-3", "NEW-MINERAL": "mineral-5", "OLD-MINERAL": "mineral-4", "PROBE-1": null, "PROBE-2": null },
        ]);
      });

      it("probe #4", function() {
        const memory = getSituation();

        assertEqual(memory, layers(memory, getPattern(memory, 4)), [
          { "BODY": "probe-4", "NEW-MINERAL": "mineral-1", "OLD-MINERAL": "mineral-4", "PROBE-1": "probe-2", "PROBE-2": "probe-2" },
          { "BODY": "probe-4", "NEW-MINERAL": "mineral-2", "OLD-MINERAL": "mineral-4", "PROBE-1": null, "PROBE-2": null },
          { "BODY": "probe-4", "NEW-MINERAL": "mineral-3", "OLD-MINERAL": "mineral-4", "PROBE-1": null, "PROBE-2": null },
          { "BODY": "probe-4", "NEW-MINERAL": "mineral-5", "OLD-MINERAL": "mineral-4", "PROBE-1": null, "PROBE-2": null },
        ]);
      });

      it("probe #5", function() {
        const memory = getSituation();

        assertEqual(memory, layers(memory, getPattern(memory, 5)), [
          { "BODY": "probe-5", "NEW-MINERAL": "mineral-1", "OLD-MINERAL": "mineral-4", "PROBE-1": "probe-2", "PROBE-2": "probe-2" },
          { "BODY": "probe-5", "NEW-MINERAL": "mineral-2", "OLD-MINERAL": "mineral-4", "PROBE-1": null, "PROBE-2": null },
          { "BODY": "probe-5", "NEW-MINERAL": "mineral-3", "OLD-MINERAL": "mineral-4", "PROBE-1": null, "PROBE-2": null },
          { "BODY": "probe-5", "NEW-MINERAL": "mineral-5", "OLD-MINERAL": "mineral-4", "PROBE-1": null, "PROBE-2": null },
        ]);
      });
    });
  });

  describe("matching many paths", function() {

    const PATTERN = {
      nodes: {
        "GOAL": { "label": "goal" },
        "DIRECTION": { "label": "resources" },
        "ALTERNATIVE": { "label": "resources" },
        "HOMEBASE": { "label": "homebase" },
        "NEXUS-OF-DIRECTION": { "label": "nexus" },
        "BUILDER": { "label": "probe" }
      },
      paths: [
        { path: ["HOMEBASE"] },
        { path: ["DIRECTION"] },
        { path: ["GOAL", "direction", "DIRECTION"], provisional: true },
        { path: ["DIRECTION", "nexus", "NEXUS-OF-DIRECTION"], optional: true },
        { path: ["GOAL", "direction", "ALTERNATIVE"], optional: true },
        { path: ["GOAL", "builder", "BUILDER"], optional: true }
      ]
    };

    it("when reduced to very few memory layers", function() {
      const memory = getMemory("goal", 1, "homebase", 1, "resources", 20, "probe", 20, "nexus", 1);

      const expectedLayers = [];
      for (let i = 1; i <= 20; i++) {
        expectedLayers.push({ GOAL: "goal-1", DIRECTION: "resources-" + i });
      }

      assertEqual(memory, layers(memory, PATTERN), expectedLayers);
    });
  });

  describe("provisioning nodes", function() {

    it("suggesting a node", function() {
      const memory = getMemory();
      const goal = memory.get("goal");

      const PATTERN = {
        nodes: {
          GOAL: goal,
          SUBGOAL: { label: "subgoal" },
        },
        paths: [
          { path: ["GOAL", "has", "SUBGOAL"], provisional: true }
        ]
      };

      const newLayers = layers(memory, PATTERN);
      assertEqual(memory, newLayers, [{}]);

      const layer = newLayers[0];
      const subgoal = layer.get("SUBGOAL");
      assert.equal(subgoal.get("label"), "subgoal", "Suggested node's label doesn't match!");
      assert.equal(goal.links().length, 0, "Suggested node is provisioned too early!");
    });

    it("provisioning a node", function() {
      const memory = getMemory();
      const goal = memory.get("goal");

      const PATTERN = {
        nodes: {
          GOAL: goal,
          SUBGOAL: { label: "subgoal" },
        },
        paths: [
          { label: "PROVISION", path: ["GOAL", "has", "SUBGOAL"], provisional: true }
        ]
      };

      const newLayers = layers(memory, PATTERN);
      assertEqual(memory, newLayers, [{}]);
      assert.equal(goal.links().length, 0, "Suggested node is provisioned too early!");

      const layer = newLayers[0];
      layer.set("PROVISION", 1);
      assert.equal(goal.links().length, 1, "Node is not provisioned!");

      const subgoal = goal.links()[0];
      assert.equal(subgoal.get("label"), "subgoal", "Provisioned node's label doesn't match!");
      assert.equal(subgoal.memory, memory, "Provisioned node isn't associated to memory!");
      assert.equal(subgoal.path, "goal/has", "Provisioned node doesn't have proper path in memory!");
    });
  });

  describe("provisioning paths", function() {

    describe("from one node to the same node", function() {
      const PATTERN = {
        nodes: { BODY: { label: "body" } },
        paths: [
          { label: "PROVISION", path: ["BODY", "loop", "BODY"], provisional: true }
        ]
      };

      it("when no path exists", function() {
        const memory = getMemory();
        const body = memory.get("body").set("label", "body");

        const newLayers = layers(memory, PATTERN);
        assertEqual(memory, newLayers, [{ BODY: body.path }]);
        assert.equal(body.links().length, 0, "Path is provisioned too early!");

        const layer = newLayers[0];
        layer.set("PROVISION", 1);
        assert.equal(body.links().length, 1, "Path is not provisioned!");
      });

      it("when the path exists", function() {
        const memory = getMemory();
        const body = memory.get("body").set("label", "body");
        body.set("loop", body);

        const newLayers = layers(memory, PATTERN);
        assertEqual(memory, newLayers, [{ BODY: body.path }]);
        assert.equal(body.links().length, 1, "Path disappeared!");

        const layer = newLayers[0];
        layer.set("PROVISION", 1);
        assert.equal(body.links().length, 1, "Path is not provisioned!");
      });
    });

    describe("from one node to another", function() {
      const PATTERN = {
        nodes: {
          PROBE: { label: "probe" },
          LOCATION: { label: "location" },
        },
        paths: [
          { label: "MOVE", path: ["PROBE", "go-to", "LOCATION"], provisional: true }
        ]
      };

      it("when no path exists", function() {
        const memory = getMemory("probe", 1, "location", 1);
        const probe = memory.get("probe-1");

        const newLayers = layers(memory, PATTERN);
        assertEqual(memory, newLayers, [
          { PROBE: "probe-1", LOCATION: "location-1" },
          { PROBE: "probe-1", LOCATION: { label: "location" } },
        ]);
        assert.equal(probe.links().length, 0, "Path is provisioned too early!");

        const layer = newLayers[0];
        layer.set("MOVE", 1);
        assert.equal(probe.links().length, 1, "Path is not provisioned!");
      });

      it("when the path exists", function() {
        const memory = getMemory("probe", 1, "location", 1);
        const probe = memory.get("probe-1");
        probe.set("go-to", memory.get("location-1"));

        const newLayers = layers(memory, PATTERN);
        assertEqual(memory, newLayers, [
          { PROBE: "probe-1", LOCATION: "location-1" },
          { PROBE: "probe-1", LOCATION: { label: "location" } },
        ]);
        assert.equal(probe.links().length, 1, "Path disappeared!");

        const layer = newLayers[0];
        layer.set("MOVE", 1);
        assert.equal(probe.links().length, 1, "Path is not provisioned!");
      });
    });

    describe("unique path", function() {
      const PATTERN = {
        nodes: {
          PROBE: { label: "probe" },
          LOCATION: { label: "location" },
        },
        paths: [
          { label: "MOVE", path: ["PROBE", "go-to", "LOCATION"], provisional: true, unique: true }
        ]
      };

      it("when no path exists", function() {
        const memory = getMemory("probe", 1, "location", 1);
        const probe = memory.get("probe-1");

        const newLayers = layers(memory, PATTERN);
        assertEqual(memory, newLayers, [{ PROBE: "probe-1", LOCATION: { label: "location" } }]);
        assert.equal(probe.links().length, 0, "Path is provisioned too early!");

        const layer = newLayers[0];
        layer.set("MOVE", 1);
        assert.equal(probe.links().length, 1, "Path is not provisioned!");
      });

      it("when the path exists", function() {
        const memory = getMemory("probe", 1, "location", 1);
        const probe = memory.get("probe-1");
        probe.set("go-to", memory.get("location-1"));

        const newLayers = layers(memory, PATTERN);
        assertEqual(memory, newLayers, [{ PROBE: "probe-1", LOCATION: "location-1" }]);
        assert.equal(probe.links().length, 1, "Path disappeared!");

        const layer = newLayers[0];
        layer.set("MOVE", 1);
        assert.equal(probe.links().length, 1, "Path is not provisioned!");
      });
    });
  });
});

function getMemory(...labels) {
  const memory = new Memory();
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const count = labels[i + 1]
    for (let j = 0; j < count; j++) {
      memory.get(label + "-" + (j + 1)).set("label", label);
    }
  }
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

      if (typeof(expectedLayer[key]) === "object") {
        const expected = expectedLayer[key];

        for (const label in expected) {
          assert.equal(actual.get("label"), expected[label], key + "/" + label + " in memory layer #" + i + " expected to be " + expected[label] + " but was " + actual.get("label"));
        }
      } else {
        const expected = expectedLayer[key] ? memory.get(expectedLayer[key]) : null;
        const expectedRef = expected ? "[" + expected.path + " #" + expected.ref + "]" : "none";
        assert.equal(actual, expected, key + " in memory layer #" + i + " expected to be " + expectedRef + " but was " + actualRef);
      }
    }
  }
}
