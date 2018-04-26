import {getMatchingSelectors} from './css-parser'

const identity = input => input

const castArray = input => Array.isArray(input) ? input : [input]

/**
 * @param {Object} rawOptions
 * @return {Object}
 */
function normalizeOptions (rawOptions) {
  let {unmatched, matched} = rawOptions.format || {}
  let {recursive, cssText, partialMatches} = rawOptions
  if (typeof recursive !== 'boolean') recursive = false
  if (typeof cssText !== 'boolean') cssText = false
  if (typeof partialMatches !== 'boolean') partialMatches = true
  if (typeof unmatched !== 'function') unmatched = identity
  if (typeof matched !== 'function') matched = identity
  return {recursive, cssText, partialMatches, unmatched, matched}
}

/**
 * @param {Object|Array} styles
 * @param {String} html
 * @param {Object} rawOptions
 * @return {Promise<Object>}
 */
function findMatches (styles, html, rawOptions = {}) {
  const options = normalizeOptions(rawOptions)
  const matches = getMatchingSelectors(castArray(styles), html, options)
  return matches
}

export {findMatches}

/* TODO
2. add unit tests
4. get <body> and <html> tags working (add tests for this)
5. document how the order of selectors is determined in the output
6. if the same selector is used multiple times, how is that handled?
8. add a note that the html needs to have a single root element
9. warn that it uses async / await
*/
