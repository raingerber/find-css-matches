import {findMatchesFromPage} from './css-parser'

// TODO use the !== method for setting boolean options?

const DEFAULT_OPTIONS = {
  cssText: false,
  recursive: true,
  includeHtml: false,
  findPartialMatches: true,
  formatSelector: (a, b) => [a, b]
}

/**
 * @param {Array|String|Object} styles
 * @return {Array<Object>}
 */
function normalizeStyles (styles) {
  if (Array.isArray(styles)) {
    return styles
  } else if (typeof styles === 'string') {
    return [{content: styles}]
  }

  return [styles]
}

/**
 * @param {Object|Array<Object>} styles
 * @param {String} html
 * @param {Object} userOptions
 * @return {Promise<Object>}
 */
function findMatches (styles, html, userOptions) {
  const stylesArray = normalizeStyles(styles)
  const options = Object.assign({}, DEFAULT_OPTIONS, userOptions)
  return findMatchesFromPage(stylesArray, html, options)
}

export {findMatches}
