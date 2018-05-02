import {getMatchingSelectors} from './css-parser'

const identity = input => input

const castArray = input => Array.isArray(input) ? input : [input]

/**
 * @param {Object} rawOptions
 * @return {Object}
 */
function normalizeOptions (rawOptions) {
  let {findPartialMatches, recursive, cssText, unmatched, matched} = rawOptions
  if (typeof findPartialMatches !== 'boolean') findPartialMatches = true
  if (typeof recursive !== 'boolean') recursive = false
  if (typeof cssText !== 'boolean') cssText = false
  if (typeof unmatched !== 'function') unmatched = identity
  if (typeof matched !== 'function') matched = identity
  return {findPartialMatches, recursive, cssText, unmatched, matched}
}

/**
 * @param {Object|Array} styles
 * @param {String} html
 * @param {Object} rawOptions
 * @return {Promise<Object>}
 */
function findMatches (styles, html, rawOptions = {}) {
  const options = normalizeOptions(rawOptions)
  return getMatchingSelectors(castArray(styles), html, options)
}

export {findMatches}
