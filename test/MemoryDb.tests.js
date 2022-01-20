/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const dbQueries = require("./dbQueries");

describe("MemoryDb - node", function () {
  describe("passes queries", function () {
    return dbQueries.call(this);
  });
});
