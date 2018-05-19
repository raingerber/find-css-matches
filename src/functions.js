/*
in the build, these functions are moved into the body of findMatchingRules,
which is necessary because that function is executed with page.evaluate;
however, the functions are defined here so that we can unit test them
*/

import * as modules from './modules'

// placeholder for unit testing
const window = {modules}

/**
 * @param {String} input
 * @returns {Boolean}
 */
function isCombinator (input) {
  return input === '>' || input === '+' || input === '~' || input === ' '
}

/**
 * @param {String} selector
 * @param {String} type
 * @param {String} name
 * @returns {Boolean}
 */
function selectorIncludesToken (selector, type, name) {
  const [{nodes}] = window.modules.tokenizer.parse(selector).nodes
  return nodes.some(node => node.type === type && node.name === name)
}

/**
 * @param {String} selector
 * @returns {Boolean}
 */
function isHtmlSelector (selector) {
  return selectorIncludesToken(selector, 'element', 'html')
}

/**
 * @param {String} selector
 * @returns {Boolean}
 */
function isBodySelector (selector) {
  return selectorIncludesToken(selector, 'element', 'body')
}

/**
 * @param {String} selector
 * @param {String} id
 * @returns {Boolean}
 */
function selectorHasId (selector, id) {
  return selectorIncludesToken(selector, 'id', id)
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
    const selector = parseSelectorText(matches, rule.selectorText, element, options, depth)
    selector && acc.push(formatRule(rule, selector, options))
    return acc
  }, [])

  if (options.recursive === true) {
    const depthOfChildren = depth + 1
    result.children = Array.prototype.reduce.call(element.children, (acc, child) => {
      if (!child.classList.contains('_____FIND_CSS_MATCHES_TAG_____')) {
        acc.push(findRulesForElement(matches, rules, child, options, depthOfChildren))
      }

      return acc
    }, [])
  }

  return result
}

/**
 * @param {Function} matches
 * @param {String} selectorText
 * @param {DOMElement} element
 * @param {Object} options
 * @param {Number} depth
 * @returns {Number}
 */
function parseSelectorText (matches, selectorText, element, options, depth) {
  let hasMatch = false

  // '.a, .b > .c' => ['.a', '.b > .c']
  const parts = selectorText.split(/\s*,\s*/)
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
  if (isFullMatchable(parts, options) && matches(element, selector)) {
    result = [[], parts]
  } else if (options.includePartialMatches && isMatchable(parts)) {
    const index = findMatchIndex(matches, element, depth, parts, parts.length - 1, options)
    const unmatched = parts.slice(0, index)
    const matched = parts.slice(index)
    result = [unmatched, matched]
  }

  if (result) {
    return selectorArrayToString(result)
  }

  return [selector, '']
}

/**
 * when the <body> is not included
 * in the user-provided HTML, we don't
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
 * @param {Object} options
 * @returns {Number}
 */
function findMatchIndex (matches, element, elementDepth, parts, index, options) {
  if (index < 0) {
    return 0
  }

  const part = parts[index]

  const NO_MATCH = parts.length

  let combinator
  if (isCombinator(part)) {
    combinator = part
  } else if (matches(element, part)) {
    return findMatchIndex(matches, element, elementDepth, parts, index - 1, options)
  } else if (parts[index + 1] === ' ') {
    return validateIndex(element, parts, index + 2, options)
  } else {
    return NO_MATCH
  }

  // for root elements, we don't know the
  // parent, so this will be a partial match
  if (combinator === '>' && elementDepth <= 0) {
    return validateIndex(element, parts, index + 1, options)
  }

  const {elements, depth} = combinatorQuery(element, combinator, elementDepth)

  if (elements.length === 0) {
    if (elementDepth > 0 && combinator !== ' ') {
      return NO_MATCH
    } else {
      return validateIndex(element, parts, index + 1, options)
    }
  }

  const indices = elements.map((element, i) => {
    // TODO make combinatorQuery a generator;
    // it could return {element, depth}, which
    // would remove this hacky line, and allow
    // for lazy evaluation instead of getting
    // all the elements in a single go
    const _depth = combinator === ' ' ? depth - i : depth
    return findMatchIndex(matches, element, _depth, parts, index - 1, options)
  })

  return Math.min(...indices)
}

/**
 * @param {DOMElement} element
 * @param {Array<String>} parts
 * @param {Number} index
 * @param {Object} options
 * @returns {Number}
 */
function validateIndex (element, parts, index, options) {
  const unmatched = parts.slice(0, index)
  if (options.tagName === 'html' && unmatched.length) {
    return parts.length
  } else if (options.tagName === 'body') {
    // the unmatched part before the <body> element can only
    // have an <html> selector followed by an optional combinator
    if (unmatched.length > 2 || !isHtmlSelector(unmatched[0])) {
      return parts.length
    }
  }

  // defined ids should not be included
  // in the unmatched parts of selectors
  const hasUnusedIdFromList = (options.ids || []).some(id => {
    return unmatched.some(selector => selectorHasId(selector, id))
  })

  if (hasUnusedIdFromList) {
    return parts.length
  }

  return index
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

/**
 * @param {NodeList} nodes
 * @param {Array} result
 * @returns {Array}
 */
function getIds (nodes, result = []) {
  for (const node of nodes) {
    node.id && result.push(node.id)
    getIds(node.children, result)
  }

  return result
}

export {
  isCombinator,
  selectorIncludesToken,
  isHtmlSelector,
  isBodySelector,
  selectorHasId,
  stringifyElement,
  getCssRules,
  findRulesForElement,
  parseSelectorText,
  splitPartOfSelector,
  isFullMatchable,
  isMatchable,
  selectorStringToArray,
  selectorArrayToString,
  findMatchIndex,
  validateIndex,
  combinatorQuery,
  cssTextToArray,
  getMediaText,
  formatRule,
  getIds
}
