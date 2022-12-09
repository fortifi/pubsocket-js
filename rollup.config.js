import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import eslint from '@rollup/plugin-eslint';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import svg from 'rollup-plugin-svg';
import {terser} from 'rollup-plugin-terser';

const {ENV, replaceValues, polyfillIncludes} = require('./build.config.cjs');

const isCanary = process.env.PAYMENTAUTH_ENV === 'canary';
const isProduction = isCanary || process.env.PAYMENTAUTH_ENV === 'prod';
//const isProductionSandbox = process.env.SANDBOX_ENV !== 'local';

const BUILD_DESTINATION = `./builds/${ENV}`;

process.chdir(__dirname);

const commonPlugins = [
  replace({values: replaceValues, preventAssignment: true}),
  resolve({browser: true, preferBuiltins: false, extensions: ['.js', '.ts']}),
  commonjs(),
  polyfillIncludes,
  eslint({throwOnError: true, throwOnWarning: false}),
  babel({
    babelHelpers: 'bundled', extensions: ['.ts', '.js', '.jsx', '.es6', '.es', '.mjs', '.cjs'],
  }),
];

export default {
  input: {'pubsocket.min': './src/pubsocket.ts'},
  output: {
    dir: `${BUILD_DESTINATION}`,
    name: 'PubSocket',
    format: 'iife',
  },
  plugins: [
    svg(),
    ...commonPlugins,
    ...(isProduction ? [terser] : []),
  ],
};
