module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        clean: {
            build: {
                src: ['build/**'],
                filter: function(filepath) {
                    return filepath.split('\\').length > 1;
                }
            }
        },

        jade: {
            compile: {
                options: {
                    pretty: true,
                    data: {
                        debug: true,
                    }
                },
                files: {
                    'build/index.html': ['src/views/*.jade']
                }
            },
        },

        less: {
            main: {
                files: {
                    'build/app.css': ['src/styles/*.less']
                }
            }
        },

        concat: {
            js: {
                src: ['src/js/namespace.js', 'src/js/**'],
                dest: 'build/app.js'
            }
        },

        copy: {
            libs: {
                expand: true,
                cwd: 'libs/',
                src: '**',
                dest: 'build/libs/',
                flatten: false
            },
            img: {
                expand: true,
                cwd: 'img/',
                src: '**',
                dest: 'build/img/',
                flatten: false
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
                src: 'build/*.css'
            },
            lint: {
                options: {
                    map: false,
                    processors: [
                        require('stylelint')({
                            syntax: require('postcss-less'),
                            extends: './node_modules/stylelint-config-standard/index.js',
                            rules: {
                                'at-rule-name-case': 'lower',
                                'length-zero-no-unit': true,
                                'indentation': 4,
                                'comment-empty-line-before': [ 'never', {
                                    except: ['first-nested'],
                                    ignore: ['stylelint-commands', 'between-comments'],
                                } ],
                            }
                        })
                    ]
                },
                src: 'src/styles/**/*.less'
            }
        },

        jshint: {
            files: [
                'src/js/**/*.js'
            ],
            options: {
                // engorce
                bitwise: true,
                curly: true,
                eqeqeq: true,
                esversion: 6,
                freeze: true,
                funcscope: true,
                globals: {
                    // module: true,
                },
                //latedef: 'nofunc',
                newcap: true,
                noarg: true,
                nocomma: true,
                //nonew: true,
                shadow: false,
                undef: true,
                unused: 'vars',
                varstmt: true,

                // relax
                boss: true,
                loopfunc: true,
                supernew: false,

                //environments
                browser: true,
                devel: true,
            }
        },

        eslint: {
            files: [
                'src/js/**/*.js'
            ],
            options: {
                extends: './node_modules/eslint/conf/eslint.json',
                parserOptions: {
                    ecmaVersion: 6,
                    sourceType: 'script'
                },
                env: {
                    browser: true,
                    es6: true
                },
                rules: {
                    'comma-dangle': 'off'
                },
                globals: [
                    // browser
                    'document',
                    'console',
                    'window',
                    'setTimeout',
                    'clearTimeout',
                    'localStorage',
                    'arguments',
                    'Blob',
                    'Map',
                    'NodeFilter',

                    // Node
                    'module',
                    'require',

                    // libs
                    'Firebase',
                    'GazeTargets',
                    'shortcut',
                    'regression'
                ]
            }
        },

        // stylelint: {     // failed to configure this
        //     files: [
        //         'src/styles/**/*.less'
        //     ],
        //     options: {
        //         configFile: './node_modules/stylelint-config-standard/index.js',
        //         rules: {

        //         }
        //     }
        // }
    });

    grunt.loadNpmTasks( 'grunt-contrib-clean' );
    grunt.loadNpmTasks( 'grunt-contrib-jade' );
    grunt.loadNpmTasks( 'grunt-contrib-less' );
    grunt.loadNpmTasks( 'grunt-contrib-copy' );
    grunt.loadNpmTasks( 'grunt-contrib-concat' );
    grunt.loadNpmTasks( 'grunt-postcss' );
    grunt.loadNpmTasks( 'grunt-contrib-jshint' );
    grunt.loadNpmTasks( 'grunt-eslint' );
    // grunt.loadNpmTasks( 'grunt-stylelint' );

    grunt.registerTask('rebuild', ['clean', 'jade', 'less', 'concat', 'copy', 'postcss:build']);
    grunt.registerTask('quick', ['jade', 'less', 'concat', 'copy:img', 'postcss:build']);
    grunt.registerTask('default', ['jade', 'less', 'concat', 'copy:img', 'copy:libs', 'postcss:build']);
    grunt.registerTask('compile', ['jshint']);
    grunt.registerTask('compile2', ['eslint', 'postcss:lint']);
};