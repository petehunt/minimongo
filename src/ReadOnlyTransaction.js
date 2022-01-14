const NullTransaction = require("./NullTransaction");
const WriteTransaction = require("./WriteTransaction");

class ReadOnlyTransaction extends NullTransaction {
  canPushTransaction(transaction) {
    return !(transaction instanceof WriteTransaction);
  }
}

module.exports = ReadOnlyTransaction;
