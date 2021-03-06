module.exports = function(grunt) {
  grunt.initConfig({
    ts: {
      default : {
        tsconfig: './src/tsconfig.json'      
      }
    },
    clean: {
      build: ['build'],
      package: ['package', '*node-red-contrib-*.tgz']
    },
    simplemocha: {
      options: {
        grep: grunt.option('grep')
      },
      internal: { src: ['build/src/test/internal/*.js'] },
      external: { src: ['build/src/test/external/*.js'] }
    },
    copy: {
      testSettings: {
        nonull: true,
        src: 'src/test/external/settings.json',
        dest:'build/src/test/external/settings.json'
      },
      testSettingsSnap: {
        nonull: true,
        src: 'src/test/external/settings.snapPac.json',
        dest:'src/test/external/settings.json'
      },
      testSettingsGroov: {
        nonull: true,
        src: 'src/test/external/settings.groovPac.json',
        dest:'src/test/external/settings.json'
      },      
      build: {
        files: [
          {src: 'src/*.html',      dest: 'build/src',       flatten: true, expand:  true},
          {src: 'src/icons/*.png', dest: 'build/src/icons/', flatten: true, expand:  true},
         ]
      },
      package: {
        files: [
          {src: 'package.json',              dest: 'package/'},
          {src: 'build/src/*.html',          dest: 'package/'},
          {src: 'build/src/**/*.js',         dest: 'package/'},
          {src: 'build/submodules/**/*.js',  dest: 'package/'},
          {src: 'build/src/icons/*.png',     dest: 'package/build/src/icons/', flatten: true, expand:  true},
          {src: 'README.md',                 dest: 'package/'},
          {src: 'LICENSE',                   dest: 'package/'}
         ]
      }
    },
    'npm-command': {
      pack: {
        options: {
          cmd:  'pack',
          args: './package'
        }
      }
    }
  });
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-npm-command");
  grunt.loadNpmTasks("grunt-ts");
  grunt.loadNpmTasks("grunt-simple-mocha");
  grunt.registerTask("default", ["clean:build", "copy:build", "ts"]);
  grunt.registerTask("test-internal", 'comment', ['simplemocha:internal']);

  /* Standard test task. Uses "src/test/external/settings.json". */
  grunt.registerTask("test", 'comment', ['default', 'copy:testSettings', 'simplemocha:internal', 'simplemocha:external']);
  grunt.registerTask("mocha", 'comment', ['copy:testSettings', 'simplemocha:internal', 'simplemocha:external']);

  /* Extra test tasks to easily test both Groov PAC and SNAP PAC.
     For Groov PAC, uses "src/test/external/settings.groovPac.json". 
     For SNAP PAC,  uses "src/test/external/settings.snapPac.json". 
     IMPORTANT: THIS WILL COPY OVER THE EXISTING "src/test/external/settings.json" file!!
  */
  grunt.registerTask("mocha-snap",  'comment', ['copy:testSettingsSnap', 'copy:testSettings', 'simplemocha:internal', 'simplemocha:external']);
  grunt.registerTask("mocha-groov",  'comment', ['copy:testSettingsGroov', 'copy:testSettings', 'simplemocha:internal', 'simplemocha:external']);
  grunt.registerTask("test-snap",  'comment', ['copy:testSettingsSnap',  'test']);
  grunt.registerTask("test-groov", 'comment', ['copy:testSettingsGroov', 'test']);

  grunt.registerTask("package", 'comment', ['clean:package', 'default', 'copy:package', 'npm-command:pack']);
};
