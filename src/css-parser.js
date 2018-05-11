import puppeteer from 'puppeteer'

import {stringifySelectors} from './stringify'

/**
 * @param {Browser} browser
 * @param {Array<Object>} styles
 * @param {String} html
 * @returns {Object}
 */
async function createPage (browser, styles, html) {
  const page = await browser.newPage()
  await page.setContent(html)
  for (let style of styles) {
    await page.addStyleTag(style)
  }

  page.on('console', msg => console.log(msg.text()))
  return page
}

/**
 * @param {String} html
 * @returns {String}
 * @throws if the string does not contain an HTML tag
 */
function getElementQuery (html) {
  const htmlWithNoComments = html.replace(/<!--[\s\S]*?-->/g, '')
  const match = /^\s*<\s*([a-z]+)/i.exec(htmlWithNoComments)
  if (match) {
    return `${match[1].toLowerCase()}:first-of-type`
  }

  throw new Error('Input HTML does not contain a valid tag.')
}

/**
 * needs to be run in a browser context
 * @param {String} elementQuery
 * @param {Object} options
 * @returns {Array<Object>}
 */
function findMatchingRules (elementQuery, options) {
  // STUB:getCssRules

  // STUB:stringifyElement

  // STUB:findRulesForElement

  // STUB:testIfSelectorIsMatch

  // STUB:findMatchingPartOfSelector

  // STUB:combinatorPreventsMatch

  // STUB:selectorHasDescendentCombinator

  // STUB:getElementsUsingCombinator

  // STUB:cssTextToArray

  // STUB:formatRule

  // STUB:getMediaText

  const matches = Function.call.bind(window.Element.prototype.webkitMatchesSelector)

  // eslint-disable-next-line no-undef
  const rules = getCssRules(document.styleSheets)
  let element = document.querySelector(elementQuery)

  element = element.parentNode.removeChild(element)

  // eslint-disable-next-line no-undef
  return findRulesForElement(matches, rules, element, options, 0)
}

/**
 * @param {Array<Object>} styles
 * @param {String} html
 * @param {Object} options
 * @returns {Object}
 */
async function findMatchesFromPage (styles, html, options) {
  const elementQuery = getElementQuery(html)
  const browser = await puppeteer.launch()
  let selectors
  try {
    const page = await createPage(browser, styles, html)
    selectors = await page.evaluate(findMatchingRules, elementQuery, options)
    selectors = stringifySelectors(selectors, options)
  } catch (error) {
    browser.close()
    throw error
  }

  browser.close()
  return selectors
}

export {
  createPage,
  getElementQuery,
  findMatchingRules,
  findMatchesFromPage
}
