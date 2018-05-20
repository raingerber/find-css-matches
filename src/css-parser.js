import {stringifySelectors} from './stringify'

/**
 * @param {ElementHandle} handle
 */
function addFindCssMatchesClass (handle) {
  handle.classList.add('_____FIND_CSS_MATCHES_TAG_____')
}

/**
 * @param {Page} page
 * @param {String} html
 * @param {Array<Object>} styles
 * @returns {Page}
 */
async function setPageContent (page, html, styles) {
  await page.setContent(html)
  for (const style of styles) {
    const handle = await page.addStyleTag(style)
    await page.evaluate(addFindCssMatchesClass, handle)
  }

  const handle = await page.addScriptTag({
    // eslint-disable-next-line no-undef
    content: $TOKENIZER_BUNDLE
  })

  await page.evaluate(addFindCssMatchesClass, handle)
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
  // $INJECTED_FUNCTIONS

  const matches = Function.call.bind(window.Element.prototype.webkitMatchesSelector)

  // eslint-disable-next-line no-undef
  const rules = parseCssRules(getCssRules(document.styleSheets))

  let elements
  if (options.isHtmlOrBodyTag) {
    elements = [document.querySelector(options.tagName)]
  } else {
    elements = Array.prototype.filter.call(document.body.children, child => {
      return !child.classList.contains('_____FIND_CSS_MATCHES_TAG_____')
    })
  }

  // eslint-disable-next-line no-undef
  const ids = getIds(elements)
  const fullOptions = {...options, ids}
  const result = elements.map(element => {
    // eslint-disable-next-line no-undef
    return findRulesForElements(matches, rules, element, fullOptions, 0)
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
