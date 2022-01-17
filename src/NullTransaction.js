class NullTransaction {
  get(collectionName, result, ...args) {
    return result;
  }
  find(collectionName, result, ...args) {
    return result;
  }
  findOne(collectionName, result, ...args) {
    return result;
  }
  upsert(collectionName, result, ...args) {
    throw new Error("Cannot write outside of a WriteTransaction");
  }
  del(collectionName, result, ...args) {
    throw new Error("Cannot write outside of a WriteTransaction");
  }
  canPushTransaction(transaction) {
    return true;
  }
}

module.exports = NullTransaction;
