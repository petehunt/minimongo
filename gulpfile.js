var gulp = require("gulp");
var babel = require("gulp-babel");
var coffee = require("gulp-coffee");
var gutil = require("gulp-util");
var browserify = require("browserify");
var streamConvert = require("vinyl-source-stream");
var glob = require("glob");
var uglify = require("gulp-uglify");
var coffeeify = require("coffeeify");
var buffer = require("vinyl-buffer");
var rename = require("gulp-rename");

gulp.task("copy", function () {
  return gulp
    .src(["./src/**/*.js"])
    .pipe(babel({ presets: ["es2015"] }))
    .pipe(gulp.dest("./lib/"));
});

gulp.task("prepareTests", ["copy"], function () {
  var bundler = browserify({
    entries: glob.sync("./test/*Tests.coffee"),
    extensions: [".coffee"],
  }).transform(coffeeify);
  var stream = bundler
    .bundle()
    // TODO error handling not working
    .on("error", gutil.log)
    .on("error", function () {
      throw "Failed";
    })
    .pipe(streamConvert("browserified.js"))
    .pipe(gulp.dest("./test"));
  return stream;
});

gulp.task("dist", ["copy", "coffee"], function () {
  bundler = browserify();
  bundler.require("./index.js", { expose: "minimongo" });
  return bundler
    .bundle()
    .pipe(streamConvert("minimongo.js"))
    .pipe(gulp.dest("./dist/"))
    .pipe(buffer())
    .pipe(rename("minimongo.min.js"))
    .pipe(uglify())
    .pipe(gulp.dest("./dist/"));
});

gulp.task("default", ["coffee", "copy", "dist"]);
