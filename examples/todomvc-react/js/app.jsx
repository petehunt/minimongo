/*jshint quotmark:false */
/*jshint white:false */
/*jshint trailing:false */
/*jshint newcap:false */
/*global React, Router*/
var app = app || {};

(function () {
  "use strict";

  app.ALL_TODOS = "all";
  app.ACTIVE_TODOS = "active";
  app.COMPLETED_TODOS = "completed";
  var TodoFooter = app.TodoFooter;
  var TodoItem = app.TodoItem;

  var ENTER_KEY = 13;

  var TodoApp = React.createClass({
    mixins: [app.TodoDb.getReactMixin()],

    getInitialState: function () {
      return {
        nowShowing: app.ALL_TODOS,
        editing: null,
        newTodo: "",
      };
    },

    componentDidMount: function () {
      var setState = this.setState;
      var router = Router({
        "/": setState.bind(this, { nowShowing: app.ALL_TODOS }),
        "/active": setState.bind(this, { nowShowing: app.ACTIVE_TODOS }),
        "/completed": setState.bind(this, { nowShowing: app.COMPLETED_TODOS }),
      });
      router.init("/");
    },

    handleChange: function (event) {
      this.setState({ newTodo: event.target.value });
    },

    handleNewTodoKeyDown: function (event) {
      if (event.keyCode !== ENTER_KEY) {
        return;
      }

      event.preventDefault();

      var val = this.state.newTodo.trim();

      if (val) {
        app.TodoDomain.addTodo(val);
        this.setState({ newTodo: "" });
      }
    },

    toggleAll: function (event) {
      var checked = event.target.checked;
      app.TodoDomain.toggleAll(checked);
    },

    toggle: function (todoToToggle) {
      app.TodoDomain.toggle(todoToToggle);
    },

    destroy: function (todo) {
      app.TodoDomain.destroy(todo);
    },

    edit: function (todo) {
      this.setState({ editing: todo._id });
    },

    save: function (todoToSave, text) {
      app.TodoDomain.save(todoToSave, text);
      this.setState({ editing: null });
    },

    cancel: function () {
      this.setState({ editing: null });
    },

    clearCompleted: function () {
      app.TodoDomain.clearCompleted();
    },

    observeData: function () {
      return { todos: app.TodoDomain.getAllTodos() };
    },

    render: function () {
      var footer;
      var main;

      var shownTodos = this.data.todos.filter(function (todo) {
        switch (this.state.nowShowing) {
          case app.ACTIVE_TODOS:
            return !todo.completed;
          case app.COMPLETED_TODOS:
            return todo.completed;
          default:
            return true;
        }
      }, this);

      var todoItems = shownTodos.map(function (todo) {
        return (
          <TodoItem
            key={todo._id}
            todo={todo}
            onToggle={this.toggle.bind(this, todo)}
            onDestroy={this.destroy.bind(this, todo)}
            onEdit={this.edit.bind(this, todo)}
            editing={this.state.editing === todo._id}
            onSave={this.save.bind(this, todo)}
            onCancel={this.cancel}
          />
        );
      }, this);

      var activeTodoCount = this.data.todos.reduce(function (accum, todo) {
        return todo.completed ? accum : accum + 1;
      }, 0);

      var completedCount = this.data.todos.length - activeTodoCount;

      if (activeTodoCount || completedCount) {
        footer = (
          <TodoFooter
            count={activeTodoCount}
            completedCount={completedCount}
            nowShowing={this.state.nowShowing}
            onClearCompleted={this.clearCompleted}
          />
        );
      }

      if (this.data.todos.length) {
        main = (
          <section className="main">
            <input
              className="toggle-all"
              type="checkbox"
              onChange={this.toggleAll}
              checked={activeTodoCount === 0}
            />
            <ul className="todo-list">{todoItems}</ul>
          </section>
        );
      }

      return (
        <div>
          <header className="header">
            <h1>todos</h1>
            <input
              className="new-todo"
              placeholder="What needs to be done?"
              value={this.state.newTodo}
              onKeyDown={this.handleNewTodoKeyDown}
              onChange={this.handleChange}
              autoFocus={true}
            />
          </header>
          {main}
          {footer}
        </div>
      );
    },
  });

  function render() {
    React.render(<TodoApp />, document.getElementsByClassName("todoapp")[0]);
  }

  render();
})();
