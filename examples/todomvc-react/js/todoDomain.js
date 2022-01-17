/*jshint quotmark:false */
/*jshint white:false */
/*jshint trailing:false */
/*jshint newcap:false */
/*global require */
var app = app || {};

(function () {
  "use strict";

  var minimongo = require("minimongo");
  var Utils = app.Utils;
  app.TodoDb = new minimongo();
  app.TodoDb.addCollection("todos");

  app.TodoDomain = {
    getAllTodos: function () {
      return app.TodoDb.todos.find();
    },

    addTodo: function (title) {
      app.TodoDb.todos.upsert({
        _id: Utils.uuid(),
        title: title,
        completed: false,
      });
    },

    toggleAll: function (checked) {
      var allTodos = app.TodoDomain.getAllTodos();
      allTodos.forEach(function (todo) {
        app.TodoDb.todos.upsert({
          _id: todo._id,
          completed: checked,
        });
      });
    },

    toggle: function (todoToToggle) {
      app.TodoDb.todos.upsert({
        _id: todoToToggle._id,
        completed: !app.TodoDb.todos.get(todoToToggle._id).completed,
      });
    },

    destroy: function (todo) {
      app.TodoDb.todos.del(todo._id);
    },

    save: function (todoToSave, text) {
      app.TodoDb.todos.upsert({
        _id: todoToSave._id,
        title: text,
      });
    },

    clearCompleted: function () {
      app.TodoDb.todos.find({ completed: true }).forEach(function (todo) {
        app.TodoDb.todos.del(todo._id);
      });
    },
  };
})();
