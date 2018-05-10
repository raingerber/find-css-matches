import {findMatchesFromPage} from './css-parser'

const DEFAULT_OPTIONS = {
  recursive: true,
  includeHtml: false,
  includeCss: false,
  includePartialMatches: true,
  formatSelector: (a, b) => [a, b]
}

/**
 * @param {String|Object|Array<Object>} styles
 * @returns {Array<Object>}
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
 * @param {String|Object|Array<Object>} styles
 * @param {String} html
 * @param {Object} userOptions
 * @returns {Promise<Object>}
 */
function findMatches (styles, html, userOptions) {
  const stylesArray = normalizeStyles(styles)
  const options = Object.assign({}, DEFAULT_OPTIONS, userOptions)
  return findMatchesFromPage(stylesArray, html, options)
}

export {findMatches}
