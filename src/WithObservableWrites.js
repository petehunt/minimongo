const EventEmitter = require("eventemitter3");
const WriteTransaction = require("./WriteTransaction");
const _ = require("lodash");

const WithObservableWrites = {
  getDefaultTransaction() {
    this.setMaxListeners(0);
    return new WriteTransaction(this);
  },
};

_.mixin(WithObservableWrites, EventEmitter.prototype);

module.exports = WithObservableWrites;
