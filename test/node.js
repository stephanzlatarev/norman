import assert from "assert";
import Node from "../code/node.js";

describe("Memory nodes", function() {

  it("create node", function() {
    const node = new Node("node", 1);
    assert.equal(node.ref, 1, "Node doesn't remember its reference number");
  });

  describe("storing and retrieving information", function() {
    const node = new Node("node", );

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
    });

    it("zero", function() {
      node.set("zero", 0);
      assert.equal(node.get("zero"), 0);
    });

    it("booleans", function() {
      node.set("true", true);
      assert.equal(node.get("true"), 1);
      node.set("false", false);
      assert.equal(node.get("false"), 0);
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

    it("booleans", function() {
      let calls = 0;
      new Node("node", 9, function(type, node, label, value) {
        assert.equal(type, 2, "Callback didn't refer to correct event type");
        assert.equal(node.ref, 9, "Callback didn't refer to correct node");
        assert.equal(label, "bool", "Callback didn't refer to correct label");
        if (calls === 0) {
          assert.equal(value, 1, "Callback didn't refer to correct value");
        } else if (calls === 1) {
          assert.equal(value, 0, "Callback didn't refer to correct value");
        }
        calls++;
      }).set("bool", true).set("bool", false);
      assert.equal(calls, 2, "Callback didn't make correct number of calls");
    });

    it("numbers", function() {
      let calls = 0;
      new Node("node", 17, function(type, node, label, value) {
        assert.equal(type, 2, "Callback didn't refer to correct event type");
        assert.equal(node.ref, 17, "Callback didn't refer to correct node");
        assert.equal(label, "pi", "Callback didn't refer to correct label");
        assert.equal(value, 3.14, "Callback didn't refer to correct value");
        calls++;
      }).set("pi", 3.14);
      assert.equal(calls, 1, "Callback didn't make correct number of calls");
    });

    it("links to nodes", function() {
      const other = new Node("other");
      let calls = 0;
      new Node("node", 14, function(type, node, label, value) {
        assert.equal(type, 2, "Callback didn't refer to correct event type");
        assert.equal(node.ref, 14, "Callback didn't refer to correct node");
        assert.equal(label, "link", "Callback didn't refer to correct label");
        assert.equal(value, other, "Callback didn't refer to correct value");
        calls++;
      }).set("link", other);
      assert.equal(calls, 1, "Callback didn't make correct number of calls");
    });

    it("when clearing stored information", function() {
      const other = new Node("other");
      let calls = 0;
      new Node("node", 21, function(type, node, label, value) {
        assert.equal(type, 2, "Callback didn't refer to correct event type");
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

  describe("matching information", function() {

    it("matching label", function() {
      const node = new Node("node");
      assert.equal(node.match({ label: "node" }), true);
    });

    it("various values", function() {
      const node = new Node("node").set("a", 2).set("b", true).set("c", false).set("d", 0);
      assert.equal(node.match({ a: 2, b: true, c: false, d: 0 }), true);
    });

    it("ignoring empty values", function() {
      const node = new Node("node").set("id", 1).set("boolean", false).set("number", 0).set("link", new Node()).clear("link");
      assert.equal(node.match({ id: 1 }), true);
    });

    it("matching empty values", function() {
      const node = new Node("node").set("id", 1);
      assert.equal(node.match({ id: 1, "boolean": false, "number": 0, "link": null }), true);
    });

    it("testing for empty values", function() {
      const node = new Node("node").set("id", 1).set("boolean", true);
      assert.equal(node.match({ id: 1, "boolean": false }), false);
    });

  });

});
