/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const invariant = require("invariant");

const createMixin = function (db) {
  let Mixin;
  return (Mixin = {
    componentWillMount() {
      invariant(
        this.observeData != null,
        "You must implement observeData: " + this.constructor.displayName
      );
      this.subscription = null;
      this.prevData = null;
      this.data = {};
      if (this.shouldComponentUpdate != null) {
        this._userShouldComponentUpdate = this.shouldComponentUpdate;
        this.shouldComponentUpdate = this._shouldComponentUpdate;
      }

      return this._refresh();
    },

    _shouldComponentUpdate(nextProps, nextState, nextContext) {
      const nextData = this.data;
      this.data = this.prevData;
      try {
        return this._userShouldComponentUpdate(
          nextProps,
          nextState,
          nextData,
          nextContext
        );
      } finally {
        this.data = nextData;
        this.prevData = this.data;
      }
    },

    _refresh() {
      if (this.subscription) {
        this.subscription.dispose();
      }

      this.subscription = db.observe(this.observeData);
      return this.subscription.subscribe(this._setData);
    },

    _setData(nextData, prevData) {
      if (this.componentWillReceiveData) {
        this.componentWillReceiveData(nextData);
      }

      this.prevData = this.data;
      this.data = nextData;
      if (prevData) {
        return this.setState({});
      }
    },

    componentWillUpdate(nextProps, nextState) {
      const prevProps = this.props;
      const prevState = this.state;

      this.props = nextProps;
      this.state = nextState;
      try {
        return this._refresh();
      } finally {
        this.props = prevProps;
        this.state = prevState;
      }
    },

    componentWillUnmount() {
      if (this.subscription) {
        return this.subscription.dispose();
      }
    },
  });
};

const WithReactMixin = {
  getReactMixin() {
    if (this.mixin == null) {
      this.mixin = createMixin(this);
    }
    return this.mixin;
  },
};

module.exports = WithReactMixin;
