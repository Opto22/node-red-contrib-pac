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
      },
      internal: { src: ['build/test/internal/*.js'] },
      external: { src: ['build/test/external/*.js'] }
    },
    copy: {
      testSettings: {
        nonull: true,
        src: 'src/test/external/settings.json',
        dest:'build/test/external/settings.json'
      },
      build: {
        files: [
          {src: 'package.json',    dest: 'build/'},
          {src: 'src/*.html',      dest: 'build/',       flatten: true, expand:  true},
          {src: 'src/icons/*.png', dest: 'build/icons/', flatten: true, expand:  true},
          {src: 'README.md',       dest: 'build/'},
          {src: 'LICENSE',         dest: 'build/'}
         ]
      },
      package: {
        files: [
          {src: 'build/package.json', dest: 'package/',       flatten: true, expand:  true},
          {src: 'build/*.html',       dest: 'package/',       flatten: true, expand:  true},
          {src: 'build/*.js',         dest: 'package/',       flatten: true, expand:  true},
          {src: 'build/icons/*.png',  dest: 'package/icons/', flatten: true, expand:  true},
          {src: 'build/README.md',    dest: 'package/',       flatten: true, expand:  true},
          {src: 'build/LICENSE',      dest: 'package/',       flatten: true, expand:  true}
         ]
      }
    },
    'npm-command': {
      pack: {
        options: {
          cmd:  'pack',
          args: 'package'
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
  grunt.registerTask("test-all", 'comment', ['default', 'copy:testSettings', 'simplemocha:internal', 'simplemocha:external']);
  grunt.registerTask("package", 'comment', ['clean:package', 'default', 'copy:package', 'npm-command:pack']);
};
