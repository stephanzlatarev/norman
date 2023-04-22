import assert from "assert";
import Node from "../code/node.js";

describe("Memory nodes", function() {

  it("create node", function() {
    const node = new Node(1);
    assert.equal(node.ref, 1, "Node doesn't remember its reference number");
  });

  describe("storing and retrieving information", function() {
    const node = new Node();

    it("empty", function() {
      assert.equal(node.get("empty"), 0, "Node doesn't return 0 for empty memory");
    });

    it("invalid", function() {
      const value = 10;
      node.set("empty", value);
      assert.equal(node.get("empty"), value, "Failure when setting this test");

      node.set("empty");
      assert.equal(node.get("empty"), value, "Node doesn't ignore call with no value");

      node.set("empty", undefined);
      assert.equal(node.get("empty"), value, "Node doesn't ignore call with undefined value");

      node.set("empty", null);
      assert.equal(node.get("empty"), value, "Node doesn't ignore call with null value");
    });

    it("zero", function() {
      node.set("zero", 0);
      assert.equal(node.get("zero"), 0);
    });

    it("numbers", function() {
      node.set("positive number", 135.65);
      assert.equal(node.get("positive number"), 135.65);
      node.set("negative number", -202.7);
      assert.equal(node.get("negative number"), -202.7);
    });

    it("links to nodes", function() {
      const other = new Node();
      node.set("link", other);
      assert.equal(node.get("link"), other);
    });

  });

  describe("calling back on changes", function() {

    it("numbers", function() {
      let calls = 0;
      new Node(17, function(node, label, value) {
        assert.equal(node.ref, 17, "Callback didn't refer to correct node");
        assert.equal(label, "pi", "Callback didn't refer to correct label");
        assert.equal(value, 3.14, "Callback didn't refer to correct value");
        calls++;
      }).set("pi", 3.14);
      assert.equal(calls, 1, "Callback didn't make correct number of calls");
    });

    it("links to nodes", function() {
      const other = new Node();
      let calls = 0;
      new Node(14, function(node, label, value) {
        assert.equal(node.ref, 14, "Callback didn't refer to correct node");
        assert.equal(label, "link", "Callback didn't refer to correct label");
        assert.equal(value, other, "Callback didn't refer to correct value");
        calls++;
      }).set("link", other);
      assert.equal(calls, 1, "Callback didn't make correct number of calls");
    });

    it("when clearing stored information", function() {
      const other = new Node();
      let calls = 0;
      new Node(21, function(node, label, value) {
        assert.equal(node.ref, 21, "Callback didn't refer to correct node");
        assert.equal(label, "link", "Callback didn't refer to correct label");
        if (calls === 0) {
          assert.equal(value, other, "Callback didn't refer to correct value");
        } else if (calls === 1) {
          assert.equal(value, 0, "Callback didn't refer to correct value");
        }
        calls++;
      }).set("link", other).clear("link");
      assert.equal(calls, 2, "Callback didn't make correct number of calls");
    });

  });

});
