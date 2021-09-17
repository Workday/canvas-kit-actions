/* eslint-disable import/extensions */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
module.exports = function () {
  return {
    files: ['src/**/*.ts'],

    tests: ['src/**/*.test.ts'],

    env: {
      type: 'node',
      runner: 'node',
    },

    testFramework: 'jest',

    compilers: {
      '**/*.ts?(x)': wallaby.compilers.babel(), // We're using Babel to compile all files seen by Jest
    },

    setup: w => {
      const jestConfig = require('./jest.config.js')

      w.testFramework.configure(jestConfig)
    },
  }
}
