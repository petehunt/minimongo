/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const ReadTransaction = require("./ReadTransaction");

const _ = require("lodash");

class ObservableRead {
  constructor(db, func, context) {
    this.db = db;
    this.func = func;
    this.context = context;
    this.lastReadTransaction = null;
    this.lastValue = null;
    this.subscribers = [];
    this.changeListener = this.changeListener.bind(this);
    this.db.on("change", this.changeListener);
    this.rerunTransaction();
  }

  subscribe(cb) {
    this.subscribers.push(cb);
    cb(this.lastValue);
    return this;
  }

  dispose() {
    return this.db.removeListener("change", this.changeListener);
  }

  rerunTransaction() {
    const nextReadTransaction = new ReadTransaction();
    const value = this.db.withTransaction(
      nextReadTransaction,
      this.func,
      this.context
    );

    // If we read different data this time, notify of a change. This saves render() time
    if (
      !this.lastReadTransaction ||
      !_.isEqual(this.lastReadTransaction.log, nextReadTransaction.log)
    ) {
      this.lastReadTransaction = nextReadTransaction;
      const prevValue = this.lastValue;
      this.lastValue = value;
      return this.subscribers.forEach(function (cb) {
        cb(this.lastValue, prevValue); // pass the old value for diffing purposes
      }, this);
    }
  }

  changeListener(changeRecords) {
    // If none of the data we read last time changed, don't rerun the transaction. This
    // saves query time.
    // Have we run the query before?
    if (!this.lastReadTransaction) {
      this.rerunTransaction();
      return;
    }

    for (let collectionName in changeRecords) {
      // Did we scan the collection?
      if (this.lastReadTransaction.dirtyScans[collectionName]) {
        this.rerunTransaction();
        return;
      }

      const dirtyIdsForCollection =
        this.lastReadTransaction.dirtyIds[collectionName] || {};
      // Did we change this particular ID? (fine-grained for gets)
      const documentFragments = changeRecords[collectionName];
      let i = 0;
      while (i < documentFragments.length) {
        const documentFragment = documentFragments[i];
        if (dirtyIdsForCollection[documentFragment._id]) {
          this.rerunTransaction();
          return;
        }
        i++;
      }
    }
  }
}

const WithObservableReads = {
  observe(func, context) {
    return new ObservableRead(this, func, context);
  },
};

module.exports = WithObservableReads;
