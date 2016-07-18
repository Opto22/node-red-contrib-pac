module.exports = function(grunt) {
  grunt.initConfig({
    ts: {
      default : {
        tsconfig: './ts/tsconfig.json'      
      }
    },
    clean: {
      build: ['js/**/*.js*'],
      package: ['package/**/*', '*node-red-contrib-*.tgz']
    },
    simplemocha: {
      options: {
      },
      internal: { src: ['js/test/internal/*.js'] },
      external: { src: ['js/test/external/*.js'] }
    },
    copy: {
      testSettings: {
        nonull: true,
        src: './ts/test/external/settings.json',
        dest:'./js/test/external/settings.json'
      },
      package: {
        files: [
          {src: 'package.json',   dest: 'package/'},
          {src: 'js/*.html',      dest: 'package/'},
          {src: 'js/*.js',        dest: 'package/'},
          {src: 'js/*.d.ts',      dest: 'package/'},
          {src: 'js/icons/*.png', dest: 'package/'},
          {src: 'README.md',      dest: 'package/'},
          {src: 'LICENSE',        dest: 'package/'}
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
  grunt.registerTask("default", ["ts"]);
  grunt.registerTask("test-internal", 'comment', ['simplemocha:internal']);
  grunt.registerTask("test-all", 'comment', ['copy:testSettings', 'ts', 'simplemocha:internal', 'simplemocha:external']);
  grunt.registerTask("package", 'comment', ['clean:package', 'copy:package', 'npm-command:pack']);
};
