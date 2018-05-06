import {findMatchesFromPage} from './css-parser'

// TODO add useFragment option

const DEFAULT_OPTIONS = {
  cssText: false,
  recursive: true,
  findPartialMatches: true,
  formatSelector: (a, b) => [a, b] // TODO pick this off the options so it doesn't get passed to evaluate?
}

/**
 * @param {Object|Array<Object>} styles
 * @param {String} html
 * @param {Object} userOptions
 * @return {Promise<Object>}
 */
function findMatches (styles, html, userOptions) {
  const stylesArray = Array.isArray(styles) ? styles : [styles]
  const options = Object.assign({}, DEFAULT_OPTIONS, userOptions)
  return findMatchesFromPage(stylesArray, html, options)
}

export {findMatches}
