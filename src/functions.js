/*
in the build, these functions are moved into the body of findMatchingRules,
which is necessary because that function is executed with page.evaluate;
however, the functions are defined here so that we can unit test them
*/

/**
 * @param {String} input
 * @returns {Boolean}
 */
function isCombinator (input) {
  return input === '>' || input === '+' || input === '~' || input === ' '
}

/**
 * @param {String} selector
 * @returns {Boolean}
 */
function isHtmlSelector (selector) {
  return /^html(?:$|[^a-z-])/i.test(selector)
}

/**
 * @param {String} selector
 * @returns {Boolean}
 */
function isBodySelector (selector) {
  return /^body(?:$|[^a-z-])/i.test(selector)
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
 * @param {Function} matches
 * @param {Array<CSSRule>} rules
 * @param {DOMElement} element
 * @param {Object} options
 * @param {Number} depth
 * @returns {Object}
 */
function findRulesForElement (matches, rules, element, options, depth) {
  const result = {}
  if (options.includeHtml === true) {
    result.html = stringifyElement(element)
  }

  result.matches = rules.reduce((acc, rule) => {
    const selector = parseRuleForElement(matches, rule, element, options, depth)
    selector && acc.push(formatRule(rule, selector, options))
    return acc
  }, [])

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

  // '.a, .b > .c' => ['.a', '.b > .c']
  const parts = rule.selectorText.split(/\s*,\s*/)
  const result = parts.map(part => {
    const selector = splitPartOfSelector(matches, element, part, depth, options)
    if (options.includePartialMatches) {
      if (selector[1]) {
        hasMatch = true
      }
    } else if (!selector[0]) {
      hasMatch = true
    }

    return selector
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
 * @param {Object} options
 * @returns {Array<String>}
 */
function splitPartOfSelector (matches, element, selector, depth, options) {
  let result
  const parts = selectorStringToArray(selector)

  if (isMatchable(parts)) {
    if (isFullMatchable(parts, options) && matches(element, selector)) {
      result = [[], parts]
    } else if (options.includePartialMatches) {
      const lastIndex = parts.length - 1
      const index = findMatchIndex(matches, element, depth, parts, lastIndex)
      const unmatched = parts.slice(0, index)
      const matched = parts.slice(index)
      result = [unmatched, matched]

      // if the <body> element was included in the user's html,
      // the unmatched part can only contain a selector for the
      // <html> element followed by an optional combinator
      if (options.tagName === 'body') {
        if (unmatched.length > 2 || !isHtmlSelector(unmatched[0])) {
          result = null
        }
      }
    }
  }

  if (result) {
    return selectorArrayToString(result)
  }

  return [selector, '']
}

/**
 * some basic selector validation
 * <html> tags - no ancestors or siblings
 * <body> tags - no siblings
 * @param {Array<String>} parts
 * @returns {Boolean}
 */
function isMatchable (parts) {
  if (parts.length === 0) {
    return false
  }

  for (let i = 2; i < parts.length; i += 2) {
    const part = parts[i]
    if (isHtmlSelector(part)) {
      return false
    } else if (isBodySelector(part)) {
      let prevPart = parts[i - 1]
      if (prevPart === '+' || prevPart === '~') {
        return false
      }

      if (prevPart === '>' || prevPart === ' ') {
        if (!isHtmlSelector(parts[i - 2])) {
          return false
        }
      }
    }
  }

  return true
}

/**
 * for partial matches where the <body> was
 * not in the user-provided HTML, we don't
 * allow selectors with "body >" in them,
 * because that makes an assumption about
 * the position of the element in the dom
 * @param {Array<String>} parts
 * @param {Object} options
 * @returns {Boolean}
 */
function isFullMatchable (parts, options) {
  if (parts.length === 0) {
    return false
  }

  if (options.isHtmlOrBodyTag) {
    return true
  }

  const index = parts.findIndex(part => isBodySelector(part))
  return index === -1 || parts[index + 1] === ' '
}

/**
 * @param {String} selector
 * @returns {Array<String>}
 */
function selectorStringToArray (selector) {
  let match
  const parts = []
  const REGEX = /\s[>+~]\s|\s+|[^\s]+/g
  while ((match = REGEX.exec(selector))) {
    parts.push(match[0] === ' ' ? match[0] : match[0].trim())
  }

  return parts
}

/**
 * @param {Array<Array<String>>} selector
 * @returns {Array<String>}
 */
function selectorArrayToString (selector) {
  return selector.map(part => part.filter(p => p !== ' ').join(' '))
}

/**
 * this function is complicated,
 * but moving each bit of logic
 * into separate functions would
 * probably make it more confusing
 * @param {Function} matches
 * @param {DOMElement} element
 * @param {Number} elementDepth
 * @param {Array<String>} parts
 * @param {Number} index - current parts index
 * @returns {Number}
 */
function findMatchIndex (matches, element, elementDepth, parts, index) {
  if (index < 0) {
    return 0
  }

  const part = parts[index]

  const NO_MATCH = parts.length

  let combinator
  if (isCombinator(part)) {
    combinator = part
  } else if (matches(element, part)) {
    if (element.tagName === 'BODY') {
      // if the <body> has already been visited, we can't
      // have a selector for that in the remaining parts
      if (parts.slice(0, index).find(part => isBodySelector(part))) {
        return NO_MATCH
      }
    }

    return findMatchIndex(matches, element, elementDepth, parts, index - 1)
  } else if (parts[index + 1] === ' ') {
    return index + 2
  } else {
    return NO_MATCH
  }

  // for root elements, we don't know the
  // parent, so this will be a partial match
  if (combinator === '>' && elementDepth <= 0) {
    return index + 1
  }

  const {elements, depth} = combinatorQuery(element, combinator, elementDepth)

  if (elements.length === 0) {
    if (elementDepth > 0 && combinator !== ' ') {
      return NO_MATCH
    } else {
      return index + 1
    }
  }

  const indices = elements.map((element, i) => {
    // TODO make combinatorQuery a generator;
    // it could return {element, depth}, which
    // would remove this hacky line, and allow
    // for lazy evaluation instead of getting
    // all the elements in a single go
    const _depth = combinator === ' ' ? depth - i : depth
    return findMatchIndex(matches, element, _depth, parts, index - 1)
  })

  return Math.min(...indices)
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
  } else if (combinator === ' ') {
    let el = element
    while ((el = el.parentElement)) {
      elements.push(el)
    }
    depthOfElements--
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
 * @param {CSSRule} rule
 * @param {Array<Array<String>>} selector
 * @param {Object} options
 * @returns {Object}
 */
function formatRule (rule, selector, options) {
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
  isCombinator,
  isHtmlSelector,
  isBodySelector,
  stringifyElement,
  getCssRules,
  findRulesForElement,
  parseRuleForElement,
  splitPartOfSelector,
  isFullMatchable,
  isMatchable,
  selectorStringToArray,
  selectorArrayToString,
  findMatchIndex,
  combinatorQuery,
  cssTextToArray,
  getMediaText,
  formatRule
}
