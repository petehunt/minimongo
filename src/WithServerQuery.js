"use strict";

var SynchronousWriteTransaction = require("./SynchronousWriteTransaction");

var _ = require("lodash");
var invariant = require("invariant");

class ServerQuery {
  constructor(cache, key) {
    this.cache = cache;
    this.key = key;

    this.mounted = false;
    this.querying = false;
  }

  getInitialState() {
    return {};
  }

  queryDidMount() {}

  queryDidUpdate(prevProps) {}

  query() {
    throw new Error("ServerQuery.query() not implemented");
  }

  setState(updates) {
    const mergedState = _.assign({}, this.state, updates);
    const cb = () => {
      this.cache.serverQueries.upsert({
        _id: this.key,
        state: mergedState,
      });
    };

    this.state = mergedState;

    if (this.querying) {
      this.cache.withTransaction(new SynchronousWriteTransaction(), cb);
    } else {
      cb();
    }
  }

  execute(props) {
    this.querying = true;
    try {
      if (!this.mounted) {
        this.props = props;
        this.state = this.getInitialState();
        this.setState(this.state);
        this.state = this.cache.serverQueries.get(this.key).state;
        this.mounted = true;
        this.queryDidMount();
      } else {
        const prevProps = this.props;
        const prevState = this.state;
        this.props = props;
        this.state = this.cache.serverQueries.get(this.key).state;
        this.queryDidUpdate(prevProps, prevState);
      }

      return this.query();
    } finally {
      this.querying = false;
    }
  }
}

function createNewServerQuery(cache, key, spec) {
  invariant(spec.hasOwnProperty("query"), "You must implement query()");

  if (!cache.hasOwnProperty("serverQueries")) {
    cache.addCollection("serverQueries");
  }

  let serverQuery = new ServerQuery(cache, key);
  _.mixin(serverQuery, spec);

  return serverQuery;
}

let serverQueries = {};
let numTypes = 0;

const WithServerQuery = {
  createServerQuery(spec) {
    const cache = this;
    invariant(
      spec.hasOwnProperty("statics"),
      "spec must have statics property"
    );
    invariant(
      spec.statics.hasOwnProperty("getKey"),
      "statics.getKey must be a function"
    );

    const typeId = numTypes++;

    function getInstance(props) {
      let key = spec.statics.getKey(props);
      invariant(typeof key === "string", "You must return a string key");
      key = typeId + "~" + key;
      if (!serverQueries.hasOwnProperty(key)) {
        serverQueries[key] = createNewServerQuery(cache, key, spec);
      }
      return serverQueries[key];
    }

    function serverQuery(props) {
      return getInstance(props).execute(props);
    }

    function invalidate(props) {
      var key = spec.statics.getKey(props);
      key = typeId + "~" + key;
      serverQueries = Object.keys(serverQueries).reduce((acc, k) => {
        const obj = acc;
        if (k !== key) {
          obj[k] = serverQueries[k];
        }
        return obj;
      }, {});
      return serverQuery(props);
    }

    serverQuery.getInstance = getInstance;
    serverQuery.invalidate = invalidate;

    return serverQuery;
  },
};

module.exports = WithServerQuery;
