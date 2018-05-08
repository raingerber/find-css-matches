import replace from 'rollup-plugin-re'
import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import multiEntry from 'rollup-plugin-multi-entry'
import MagicString from 'magic-string'

import pkg from './package.json'
import * as functions from './src/functions'

// TODO remove comments in the build

// keep in mind that Jest will automatically define NODE_ENV as test

// ; rm __test__/index.js

// TODO add babel or buble or something, for object spread for example

const {TEST_BUILD} = process.env

const compact = input => input.filter(item => item)

// function functionToString (fn, ...args) {
//   const argString = args.map(arg => JSON.stringify(arg)).join(',')
//   return `(${fn.toString()})(${argString})`
// }

const config = [{
  plugins: compact([
    replace({
      patterns: [{
        match: '**/src/css-parser.js',
        test: /([\t ]*)\/\/\s*STUB:([^\s]+)/g,
        replace: (fullMatch, whitespace, id) => {
          const fn = functions[id]
          if (!fn) {
            throw new Error(`[build error] The ${id} function is not defined.`)
          }

          let str = fn.toString()
          str = new MagicString(str)
          str.indent(whitespace)
          return str.toString()
        }
      }]
    }),
    TEST_BUILD ? multiEntry() : null,
    resolve(),
    commonjs({
      sourceMap: TEST_BUILD
    })
  ]),
  external: [
    'puppeteer'
  ],
  input: './src/index.js',
  output: [
    {
      file: pkg.main,
      format: 'cjs'
    }, {
      file: pkg.module,
      format: 'es'
    }
  ]
}]

if (TEST_BUILD) {
  Object.assign(config[0], {
    input: './src/*.js',
    output: {
      sourcemap: 'inline',
      file: '__test__/index.js',
      format: 'cjs'
    }
  })
}

export default config
