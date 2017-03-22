'use strict';

const path = require('path');
const del = require('del');
const gulp = require('gulp');
const gulplog = require('gulplog');
const combine = require('stream-combiner2').obj;
const throttle = require('lodash.throttle');
const debug = require('gulp-debug');
const sourcemaps = require('gulp-sourcemaps');
const stylus = require('gulp-stylus');
const browserSync = require('browser-sync').create();
const gulpIf = require('gulp-if');
const cssnano = require('gulp-cssnano');
const rev = require('gulp-rev');
const revReplace = require('gulp-rev-replace');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const uglify = require('gulp-uglify');
const resolver = require('stylus').resolver;
const AssetsPlugin = require('assets-webpack-plugin');


// Gulp + Webpack = ♡

const webpackStream = require('webpack-stream');
const webpack = webpackStream.webpack;
const named = require('vinyl-named');

const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';

gulp.task('styles', function() {

  return gulp.src('frontend/styles/index.styl')
      .pipe(plumber({
        errorHandler: notify.onError(err => ({
          title:   'Styles',
          message: err.message
        }))
      }))
      .pipe(gulpIf(isDevelopment, sourcemaps.init()))
      .pipe(stylus({
        define: {
          url: resolver()
        }
      }))
      .pipe(gulpIf(isDevelopment, sourcemaps.write()))
      .pipe(gulpIf(!isDevelopment, combine(cssnano(), rev())))
      .pipe(gulp.dest('public/styles'))
      .pipe(gulpIf(!isDevelopment, combine(rev.manifest('css.json'), gulp.dest('manifest'))));

});

gulp.task('assets', function() {
  return gulp.src('frontend/assets/**/*.*', {since: gulp.lastRun('assets')})
      .pipe(gulpIf(!isDevelopment, revReplace({
        manifest: gulp.src('manifest/css.json', {allowEmpty: true})
      })))
      .pipe(gulpIf(!isDevelopment, revReplace({
        manifest: gulp.src('manifest/webpack.json', {allowEmpty: true})
      })))
      .pipe(gulp.dest('public'));
});

gulp.task('styles:assets', function() {
  return gulp.src('frontend/styles/**/*.{svg,png}', {since: gulp.lastRun('styles:assets')})
      .pipe(gulp.dest('public/styles'));
});

gulp.task('webpack', function(callback) {
  let firstBuildReady = false;

  function done(err, stats) {
    firstBuildReady = true;

    if (err) { // hard error, see https://webpack.github.io/docs/node.js-api.html#error-handling
      return;  // emit('error', err) in webpack-stream
    }

    gulplog[stats.hasErrors() ? 'error' : 'info'](stats.toString({
      colors: true
    }));

  }

  let options = {
    output: {
      publicPath: '/js/',
      filename: isDevelopment ? '[name].js' : '[name]-[chunkhash:10].js'
    },
    watch:   isDevelopment,
    devtool: isDevelopment ? 'cheap-module-inline-source-map' : null,
    module:  {
      loaders: [{
        test:    /\.js$/,
        include: path.join(__dirname, "frontend"),
        loader:  'babel?presets[]=es2015'
      }]
    },
    plugins: [
      new webpack.NoErrorsPlugin()
    ]
  };

  if (!isDevelopment) {
    options.plugins.push(new AssetsPlugin({
      filename: 'webpack.json',
      path:     __dirname + '/manifest',
      processOutput(assets) {
        for (let key in assets) {
          assets[key + '.js'] = assets[key].js.slice(options.output.publicPath.length);
          delete assets[key];
        }
        return JSON.stringify(assets);
      }
    }));
  }

  return gulp.src('frontend/js/*.js')
      .pipe(plumber({
        errorHandler: notify.onError(err => ({
          title:   'Webpack',
          message: err.message
        }))
      }))
      .pipe(named())
      .pipe(webpackStream(options, null, done))
      .pipe(gulpIf(!isDevelopment, uglify()))
      .pipe(gulp.dest('public/js'))
      .on('data', function() {
        if (firstBuildReady) {
          callback();
        }
      });

});

gulp.task('clean', function() {
  return del(['public', 'manifest']);
});

gulp.task('build', gulp.series('clean', gulp.parallel('styles:assets', 'styles', 'webpack'), 'assets'));

gulp.task('serve', function() {
  browserSync.init({
    server: 'public'
  });

  browserSync.watch('public/**/*.*').on('change', browserSync.reload);
});


gulp.task('dev',
    gulp.series(
        'build',
        gulp.parallel(
            'serve',
            function() {
              gulp.watch('frontend/styles/**/*.styl', gulp.series('styles'));
              gulp.watch('frontend/assets/**/*.*', gulp.series('assets'));
              gulp.watch('frontend/styles/**/*.{svg,png}', gulp.series('styles:assets'));
            }
        )
    )
);
