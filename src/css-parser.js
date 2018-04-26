import puppeteer from 'puppeteer'

import {CSS_RULE_TYPES} from './constants'

/**
 * @param {String} html
 * @return {String}
 */
function getSelector (html) {
  const match = /<\s*([a-z]+)/i.exec(html)
  if (!match) {
    throw new Error('Input HTML does not contain a valid tag.')
  }

  const tagName = match[1].toLowerCase()
  const selector = `${tagName}:first-of-type`
  return selector
}

/**
 * needs to be run in a browser context
 * @param {Object} CSS_RULE_TYPES
 * @param {String} elementQuery
 * @param {Object} options
 * @return {Array<Object>}
 */
function findMatchingSelectors (CSS_RULE_TYPES, elementQuery, options) {
  const matches = Function.call.bind(window.Element.prototype.webkitMatchesSelector)

  // STUB:findMatchingRules

  // STUB:findMatchingSegment

  // STUB:formatRule

  let rules = []
  for (let {cssRules} of document.styleSheets) {
    for (let rule of cssRules) {
      switch (CSS_RULE_TYPES[rule.type]) {
        case 'STYLE_RULE':
          rules.push(rule)
          break
        case 'MEDIA_RULE':
          rules.splice(rules.length, 0, ...rule.cssRules)
          break
      }
    }
  }

  const element = document.querySelector(elementQuery)

  // eslint-disable-next-line no-undef
  return findMatchingRules(matches, rules, element, options, true)
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
 * @param {Array<Object>} styles
 * @param {String} html
 * @param {Object} options
 * @return {Object}
 */
async function getMatchingSelectors (styles, html, options) {
  const elementQuery = getSelector(html)
  const browser = await puppeteer.launch()
  const page = await createPage(browser, styles, html)
  const selectors = await page.evaluate(
    findMatchingSelectors,
    CSS_RULE_TYPES,
    elementQuery,
    options
  )

  browser.close()
  return selectors
}

export {
  getMatchingSelectors
}
