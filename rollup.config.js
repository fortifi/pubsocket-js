import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import eslint from '@rollup/plugin-eslint';
import resolve from '@rollup/plugin-node-resolve';
import svg from 'rollup-plugin-svg';
import {terser} from 'rollup-plugin-terser';

process.chdir(__dirname);

const commonPlugins = [
  resolve({browser: true, preferBuiltins: false, extensions: ['.js', '.ts']}),
  commonjs(),
  eslint({throwOnError: true, throwOnWarning: false}),
  babel({
    babelHelpers: 'bundled', extensions: ['.ts', '.js', '.jsx', '.es6', '.es', '.mjs', '.cjs'],
  }),
];

export default {
  input: {'pubsocket.min': './src/pubsocket.ts'},
  output: {
    dir: './builds/',
    name: 'PubSocket',
    format: 'iife',
  },
  plugins: [
    svg(),
    ...commonPlugins,
    terser(),
  ],
};
