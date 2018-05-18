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
 * @param {String} html
 * @param {Object} options
 * @param {Object} overrides
 * @returns {Object}
 */
function mergeOptions (html, options, overrides) {
  const tagName = getOpeningTagName(html)
  const isHtmlOrBodyTag = tagName === 'html' || tagName === 'body'
  return Object.assign({}, options, overrides, {tagName, isHtmlOrBodyTag})
}

/**
 * @param {Browser} browser
 * @returns {Page}
 */
async function createPage (browser) {
  const page = await browser.newPage()
  page.on('console', msg => console.log(msg.text()))
  return page
}

/**
 * @param {String|Object|Array<Object>} styles
 * @param {Object} instanceOptions
 * @returns {Function}
 */
async function findMatchesFactory (styles, instanceOptions) {
  const stylesArray = normalizeStyles(styles)
  const baseOptions = Object.assign({}, DEFAULT_OPTIONS, instanceOptions)

  let browser = await puppeteer.launch()
  let page = await createPage(browser)

  async function closeBrowser () {
    await browser.close()
    browser = null
    page = null
  }

  let queue = []
  let isClosed = false
  let isResolving = false
  async function beginResolving () {
    if (!queue.length) {
      isResolving = false
      if (isClosed) {
        await closeBrowser()
      }

      return
    }

    isResolving = true
    const {resolve, reject, html, options} = queue.shift()

    try {
      resolve(await findMatchesFromPage(page, html, stylesArray, options))
    } catch (error) {
      reject(error)
    }

    beginResolving()
  }

  /**
   * @param {String} html
   * @param {Object} localOptions
   * @returns {Object}
   */
  async function findMatches (html, localOptions) {
    if (!page) {
      throw new Error('Unable to call findMatches(...) after findMatches.close()')
    }

    const options = mergeOptions(html, baseOptions, localOptions)
    return new Promise((resolve, reject) => {
      queue.push({resolve, reject, html, options})
      !isResolving && beginResolving()
    })
  }

  findMatches.close = async () => {
    if (!browser) {
      return
    }

    isClosed = true

    // when isResolving is true,
    // closeBrowser will eventually
    // be called from beginResolving,
    // so findMatches.close does not
    // cancel any pending requests
    !isResolving && await closeBrowser()
  }

  return findMatches
}

/**
 * @param {String|Object|Array<Object>} styles
 * @param {String} html
 * @param {Object} userOptions
 * @returns {Object}
 */
async function findMatches (styles, html, userOptions) {
  const browser = await puppeteer.launch()
  const page = await createPage(browser)
  const stylesArray = normalizeStyles(styles)
  const options = mergeOptions(html, DEFAULT_OPTIONS, userOptions)
  const result = await findMatchesFromPage(page, html, stylesArray, options)
  browser.close()
  return result
}

export {DEFAULT_OPTIONS, mergeOptions, findMatchesFactory, findMatches}
