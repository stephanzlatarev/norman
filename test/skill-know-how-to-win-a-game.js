import assert from "assert";
import fs from "fs";
import Memory from "../code/memory.js";

const MAPPING = JSON.parse(fs.readFileSync("./skill/know-how-to-win-a-game/mapping.json"));

describe("Skill 'know how to win a game'", function() {

  it("Suggest subgoal", function() {
    const memory = new Memory();
    const goal = memory.get("goal").set("label", "destroy enemy");
    const game = memory.get("game").set("is-game", true);

    const layers = memory.layers(goal, game, MAPPING.memory);
    assert.equal(layers.length, 1, "Memory layers don't match!");

    const layer = layers[0];
    const subgoal = layer.get("BUILD-STRENGTH");
    assert.equal(subgoal.get("label"), "build strength", "Subgoal label doesn't match!");
    assert.equal(goal.links().length, 0, "Subgoal is provisioned too early!");
  });

  it("Provision subgoal", function() {
    const memory = new Memory();
    const goal = memory.get("goal").set("label", "destroy enemy");
    const game = memory.get("game").set("is-game", true);
    const layer = memory.layers(goal, game, MAPPING.memory)[0];

    for (const output of MAPPING.output) layer.set(output, 1);

    assert.equal(goal.links().length, 1, "Subgoal is not provisioned!");

    const subgoal = goal.links()[0];
    assert.equal(subgoal.get("label"), "build strength", "Subgoal label doesn't match!");
    assert.equal(subgoal.memory, memory, "Subgoal isn't associated to memory!");
    assert.equal(subgoal.path, "goal/build-strength", "Subgoal doesn't have proper path in memory!");
  });

});
