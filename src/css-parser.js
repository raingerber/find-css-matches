const puppeteer = require('puppeteer')
const generateHash = require('object-hash')

const CSS_RULE_TYPES = require('./css-rule-types')

/**
 * needs to be run in a browser context
 * @param {Boolean} recursive
 * @return {Array}
 */
async function findMatchingSelectors (recursive) {
  // TODO doesn't need all this since it's being run in chrome
  const matches = Function.call.bind(
    window.Element.prototype.matchesSelector ||
    window.Element.prototype.msMatchesSelector ||
    window.Element.prototype.mozMatchesSelector ||
    window.Element.prototype.webkitMatchesSelector ||
    window.Element.prototype.oMatchesSelector
  )

  let rules = []
  for (let {cssRules} of document.styleSheets) {
    rules = rules.concat(addCssRules(cssRules))
  }

  function addCssRules (rules, result = []) {
    for (let rule of rules) {
      switch (window.CSS_RULE_TYPES[rule.type]) {
        case 'STYLE_RULE':
          result.push(rule)
          break
        case 'MEDIA_RULE':
          result = addCssRules(rule.cssRules, result)
          break
      }
    }

    return result
  }

  if (document.body.childNodes.length !== 1) {
  // TODO throw error if body has more than one child (or no children)
  }

  const element = document.body.children[0] // TODO use firstChild?
  const matchingRules = await getMatchingRulesObject(rules, element, recursive, true)
  return matchingRules

  /**
   * @param {Array<CSSRule>} rules
   * @param {DOMElement} element
   * @param {Boolean} recursive
   * @return {Object}
   */
  async function getMatchingRulesObject (rules, element, recursive, isRoot) {
    const result = { selectors: [], children: [] }
    // if (!element) {
    //   return
    // }

    const matchingRules = getMatchingRules(rules, element, isRoot)
    for (let {selector, rule} of matchingRules) {
      let mediaText = ''
      if (rule.parentRule && rule.parentRule.media) {
        mediaText = rule.parentRule.media.mediaText
      }

      const hash = await window.generateHash(mediaText + rule.cssText)
      result.selectors.push({ selector, mediaText, hash })
    }

    if (!recursive) {
      return result
    }

    for (let child of element.children) {
      const obj = await getMatchingRulesObject(rules, child, recursive, false)
      result.children.push(obj)
    }

    return result
  }

  /**
   * @param {String} token
   * @return {Boolean}
   */
  function isCombinator (token) {
    return /[+~>]/.test(token)
  }

  /**
   * @param {Array<CSSRule>} rules
   * @param {DOMElement} element
   * @return {Array<String>}
   */
  function getMatchingRules (rules, element, isRoot) {
    return rules.reduce((acc, rule) => {
      let foundMatch = false
      const parts = rule.selectorText.split(/\s*,\s*/)
      const selector = parts.map(selectorPart => {
        const processed = isMatch(element, selectorPart, isRoot)
        if (processed) {
          foundMatch = true
          return processed
        }

        return [selectorPart, '']
      })

      if (foundMatch) {
        acc.push({ selector, rule })
      }

      return acc
    }, [])
  }

  /**
   * @param {DOMElement} element
   * @param {String} selector
   * @param {Boolean} isRoot
   * @return {Array<String>}
   */
  function isMatch (element, selector, isRoot) {
    const parts = selector.trim().split(/\s+/) // split on whitespace
    if (matches(element, selector)) {
      return ['', parts.join(' ')]
    }

    let curr = 0
    let limit = parts.length
    if (isRoot) {
      const i = findLastIndex(parts, s => isCombinator(s))
      if (i !== -1) curr = i + 1
    } else {
      const i = findIndex(parts, s => isCombinator(s))
      if (i !== -1) limit = i
    }

    let sel = parts.slice(curr, limit).join(' ')
    while (curr < limit) {
      if (matches(element, sel)) {
        const unmatched = parts.slice(0, curr).join(' ')
        const matched = parts.slice(curr).join(' ')
        return [unmatched, matched]
      }

      sel = sel.replace(`${parts[curr++]} `, '')
    }
  }

  /**
   * @param {Array} array
   * @param {Function} fn
   * @return {Integer}
   */
  function findLastIndex (array, fn) {
    for (let i = array.length - 1; i >= 0; i--) {
      if (fn(array[i])) return i
    }

    return -1
  }

  /**
   * @param {Array} array
   * @param {Function} fn
   * @return {Integer}
   */
  function findIndex (array, fn) {
    for (let i = 0; i < array.length; i++) {
      if (fn(array[i])) return i
    }

    return -1
  }
}

/**
 * @param {Browser} browser
 * @param {String} html
 * @param {Array<Object>} styles
 * @return {Page}d
 */
async function createPage (browser, html, styles) {
  const page = await browser.newPage()
  await page.addScriptTag({
    content: `window.CSS_RULE_TYPES = ${JSON.stringify(CSS_RULE_TYPES)};`
  })

  await page.setContent(html)
  for (let i = 0; i < styles.length; i++) {
    await page.addStyleTag(styles[i])
  }

  await page.exposeFunction('generateHash', generateHash)
  // await page.on('console', msg => console.log(msg.text()))
  return page
}

/**
 * @param {String} html
 * @param {Array<Object>} styles
 * @param {Object} options
 * @return {Promise<Array>}
 */
function getMatchingSelectors (html, styles, options) {
  return puppeteer.launch().then(async browser => {
    const page = await createPage(browser, html, styles)
    const matchingSelectors = await page.evaluate(
      findMatchingSelectors,
      options.recursive
    )

    browser.close()
    return matchingSelectors
  })
}

module.exports = {
  getMatchingSelectors
}
