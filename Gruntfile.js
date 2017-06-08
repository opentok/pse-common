module.exports = function(grunt) {

  ['grunt-bower-task', 'grunt-karma'].forEach(grunt.loadNpmTasks);

  grunt.loadTasks('tasks');

  var TEST_BASE_DIR = 'test/';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    bower: {
      install: {
        options: {
          targetDir: './lib',
          layout: 'byType',
          install: true,
          verbose: false,
          cleanTargetDir: false,
          cleanBowerDir: true,
          bowerOptions: {}
        }
      }
    },

    karma: {
      options: {
        configFile: 'karma.conf.js'
      },
      integration: {
        singleRun: true
      }
    }
  });

  grunt.registerTask('test', 'Launch all tests', [
    'karma:integration'
  ]);

  grunt.registerTask('config', [
    'preBowerInstall',
    'bower:install',
    'postBowerInstall'
  ]);

  grunt.registerTask('default', ['config', 'test']);
};
