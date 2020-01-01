'use strict';
module.exports = function(grunt) {
    grunt.config.init({
        watch:{
            main: {
                files: ['Gruntfile.js', './**/*.js', 'test/**/*.js', './**/*.scss'],
                tasks: ['compass:compileDevelopment', 'eslint', 'mochaTest']
            },
            templates: {
                files: ['resource-bundles/**/*.html'],
                tasks: ['templates']
            }
        },
        eslint: {
            src: ['.'],
            options: {
                quiet: true
            }
        },
        mochaTest: {
            test: {
                options: {
                    reporter: 'list'
                },
                src: ['test/**/*.js']
            }
        },
        compass: {
            clean: {
                options: {
                    sassDir: 'resource-bundles',
                    cssDir: 'resource-bundles',
                    clean: true
                }
            },
            compileDevelopment: {
                options: {
                    sassDir: 'resource-bundles',
                    cssDir: 'resource-bundles',
                    environment: 'development'
                }
            },
            compileProduction: {
                options: {
                    sassDir: 'resource-bundles',
                    cssDir: 'resource-bundles',
                    environment: 'production'
                }
            },
            watch: {
                options: {
                    sassDir: 'resource-bundles',
                    cssDir: 'resource-bundles',
                    watch: true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-compass');
    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-mocha-test');

    var _ = require('lodash');

    var compileTemplate = function(out) {
        out = out.replace(/\r?\n|\r/g, ' ').replace(/'/g, "\\'").replace(/\s{2,}/g, ' ');
        return out;
    };
    var prettyFileName = function(n) {
        return _.camelCase(n.replace('.html', '').replace(/[- ]/g, '_'));
    };

    // custom task to compile our vfhelper templates so we can use them as variables
    grunt.registerTask('compileVfHelperTemplates', 'compileVfHelperTemplates', function() {
        var srcDir = 'resource-bundles/AY.resource/vfHelpers/templates';
        var contents = ['//compiled using grunt; grunt:templates or just run grunt\nvar vfHelperTemplates = vfHelperTemplates || {};'];
        var outputFile = 'resource-bundles/AY.resource/vfHelpers/vfHelperTemplates.js';
        grunt.file.expand({cwd: srcDir}, '*.html').forEach(function(filename) {
            contents.push("\nvfHelperTemplates." + prettyFileName(filename) + "='" + compileTemplate(grunt.file.read(srcDir + '/' + filename)) + "';");
        });
        grunt.file.write(outputFile, contents.join(''));
        grunt.log.oklns('created: ' + outputFile);
    });

    grunt.registerTask('templates', ['compileVfHelperTemplates']);
    grunt.registerTask('default', ['compass:clean', 'compass:compileDevelopment', 'templates', 'eslint', 'mochaTest']);
    grunt.registerTask('development', ['compass:clean', 'compass:compileDevelopment', 'templates', 'eslint', 'mochaTest']);
    grunt.registerTask('production', ['compass:clean', 'compass:compileProduction', 'templates', 'eslint', 'mochaTest']);
};