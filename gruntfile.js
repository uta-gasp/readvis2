const destDirProd = '';
const destDirDev = 'build/';

const isDev = process.argv[2] !== 'publish';
const destDir = isDev ? destDirDev : destDirProd;

module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        clean: {
            dev: {
                src: [ `${destDirDev}**` ],
                filter: function(filepath) {
                    return filepath.split('\\').length > 1;
                }
            },
            prod: [ `${destDirProd}app.js`, `${destDirProd}app.es5.js` ]
        },

        jade: {
            compile: {
                options: {
                    pretty: isDev,
                    data: {
                        debug: isDev,
                    }
                },
                src: [ 'src/views/*.jade' ],
                dest: `${destDir}index.html`
            },
        },

        less: {
            compile: {
                src: [ 'src/styles/*.less' ],
                dest: `${destDir}app.css`
            }
        },

        concat: {
            js: {
                src: [ 'src/js/namespace.js', 'src/js/**' ],
                dest: `${destDir}app.js`
            }
        },

        copy: {
            libs: {
                expand: true,
                cwd: 'libs/',
                src: '**',
                dest: `${destDirDev}libs/`,
                flatten: false
            },
            img: {
                expand: true,
                cwd: 'img/',
                src: '*.png',
                dest: `${destDirDev}img/`,
                flatten: false
            }
        },

        postcss: {
            autopref: {
                options: {
                    map: false,
                    processors: [
                        require('autoprefixer')({
                            browsers: ['last 2 versions']
                        })
                    ]
                },
                src: `${destDir}*.css`
            },
            // This linting do work with syntax: require('postcss-less'),
            // but stylelint complains about certain LESS syntax features,
            // like mixins ( .a { .b } ).
            // Having postcss-less for syntax does not really
            // help, just removes the ressame "you are using CSS parser for LESS files"
            // If "syntax: 'less', then some error occurs,
            // Work OK with syntax: require('stylelint/node_modules/postcss-less), but
            // removes ";" after mixins in "less" files, so the following lint will fail
            lint: {
                options: {
                    map: false,
                    syntax: require('stylelint/node_modules/postcss-less'),
                    processors: [
                        require('stylelint')({
                            extends: './node_modules/stylelint-config-standard/index.js',
                            rules: {
                                'at-rule-name-case': 'lower',
                                'length-zero-no-unit': true,
                                'indentation': 4,
                                'comment-empty-line-before': [ 'never', {
                                    except: ['first-nested'],
                                    ignore: ['stylelint-commands', 'after-comment'],
                                }],
                                'declaration-empty-line-before': null,
                            }
                        })
                    ]
                },
                src: 'src/styles/**/*.less'
            }
        },

        babel: {
            options: {
                sourceMap: false,
                presets: ['es2015']
            },
            compile: {
                src: `${destDir}app.js`,
                dest: `${destDir}app.es5.js`
            }
        },

        uglify: {
            options: {
                mangle: {
                    except: [
                        'ReadVis2', 'SGWM', 'firebase', 'app', 'window', 'document'
                    ]
                }
            },
            js: {
                src: `${destDir}app.es5.js`,
                dest: `${destDir}app.min.js`
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
                    // 'document',
                    // 'console',
                    // 'window',
                    // 'setTimeout',
                    // 'clearTimeout',
                    // 'localStorage',
                    // 'arguments',
                    // 'Blob',
                    // 'Map',
                    // 'NodeFilter',

                    // libs
                    'firebase',
                ]
            }
        },

        stylelint: {
            options: {
                syntax: '',
                config: {
                    extends: 'stylelint-config-standard',
                    rules: {
                        'at-rule-name-case': 'lower',
                        'length-zero-no-unit': true,
                        'indentation': 4,
                        'comment-empty-line-before': [ 'never', {
                            except: ['first-nested'],
                            ignore: ['stylelint-commands', 'after-comment'],
                        }],
                        'declaration-empty-line-before': null,
                    }
                }
            },

            src: 'src/styles/**/*.less'
        },
    });

    grunt.loadNpmTasks( 'grunt-contrib-clean' );
    grunt.loadNpmTasks( 'grunt-contrib-jade' );
    grunt.loadNpmTasks( 'grunt-contrib-less' );
    grunt.loadNpmTasks( 'grunt-contrib-copy' );
    grunt.loadNpmTasks( 'grunt-contrib-concat' );
    grunt.loadNpmTasks( 'grunt-postcss' );
    grunt.loadNpmTasks( 'grunt-babel' );
    grunt.loadNpmTasks( 'grunt-contrib-uglify' );
    grunt.loadNpmTasks( 'grunt-contrib-jshint' );
    grunt.loadNpmTasks( 'grunt-eslint' );
    grunt.loadNpmTasks( 'grunt-stylelint' );

    grunt.registerTask( 'default', [ 'jade', 'less', 'concat', 'copy', 'postcss' ] );
    grunt.registerTask( 'rebuild', [ 'clean:dev', 'jade', 'less', 'concat', 'copy', 'postcss' ] );
    grunt.registerTask( 'publish', [ 'jade', 'less', 'concat', 'postcss', 'babel', 'uglify', 'clean:prod' ] );

    grunt.registerTask( 'compile', [ 'jshint' ] );
    grunt.registerTask( 'compile2', [ 'eslint', 'stylelint' ] );
};