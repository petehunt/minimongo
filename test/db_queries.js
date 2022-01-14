/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS204: Change includes calls to have a more natural evaluation order
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const MemoryDb = require("../src/MemoryDb");
const _ = require("lodash");
const chai = require("chai");
const { assert } = chai;

const error = function (err) {
  console.log(err);
  return assert.fail(JSON.stringify(err));
};

// Runs queries on @col which must be a collection (with a:<string>, b:<integer>, c:<json>, geo:<geojson>, stringarr: <json array of strings>)
// When present:
// c.arrstr is an array of string values
// c.arrint is an array of integer values
// @reset(done) must truncate the collection
module.exports = function () {
  before(function () {
    // Test a filter to return specified rows (in order)
    return (this.testFilter = function (filter, ids, done) {
      const results = this.col.find(filter, { sort: ["_id"] });
      assert.deepEqual(_.pluck(results, "_id"), ids);
      return done();
    });
  });

  context("With sample rows", function () {
    beforeEach(function (done) {
      return this.reset(() => {
        this.col.upsert({ _id: "1", a: "Alice", b: 1, c: { d: 1, e: 2 } });
        this.col.upsert({ _id: "2", a: "Charlie", b: 2, c: { d: 2, e: 3 } });
        this.col.upsert({ _id: "3", a: "Bob", b: 3 });
        return process.nextTick(() => done());
      });
    });

    it("finds all rows", function (done) {
      const results = this.col.find({});
      assert.equal(results.length, 3);
      return done();
    });

    it("finds all rows with options", function (done) {
      const results = this.col.find({}, {});
      assert.equal(3, results.length);
      return done();
    });

    it("filters by id", function (done) {
      return this.testFilter({ _id: "1" }, ["1"], done);
    });

    it("filters by string", function (done) {
      return this.testFilter({ a: "Alice" }, ["1"], done);
    });

    it("filters by $in string", function (done) {
      return this.testFilter(
        { a: { $in: ["Alice", "Charlie"] } },
        ["1", "2"],
        done
      );
    });

    it("filters by number", function (done) {
      return this.testFilter({ b: 2 }, ["2"], done);
    });

    it("filters by $in number", function (done) {
      return this.testFilter({ b: { $in: [2, 3] } }, ["2", "3"], done);
    });

    it("filters by $regex", function (done) {
      return this.testFilter({ a: { $regex: "li" } }, ["1", "2"], done);
    });

    it("filters by $regex case-sensitive", function (done) {
      return this.testFilter({ a: { $regex: "A" } }, ["1"], done);
    });

    it("filters by $regex case-insensitive", function (done) {
      return this.testFilter(
        { a: { $regex: "A", $options: "i" } },
        ["1", "2"],
        done
      );
    });

    it("filters by $or", function (done) {
      return this.testFilter({ $or: [{ b: 1 }, { b: 2 }] }, ["1", "2"], done);
    });

    it("filters by path", function (done) {
      return this.testFilter({ "c.d": 2 }, ["2"], done);
    });

    it("filters by $ne", function (done) {
      return this.testFilter({ b: { $ne: 2 } }, ["1", "3"], done);
    });

    it("filters by $gt", function (done) {
      return this.testFilter({ b: { $gt: 1 } }, ["2", "3"], done);
    });

    it("filters by $lt", function (done) {
      return this.testFilter({ b: { $lt: 3 } }, ["1", "2"], done);
    });

    it("filters by $gte", function (done) {
      return this.testFilter({ b: { $gte: 2 } }, ["2", "3"], done);
    });

    it("filters by $lte", function (done) {
      return this.testFilter({ b: { $lte: 2 } }, ["1", "2"], done);
    });

    it("filters by $not", function (done) {
      return this.testFilter({ b: { $not: { $lt: 3 } } }, ["3"], done);
    });

    it("filters by $or", function (done) {
      return this.testFilter({ $or: [{ b: 3 }, { b: 1 }] }, ["1", "3"], done);
    });

    it("filters by $exists: true", function (done) {
      return this.testFilter({ c: { $exists: true } }, ["1", "2"], done);
    });

    it("filters by $exists: false", function (done) {
      return this.testFilter({ c: { $exists: false } }, ["3"], done);
    });

    it("includes fields", function (done) {
      const results = this.col.find({ _id: "1" }, { fields: { a: 1 } });
      assert.deepEqual(results[0], { _id: "1", a: "Alice" });
      return done();
    });

    it("includes subfields", function (done) {
      const results = this.col.find({ _id: "1" }, { fields: { "c.d": 1 } });
      assert.deepEqual(results[0], { _id: "1", c: { d: 1 } });
      return done();
    });

    it("ignores non-existent subfields", function (done) {
      const results = this.col.find({ _id: "1" }, { fields: { "x.y": 1 } });
      assert.deepEqual(results[0], { _id: "1" });
      return done();
    });

    it("excludes fields", function (done) {
      const results = this.col.find({ _id: "1" }, { fields: { a: 0 } });
      assert.isUndefined(results[0].a);
      assert.equal(results[0].b, 1);
      return done();
    });

    it("excludes subfields", function (done) {
      const results = this.col.find({ _id: "1" }, { fields: { "c.d": 0 } });
      assert.deepEqual(results[0].c, { e: 2 });
      return done();
    });

    it("can get", function (done) {
      const result = this.col.get("2");
      assert.equal("Charlie", result.a);
      return done();
    });

    it("can get missing", function (done) {
      const result = this.col.get("999", "honker burger");
      assert.equal("honker burger", result);
      return done();
    });

    it("finds one row", function (done) {
      const result = this.col.findOne({ _id: "2" });
      assert.equal("Charlie", result.a);
      return done();
    });

    it("emits events", function (done) {
      const events = [];
      this.db.on("change", (changeRecords) => events.push(changeRecords));
      this.col.upsert({ _id: 1, name: "x" });
      assert.deepEqual(events, []);

      return process.nextTick(() => {
        assert.deepEqual(events, [{ scratch: [{ _id: "1", _version: 2 }] }]);

        events.length = 0;

        this.col.upsert({ _id: 1, name: "y" });
        this.col.del(1);

        assert.deepEqual(events, []);
        return process.nextTick(function () {
          assert.deepEqual(events, [{ scratch: [{ _id: "1", _version: 4 }] }]);
          return done();
        });
      });
    });

    it("supports observable queries", function (done) {
      const subscribeEvents = [];
      let queryEvents = 0;
      let getQueryEvents = 0;

      const q = this.db.observe(() => {
        queryEvents++;
        return this.db.scratch.find({ _id: "1" });
      });

      q.subscribe((result) => subscribeEvents.push(result));

      const q2 = this.db.observe(() => {
        getQueryEvents++;
        return this.db.scratch.get(1);
      });
      q2.subscribe(() => null);

      assert.deepEqual(subscribeEvents, [
        [{ _id: "1", _version: 1, a: "Alice", b: 1, c: { d: 1, e: 2 } }],
      ]);
      assert.equal(queryEvents, 1);
      assert.equal(getQueryEvents, 1);

      subscribeEvents.length = 0;
      queryEvents = 0;
      getQueryEvents = 0;

      this.col.upsert({ _id: "1", a: "Bob", b: null, c: null });

      return process.nextTick(() => {
        assert.deepEqual(subscribeEvents, [
          [{ _id: "1", _version: 2, a: "Bob", b: null, c: null }],
        ]);
        assert.equal(queryEvents, 1);
        assert.equal(getQueryEvents, 1);

        subscribeEvents.length = 0;
        queryEvents = 0;
        getQueryEvents = 0;

        // Updating a collection should not trigger get() updates or re-renders
        this.col.upsert({ _id: "2", a: "Jimbo" });
        return process.nextTick(() => {
          assert.deepEqual(subscribeEvents, []);
          assert.equal(queryEvents, 1);
          assert.equal(getQueryEvents, 0);

          return done();
        });
      });
    });

    it("supports server queries", function (done) {
      const { col } = this;
      const { db } = this;

      const logs = [];

      this.col.upsert({ _id: "foo", name: "x", age: 99 });

      const serverQuery = this.db.createServerQuery({
        statics: {
          getKey(props) {
            return props.name;
          },
        },
        query() {
          logs.push("query() " + JSON.stringify(this.state));
          return col.find({ a: this.props.name });
        },
        getInitialState() {
          return { name: "" };
        },
        queryDidMount() {
          this.setState({ name: "pete" });
          return logs.push("didMount");
        },
        queryDidUpdate(prevProps) {
          return logs.push(
            "didUpdateProps " +
              JSON.stringify(this.props) +
              ", " +
              JSON.stringify(prevProps)
          );
        },
      });

      const sub = this.db.observe(() => serverQuery({ name: "x" }));
      sub.subscribe((result) => logs.push("result " + JSON.stringify(result)));
      serverQuery.getInstance({ name: "x" }).setState({ name: "next" });
      return process.nextTick(function () {
        assert.deepEqual(logs, [
          "didMount",
          'query() {"name":"pete"}',
          "result []",
          'didUpdateProps {"name":"x"}, {"name":"x"}',
          'query() {"name":"next"}',
          "result []",
        ]);

        return done();
      });
    });

    it("does not remount server queries", function (done) {
      let num_mounts = 0;
      const serverQuery = this.db.createServerQuery({
        statics: {
          getKey(props) {
            return props.a;
          },
        },
        query() {},
        queryDidMount() {
          return (num_mounts += 1);
        },
      });
      serverQuery({ a: "x", b: "y" });
      serverQuery({ a: "x", b: "z" });
      assert.equal(num_mounts, 1);
      serverQuery({ a: "y", b: "z" });
      return done();
    });

    it("synchronously sets state", function (done) {
      let num_queries = 0;
      const serverQuery = this.db.createServerQuery({
        statics: {
          getKey() {
            return "x";
          },
        },
        query() {
          return (num_queries += 1);
        },
        queryDidMount() {
          return this.setState({});
        },
      });
      serverQuery({ a: "x", b: "y" });
      assert.equal(num_queries, 1);
      return done();
    });

    it("asynchronously sets state", function (done) {
      let num_queries = 0;
      const serverQuery = this.db.createServerQuery({
        statics: {
          getKey() {
            return "x";
          },
        },
        query() {
          return (num_queries += 1);
        },
      });
      this.db
        .observe(() => serverQuery({ a: "x", b: "y" }))
        .subscribe(function (x) {});
      assert.equal(num_queries, 1);
      serverQuery.getInstance({ a: "x" }).setState({});
      return process.nextTick(function () {
        assert.equal(num_queries, 2);
        return done();
      });
    });

    it("serializes and deseralizes", function (done) {
      const serialized = this.db.serialize();
      const deserialized = MemoryDb.deserialize(serialized);
      assert.deepEqual(this.col.find(), deserialized.scratch.find());
      assert.deepEqual(serialized, deserialized.serialize());
      return done();
    });

    it("does not allow cascading writes", function (done) {
      this.db.on("change", (changeRecords) => {
        let thrown_exception = null;
        try {
          this.col.upsert({ _id: 2, name: "y" });
        } catch (e) {
          thrown_exception = e;
        }
        assert(thrown_exception);
        return done();
      });

      return this.col.upsert({ _id: 1, name: "x" });
    });

    it("supports long stack traces", function (done) {
      if (navigator.userAgent.toLowerCase().indexOf("chrome") === -1) {
        done();
        return;
      }

      let captured_stack = null;
      this.db.on(
        "change",
        (changeRecords) => (captured_stack = new Error("ouch").stack)
      );

      this.col.upsert({ _id: 1, name: "x" });
      return process.nextTick(() => {
        assert(captured_stack.indexOf("upsert") > -1);
        return done();
      });
    });

    it("dels item", function (done) {
      let needle, needle1;
      let result;
      this.col.del("2");
      const results = this.col.find({});
      assert.equal(2, results.length);
      assert(
        ((needle = "1"),
        Array.from(
          (() => {
            const result1 = [];
            for (result of Array.from(results)) {
              result1.push(result._id);
            }
            return result1;
          })()
        ).includes(needle))
      );
      assert(
        ((needle1 = "2"),
        !Array.from(
          (() => {
            const result2 = [];
            for (result of Array.from(results)) {
              result2.push(result._id);
            }
            return result2;
          })()
        ).includes(needle1))
      );
      return done();
    });

    it("removes items", function (done) {
      let needle, needle1;
      let result;
      this.col.remove({ _id: "2" });
      const results = this.col.find({});
      assert.equal(2, results.length);
      assert(
        ((needle = "1"),
        Array.from(
          (() => {
            const result1 = [];
            for (result of Array.from(results)) {
              result1.push(result._id);
            }
            return result1;
          })()
        ).includes(needle))
      );
      assert(
        ((needle1 = "2"),
        !Array.from(
          (() => {
            const result2 = [];
            for (result of Array.from(results)) {
              result2.push(result._id);
            }
            return result2;
          })()
        ).includes(needle1))
      );
      return done();
    });

    it("dels non-existent item", function (done) {
      this.col.del("999");
      const results = this.col.find({});
      assert.equal(3, results.length);
      return done();
    });

    it("sorts ascending", function (done) {
      const results = this.col.find({}, { sort: ["a"] });
      assert.deepEqual(_.pluck(results, "_id"), ["1", "3", "2"]);
      return done();
    });

    it("sorts descending", function (done) {
      const results = this.col.find({}, { sort: [["a", "desc"]] });
      assert.deepEqual(_.pluck(results, "_id"), ["2", "3", "1"]);
      return done();
    });

    it("limits", function (done) {
      const results = this.col.find({}, { sort: ["a"], limit: 2 });
      assert.deepEqual(_.pluck(results, "_id"), ["1", "3"]);
      return done();
    });

    it("skips", function (done) {
      const results = this.col.find({}, { sort: ["a"], skip: 2 });
      assert.deepEqual(_.pluck(results, "_id"), ["2"]);
      return done();
    });

    it("shares memory for identical instances", function (done) {
      const result1 = this.col.findOne({ _id: "2" });
      const result2 = this.col.findOne({ _id: "2" });
      assert(result1 === result2);
      return done();
    });

    it("does not share memory for different instances", function (done) {
      const result1 = this.col.findOne({ _id: "2" });
      this.col.upsert({ _id: "2", a: "1" });
      const result2 = this.col.findOne({ _id: "2" });
      assert(!(result1 === result2));
      return done();
    });

    it("returns array if called with array", function (done) {
      const items = this.col.upsert([{ _id: 1, a: "1" }]);
      assert.equal(items[0].a, "1");
      return done();
    });

    it("updates by id", function (done) {
      let item = this.col.upsert({ _id: "1", a: "1" });
      item = this.col.upsert({ _id: "1", a: "2", b: 1 });
      assert.equal(item.a, "2");

      const results = this.col.find({ _id: "1" });
      assert.equal(1, results.length, "Should be only one document");
      return done();
    });

    return it("call upsert with upserted row", function (done) {
      const item = this.col.upsert({ _id: "1", a: "1" });
      assert.equal(item._id, "1");
      assert.equal(item.a, "1");
      return done();
    });
  });

  it("upserts multiple rows", function (done) {
    this.timeout(10000);
    return this.reset(() => {
      const docs = [];
      for (let i = 0; i < 100; i++) {
        docs.push({ _id: i, b: i });
      }

      this.col.upsert(docs);
      const results = this.col.find({});
      assert.equal(results.length, 100);
      return done();
    });
  });

  context("With sample with capitalization", function () {
    beforeEach(function (done) {
      return this.reset(() => {
        this.col.upsert({ _id: "1", a: "Alice", b: 1, c: { d: 1, e: 2 } });
        this.col.upsert({ _id: "2", a: "AZ", b: 2, c: { d: 2, e: 3 } });
        return done();
      });
    });

    return it("finds sorts in Javascript order", function (done) {
      const results = this.col.find({}, { sort: ["a"] });
      assert.deepEqual(_.pluck(results, "_id"), ["2", "1"]);
      return done();
    });
  });

  context("With integer array in json rows", function () {
    beforeEach(function (done) {
      return this.reset(() => {
        this.col.upsert({ _id: "1", c: { arrint: [1, 2] } });
        this.col.upsert({ _id: "2", c: { arrint: [2, 3] } });
        this.col.upsert({ _id: "3", c: { arrint: [1, 3] } });
        return done();
      });
    });

    it("filters by $in", function (done) {
      return this.testFilter({ "c.arrint": { $in: [3] } }, ["2", "3"], done);
    });

    return it("filters by list $in with multiple", function (done) {
      return this.testFilter(
        { "c.arrint": { $in: [1, 3] } },
        ["1", "2", "3"],
        done
      );
    });
  });

  context("With object array rows", function () {
    beforeEach(function (done) {
      return this.reset(() => {
        this.col.upsert({
          _id: "1",
          c: [
            { x: 1, y: 1 },
            { x: 1, y: 2 },
          ],
        });
        this.col.upsert({ _id: "2", c: [{ x: 2, y: 1 }] });
        this.col.upsert({ _id: "3", c: [{ x: 2, y: 2 }] });
        return done();
      });
    });

    return it("filters by $elemMatch", function (done) {
      return this.testFilter(
        { c: { $elemMatch: { y: 1 } } },
        ["1", "2"],
        () => {
          return this.testFilter({ c: { $elemMatch: { x: 1 } } }, ["1"], done);
        }
      );
    });
  });

  context("With array rows with inner string arrays", function () {
    beforeEach(function (done) {
      return this.reset(() => {
        this.col.upsert({
          _id: "1",
          c: [{ arrstr: ["a", "b"] }, { arrstr: ["b", "c"] }],
        });
        this.col.upsert({ _id: "2", c: [{ arrstr: ["b"] }] });
        this.col.upsert({
          _id: "3",
          c: [{ arrstr: ["c", "d"] }, { arrstr: ["e", "f"] }],
        });
        return done();
      });
    });

    return it("filters by $elemMatch", function (done) {
      return this.testFilter(
        { c: { $elemMatch: { arrstr: { $in: ["b"] } } } },
        ["1", "2"],
        () => {
          return this.testFilter(
            { c: { $elemMatch: { arrstr: { $in: ["d", "e"] } } } },
            ["3"],
            done
          );
        }
      );
    });
  });

  context("With text array rows", function () {
    beforeEach(function (done) {
      return this.reset(() => {
        this.col.upsert({ _id: "1", textarr: ["a", "b"] });
        this.col.upsert({ _id: "2", textarr: ["b", "c"] });
        this.col.upsert({ _id: "3", textarr: ["c", "d"] });
        return done();
      });
    });

    it("filters by $in", function (done) {
      return this.testFilter({ textarr: { $in: ["b"] } }, ["1", "2"], done);
    });

    it("filters by direct reference", function (done) {
      return this.testFilter({ textarr: "b" }, ["1", "2"], done);
    });

    return it("filters by both item and complete array", function (done) {
      return this.testFilter(
        { textarr: { $in: ["a", ["b", "c"]] } },
        ["1", "2"],
        done
      );
    });
  });

  const geopoint = (lng, lat) => ({
    type: "Point",
    coordinates: [lng, lat],
  });

  return context("With geolocated rows", function () {
    beforeEach(function (done) {
      this.col.upsert({ _id: "1", geo: geopoint(90, 45) });
      this.col.upsert({ _id: "2", geo: geopoint(90, 46) });
      this.col.upsert({ _id: "3", geo: geopoint(91, 45) });
      this.col.upsert({ _id: "4", geo: geopoint(91, 46) });
      return done();
    });

    it("finds points near", function (done) {
      const selector = {
        geo: {
          $near: {
            $geometry: geopoint(90, 45),
          },
        },
      };

      const results = this.col.find(selector);
      assert.deepEqual(_.pluck(results, "_id"), ["1", "3", "2", "4"]);
      return done();
    });

    it("finds points near maxDistance", function (done) {
      const selector = {
        geo: {
          $near: {
            $geometry: geopoint(90, 45),
            $maxDistance: 111180,
          },
        },
      };

      const results = this.col.find(selector);
      assert.deepEqual(_.pluck(results, "_id"), ["1", "3"]);
      return done();
    });

    it("finds points near maxDistance just above", function (done) {
      const selector = {
        geo: {
          $near: {
            $geometry: geopoint(90, 45),
            $maxDistance: 111410,
          },
        },
      };

      const results = this.col.find(selector);
      assert.deepEqual(_.pluck(results, "_id"), ["1", "3", "2"]);
      return done();
    });

    it("finds points within simple box", function (done) {
      const selector = {
        geo: {
          $geoIntersects: {
            $geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [89.5, 45.5],
                  [89.5, 46.5],
                  [90.5, 46.5],
                  [90.5, 45.5],
                  [89.5, 45.5],
                ],
              ],
            },
          },
        },
      };
      const results = this.col.find(selector);
      assert.deepEqual(_.pluck(results, "_id"), ["2"]);
      return done();
    });

    it("finds points within big box", function (done) {
      const selector = {
        geo: {
          $geoIntersects: {
            $geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [0, -89],
                  [0, 89],
                  [179, 89],
                  [179, -89],
                  [0, -89],
                ],
              ],
            },
          },
        },
      };
      const results = this.col.find(selector, { sort: ["_id"] });
      assert.deepEqual(_.pluck(results, "_id"), ["1", "2", "3", "4"]);
      return done();
    });

    return it("handles undefined", function (done) {
      const selector = {
        geo: {
          $geoIntersects: {
            $geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [89.5, 45.5],
                  [89.5, 46.5],
                  [90.5, 46.5],
                  [90.5, 45.5],
                  [89.5, 45.5],
                ],
              ],
            },
          },
        },
      };
      this.col.upsert({ _id: 5 });
      const results = this.col.find(selector);
      assert.deepEqual(_.pluck(results, "_id"), ["2"]);
      return done();
    });
  });
};
