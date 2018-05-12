import puppeteer from 'puppeteer'

import {getOpeningTagName, findMatchesFromPage} from './css-parser'

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
 * @param {Object} options
 * @param {String} html
 * @returns {Object}
 */
function mergeOptions (options, html) {
  const tagName = getOpeningTagName(html)
  const isHtmlOrBodyTag = tagName === 'html' || tagName === 'body'
  return Object.assign({}, DEFAULT_OPTIONS, options, {tagName, isHtmlOrBodyTag})
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

    const userOptions = Object.assign({}, instanceOptions, localOptions)
    return findMatchesFromPage(page, html, stylesArray, mergeOptions(userOptions, html))
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

export {mergeOptions, findMatchesFactory, findMatches}
