/* eslint-disable no-multi-spaces */

/**
 * @param {StyleSheetList} sheets
 * @return {Array<CSSRule>}
 */
function getCssRules (sheets) {
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
        } else if (matches(element, part)) {
          parsed = ['', part]
        } else {
          parsed = [part, '']
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
 * returns an array that contains 2 strings: [<unmatched>, <matched>]
 * joining the two strings with a space will produce the original selector
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
  // TODO this might only work/be necessary when
  // the element is a child of the <body> tag
  // in any case, add an explanation for this logic
  // let i = -1
  let i = 0
  if (depth === 0) {
    i = parts.length - 1
    for (; i > -1; i--) {
      if (parts[i] === '>') {
        break
      }
    }

    i = i === -1 ? 0 : i + 1
  }

  for (let part = parts[i]; part; part = parts[++i]) {
    const unmatched = parts.slice(0, i).join(' ')
    if (/[>+~]/.test(part)) {
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
  if (elementDepth < 1) {
    return false
  }

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
  } else if (combinator === '+' || combinator === '~') {
    let el = element
    while ((el = el.previousElementSibling)) {
      elements.unshift(el)
      if (combinator === '+') {
        break
      }
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
  findMatchingPartOfSelector,
  combinatorPreventsMatch,
  getElementsUsingCombinator,
  formatRule
}
