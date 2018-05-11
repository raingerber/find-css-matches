import puppeteer from 'puppeteer'

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
 * @param {Object} instanceOptions
 * @returns {Function}
 */
async function findMatchesFactory (styles, instanceOptions) {
  const stylesArray = normalizeStyles(styles)
  let browser = await puppeteer.launch()
  let page = await browser.newPage()
  page.on('console', msg => console.log(msg.text()))
  /**
   * @param {String} html
   * @param {Object} localOptions
   * @returns {Object}
   */
  async function findMatches (html, localOptions) {
    if (!page) {
      throw new Error('Unable to call findMatches(...) after findMatches.close()')
    }

    const options = Object.assign({}, DEFAULT_OPTIONS, instanceOptions, localOptions)
    return findMatchesFromPage(page, html, stylesArray, options)
  }

  findMatches.close = async () => {
    await browser.close()
    browser = null
    page = null
  }

  return findMatches
}

/**
 * @param {String|Object|Array<Object>} styles
 * @param {String} html
 * @param {Object} options
 * @returns {Object}
 */
async function findMatches (styles, html, options) {
  const _findMatches = await findMatchesFactory(styles, options)
  const selectors = await _findMatches(html)
  _findMatches.close()
  return selectors
}

export {findMatchesFactory, findMatches}
