/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const chai = require("chai");
const { assert } = chai;
const MemoryDb = require("../src/MemoryDb");
const db_queries = require("./db_queries");
const _ = require("lodash");

describe("MemoryDb", function () {
  before(function (done) {
    this.reset = (done) => {
      this.db = new MemoryDb(true);
      this.db.addCollection("scratch");
      this.col = this.db.scratch;
      return done();
    };
    return this.reset(done);
  });

  describe("passes queries", function () {
    return db_queries.call(this);
  });
});
