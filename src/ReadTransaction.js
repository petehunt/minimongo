/*
 * decaffeinate suggestions:
 * DS002: Fix invalid constructor
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const NullTransaction = require("./NullTransaction");
const SynchronousWriteTransaction = require("./SynchronousWriteTransaction");

class ReadTransaction extends NullTransaction {
  constructor() {
    super();
    this.dirtyIds = {};
    this.dirtyScans = {};
    this.log = [];
  }

  _extractFragment(doc) {
    if (!doc) {
      return null;
    }

    return {
      _id: doc._id,
      _version: doc._version,
    };
  }

  get(collectionName, result, _id) {
    this.dirtyIds[collectionName] = this.dirtyIds[collectionName] || {};
    this.dirtyIds[collectionName][_id] = true;
    this.log.push(this._extractFragment(result));
    return result;
  }

  find(collectionName, result) {
    this.dirtyScans[collectionName] = true;
    this.log.push(result.map(this._extractFragment));
    return result;
  }

  findOne(collectionName, result) {
    this.dirtyScans[collectionName] = true;
    this.log.push(this._extractFragment(result));
    return result;
  }

  canPushTransaction(transaction) {
    return transaction instanceof SynchronousWriteTransaction;
  }
}

module.exports = ReadTransaction;
