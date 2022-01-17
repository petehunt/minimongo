"use strict";

const _ = require("lodash");

function cannotRead() {
  throw new Error("Cannot read in a SynchronousWriteTransaction");
}

function SynchronousWriteTransaction() {}

_.mixin(SynchronousWriteTransaction.prototype, {
  get: cannotRead,
  find: cannotRead,
  findOne: cannotRead,
  upsert: (_, result) => result,
  del: (_, result) => result,
  canPushTransaction: () => false,
});

module.exports = SynchronousWriteTransaction;
