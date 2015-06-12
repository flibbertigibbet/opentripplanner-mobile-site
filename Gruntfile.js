module.exports = function(grunt) {
    require('time-grunt')(grunt);

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        clean: ['dist'],
        copy: {
            app: {
                files: [
                    { src: 'index.html', dest: 'dist/' },
                    { expand: true, src: 'img/**', dest: 'dist' },
                    {
                        expand: true,
                        flatten: true,
                        src: 'bower_components/**/*.{png,jpg,ico,svg}',
                        dest: 'dist/styles/images'
                    }
                ]
            }
        },
        cssmin: {
            bower: {
                files: [{
                    dest: 'dist/styles/vendor.css',
                    src: require('wiredep')({exclude: [ /leaflet/ ]}).css
                }]
            },
            app: {
                files: [{ dest: 'dist/styles/app.css', src: 'styles/**/*.css' }]
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
                screwIE8: true,
                sourceMap: true
            },
            bower: {
                files: [{
                    dest: 'dist/scripts/vendor.js',
                    src: require('wiredep')({exclude: [ /leaflet/ ]}).js
                }]
            },
            app: {
                files: [{ dest: 'dist/scripts/app.js', src: 'js/**/*.js' }]
            }
        },
        htmlmin: {
            dist: {
                options: {
                    removeComments: true,
                    collapseWhitespace: true
                },
                files: {
                    'dist/index.html': 'dist/index.html'
                }
            },
        },
        wiredep: {
            task: {
                src: [
                  'index.html',
                  'styles/main.css'
                ],
                exclude: [ /leaflet/ ]
            }
        },
        'http-server': {
            cache: 1,
            port: 8282,
            host: "127.0.0.1",
            // server default file extension 
            ext: "html",
            root: '.'
        },
        'gh-pages': {
            options: {
                base: 'dist'
            },
            src: ['**']
        },
        useminPrepare: {
            html: 'dist/index.html',
        },
        usemin: {
            dest: 'dist',
            html: 'dist/index.html',
            css: ['vendor.css', 'app.css'],
            js: ['vendor.js', 'app.js']
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-filerev');
    grunt.loadNpmTasks('grunt-gh-pages');
    grunt.loadNpmTasks('grunt-http-server');
    grunt.loadNpmTasks('grunt-usemin');
    grunt.loadNpmTasks('grunt-wiredep');

    // basic web server for testing
    grunt.registerTask('serve', ['http-server']);

    // Default task(s).
    grunt.registerTask('default', ['wiredep', 'serve']);

    // build for production
    grunt.registerTask('build', [
        'clean',
        'wiredep',
        'copy:app',
        'useminPrepare',
        'cssmin:bower',
        'cssmin:app',
        'uglify:bower',
        'uglify:app',
        'usemin',
        'htmlmin:dist'
    ]);

    // push to gh-pages
    grunt.registerTask('deploy', ['build', 'gh-pages'])
};