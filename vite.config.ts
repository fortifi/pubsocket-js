/// <reference types="vitest" />
import {defineConfig} from "vite";
import * as path from "node:path";
import minifyHTML from 'rollup-plugin-minify-html-literals';

const fileName = {
  iife: `pubsocket.min.js`,
};

const formats = Object.keys(fileName) as Array<keyof typeof fileName>;

export default defineConfig({
  base: './',
  plugins: [
    // @ts-ignore
    minifyHTML()
  ],
  build: {
    outDir: 'builds',
    lib: {
      entry: 'src/pubsocket.ts',
      name: 'Pubsocket',
      formats,
      fileName: format => fileName[format],
    },
    terserOptions: {
      format: {
        comments: false
      }
    },
    minify: 'terser',
  },
  test: {},
  resolve: {
    alias: [
      {find: "@", replacement: path.resolve(__dirname, 'src')},
    ]
  }
});
