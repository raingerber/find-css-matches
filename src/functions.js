/*
in the build, these functions are moved into the body of findMatchingRules,
which is necessary because that function is executed with page.evaluate;
however, the functions are defined here so that we can unit test them
*/

/**
 * @param {StyleSheetList|Array<CSSRule>} styles
 * @returns {Array<CSSRule>}
 */
function getCssRules (styles) {
  // https://developer.mozilla.org/en-US/docs/Web/API/CSSRule
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

  const rules = []
  for (const {cssRules} of styles) {
    for (const rule of cssRules) {
      switch (CSS_RULE_TYPES[rule.type]) {
        case 'STYLE_RULE':
          rules.push(rule)
          break
        case 'MEDIA_RULE':
          rules.push(...getCssRules([rule]))
          break
      }
    }
  }

  return rules
}

/**
 * @param {DOMElement} element
 * @returns {String}
 */
function stringifyElement (element) {
  const match = element.outerHTML.match(/[^>]*>/)
  return match ? match[0] : ''
}

/**
 * @param {Function} matches
 * @param {Array<CSSRule>} rules
 * @param {DOMElement} element
 * @param {Object} options
 * @param {Number} depth
 * @returns {Object}
 */
function findRulesForElement (matches, rules, element, options, depth) {
  const result = {
    matches: rules.reduce((acc, rule) => {
      const selector = parseRuleForElement(matches, rule, element, options, depth)
      selector && acc.push(formatRule(selector, rule, options))
      return acc
    }, [])
  }

  if (options.includeHtml === true) {
    result.html = stringifyElement(element)
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
 * @param {CSSRule} rule
 * @param {DOMElement} element
 * @param {Object} options
 * @param {Number} depth
 * @returns {Number}
 */
function parseRuleForElement (matches, rule, element, options, depth) {
  let hasMatch = false
  // 'div, div > div' => ['div', 'div > div']
  const parts = rule.selectorText.split(/\s*,\s*/)
  const result = parts.map(part => {
    let split
    if (matches(element, part)) {
      split = ['', part]
    } else if (options.includePartialMatches) {
      split = findPartialMatch(matches, element, part, depth)
    } else {
      split = [part, '']
    }

    if (split[1]) {
      hasMatch = true
    }

    return split
  })

  if (hasMatch) {
    return result
  }

  return null
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
 * @returns {Array<String>}
 */
function findPartialMatch (matches, element, selector, depth) {
  // ['.a > .b'] => ['.a', '>', '.b']
  const parts = selector.split(/\s+/)
  const index = findMatchIndex(matches, element, depth, parts)
  const unmatched = parts.slice(0, index).join(' ')
  const matched = parts.slice(index).join(' ')
  return [unmatched, matched]
}

/**
 * @param {Function} matches
 * @param {DOMElement} element
 * @param {Number} elementDepth
 * @param {Array<String>} parts
 * @returns {Number}
 */
function findMatchIndex (matches, element, elementDepth, parts) {
  const lastIndex = parts.length - 1
  if (!matches(element, parts[lastIndex])) {
    return parts.length
  }

  const index = lastIndex - 1
  const part = parts[index]
  if (part === '>' || part === '+' || part === '~') {
    if (elementDepth === 0 && part === '>') {
      return lastIndex
    }

    const {elements, depth} = combinatorQuery(element, part, elementDepth)
    if (elements.length === 0) {
      if (elementDepth) {
        return parts.length
      } else {
        return lastIndex
      }
    }

    const subParts = parts.slice(0, index)
    const indices = elements.map(element => {
      return findMatchIndex(matches, element, depth, subParts)
    })

    const subIndex = Math.min(...indices)
    if (subIndex === subParts.length) {
      return parts.length
    }

    return subIndex
  }

  return lastIndex
}

/**
 * @param {DOMElement} element
 * @param {String} combinator
 * @param {Number} depth
 * @returns {Object}
 */
function combinatorQuery (element, combinator, depth) {
  const elements = []
  let depthOfElements = depth
  if (combinator === '>') {
    if (element.parentElement) {
      elements.push(element.parentElement)
    }
    depthOfElements--
  } else if (combinator === '+') {
    if (element.previousElementSibling) {
      elements.push(element.previousElementSibling)
    }
  } else if (combinator === '~') {
    let el = element
    while ((el = el.previousElementSibling)) {
      elements.unshift(el)
    }
  }

  return {elements, depth: depthOfElements}
}

/**
 * @param {String} cssText
 * @returns {Array<String>}
 */
function cssTextToArray (cssText) {
  const match = cssText.match(/{([^}]*)}/)
  const text = match ? match[1].trim() : ''
  return text.split(/;\s*/).reduce((acc, str) => {
    str && acc.push(`${str}`)
    return acc
  }, [])
}

/**
 * @param {CSSRule} rule
 * @returns {String}
 */
function getMediaText (rule) {
  let media = ''
  let current = rule
  while ((current = current.parentRule) && current.media) {
    if (media) {
      media = `${current.media.mediaText} AND ${media}`
    } else {
      media = current.media.mediaText
    }
  }

  return media
}

/**
 * @param {Array<Array<String>>} selector
 * @param {CSSRule} rule
 * @param {Object} options
 * @returns {Object}
 */
function formatRule (selector, rule, options) {
  const ruleObj = {selector}
  const media = getMediaText(rule)
  if (media) {
    ruleObj.media = media
  }

  if (options.includeCss === true) {
    ruleObj.css = cssTextToArray(rule.cssText)
  }

  if (options.includePartialMatches) {
    ruleObj.isPartialMatch = selector.every(([unmatched]) => unmatched)
  }

  return ruleObj
}

export {
  getCssRules,
  stringifyElement,
  findRulesForElement,
  parseRuleForElement,
  findPartialMatch,
  findMatchIndex,
  combinatorQuery,
  cssTextToArray,
  getMediaText,
  formatRule
}
