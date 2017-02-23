module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        jade: {
            compile: {
                options: {
                    pretty: false,
                    data: {
                        debug: false
                    }
                },
                files: {
                    'index.html': ['src/views/*.jade']
                }
            },
        },

        less: {
            main: {
                files: {
                    'app.css': ['src/styles/*.less']
                }
            }
        },

        concat: {
            js: {
                src: ['src/js/namespace.js', 'src/js/**'],
                dest: 'app.js'
            }
        },

        postcss: {
            build: {
                options: {
                    map: false,
                    processors: [
                        require('autoprefixer')({
                            browsers: ['last 2 versions']
                        })
                    ]
                },
                src: '*.css'
            },
        },

        babel: {
            options: {
                sourceMap: false,
                presets: ['es2015']
            },
            dist: {
                files: {
                    'app.es5.js': 'app.js'
                }
            }
        },

        uglify: {
            options: {
                mangle: {
                    except: [
                        'ReadVis2', 'SGWM', 'firebase', 'app', 'modules', 'window', 'document'
                    ]
                }
            },
            js: {
                files: {
                    'app.min.js': 'app.es5.js'
                }
            }
        },

        clean: {
            js: [ 'app.js', 'app.es5.js' ]
        },
    });

    grunt.loadNpmTasks( 'grunt-contrib-jade' );
    grunt.loadNpmTasks( 'grunt-contrib-less' );
    grunt.loadNpmTasks( 'grunt-contrib-copy' );
    grunt.loadNpmTasks( 'grunt-contrib-concat' );
    grunt.loadNpmTasks( 'grunt-postcss' );
    grunt.loadNpmTasks( 'grunt-babel' );
    grunt.loadNpmTasks( 'grunt-contrib-uglify' );
    grunt.loadNpmTasks( 'grunt-contrib-clean' );

    grunt.registerTask( 'default', [ 'jade', 'less', 'concat', 'postcss', 'babel', 'uglify', 'clean' ] );
};