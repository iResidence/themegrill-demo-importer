/* jshint node:true */
module.exports = function( grunt ){
	'use strict';

	grunt.initConfig({

		// Setting folder templates.
		dirs: {
			js: 'assets/js',
			css: 'assets/css'
		},

		// JavaScript linting with JSHint.
		jshint: {
			options: {
				jshintrc: '.jshintrc'
			},
			all: [
				'Gruntfile.js',
				'<%= dirs.js %>/admin/*.js',
				'!<%= dirs.js %>/admin/*.min.js'
			]
		},

		// Sass linting with Stylelint.
		stylelint: {
			options: {
				stylelintrc: '.stylelintrc'
			},
			all: [
				'<%= dirs.css %>/*.scss'
			]
		},

		// Minify all .js files.
		uglify: {
			options: {
				ie8: true,
				parse: {
					strict: false
				},
				output: {
					comments : /@license|@preserve|^!/
				}
			},
			admin: {
				files: [{
					expand: true,
					cwd: '<%= dirs.js %>/admin/',
					src: [
						'*.js',
						'!*.min.js'
					],
					dest: '<%= dirs.js %>/admin/',
					ext: '.min.js'
				}]
			},
			vendor: {
				files: {
					'<%= dirs.js %>/jquery-tiptip/jquery.tipTip.min.js': ['<%= dirs.js %>/jquery-tiptip/jquery.tipTip.js']
				}
			}
		},

		// Compile all .scss files.
		sass: {
			options: {
				sourceMap: false
			},
			compile: {
				files: [{
					expand: true,
					cwd: '<%= dirs.css %>/',
					src: ['*.scss'],
					dest: '<%= dirs.css %>/',
					ext: '.css'
				}]
			}
		},

		// Generate all RTL .css files
		rtlcss: {
			generate: {
				expand: true,
				cwd: '<%= dirs.css %>',
				src: [
					'*.css',
					'!*-rtl.css'
				],
				dest: '<%= dirs.css %>/',
				ext: '-rtl.css'
			}
		},

		// Minify all .css files.
		cssmin: {
			minify: {
				expand: true,
				cwd: '<%= dirs.css %>/',
				src: ['*.css'],
				dest: '<%= dirs.css %>/',
				ext: '.css'
			}
		},

		// Watch changes for assets.
		watch: {
			css: {
				files: [
					'<%= dirs.css %>/*.scss'
				],
				tasks: ['sass', 'rtlcss', 'cssmin']
			},
			js: {
				files: [
					'<%= dirs.js %>/admin/*.js',
					'!<%= dirs.js %>/admin/*.min.js'
				],
				tasks: ['jshint', 'uglify']
			}
		},

		// Generate POT files.
		makepot: {
			options: {
				type: 'wp-plugin',
				domainPath: 'languages',
				potHeaders: {
					'report-msgid-bugs-to': 'themegrill@gmail.com',
					'language-team': 'LANGUAGE <EMAIL@ADDRESS>'
				}
			},
			dist: {
				options: {
					potFilename: 'themegrill-demo-importer.pot',
					exclude: [
						'vendor/.*'
					]
				}
			}
		},

		// Add Textdomain.
		addtextdomain: {
			options: {
				textdomain: 'themegrill-demo-importer',
				updateDomains: ['wordpress-importer']
			},
			target: {
				files: {
					src: [
						'**/*.php',         // Include all files
						'!node_modules/**', // Exclude node_modules/
						'!vendor/**'        // Exclude vendor/
					]
				}
			}
		},

		// Check textdomain errors.
		checktextdomain: {
			options: {
				text_domain: 'themegrill-demo-importer',
				keywords: [
					'__:1,2d',
					'_e:1,2d',
					'_x:1,2c,3d',
					'esc_html__:1,2d',
					'esc_html_e:1,2d',
					'esc_html_x:1,2c,3d',
					'esc_attr__:1,2d',
					'esc_attr_e:1,2d',
					'esc_attr_x:1,2c,3d',
					'_ex:1,2c,3d',
					'_n:1,2,4d',
					'_nx:1,2,4c,5d',
					'_n_noop:1,2,3d',
					'_nx_noop:1,2,3c,4d'
				]
			},
			files: {
				src: [
					'**/*.php',         // Include all files
					'!node_modules/**', // Exclude node_modules/
					'!vendor/**'        // Exclude vendor/
				],
				expand: true
			}
		},

		// PHP Code Sniffer.
		phpcs: {
			options: {
				bin: 'vendor/bin/phpcs',
				standard: './dev.ruleset.xml'
			},
			dist: {
				src:  [
					'**/*.php',                       // Include all files
					'!node_modules/**',               // Exclude node_modules/
					'!vendor/**',                     // Exclude vendor/
					'!includes/includes/importers/**' // Exclude vendor/
				]
			}
		},

		// Autoprefixer.
		postcss: {
			options: {
				processors: [
					require( 'autoprefixer' )({
						browsers: [
							'> 0.1%',
							'ie 8',
							'ie 9'
						]
					})
				]
			},
			dist: {
				src: [
					'<%= dirs.css %>/*.css'
				]
			}
		},

		// Compress files and folders.
		compress: {
			options: {
				archive: 'themegrill-demo-importer.zip'
			},
			files: {
				src: [
					'**',
					'!.*',
					'!*.md',
					'!*.zip',
					'!.*/**',
					'!sass/**',
					'!vendor/**',
					'!Gruntfile.js',
					'!package.json',
					'!composer.json',
					'!composer.lock',
					'!node_modules/**',
					'!dev.ruleset.xml',
					'!phpcs.ruleset.xml'
				],
				dest: 'themegrill-demo-importer',
				expand: true
			}
		}
	});

	// Load NPM tasks to be used here
	grunt.loadNpmTasks( 'grunt-sass' );
	grunt.loadNpmTasks( 'grunt-phpcs' );
	grunt.loadNpmTasks( 'grunt-rtlcss' );
	grunt.loadNpmTasks( 'grunt-postcss' );
	grunt.loadNpmTasks( 'grunt-stylelint' );
	grunt.loadNpmTasks( 'grunt-wp-i18n' );
	grunt.loadNpmTasks( 'grunt-checktextdomain' );
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );
	grunt.loadNpmTasks( 'grunt-contrib-uglify' );
	grunt.loadNpmTasks( 'grunt-contrib-cssmin' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	grunt.loadNpmTasks( 'grunt-contrib-compress' );

	// Register tasks
	grunt.registerTask( 'default', [
		'jshint',
		'uglify',
		'css'
	]);

	grunt.registerTask( 'js', [
		'jshint',
		'uglify:admin'
	]);

	grunt.registerTask( 'css', [
		'stylelint',
		'sass',
		'rtlcss',
		'postcss',
		'cssmin'
	]);

	grunt.registerTask( 'dev', [
		'default',
		'makepot'
	]);

	grunt.registerTask( 'zip', [
		'dev',
		'compress'
	]);
};
