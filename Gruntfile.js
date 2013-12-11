'use strict';

var request = require('request');

module.exports = function (grunt) {
  // show elapsed time at the end
  require('time-grunt')(grunt);
  // load all grunt tasks
  require('load-grunt-tasks')(grunt);

  var reloadPort = 35729, files;

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    forever: {
      options: {
        index: 'app.js',
        logDir: './'
      }
    },
    bower: {
      install: {
        options: {
          targetDir: './public/bower'
        }
      }
    },
    less: {
      development: {
        files: {
            "public/css/style.css": "public/css/style.less"
        }
      }
    },
    cssmin : {
        css:{
            options: {
              keepSpecialComments: 0
            },
            src: 'public/css/style.css',
            dest: 'public/css/style.css'
        }
    },
    concat: {
        js: {
            src: [
                'public/bower/jquery/jquery.js',
                'public/bower/bootstrap/dist/js/bootstrap.js',
                'public/bower/pace/pace.js'
            ],
            dest: 'public/js/app.js'
        }
    },
    uglify: {
        js: {
            files: {
                'public/js/app.js': ['public/js/app.js']
            }
        }
    },
    develop: {
      server: {
        file: 'app.js'
      }
    },
    watch: {
      options: {
        nospawn: true,
        livereload: reloadPort
      },
      server: {
        files: [
          'app.js',
          'routes/*.js'
        ],
        tasks: ['develop', 'delayed-livereload']
      },
      js: {
        files: ['public/js/*.js'],
        tasks: ['concat:js','uglify:js'],
        options: {
          livereload: reloadPort
        }
      },
      less: {
        files: ['public/css/*.less'],
        tasks: ["less", 'cssmin:css'],
        options: {
          livereload: reloadPort
        }
      },
      ejs: {
        files: ['views/*.ejs'],
        options: {
          livereload: reloadPort
        }
      }
    }
  });

  grunt.config.requires('watch.server.files');
  files = grunt.config('watch.server.files');
  files = grunt.file.expand(files);

  grunt.registerTask('delayed-livereload', 'Live reload after the node server has restarted.', function () {
    var done = this.async();
    setTimeout(function () {
      request.get('http://localhost:' + reloadPort + '/changed?files=' + files.join(','),  function (err, res) {
          var reloaded = !err && res.statusCode === 200;
          if (reloaded) {
            grunt.log.ok('Delayed live reload successful.');
          } else {
            grunt.log.error('Unable to make a delayed live reload.');
          }
          done(reloaded);
        });
    }, 500);
  });

  grunt.registerTask('development', [
    'npm-install',
    'bower:install',
    'concat:js',
    'less',
    'develop',
    'watch'
  ]);

  grunt.registerTask('production', [
    'npm-install',
    'bower:install',
    'concat:js',
    'uglify:js',
    'less',
    'cssmin:css',
    'forever:restart'
  ]);
};
