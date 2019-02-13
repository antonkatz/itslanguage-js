module.exports = (config) => {
  const configuration = {
    frameworks: [
      'browserify',
      'jasmine',
    ],
    files: [
      'packages/**/*.spec.js',
    ],
    browsers: [
      'ChromeHeadless',
    ],
    customLaunchers: {
      ChromeTravisCi: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox --disable-gpu'],
      },
    },
    reporters: [
      'progress',
      'coverage',
    ],
    coverageReporter: {
      check: {
        each: {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        global: {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
      reporters: [
        {
          type: 'html',
          dir: 'coverage/',
          subdir: 'report-html',
        },
        {
          type: 'text',
        },
        {
          type: 'json',
        },
      ],
      instrumenterOptions: {
        istanbul: {
          noCompact: true,
        },
      },
    },
    preprocessors: {
      'packages/**/*.spec.js': ['browserify'],
    },
    browserify: {
      debug: true,
      transform: [
        [
          'babelify',
          {
            presets: [
              '@babel/preset-env',
            ],
            plugins: [
              '@babel/plugin-transform-runtime',
            ],
          },
        ],
      ],
    },
  };

  config.set(configuration);
};
