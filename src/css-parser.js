/* eslint-disable no-multi-spaces */

import puppeteer from 'puppeteer'

import {stringifySelectors} from './stringify'

/**
 * @param {Browser} browser
 * @param {Array<Object>} styles
 * @param {String} html
 * @return {Object}
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
 * needs to be run in a browser context
 * @param {String} elementQuery
 * @param {Object} options
 * @return {Array<Object>}
 */
function findMatchingRules (elementQuery, options) {
  const matches = Function.call.bind(window.Element.prototype.webkitMatchesSelector)

  // STUB:findRulesForElement

  // STUB:findMatchingPartOfSelector

  // STUB:combinatorPreventsMatch

  // STUB:getElementsUsingCombinator

  // STUB:formatRule

  const CSS_RULE_TYPES = [
    'UNKNOWN_RULE',                // 0
    'STYLE_RULE',                  // 1
    'CHARSET_RULE',                // 2
    'IMPORT_RULE',                 // 3
    'MEDIA_RULE',                  // 4
    'FONT_FACE_RULE',              // 5
    'PAGE_RULE',                   // 6
    'KEYFRAMES_RULE',              // 7
    'KEYFRAME_RULE',               // 8
    null,                          // 9
    'NAMESPACE_RULE',              // 10
    'COUNTER_STYLE_RULE',          // 11
    'SUPPORTS_RULE',               // 12
    'DOCUMENT_RULE',               // 13
    'FONT_FEATURE_VALUES_RULE',    // 14
    'VIEWPORT_RULE',               // 15
    'REGION_STYLE_RULE'            // 16
  ]

  let rules = []
  for (let {cssRules} of document.styleSheets) {
    for (let rule of cssRules) {
      switch (CSS_RULE_TYPES[rule.type]) {
        case 'STYLE_RULE':
          rules.push(rule)
          break
        case 'MEDIA_RULE':
          rules.push(...rule.cssRules)
          break
      }
    }
  }

  const element = document.querySelector(elementQuery)

  // eslint-disable-next-line no-undef
  return findRulesForElement(matches, rules, element, options, 0)
}

/**
 * @param {Array<Object>} styles
 * @param {String} html
 * @param {Object} options
 * @return {Object}
 */
async function findMatchesFromPage (styles, html, options) {
  const browser = await puppeteer.launch()
  const page = await createPage(browser, styles, html)
  const elementQuery = await getElementQuery(page, html)
  let selectors = await page.evaluate(
    findMatchingRules,
    elementQuery,
    options
  )

  browser.close()
  selectors = stringifySelectors(selectors, options)
  return selectors
}

/**
 * @param {Page} page
 * @param {String} html
 * @return {String}
 */
async function getElementQuery (page, html) {
  const htmlWithNoComments = html.replace(/<!--[\s\S]*?-->/g, '')
  const match = /^\s*<\s*([a-z]+)/i.exec(htmlWithNoComments)
  if (match) {
    const tagName = match[1].toLowerCase()
    const actualTagName = await page.evaluate('document.body.firstChild.tagName')
    if (tagName === actualTagName.toLowerCase()) {
      return `${tagName}:first-of-type`
    }
  }

  throw new Error('Input HTML does not contain a valid tag.')
}

export {
  createPage,
  findMatchesFromPage,
  getElementQuery
}
