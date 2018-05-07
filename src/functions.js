
/**
 * @param {StyleSheetList} sheets
 * @return {Array<CSSRule>}
 */
function getCssRules (sheets) {
  const CSS_RULE_TYPES = [
    /* eslint-disable no-multi-spaces */
    'UNKNOWN_RULE',              // 0
    'STYLE_RULE',                // 1
    'CHARSET_RULE',              // 2
    'IMPORT_RULE',               // 3
    'MEDIA_RULE',                // 4
    'FONT_FACE_RULE',            // 5
    'PAGE_RULE',                 // 6
    'KEYFRAMES_RULE',            // 7
    'KEYFRAME_RULE',             // 8
    null,                        // 9
    'NAMESPACE_RULE',            // 10
    'COUNTER_STYLE_RULE',        // 11
    'SUPPORTS_RULE',             // 12
    'DOCUMENT_RULE',             // 13
    'FONT_FEATURE_VALUES_RULE',  // 14
    'VIEWPORT_RULE',             // 15
    'REGION_STYLE_RULE'          // 16
    /* eslint-enable no-multi-spaces */
  ]

  let rules = []
  for (let {cssRules} of sheets) {
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

  return rules
}

/**
 * @param {Function} matches
 * @param {Array<CSSRule>} rules
 * @param {DOMElement} element
 * @param {Object} options
 * @param {Number} depth
 * @return {Object}
 */
function findRulesForElement (matches, rules, element, options, depth) {
  const result = {
    matches: rules.reduce((acc, rule) => {
      let hasMatch = false
      const selector = rule.selectorText.split(/\s*,\s*/).map(part => {
        let parsed
        if (options.findPartialMatches) {
          parsed = findMatchingPartOfSelector(matches, element, part, depth)
        } else {
          parsed = testIfSelectorIsMatch(matches, element, part)
        }

        if (parsed[1]) {
          hasMatch = true
        }

        return parsed
      })

      if (hasMatch) {
        acc.push(formatRule(selector, rule, options))
      }

      return acc
    }, [])
  }

  if (options.recursive === true) {
    const depthOfChildren = depth + 1
    result.children = Array.prototype.map.call(element.children, child => {
      return findRulesForElement(matches, rules, child, options, depthOfChildren)
    })
  }

  return result
}

/**
 * @param {Function} matches
 * @param {DOMElement} element
 * @param {String} selector
 * @return {Array<String>}
 */
function testIfSelectorIsMatch (matches, element, selector) {
  if (matches(element, selector)) {
    return ['', selector]
  }

  return [selector, '']
}

/**
 * returns an array that contains 2 strings: [<unmatched>, <matched>]
 * joining the two strings with a space produces the original selector
 * if the <matched> string is empty, there was NO MATCH found
 * if neither string is empty, it was a partial match
 * @param {Function} matches
 * @param {DOMElement} element
 * @param {String} selector
 * @param {Number} depth
 * @return {Array<String>}
 */
function findMatchingPartOfSelector (matches, element, selector, depth) {
  const parts = selector.split(/\s+/)

  for (let i = 0, part = parts[i]; part; part = parts[++i]) {
    // TODO instead of body, it needs to be a regex that makes sure
    // it's a tagName (i.e. it should be preceded by whitespace, or a combinator)
    // are there cases where body could come inside parentheses though?
    // if (parts[i + 1] === '>' && parts[i].includes('body')) {
    //   continue
    // }

    const unmatched = parts.slice(0, i).join(' ')
    if (/[>+~]/.test(part)) {
      // the problem when depth > 0 is that part of the selector might still
      // extend above the root
      // explain this is for div > div > div matching the child in <div><div></div></div>
      if (combinatorPreventsMatch(matches, element, unmatched, part, depth)) {
        break
      }

      continue
    }

    const matched = parts.slice(i).join(' ')
    if (matches(element, matched)) {
      return [unmatched, matched]
    }
  }

  return [selector, '']
}

/**
 * @param {Function} matches
 * @param {DOMElement} element
 * @param {String} selector
 * @param {String} combinator
 * @param {Number} _depth
 * @return {Boolean}
 */
function combinatorPreventsMatch (matches, element, selector, combinator, elementDepth) {
  // return early for the root element of the user-provided html
  if (elementDepth < 1) {
    return false
  }

  // this check only happens for child nodes, because we already know their
  // parents and siblings (which are considered unknown for root elements)
  const {elements, depth} = getElementsUsingCombinator(element, combinator, elementDepth)
  return !elements.some(node => {
    return findMatchingPartOfSelector(matches, node, selector, depth)[1]
  })
}

/**
 * @param {DOMElement} element
 * @param {String} combinator
 * @param {Number} depth
 * @return {Object}
 */
function getElementsUsingCombinator (element, combinator, depth) {
  const elements = []
  let depthOfElements = depth
  if (combinator === '>') {
    elements.push(element.parentNode)
    depthOfElements--
  } else if (combinator === '+') {
    elements.push(element.previousElementSibling)
  } else if (combinator === '~') {
    let el = element
    while ((el = el.previousElementSibling)) {
      elements.unshift(el)
    }
  }

  return {elements, depth: depthOfElements}
}

/**
 * @param {Array<Array<String>>} selector
 * @param {CSSRule} rule
 * @param {Object} options
 * @return {Object}
 */
function formatRule (selector, rule, options) {
  const ruleObj = {selector}
  if (rule.parentRule && rule.parentRule.media) {
    ruleObj.mediaText = rule.parentRule.media.mediaText
  }

  if (options.cssText === true) {
    ruleObj.cssText = rule.cssText
  }

  if (options.findPartialMatches) {
    ruleObj.isPartialMatch = selector.every(([unmatched]) => unmatched)
  }

  return ruleObj
}

export {
  getCssRules,
  findRulesForElement,
  testIfSelectorIsMatch,
  findMatchingPartOfSelector,
  combinatorPreventsMatch,
  getElementsUsingCombinator,
  formatRule
}
