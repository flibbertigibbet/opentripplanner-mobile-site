module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: 'src/<%= pkg.name %>.js',
        dest: 'build/<%= pkg.name %>.min.js'
      }
    },
    wiredep: {
      task: {
        src: [
          'index.html',
          'styles/main.css'
        ],
        exclude: [ /leaflet/ ],
        options: {
        }
      }
    },
    'http-server': {
        cache: 5,
        port: 8282,
        host: "127.0.0.1",
        // server default file extension 
        ext: "html",
        root: '.'
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-wiredep');
  grunt.loadNpmTasks('grunt-http-server');

  // Default task(s).
  grunt.registerTask('default', ['wiredep']);

  // basic web server for testing
  grunt.registerTask('serve', ['http-server']);
  
};