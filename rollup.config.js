import fs from 'fs'
import json from 'rollup-plugin-json'
import replace from 'rollup-plugin-re'
import minify from 'rollup-plugin-babel-minify'
import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import multiEntry from 'rollup-plugin-multi-entry'
import cleanup from 'rollup-plugin-cleanup'
import MagicString from 'magic-string'

import pkg from './package.json'
import * as functions from './src/functions'

const {TEST_BUILD} = process.env

const compact = input => input.filter(Boolean)

const config = [
  {
    input: './src/modules.js',
    output: {
      format: 'iife',
      file: './dist/modules.js',
      sourcemap: false,
      name: 'modules'
    },
    plugins: [
      // the regexpu-core package (used by css-selector-tokenizer)
      // requires a json file that needs to be converted to a module
      json(),
      resolve(),
      commonjs({
        sourcemap: false
      }),
      minify({
        comments: false,
        sourceMap: false
      })
    ]
  },
  {
    plugins: compact([
      json(),
      replace({
        patterns: [
          {
            match: '**/src/css-parser.js',
            test: /([\t ]*)\/\/\s*STUB:([^\s]+)/g,
            replace: (fullMatch, whitespace, id) => {
              const fn = functions[id]
              if (!fn) {
                throw new Error(`The ${id} function is not defined`)
              }

              let str = fn.toString()
              str = new MagicString(str)
              str.indent(whitespace)
              return str.toString()
            }
          },
          {
            match: '**/src/css-parser.js',
            test: '$TOKENIZER_BUNDLE',
            replace: () => {
              const code = fs.readFileSync('./dist/modules.js', 'utf8')
              return JSON.stringify(code)
            }
          }
        ]
      }),
      TEST_BUILD ? multiEntry() : null,
      resolve(),
      commonjs({
        sourceMap: TEST_BUILD
      }),
      cleanup({
        comments: ['some', 'istanbul', 'srcmaps']
      })
    ]),
    external: [
      'puppeteer'
    ],
    input: './index.js',
    output: [{
      file: pkg.main,
      format: 'cjs'
    }, {
      file: pkg.module,
      format: 'es'
    }]
  }
]

if (TEST_BUILD) {
  Object.assign(config[1], {
    input: './src/*.js',
    output: {
      sourcemap: 'inline',
      file: '__test__/index.js',
      format: 'cjs'
    }
  })
}

export default config
