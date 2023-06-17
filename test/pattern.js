import assert from "assert";
import Memory from "../code/memory.js";

describe("Memory patterns", function() {

  describe("creating and deleting patterns", function() {

    it("create pattern", function() {
      const memory = new Memory();
      assert.equal(memory.patterns.length, 0);
      memory.pattern({ nodes: { ONE: { label: "One" } }, infos: [ { node: "ONE" } ] });
      assert.equal(memory.patterns.length, 1);
    });

    it("delete pattern from memory", function() {
      const memory = new Memory();
      const pattern = memory.pattern({ nodes: { ONE: { label: "One" } }, infos: [ { node: "ONE" } ] });
      assert.equal(memory.patterns.length, 1);
      memory.remove(pattern);
      assert.equal(memory.patterns.length, 0);
    });

    it("delete pattern from pattern itself", function() {
      const memory = new Memory();
      const pattern = memory.pattern({ nodes: { ONE: { label: "One" } }, infos: [ { node: "ONE" } ] });
      assert.equal(memory.patterns.length, 1);
      memory.remove(pattern);
      assert.equal(memory.patterns.length, 0);
    });

  });

  describe("matching descriptors", function() {

    describe("type of info", function() {

      it("match node", function() {
        const memory = new Memory();
        const pattern = memory.pattern({
          nodes: { GAME: { label: "Game" } },
          infos: [ { node: "GAME" } ]
        });

        assertPatternMatch(pattern, []);

        memory.model().add("Game");
        assertPatternMatch(pattern, [ [ 1 ] ]);
      });

      it("match node by path only", function() {
        const memory = new Memory();
        const model = memory.model();
        const pattern = memory.pattern({
          nodes: { SUBJECT: { label: "Subject" }, OBJECT: {} },
          paths: [ [ "SUBJECT", "has", "OBJECT" ] ],
          infos: [ { node: "OBJECT", label: "id" } ]
        });

        const subject = model.add("Subject").set("id", 101);
        for (let i = 1; i <= 3; i++) model.add("Object-" + i).set("id", 200 + i);
        assertPatternMatch(pattern, []);

        subject.set("has", model.get("Object-2"));
        assertPatternMatch(pattern, [ [ 202 ] ]);
      });

      it("match path by node key and nodes by labels", function() {
        const memory = new Memory();
        const model = memory.model();
        const pattern = memory.pattern({
          nodes: { PRODUCER: { label: "Producer" }, PRODUCT: { label: "Product" } },
          paths: { PRODUCING: [ "PRODUCER", "produce", "PRODUCT" ] },
          infos: [ { node: "PRODUCER", label: "id" } ]
        });

        assertPatternMatch(pattern, []);

        const one = model.add("Producer").set("id", 701);
        assertPatternMatch(pattern, []);

        const two = model.add("Product");
        assertPatternMatch(pattern, []);

        one.set("produce", two);
        assertPatternMatch(pattern, [ [ 701 ] ]);
      });

      it("match path by node key and nodes by values", function() {
        const memory = new Memory();
        const model = memory.model();
        const pattern = memory.pattern({
          nodes: { PRODUCER: { producer: true }, PRODUCT: { product: true } },
          paths: { PRODUCING: [ "PRODUCER", "produce", "PRODUCT" ] },
          infos: [ { node: "PRODUCER", label: "id" }, { node: "PRODUCT", label: "id" } ]
        });

        assertPatternMatch(pattern, []);

        for (let i = 1; i < 5; i++) model.add("Producer-" + i).set("producer", true).set("id", 700 + i);
        assertPatternMatch(pattern, []);

        for (let i = 1; i < 5; i++) model.add("Product-" + i).set("product", true).set("id", 900 + i);
        assertPatternMatch(pattern, []);

        model.add("Producer-2").set("produce", model.add("Product-3"));
        assertPatternMatch(pattern, [ [ 702, 903 ] ]);

        model.add("Producer-3").set("produce", model.add("Product-2"));
        assertPatternMatch(pattern, [ [ 702, 903 ], [ 703, 902 ] ]);

        model.add("Producer-2").set("produce", false);
        assertPatternMatch(pattern, [ [ 703, 902 ] ]);

        model.add("X").set("producer", true).set("id", 101).set("produce", model.add("Y").set("product", true).set("id", 102));
        assertPatternMatch(pattern, [ [ 703, 902 ], [ 101, 102 ] ]);
      });

//      it("match path by use of node label", function() {
//        const memory = new Memory();
//        const model = memory.model();
//        const pattern = memory.pattern({
//          nodes: { PRODUCER: { label: "Producer" } },
//          paths: { PRODUCING: [ "PRODUCER", "produce", "Product" ] },
//          infos: [ { node: "PRODUCER", label: "id" } ]
//        });
//
//        assertPatternMatch(pattern, []);
//
//        const one = model.add("Producer").set("id", 702);
//        assertPatternMatch(pattern, []);
//
//        const two = model.add("Product");
//        assertPatternMatch(pattern, []);
//
//        one.set("produce", two);
//        assertPatternMatch(pattern, [ [ 702 ] ]);
//      });

      it("match path which starts in fixture", function() {
        const memory = new Memory();
        const model = memory.model();
        const fixture = memory.pattern({ nodes: { SUBJECT: { subject: true } }, infos: [ { node: "SUBJECT" } ] });
        const subject = model.add("Subject").set("subject", true);

        const pattern = memory.pattern({
          nodes: { OBJECT: { object: true } },
          paths: [ [ "SUBJECT", "has", "OBJECT" ] ],
          infos: [ { node: "OBJECT", label: "id" } ]
        });

        for (const one of fixture) {
          pattern.fix(one);
        }

        assertPatternMatch(pattern, []);

        for (let i = 1; i < 5; i++) model.add("Subject-" + i).set("object", true).set("id", i);
        for (let i = 1; i < 5; i++) model.add("Object-" + i).set("object", true).set("id", i);
        assertPatternMatch(pattern, []);

        model.add("Subject-2").set("has", model.add("Object-1"));
        subject.set("has", model.add("Object-3"));
        model.add("Subject-4").set("has", model.add("Object-2"));
        assertPatternMatch(pattern, [ [ 3 ] ]);
      });

      it("match path which starts in fixture and the fix is after the creation of memory nodes", function() {
        const memory = new Memory();
        const model = memory.model();
        const fixture = memory.pattern({ nodes: { SUBJECT: { subject: true } }, infos: [ { node: "SUBJECT" } ] });
        const subject = model.add("Subject").set("subject", true);

        const pattern = memory.pattern({
          nodes: { OBJECT: { object: true } },
          paths: [ [ "SUBJECT", "has", "OBJECT" ] ],
          infos: [ { node: "OBJECT", label: "id" } ]
        });

        for (let i = 1; i < 5; i++) model.add("Subject-" + i).set("object", true).set("id", i);
        for (let i = 1; i < 5; i++) model.add("Object-" + i).set("object", true).set("id", i);

        model.add("Subject-2").set("has", model.add("Object-1"));
        subject.set("has", model.add("Object-3"));
        model.add("Subject-4").set("has", model.add("Object-2"));
        assertPatternMatch(pattern, []);

        for (const one of fixture) {
          pattern.fix(one);
        }
        assertPatternMatch(pattern, [ [ 3 ] ]);
      });

      it("match path which ends in fixture", function() {
        const memory = new Memory();
        const model = memory.model();
        const fixture = memory.pattern({ nodes: { OBJECT: { object: true } }, infos: [ { node: "OBJECT" } ] });
        const object = model.add("Object").set("object", true);

        const pattern = memory.pattern({
          nodes: { SUBJECT: { subject: true } },
          paths: [ [ "SUBJECT", "has", "OBJECT" ] ],
          infos: [ { node: "SUBJECT", label: "id" } ]
        });

        for (const one of fixture) {
          pattern.fix(one);
        }

        assertPatternMatch(pattern, []);

        for (let i = 1; i < 5; i++) model.add("Subject-" + i).set("subject", true).set("id", i);
        for (let i = 1; i < 5; i++) model.add("Object-" + i).set("object", true).set("id", i);
        assertPatternMatch(pattern, []);

        model.add("Subject-1").set("has", model.add("Object-2"));
        model.add("Subject-3").set("has", object);
        model.add("Subject-4").set("has", model.add("Object-1"));
        assertPatternMatch(pattern, [ [ 3 ] ]);
      });

      it("match path which ends in fixture and the fix is after the creation of memory nodes", function() {
        const memory = new Memory();
        const model = memory.model();
        const fixture = memory.pattern({ nodes: { OBJECT: { object: true } }, infos: [ { node: "OBJECT" } ] });
        const object = model.add("Object").set("object", true);

        let match;
        for (const one of fixture) {
          match = one;
        }

        const pattern = memory.pattern({
          nodes: { SUBJECT: { subject: true } },
          paths: [ [ "SUBJECT", "has", "OBJECT" ] ],
          infos: [ { node: "SUBJECT", label: "id" } ]
        });

        for (let i = 1; i < 5; i++) model.add("Subject-" + i).set("subject", true).set("id", i);
        for (let i = 1; i < 5; i++) model.add("Object-" + i).set("object", true).set("id", i);

        model.add("Subject-1").set("has", model.add("Object-2"));
        model.add("Subject-3").set("has", object);
        model.add("Subject-4").set("has", model.add("Object-1"));

        pattern.fix(match);
        assertPatternMatch(pattern, [ [ 3 ] ]);
      });

      it("match value", function() {
        const memory = new Memory();
        const model = memory.model();
        const pattern = memory.pattern({
          nodes: { GAME: { label: "Game" } },
          infos: [ { node: "GAME", label: "time" } ]
        });

        const game = model.add("Game");

        assertPatternMatch(pattern, [ [ 0 ] ]);
        game.set("time", 101);
        assertPatternMatch(pattern, [ [ 101 ] ]);
      });

    });

    describe("multiple node descriptors", function() {

      it("multiple descriptors matching the same memory node at pattern creation", function() {
        const memory = new Memory();
        memory.model().add("Object").set("a", true).set("b", true).set("c", true);

        const pattern = memory.pattern({
          nodes: { A: { a: true }, B: { b: true }, C: { c: true } },
          infos: [ { node: "A" }, { node: "B" }, { node: "C" } ]
        });
        assertPatternMatch(pattern, [ [ 1, 1, 1 ] ]);
      });

      it("multiple descriptors matching the same memory node after time", function() {
        const memory = new Memory();
        const object = memory.model().add("Object").set("a", true);

        const pattern = memory.pattern({
          nodes: { A: { a: true }, B: { b: true }, C: { c: true } },
          infos: [ { node: "A" }, { node: "B" }, { node: "C" } ]
        });
        assertPatternMatch(pattern, []);

        object.set("b", true).set("c", true);
        assertPatternMatch(pattern, [ [ 1, 1, 1 ] ]);
      });

    });

    describe("timeline", function() {

      describe("match exists before creation of pattern", function() {

        it("match by label", function() {
          const memory = new Memory();
          const model = memory.model();
          model.add("Game").set("time", 101);

          const pattern = memory.pattern({
            nodes: { GAME: { label: "Game" } },
            infos: [ { node: "GAME", label: "time" } ]
          });

          assertPatternMatch(pattern, [ [ 101 ] ]);
        });

      });

      describe("match appears after creation of pattern", function() {

        it("match by label", function() {
          const memory = new Memory();
          const model = memory.model();

          const pattern = memory.pattern({
            nodes: { GAME: { label: "Game" } },
            infos: [ { node: "GAME", label: "time" } ]
          });

          model.add("Game").set("time", 101);

          assertPatternMatch(pattern, [ [ 101 ] ]);
        });

      });

      describe("match changes after creation of pattern", function() {

        it("match by label", function() {
          const memory = new Memory();
          const model = memory.model();
          model.add("Game").set("time", 101);

          const pattern = memory.pattern({
            nodes: { GAME: { label: "Game" } },
            infos: [ { node: "GAME", label: "time" } ]
          });

          model.add("Game").set("time", 203);

          assertPatternMatch(pattern, [ [ 203 ] ]);
        });

      });

    });

  });

  describe("matching iterator", function() {

    describe("when pattern doesn't ask for anything", function() {

      it("no pattern and no memory nodes", function() {
        assertPatternMatch(new Memory().pattern({}), []);
      });

      it("no pattern and some memory nodes", function() {
        const memory = new Memory();
        memory.model().add("test").set("value", 1);
        assertPatternMatch(memory.pattern({}), []);
      });

    });

    describe("when there are no matches in memory", function() {

      it("no matching memory node", function() {
        const memory = new Memory();
        memory.model().add("Game").set("time", 1);

        const pattern = memory.pattern({
          nodes: { DATA: { label: "Data" }, GAME: { label: "Game" } },
          infos: [ { node: "DATA" }, { node: "GAME" } ]
        });

        assertPatternMatch(pattern, []);
      });

    });

    describe("when there are multiple matches in memory", function() {

      it("multiple memory nodes", function() {
        const memory = new Memory();
        const model = memory.model();
        model.add("unit-1").set("unit", true).set("id", 101).set("age", 32);
        model.add("unit-2").set("unit", true).set("id", 102).set("age", 17);
        model.add("unit-3").set("unit", true).set("id", 103).set("age", 63);

        const pattern = memory.pattern({
          nodes: { UNIT: { unit: true } },
          infos: [ { node: "UNIT", label: "id" }, { node: "UNIT", label: "age" } ]
        });

        assertPatternMatch(pattern, [[101, 32], [102, 17], [103, 63]]);
      });

    });

  });

  describe("notifications for pattern matches", function() {

    it("callback doesn't expect to receive the matches", async function() {
      let notification = "no notification received yet";
      const callback = ((...match) => notification = JSON.stringify(match));

      const memory = new Memory();
      const model = memory.model();
      const game = model.add("Game").set("time", 1);

      memory.pattern({
        nodes: { GAME: { label: "Game" } },
        infos: [ { node: "GAME", label: "time" } ]
      }).listen(callback);
      assert.equal(notification, "[]", "Notification is not as expected");

      game.set("time", 101);
      await memory.notifyPatternListeners();
      assert.equal(notification, "[]", "Notification is not as expected");
    });

    it("callback expects to receive the matches", async function() {
      let notification = "no notification received yet";
      const callback = ((match) => notification = JSON.stringify(match));

      const memory = new Memory();
      const model = memory.model();
      const game = model.add("Game").set("time", 1);

      memory.pattern({
        nodes: { GAME: { label: "Game" } },
        infos: { "Game Label": { node: "GAME", label: "time" } }
      }).listen(callback);
      assert.equal(notification, "{\"Game Label\":1}", "Notification is not as expected");

      game.set("time", 101);
      await memory.notifyPatternListeners();
      assert.equal(notification, "{\"Game Label\":101}", "Notification is not as expected");
    });

    it("notification on disappearance of a match", async function() {
      let notification = "no notification received yet";
      const callback = ((match) => notification = JSON.stringify(match));

      const memory = new Memory();
      const model = memory.model();
      const object = model.add("Object").set("value", true);

      memory.pattern({
        nodes: { OBJECT: { label: "Object", value: true } },
        infos: [ { node: "OBJECT" } ]
      }).listen(callback);

      await memory.notifyPatternListeners();
      assert.equal(notification, "{\"0\":1}", "Notification is not as expected");

      object.set("value", false);
      await memory.notifyPatternListeners();
      assert.equal(notification, "null", "Notification is not as expected");
    });

  });

  describe("reading data", function() {

    it("reading arrays of values", async function() {
      const memory = new Memory();
      const model = memory.model();
      const pattern = memory.pattern({
        nodes: { A: { label: "A" }, OBJECT1: { label: "Object 1" }, OBJECT2: { label: "Object 2" }, OBJECT3: { label: "Object 3" }, Z: { label: "Z" } },
        infos: [ { node: "A" }, { node: "OBJECT1", length: 2 }, { node: "OBJECT2", length: 3 }, { node: "OBJECT3", length: 4 }, { node: "Z" } ]
      });

      model.add("A");
      model.add("Object 1").set(0, 101).set(1, 102);
      model.add("Object 2").set(0, 201).set(1, 202).set(2, 203);
      model.add("Object 3").set(0, 301).set(1, 302).set(2, 303).set(3, 304);
      model.add("Z");

      assertPatternMatch(pattern, [[1, 101, 102, 201, 202, 203, 301, 302, 303, 304, 1]]);
    });

  });

  describe("writing data", function() {

    it("create node with label", async function() {
      const memory = new Memory();
      const pattern = memory.pattern({
        nodes: { OBJECT: { label: "Object", value: 500 } },
        infos: [ { node: "OBJECT" } ]
      });

      pattern.write([1]);
      assert.equal(memory.add("Object").get("value"), 500, "New value is not as expected");
    });

    it("create node by setting value", async function() {
      const memory = new Memory();
      const pattern = memory.pattern({
        nodes: { OBJECT: { label: "Object" } },
        infos: [ { node: "OBJECT", label: "value" } ]
      });

      pattern.write([500]);
      assert.equal(memory.add("Object").get("value"), 500, "New value is not as expected");
    });

    it("setting values", async function() {
      const memory = new Memory();
      const model = memory.model();
      const object = model.add("Object").set("value", 1);
      const pattern = memory.pattern({
        nodes: { OBJECT: { label: "Object" } },
        infos: [ { node: "OBJECT", label: "value" } ]
      });

      assert.equal(object.get("value"), 1, "Initial value is not as expected");

      pattern.write([300]);
      assert.equal(object.get("value"), 300, "New value is not as expected");
    });

    it("setting arrays of values", async function() {
      const memory = new Memory();
      const model = memory.model();
      const pattern = memory.pattern({
        nodes: { OBJECT1: { label: "Object 1" }, OBJECT2: { label: "Object 2" }, OBJECT3: { label: "Object 3" } },
        infos: [ { node: "OBJECT1", length: 2 }, { node: "OBJECT2", length: 3 }, { node: "OBJECT3", length: 4 } ]
      });

      model.add("Object 1");
      model.add("Object 2");
      model.add("Object 3");

      pattern.write([101, 102, 201, 202, 203, 301, 302, 303, 304]);
      assert.equal(asArrayText(model.get("Object 1").values(2)), asArrayText([101, 102]));
      assert.equal(asArrayText(model.get("Object 2").values(3)), asArrayText([201, 202, 203]));
      assert.equal(asArrayText(model.get("Object 3").values(4)), asArrayText([301, 302, 303, 304]));
    });

    it("linking existing nodes", async function() {
      const memory = new Memory();
      const model = memory.model();
      const author = model.add("Author");
      const book = model.add("Book");
      const pattern = memory.pattern({
        nodes: { AUTHOR: { label: "Author" }, BOOK: { label: "Book" } },
        paths: { WRITE: [ "AUTHOR", "writes",  "BOOK" ] },
        infos: [ { path: "WRITE" } ]
      });

      assert.equal(author.get("writes"), 0, "Initial path is not as expected");

      pattern.write([1]);
      assert.equal(author.get("writes"), book, "New path is not as expected");
    });

    it("linking existing to new node", async function() {
      const memory = new Memory();
      const model = memory.model();
      const author = model.add("Author");
      const pattern = memory.pattern({
        nodes: { AUTHOR: { label: "Author" }, BOOK: { label: "Book" } },
        paths: { WRITE: [ "AUTHOR", "writes",  "BOOK" ] },
        infos: [ { path: "WRITE" } ]
      });

      assert.equal(author.get("writes"), 0, "Initial path is not as expected");

      pattern.write([1]);
      assert.equal(author.get("writes").label, "Book", "New path is not as expected");
    });

    it("linking new to existing node", async function() {
      const memory = new Memory();
      const model = memory.model();
      const book = model.add("Book");
      const pattern = memory.pattern({
        nodes: { AUTHOR: { label: "Author" }, BOOK: { label: "Book" } },
        paths: { WRITE: [ "AUTHOR", "writes",  "BOOK" ] },
        infos: [ { path: "WRITE" } ]
      });

      pattern.write([1]);

      const author = memory.add("Author");
      assert.equal(author.get("writes"), book, "New path is not as expected");
    });

    it("linking new nodes", async function() {
      const memory = new Memory();
      const pattern = memory.pattern({
        nodes: { AUTHOR: { label: "Author" }, BOOK: { label: "Book" } },
        paths: { WRITE: [ "AUTHOR", "writes",  "BOOK" ] },
        infos: [ { path: "WRITE" } ]
      });

      pattern.write([1]);

      const author = memory.add("Author");
      const book = memory.add("Book");
      assert.equal(author.get("writes"), book, "New path is not as expected");
    });

    it("linking new node to label", async function() {
      const memory = new Memory();
      const pattern = memory.pattern({
        nodes: { AUTHOR: { label: "Author" } },
        paths: { WRITE: [ "AUTHOR", "writes",  "Book" ] },
        infos: [ { path: "WRITE" } ]
      });

      pattern.write([1]);

      const author = memory.add("Author");
      assert.equal(author.get("writes").label, "Book", "New path is not as expected");
    });

    it("removing links", async function() {
      const memory = new Memory();
      const model = memory.model();
      const pattern = memory.pattern({
        nodes: { AUTHOR: { label: "Author" }, BOOK: { label: "Book" } },
        paths: { WRITE: [ "AUTHOR", "writes",  "Book" ] },
        infos: [ { path: "WRITE" } ]
      });

      model.add("Author").set("writes", model.add("Book"));

      pattern.write([0]);

      assert.equal(model.get("Author").get("writes").label, null, "Path is not removed");
    });

  });

  describe("basic pattern scenarios for StarCraft II skills", function() {

    it("greet with chat message at exact game time", async function() {
      let notificationsGiven = 0;
      let notificationsWhen = 0;
      let notificationsThen = 0;

      const memory = new Memory();
      const given = memory.pattern({
        nodes: { GOAL: { label: "Greet", goal: true }, CHAT: { label: "Chat" } },
        infos: [ { node: "GOAL" } ]
      }).listen(() => (notificationsGiven++));

      const model = memory.model();
      const chat = model.add("Chat");
      const game = model.add("Game").set("time", 1);
      model.add("Greet").set("goal", true);

      await memory.notifyPatternListeners();

      assert.equal(notificationsGiven, 1, "Given pattern not matched");
      assertPatternMatch(given, [[1]]);

      // Skill starts to watch this situation
      const when = memory.pattern({
        nodes: { GAME: { label: "Game" } },
        infos: [ { node: "GAME", label: "time" } ]
      }).listen(() => (notificationsWhen++));
      const then = memory.pattern({
        infos: [ { node: "GOAL" }, { node: "CHAT", length: 2 } ]
      }).listen(() => (notificationsThen++));

      for (const situation of given) when.fix(situation);

      assert.equal(notificationsWhen, 1, "When pattern not matched");
      assertPatternMatch(when, [[1]]);

      // Time goes by
      game.set("time", 10);
      await memory.notifyPatternListeners();

      // More time goes by
      game.set("time", 22);
      await memory.notifyPatternListeners();
      assert.equal(notificationsWhen, 2, "When pattern didn't notify about changes");
      assertPatternMatch(when, [[22]]);
      for (const take of when) then.fix(take);

      // Send greeting
      then.write([0, 8, 7]);

      // Check that the goal is gone and the message is in the chat
      assertPatternMatch(given, []);
      assert.equal(asArrayText(chat.values(2)), asArrayText([8, 7]));

      // Check that notifications are not too many
      await memory.notifyPatternListeners();
      assert.equal(notificationsGiven, 2, "Given pattern notifications not as expected");
    });

    it("chronoboost with many nexuses", async function() {
      const memory = new Memory();
      const notifications = [];

      const when = memory.pattern({
        nodes: {
          PRODUCER: { boostable: true, orders: true, boost: false },
          NEXUS: { "type:nexus": true }
        },
        infos: [
          { node: "NEXUS", label: "id" },
          { node: "NEXUS", label: "energy" },
          { node: "PRODUCER", label: "id" },
          { node: "PRODUCER", label: "ability" },
        ]
      }).listen(match => notifications.push(match));

      const model = memory.model();
      const firstNexus = model.add("Nexus-1").set("type:nexus", true).set("id", 101).set("boostable", true);
      const secondNexus = model.add("Nexus-2").set("type:nexus", true).set("id", 102).set("boostable", true);

      firstNexus.set("energy", 50);
      secondNexus.set("energy", 50);
      await memory.notifyPatternListeners();
      assertNotifications(notifications, []);
      notifications.length = 0;

      // Make first nexus eligible for boost
      firstNexus.set("orders", 1).set("ability", 1001);
      await memory.notifyPatternListeners();
      assertNotifications(notifications, [
        {"0":101,"1":50,"2":101,"3":1001},
        {"0":102,"1":50,"2":101,"3":1001}
      ]);
      notifications.length = 0;

      // Make second nexus eligible for boost
      secondNexus.set("orders", 1).set("ability", 1002);
      await memory.notifyPatternListeners();
      assertNotifications(notifications, [
        {"0":101,"1":50,"2":101,"3":1001},
        {"0":101,"1":50,"2":102,"3":1002},
        {"0":102,"1":50,"2":101,"3":1001},
        {"0":102,"1":50,"2":102,"3":1002}
      ]);
      notifications.length = 0;

      // Make second nexus boost the first one
      secondNexus.set("energy", 0);
      firstNexus.set("boost", 50);
      await memory.notifyPatternListeners();
      assertNotifications(notifications, [
        {"0":101,"1":50,"2":102,"3":1002},
        {"0":102,"1": 0,"2":102,"3":1002}
      ]);
      notifications.length = 0;

      const then = memory.pattern({
        paths: { COMMAND: [ "NEXUS", "chronoboost", "PRODUCER" ] },
        infos: [ { path: "COMMAND" } ]
      });

      let situation;
      let boost;
      for (const take of when) {
        then.fix(take);

        if (take.node("NEXUS").get("energy") >= 50) {
          situation = take;
          boost = [1];
        }
      }

      then.fix(situation);
      then.write(boost);

      // Check that first nexus is to boost the second one
      assert.equal(firstNexus.get("chronoboost"), secondNexus);
      assert.equal(secondNexus.get("chronoboost"), 0);
    });

  });

});

function assertPatternMatch(pattern, expectedMatches) {
  let index = 0;
  for (const actualMatch of pattern) {
    assert.equal(asArrayText(actualMatch.data()), asArrayText(expectedMatches[index]), "Pattern match #" + index + " is not as expected");
    index++;
  }
  assert.equal(index, expectedMatches.length, "Pattern has wrong number of matches");
}

function assertNotifications(notifications, expectedNotifications) {
  let index = 0;
  for (const actualNotification of notifications) {
    assert.equal(asObjectText(actualNotification), asObjectText(expectedNotifications[index]), "Notification #" + index + " is not as expected");
    index++;
  }
  assert.equal(index, expectedNotifications.length, "Callback received wrong number of notifications");
}

function asArrayText(value) {
  return Array.isArray(value) ? JSON.stringify(value) : "[]";
}

function asObjectText(value) {
  return value ? JSON.stringify(value) : "";
}
