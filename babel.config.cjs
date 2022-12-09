module.exports = {
  'assumptions': {
    'setPublicClassFields': true,
  },
  exclude: [
    'node_modules/core-js/**',
  ],
  plugins: [
    '@babel/plugin-proposal-object-rest-spread',
    ['@babel/plugin-transform-typescript', {'allowDeclareFields': true}],
    ['@babel/plugin-proposal-decorators', {'decoratorsBeforeExport': true}],
    ['@babel/plugin-proposal-class-properties'],
  ],
  presets: [
    // Enabling Babel to understand TypeScript
    '@babel/preset-typescript',
    [
      // Allows smart transpilation according to target environments
      '@babel/preset-env',
      {
        // Specifying which browser versions you want to transpile down to
        corejs: '3.26.1',
        useBuiltIns: 'usage',
        bugfixes: true,
        /**
         * Specifying what module type should the output be in.
         * For test cases, we transpile all the way down to commonjs since jest does not understand TypeScript.
         * For all other cases, we don't transform since we want Webpack to do that in order for it to do
         * dead code elimination (tree shaking) and intelligently select what all to add to the bundle.
         */
        modules: false,
      },
    ],
  ],
};
