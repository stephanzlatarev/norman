import assert from "assert";
import Memory from "../code/memory.js";

const memory = new Memory();

describe("Memory models", function() {

  it("adding a node", function() {
    const node = memory.model().add("a");

    assert.notEqual(node, null, "Node is null");
    assert.equal(node.ref >= 0, true, "Node's reference number is not a number");
  });

  it("adding nodes with the same label into the same model", function() {
    const model = memory.model();
    const a = model.add("a");
    const b = model.add("a");

    assert.strictEqual(a, a, "Nodes differ");
    assert.equal(a.ref, b.ref, "Nodes have different reference numbers");
  });

  it("adding nodes with different labels into the same model", function() {
    const model = memory.model();
    const a = model.add("a");
    const b = model.add("b");

    assert.notEqual(a, b, "Nodes don't differ");
    assert.notEqual(a.ref, b.ref, "Nodes don't have different reference numbers");
  });

  it("adding nodes with the same label into different models", function() {
    const a = memory.model().add("a");
    const b = memory.model().add("a");

    assert.notEqual(a, b, "Nodes don't differ");
    assert.notEqual(a.ref, b.ref, "Nodes don't have different reference numbers");
  });

  it("adding nodes with different labels into different models", function() {
    const a = memory.model().add("a");
    const b = memory.model().add("b");

    assert.notEqual(a, b, "Nodes don't differ");
    assert.notEqual(a.ref, b.ref, "Nodes don't have different reference numbers");
  });

  it("finding one node by label", function() {
    const model = memory.model();
    const a = model.add("a").set("value", 100);
    const b = model.add("b").set("value", -100);

    assert.equal(model.one({ label: "a" }), a);
    assert.equal(model.one({ label: "b" }), b);
  });

  it("finding one node by values", function() {
    const model = memory.model();
    const a = model.add("a").set("value", 100);
    const b = model.add("b").set("value", -100);

    assert.equal(model.one({ value: 100 }), a);
    assert.equal(model.one({ value: -100 }), b);
  });

  it("getting a node by its label", function() {
    const model = memory.model();
    const node = model.add("a").set("flag", true);
    assert.equal(node.get("flag"), true);

    assert.equal(model.add("a").get("flag"), true);
  });

  it("deleting a node from memory", function() {
    const model = memory.model();
    const node = model.add("a").set("flag", true);
    assert.equal(node.get("flag"), true);

    memory.remove(node);
    assert.equal(model.add("a").get("flag"), false);
  });

  it("deleting a linked node from memory", function() {
    const model = memory.model();
    const node = model.add("a");
    const link = model.add("b").set("link", node);

    memory.remove(node);
    assert.equal(link.get("link"), 0);
  });

  it("deleting a node from model", function() {
    const model = memory.model();
    const node = model.add("a").set("flag", true);
    assert.equal(node.get("flag"), true);

    model.remove(node);
    assert.equal(model.add("a").get("flag"), false);
  });

  it("deleting a linked node from model", function() {
    const model = memory.model();
    const node = model.add("a");
    const link = model.add("b").set("link", node);

    model.remove(node);
    assert.equal(link.get("link"), 0);
  });

});
