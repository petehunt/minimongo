# minimongo-cache

A forked version of [Minimongo](https://github.com/mWater/minimongo) designed for a synchronous local cache for React apps. This is designed to replace Flux.

Not ready for production use.

## The problem

React is great at coordinating hierarchical data, but not so great when that data is shared "sideways" (outside the component hierarchy).

This project attempts to solve the same problems observable models, state atoms and Flux try to solve.

### Why not Flux?

  * Flux gets you thinking in verbs, when a lot of problems are most easily modeled as nouns
  * Flux doesn't give you much, so you end up having to write a lot of mechanical query / indexing code
  * Flux hides mutable state inside of individual stores, causing denormalized data. This usually means that coordination between stores is painful
  * It's still not clear where in Flux you load your data from the server

## The solution

For the first issue, leverage what OOP got right: thinking in objects is a very friendly way to model your problem.

For the second issue, some sort of query engine would be nice on the client. MongoDB has proven to have a friendly API, and Meteor already implemented it client-side (minimongo).

For the third issue, we store the object graph in a fully normalized state (i.e. the minimal representation of your app's state) and write modules called *domains* which are like stateless Flux stores that read from minimongo. They control a single domain of your app, so when you want to do a mutation, simply call a mutator method on a domain and it will write to minimongo. Since domains are stateless, they can call each other with no coordination.

For the fourth issue, since we treat the local database like a cache, we can use the same read-through caching techniques for data fetching that we use on the server; it's very clear where your server requests go.

## Examples

### Simple example

```js
var minimongo = require('minimongo-cache');

var cache = new minimongo();

cache.addCollection('users');
cache.addCollection('todos');

// Insert some stuff into the cache. Note that everything you insert must have
// a unique `_id` string

cache.todos.upsert({
  _id: '1',
  authorId: '1',
  text: 'Take out the trash',
  completed: false,
});

cache.users.upsert({
  _id: '1',
  username: 'petehunt',
  pic: 'http://graph.facebook.com/pwh/picture',
});

// Note that `upsert()` will update individual fields of a document similar
// to how `setState()` works.
cache.users.upsert({
  _id: '1',
  fullname: 'Pete Hunt',
});

// We can also remove a user if we wanted to by passing their ID:
cache.users.remove('1');

// Thanks to Meteor's minimongo implementation, we can find all TODOs that belong
// to a specific user
var todos = cache.todos.find({authorId: '1'});

// Or we can do a crazy efficient get by ID
var user = cache.users.get('1');

// Documents in `minimongo-cache` have version numbers. They're very convenient
// for React's `shouldComponentUpdate()` method
// user._version === 2, since there have been 2 upserts
// todos[0]._version === 1, since there has been 1 upsert

// Collections have version numbers too:
// cache.todos._version === 3, since there have been 3 upserts on that collection
```

### React Native Polyfill
In order to use this package with React Native you'll need to polyfill process.nextTick before using.

```
if (typeof this.process.nextTick === 'undefined') {
  process.nextTick = setImmediate;
}

var cache = new minimongo();

cache.addCollection('todos');

....

```

### Reactivity examples

```js
// minimongo-cache is built in a modular style, so there are varying levels
// of reactivity supported. For example, you can just use it as a synchronous
// cache, as shown above. It will also emit `change` events -- they will be
// batched and deduped within a single event tick, so mutations within a single
// event tick are effectively atomic to all observers.

cache.on('change', function(changeRecords) {
  for (collectionName in changeRecords) {
    console.group('Collection: ' + collectionName);
    changeRecords[collectionName].forEach(function(changeRecord) {
      console.log('Document ID: ' + changeRecord._id + ', version: ' + changeRecord._version);
    });
    console.groupEnd();
  }
});

// minimongo-cache can support Meteor-style reactive queries and will eventually expose a
// React observable (see https://github.com/facebook/react/issues/3398)

var todoItems = cache.observe(function() {
  // This method should be pure. If you try to `upsert()` in here, it will
  // throw.
  return cache.todos.find({authorId: '1'});
});

// This will fire whenever the query needs to be updated. Note that this is fairly
// smart: it only processes change events it needs to, and if all document versions
// are the same since the last computation it's not recomputed.
todoItems.subscribe(function(results) {
  console.log('Author 1 TODO items:', results);
});

// Dispose when you're done, per the spec.
todoItems.dispose();
```

### Server requests

`minimongo-cache` supports server fetches through a read-through-cache abstraction.

```js

var xhr = require('xhr');

var getTodos = cache.createServerQuery({
  statics: {
    getKey: function(props) {
      return props.authorId;
    },
  },

  query: function() {
    return cache.todos.find({authorId: this.props.authorId});
  },

  getInitialState: function() {
    return {fetching: false};
  },

  queryDidMount: function() {
    this.fetch();
  },

  fetch: function() {
    xhr(
      {method: 'GET', url: '/todos/' + encodeURIComponent(this.props.authorId)},
      function(err, body) {
        body.forEach(function(result) {
          cache.todos.upsert(result);
        });
      }
    );
  },
});
```

### Future work: MVCC

This is not implemeneted.

```js

// User is at version 1
cache.users.upsert({
  _id: '1',
  name: 'pete'
});

// When you update a document, specify the new version you want to create. If it's
// too old (i.e. someone else updated the document and you didn't expect it) the
// write will fail and the transaction can be retried
cache.transaction(function() {
  cache.users.upsert({
    _id: '1',
    _version: 2,
    name: 'pete',
  });
})
```

### Domains example

```js
var TodosDomain = {
  getTodos: function(authorId) {
    return cache.todos.find({authorId: authorId}, {sort: {completed: 1, timestamp: -1}});
  },

  // Mutation is straightforward.
  markComplete: function(todoId) {
    cache.todos.upsert({
      _id: todoId,
      completed: true,
    });
  },
};

var UsersDomain = {
  // Coordination between domains is painless
  getUserInfo: function(authorId) {
    return {
      profile: cache.users.get(authorId),
      todoCount: TodosDomain.getTodos(authorId).length,
    };
  },
};
```

### Working with React

```js
var React = require('react');

var UserContainer = React.createClass({
  mixins: [cache.getReactMixin()],

  observeData: function() {
    return {user: UsersDomain.getUserInfo(this.props.userId)};
  },

  render: function() {
    return (
      <div>
        My name is {this.data.user.profile.username}
        and I have {this.data.user.todoCount} open TODOs.
      </div>
    );
  },
});
```

## How to improve performance

  * Favor `db.get()` over `db.find()` or `db.findOne()`
  * Set `db.batchedUpdates = React.addons.batchedUpdates`
  * Use `shouldComponentUpdate()` with minimongo-cache's `identity` feature
  * Set `db.debug = false;`

## Why not (your technique here)?

### Why not Om-style immutable state atoms?

  * Immutable data structures aren't a panacea -- it's very difficult to represent cyclic structures with them and still reap their benefits. `_version` serves this purpose well.

### Why not Backbone/observable models?

  * Observable models generally push updates through via callbacks, which ain't great for perf
  * Observable models are usually fine-grained to support traditional front-end databinding, which we don't need because we have React.

### Why not Relay?

It's not out yet. But also, I think Relay may require changes to your server-side endpoints.

### Why not Meteor?

While MongoDB is kind of convenient on the client, I may want a different database (or databases) on the server and I am afraid of magical conflict resolution. Also their primary UI solution is still Blaze and I prefer React -- I think their Tracker system may have extra performance costs to support it (though I may be wrong!)

## FAQ

### Why CoffeeScript?

Because the original was in CoffeeScript.

### What does this suck at?

  * It could maybe be rethought with immutable.js for better MVCC and `PureRenderMixin` support
  * Doesn't solve the "n+1 queries" problem, and therefore server rendering, like Relay does
    * I intend to build this layer on top of this system

### Why is it slow?

`minimongo-cache` defaults to debug mode which enables long stack traces. These are great for debugging but can be slow. Set `db.debug = false` to disable this feature.
