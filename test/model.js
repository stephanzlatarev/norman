import assert from "assert";
import Memory from "../code/memory.js";

const memory = new Memory();
const model = memory.model();

describe("Memory models", function() {

  it("adding nodes", function() {
    const node = model.add();

    assert.notEqual(node, null, "Node is null");
    assert.equal(node.ref >= 0, true, "Node's reference number is not a number");
  });

  it("adding nodes from the same model", function() {
    const a = model.add();
    const b = model.add();

    assert.notEqual(a, b, "Nodes don't differ");
    assert.notEqual(a.ref, b.ref, "Nodes don't have different reference numbers");
  });

  it("adding nodes from different models", function() {
    const a = model.add();
    const b = memory.model().add();

    assert.notEqual(a, b, "Nodes don't differ");
    assert.notEqual(a.ref, b.ref, "Nodes don't have different reference numbers");
  });

  it("finding nodes", function() {
    const a = model.add().set("value", 100);
    const b = model.add().set("value", -100);

    assert.equal(model.find({ value: 100 }), a);
    assert.equal(model.find({ value: -100 }), b);
  });

});
