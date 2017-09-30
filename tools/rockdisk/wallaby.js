module.exports = function(w) {
  return {
    files: ['src/**/*.ts', 'test/**/!(*.test).ts'],
    tests: ['test/**/*.test.ts'],
    env: {
      type: 'node',
    },
    testFramework: 'jasmine',
  };
};
