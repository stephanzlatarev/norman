import assert from "assert";
import move from "../train/military/flows.js";

class Placement {

  constructor(placements) {
    if (placements) {
      this.placements = placements;
    } else {
      this.placements = [];

      for (let i = 0; i < 100; i++) {
        this.placements.push(0);
      }
    }
  }

  place(x, y, volume) {
    this.placements[x + y * 10] = volume;
    return this;
  }

  move(target, steps) {
    const iterations = steps ? steps : 1;
    let placements = this.placements;

    for (let step = 0; step < iterations; step++) {
      placements = move(placements, target.placements);
    }

    return new Placement(placements);
  }

  assertEqual(another) {
    const differences = [];

    for (let spot = 0; spot < 100; spot++) {
      if (Math.abs(this.placements[spot] - another.placements[spot]) >= 0.01) {
        differences.push(spot + ": " + this.placements[spot] + " vs " + another.placements[spot]);
      }
    }

    if (differences.length) {
      this.display();
      console.log(" ================ ");
      another.display();
      assert.equal(differences.join(", "), "");
    }
  }

  display() {
    for (let y = 0; y < 10; y++) {
      const line = [];

      for (let x = 0; x < 10; x++) {
        line.push(cell(this.placements[x + y * 10]));
      }

      console.log(line.join(" "));
    }
  }
}

function cell(value) {
  if (value > 0) {
    if (value >= 100) return " ###";

    let cell = "" + Math.floor(value * 10);
    while (cell.length < 4) cell = " " + cell;
    return cell;
  }

  return "    ";
}

describe("Flows", function() {

  describe("basic moves", function() {

    it("basic moves", function() {
      const initial = new Placement().place(0, 0, 1);
      const deployment = new Placement().place(1, 1, 1);
      const expected = new Placement().place(1, 1, 1);
      expected.assertEqual(initial.move(deployment));
    });

  });

  describe("one unit spreads to multiple targets", function() {
    const initial = new Placement().place(4, 4, 50);
    const deployment = new Placement().place(0, 0, 10).place(8, 0, 10).place(0, 8, 10).place(9, 4, 10).place(4, 9, 10);

    it("one step", function() {
      const expected = new Placement().place(3, 3, 10).place(5, 3, 10).place(3, 5, 10).place(5, 4, 10).place(4, 5, 10);
      expected.assertEqual(initial.move(deployment, 1));
    });

    it("two steps", function() {
      const expected = new Placement().place(2, 2, 10).place(6, 2, 10).place(2, 6, 10).place(6, 4, 10).place(4, 6, 10);
      expected.assertEqual(initial.move(deployment, 2));
    });

    it("all steps", function() {
      deployment.assertEqual(initial.move(deployment, 5));
    });

  });

  describe("one unit moves over another on route to target", function() {
    const initial = new Placement().place(1, 1, 10).place(1, 3, 5);
    const deployment = new Placement().place(1, 3, 5).place(1, 5, 10);

    it("one step", function() {
      const expected = new Placement().place(1, 2, 10).place(1, 3, 5);
      expected.assertEqual(initial.move(deployment, 1));
    });

    it("two steps", function() {
      const expected = new Placement().place(1, 3, 15);
      expected.assertEqual(initial.move(deployment, 2));
    });

    it("all steps", function() {
      deployment.assertEqual(initial.move(deployment, 4));
    });

  });

  describe("three units move to one target", function() {
    const initial = new Placement().place(4, 4, 10).place(4, 5, 10).place(4, 6, 10);
    const deployment = new Placement().place(4, 9, 30);

    it("one step", function() {
      const expected = new Placement().place(4, 5, 10).place(4, 6, 10).place(4, 7, 10);
      expected.assertEqual(initial.move(deployment, 1));
    });

    it("three steps", function() {
      const expected = new Placement().place(4, 7, 10).place(4, 8, 10).place(4, 9, 10);
      expected.assertEqual(initial.move(deployment, 3));
    });

    it("all steps", function() {
      deployment.assertEqual(initial.move(deployment, 5));
    });

  });

  describe("three units move to one target with small parts remaining", function() {
    const initial = new Placement().place(4, 4, 10).place(4, 5, 10).place(4, 6, 10);
    const deployment = new Placement().place(4, 5, 3).place(4, 6, 3).place(4, 9, 24);

    it("one step", function() {
      const expected = new Placement().place(4, 5, 10).place(4, 6, 10).place(4, 7, 10);
      expected.assertEqual(initial.move(deployment, 1));
    });

    it("three steps", function() {
      const expected = new Placement().place(4, 5, 3).place(4, 6, 3).place(4, 7, 4).place(4, 8, 10).place(4, 9, 10);
      expected.assertEqual(initial.move(deployment, 3));
    });

    it("all steps", function() {
      deployment.assertEqual(initial.move(deployment, 5));
    });

  });

  describe("three units move to one target with half parts remaining", function() {
    const initial = new Placement().place(4, 4, 10).place(4, 5, 10).place(4, 6, 10);
    const deployment = new Placement().place(4, 5, 5).place(4, 6, 5).place(4, 9, 20);

    it("one step", function() {
      const expected = new Placement().place(4, 5, 10).place(4, 6, 10).place(4, 7, 10);
      expected.assertEqual(initial.move(deployment, 1));
    });

    it("three steps", function() {
      const expected = new Placement().place(4, 5, 5).place(4, 6, 5).place(4, 8, 10).place(4, 9, 10);
      expected.assertEqual(initial.move(deployment, 3));
    });

    it("all steps", function() {
      deployment.assertEqual(initial.move(deployment, 5));
    });

  });

  describe("moving in formation", function() {
    const initial = new Placement().place(1, 1, 10).place(1, 3, 10).place(3, 1, 10).place(2, 2, 10);
    const deployment = new Placement().place(7, 7, 10).place(7, 9, 10).place(9, 7, 10).place(8, 8, 10);

    it("one step", function() {
      const expected = new Placement().place(2, 2, 10).place(2, 4, 10).place(4, 2, 10).place(3, 3, 10);
      expected.assertEqual(initial.move(deployment, 1));
    });

    it("all steps", function() {
      const expected = new Placement().place(3, 3, 10).place(3, 5, 10).place(5, 3, 10).place(4, 4, 10);
      expected.assertEqual(initial.move(deployment, 2));
    });

  });

});
