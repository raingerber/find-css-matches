import {stringifySelectors} from './stringify'

/**
 * @param {Page} page
 * @param {String} html
 * @param {Array<Object>} styles
 * @returns {Page}
 */
async function setPageContent (page, html, styles) {
  await page.setContent(html)
  for (const style of styles) {
    await page.addStyleTag(style)
  }

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
 * @param {Page} page
 * @param {String} html
 * @param {Array<Object>} styles
 * @param {Object} options
 * @returns {Object}
 */
async function findMatchesFromPage (page, html, styles, options) {
  const elementQuery = getElementQuery(html)
  await setPageContent(page, html, styles)
  let matches = await page.evaluate(findMatchingRules, elementQuery, options)
  matches = stringifySelectors(matches, options)
  return matches
}

export {
  setPageContent,
  getElementQuery,
  findMatchingRules,
  findMatchesFromPage
}
