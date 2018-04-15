import replace from 'rollup-plugin-re'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

import pkg from './package.json'
import * as functions from './src/functions'

const STUB_REGEX = /([\t ]*)\/\/\s*STUB:([^\s]+)/

// TODO add mapValues devDependency
// const stringified = mapValues(functions, fn => fn.toString())

const stringified = (function functionsToString (functions) {
  const keys = Object.keys(functions)
  return keys.reduce((acc, key) => {
    acc[key] = functions[key].toString()
    return acc
  }, {})
}(functions))

let unused = Object.keys(stringified)

function replaceFunctionStub (fullMatch, whitespace, id) {
  let fn = stringified[id]
  if (fn) {
    // TODO insert whitespace
    // TODO warn if these are not all used? or record how often each of them is used?
    // maybe you could have a setting for how often each of them should be used
    unused = unused.filter(key => key !== id)
    // console.log(unused)
    return fn
  }

  throw new Error(`[build error] The ${id} function is not defined.`)
}

export default [
  {
    plugins: [
      replace({
        patterns: [{
          test: STUB_REGEX,
          replace: replaceFunctionStub
        }]
      })
      // resolve(),
      // commonjs({
      //   sourceMap: false
      // })
    ],
    input: './index.js',
    // external: ['puppeteer'],
    output: [
      {
        file: pkg.main,
        format: 'cjs'
      },
      {
        file: pkg.module,
        format: 'es'
      }
    ]
  }
]
