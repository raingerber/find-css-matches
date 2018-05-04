import puppeteer from 'puppeteer'

import {CSS_RULE_TYPES} from './constants'

import {stringifySelectors} from './stringify'

/**
 * @param {String} html
 * @return {String}
 */
function getElementQuery (html) {
  // TODO what if there's a comment in the html?
  const match = /<\s*([a-z]+)/i.exec(html)
  if (!match) {
    throw new Error('Input HTML does not contain a valid tag.')
  }

  const tagName = match[1].toLowerCase()
  const selector = `${tagName}:first-of-type`
  return selector
}

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
 * @param {Object} CSS_RULE_TYPES
 * @param {String} elementQuery
 * @param {Object} options
 * @return {Array<Object>}
 */
function findMatchingRules (CSS_RULE_TYPES, elementQuery, options) {
  const matches = Function.call.bind(window.Element.prototype.webkitMatchesSelector)

  // STUB:findRulesForElement

  // STUB:findMatchingPartOfSelector

  // STUB:combinatorPreventsMatch

  // STUB:getElementsUsingCombinator

  // STUB:formatRule

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
  const elementQuery = getElementQuery(html)
  const browser = await puppeteer.launch()
  const page = await createPage(browser, styles, html)
  let selectors = await page.evaluate(
    findMatchingRules,
    CSS_RULE_TYPES,
    elementQuery,
    options
  )

  browser.close()
  selectors = stringifySelectors(selectors, options)
  return selectors
}

export {
  findMatchesFromPage
}
