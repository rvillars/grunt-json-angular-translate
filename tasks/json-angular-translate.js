/*
 * grunt-json-angular-translate
 *
 *
 * Copyright (c) 2014 Shahar Talmi
 * Licensed under the MIT license.
 */

'use strict';

var multiline = require('multiline');
var jbfunc = 'js_beautify';
var jb = require('js-beautify')[jbfunc];
var toSingleQuotes = require('to-single-quotes');
var extend = require('util')._extend;

function merge(base, add) {
  var key = Object.keys(add)[0];
  if (typeof(add[key]) === 'object' && base[key]) {
    merge(base[key], add[key]);
  } else {
    base[key] = add[key];
  }
  return base;
}

function unflatten(json) {
  return Object.keys(json).reduceRight(function(prev, key) {
    return merge(prev, key.split('.').reduceRight(function (prev, curr) {
      var obj = {};
      obj[curr] = prev;
      return obj;
    }, json[key]));
  }, {});
}

module.exports = function (grunt) {
  grunt.registerMultiTask('jsonAngularTranslate', 'The best Grunt plugin ever.', function () {
    var extractLanguage;
    var options = this.options({moduleName: 'translations', extractLanguage: '..(?=\\.[^.]*$)'});

    if (typeof(options.extractLanguage) === 'string') {
      extractLanguage = function (filepath) {
        return filepath.match(new RegExp(options.extractLanguage))[0];
      };
    } else if (typeof(options.extractLanguage) === 'function') {
      extractLanguage = options.extractLanguage;
    }

    this.files.forEach(function (file) {
      // Concat specified files.
      var language;
      var src = file.src.filter(function (filepath) {
        // Warn on and remove invalid source files (if nonull was set).
        if (!grunt.file.exists(filepath)) {
          grunt.log.warn('Source file "' + filepath + '" not found.');
          return false;
        } else {
          return true;
        }
      }).map(function (filepath) {
        // Read file source.
        var currLanguage = extractLanguage(filepath);
        if (language && language !== currLanguage) {
          throw 'inconsistent language: ' + filepath + ' (' + currLanguage + ' !== ' + language + ')';
        }
        language = currLanguage;
        return unflatten(JSON.parse(grunt.file.read(filepath)));
      }).reduce(extend, {});

      src = multiline(function(){/*
'use strict';

try {
  angular.module('{{moduleName}}');
} catch (e) {
  angular.module('{{moduleName}}', ['pascalprecht.translate']);
}

angular.module('{{moduleName}}').config(function ($translateProvider) {
  $translateProvider.translations('{{language}}', {{translations}});
  $translateProvider.preferredLanguage('{{language}}');
});
      */}).replace(/{{language}}/g, language).replace(/{{moduleName}}/g, options.moduleName)
          .replace('{{translations}}', toSingleQuotes(JSON.stringify(src)));

      src = jb(src, {'indent_size': 2, 'jslint_happy': true}) + '\n';

      grunt.file.write(file.dest, src);

      grunt.log.writeln('File "' + file.dest + '" created.');
    });
  });

};
