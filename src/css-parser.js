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
function getOpeningTagName (html) {
  const htmlWithNoComments = html.replace(/<!--[\s\S]*?-->/g, '')
  const match = /^\s*<\s*([a-z]+)/i.exec(htmlWithNoComments)
  if (match) {
    return match[1].toLowerCase()
  }

  throw new Error('Input HTML does not contain a valid tag')
}

/**
 * needs to be run in a browser context
 * @param {Object} options
 * @returns {Array<Object>}
 */
function findMatchingRules (options) {
  // STUB:isCombinator

  // STUB:isHtmlSelector

  // STUB:isBodySelector

  // STUB:stringifyElement

  // STUB:getCssRules

  // STUB:findRulesForElement

  // STUB:parseRuleForElement

  // STUB:splitPartOfSelector

  // STUB:isMatchable

  // STUB:isFullMatchable

  // STUB:selectorStringToArray

  // STUB:selectorArrayToString

  // STUB:findMatchIndex

  // STUB:combinatorQuery

  // STUB:cssTextToArray

  // STUB:formatRule

  // STUB:getMediaText

  const matches = Function.call.bind(window.Element.prototype.webkitMatchesSelector)

  // eslint-disable-next-line no-undef
  const rules = getCssRules(document.styleSheets)

  let elements
  if (options.isHtmlOrBodyTag) {
    elements = [document.querySelector(options.tagName)]
  } else {
    elements = [...document.body.children]
  }

  const result = elements.map(element => {
    // eslint-disable-next-line no-undef
    return findRulesForElement(matches, rules, element, options, 0)
  })

  return Promise.all(result)
}

/**
 * @param {Page} page
 * @param {String} html
 * @param {Array<Object>} styles
 * @param {Object} options
 * @returns {Object}
 */
async function findMatchesFromPage (page, html, styles, options) {
  await setPageContent(page, html, styles)
  let matches = await page.evaluate(findMatchingRules, options)
  matches = matches.map(match => stringifySelectors(match, options))
  if (matches.length === 1) {
    matches = matches[0]
  }

  return matches
}

export {
  setPageContent,
  getOpeningTagName,
  findMatchingRules,
  findMatchesFromPage
}
