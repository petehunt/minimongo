/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let MemoryDb;

const NullTransaction = require("./NullTransaction");
const WithObservableReads = require("./WithObservableReads");
const WithObservableWrites = require("./WithObservableWrites");
const WithReactMixin = require("./WithReactMixin");
const WithServerQuery = require("./WithServerQuery");

const _ = require("lodash");
const utils = require("./utils");
const { processFind } = require("./utils");

// TODO: use ImmutableJS (requires changing selector.js which will
// be painful). This will also let us do MVCC.

module.exports = MemoryDb = class MemoryDb {
  constructor() {
    this.collections = {};
    this.debug = true;
    this.batchedUpdates = (cb) => cb();
    this.transaction = this.getDefaultTransaction();
  }

  uncaughtExceptionHandler(e) {
    throw e;
  }

  getDefaultTransaction() {
    return new NullTransaction();
  }

  serialize() {
    const data = {};
    for (let collectionName in this.collections) {
      data[collectionName] = this.collections[collectionName].serialize();
    }
    return data;
  }

  static deserialize(data) {
    const db = new MemoryDb();
    for (let collectionName in data) {
      const collection = Collection.deserialize(db, data[collectionName]);
      db.collections[collectionName] = collection;
      db[collectionName] = collection;
    }
    return db;
  }

  addCollection(name) {
    if (this[name] != null) {
      return;
    }
    const collection = new Collection(name, this);
    this[name] = collection;
    return (this.collections[name] = collection);
  }

  withTransaction(transaction, func, context) {
    if (!this.transaction.canPushTransaction(transaction)) {
      throw new Error("Already in a transaction");
    }

    const prevTransaction = this.transaction;
    this.transaction = transaction;
    try {
      return func.call(context);
    } finally {
      this.transaction = prevTransaction;
    }
  }
};

_.mixin(MemoryDb.prototype, WithObservableReads);
_.mixin(MemoryDb.prototype, WithObservableWrites);
_.mixin(MemoryDb.prototype, WithReactMixin);
_.mixin(MemoryDb.prototype, WithServerQuery);

// Stores data in memory
class Collection {
  constructor(name, db) {
    this.name = name;
    this.db = db;

    this.items = {};
    this.versions = {};
    this.version = 1;
  }

  serialize() {
    return {
      name: this.name,
      items: this.items,
      versions: this.versions,
      version: this.version,
    };
  }

  static deserialize(db, data) {
    const collection = new Collection(data.name, db);
    collection.items = data.items;
    collection.versions = data.versions;
    collection.version = data.version;
    return collection;
  }

  find(selector, options) {
    return this.db.transaction.find(
      this.name,
      this._findFetch(selector, options),
      selector,
      options
    );
  }

  findOne(selector, options) {
    return this.db.transaction.findOne(
      this.name,
      this._findOne(selector, options),
      selector,
      options
    );
  }

  _findOne(selector, options) {
    options = options || {};

    const results = this._findFetch(selector, options);
    if (results.length > 0) {
      return results[0];
    } else {
      return null;
    }
  }

  _findFetch(selector, options) {
    return processFind(this.items, selector, options);
  }

  get(_id, missing) {
    return (
      this.db.transaction.get(this.name, this._findOne({ _id }), _id) ||
      missing ||
      null
    );
  }

  upsert(docs) {
    const [items, _1, _2] = Array.from(utils.regularizeUpsert(docs));

    for (let item of Array.from(items)) {
      // Shallow copy since MemoryDb adds _version to the document.
      // TODO: should we get rid of this mutation?
      const doc = _.assign({}, this.items[item.doc._id] || {}, item.doc);

      // Replace/add
      this.items[item.doc._id] = doc;
      this.version += 1;
      this.versions[doc._id] = (this.versions[doc._id] || 0) + 1;
      this.items[doc._id]._version = this.versions[doc._id];
    }

    return this.db.transaction.upsert(this.name, docs, docs);
  }

  del(id) {
    if (_.has(this.items, id)) {
      const prev_version = this.items[id]._version;
      this.version += 1;
      this.versions[id] = prev_version + 1;
      delete this.items[id];
    }
    return this.db.transaction.del(this.name, null, id);
  }

  remove(selector, options) {
    const results = this._findFetch(selector, options);
    return results.forEach((doc) => this.del(doc._id));
  }
}
