import {
  combinatorQuery,
  stringifyElement,
  cssTextToArray,
  getMediaText
} from './dom-utils'

import {
  selectorArrayToString
} from './parser'

/**
 * @param {String} type
 * @param {String} name
 * @param {Object} token
 * @returns {Boolean}
 */
function tokenIsMatch (type, name, token) {
  return token.type === type && token.name === name
}

/**
 * @param {String} type
 * @param {String} name
 * @param {Array<Object>} tokens
 * @returns {Object|undefined}
 */
function findMatchingToken (type, name, tokens) {
  return tokens.find(token => tokenIsMatch(type, name, token))
}

/**
 * @param {Array<Object>} tokens
 * @returns {Object|undefined}
 */
function findHtmlToken (tokens) {
  return findMatchingToken('element', 'html', tokens)
}

/**
 * @param {Array<Object>} tokens
 * @returns {Object|undefined}
 */
function findBodyToken (tokens) {
  return findMatchingToken('element', 'body', tokens)
}

/**
 * @param {Array<Object>} tokens
 * @param {String} id
 * @returns {Object|undefined}
 */
function findIdToken (tokens, id) {
  return findMatchingToken('id', id, tokens)
}

/**
 * @param {Object} node
 * @returns {Boolean}
 */
function isElementOrUniversalNode (node) {
  if (node.tokens.length !== 1) {
    return false
  }

  const {type} = node.tokens[0]
  return type === 'element' || type === 'universal'
}

/**
 * @param {Function} matches
 * @param {Array<Object>} rules
 * @param {DOMElement} element
 * @param {Object} options
 * @param {Number} depth
 * @returns {Object}
 */
function findRulesForElements (matches, rules, element, options, depth) {
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
    result.children = Array.prototype.reduce.call(element.children, (acc, child) => {
      if (!child.classList.contains('_____FIND_CSS_MATCHES_TAG_____')) {
        acc.push(findRulesForElements(matches, rules, child, options, depthOfChildren))
      }

      return acc
    }, [])
  }

  return result
}

/**
 * @param {Function} matches
 * @param {Object} rule
 * @param {DOMElement} element
 * @param {Object} options
 * @param {Number} depth
 * @returns {Array<Array<String>>|null}
 */
function parseRuleForElement (matches, rule, element, options, depth) {
  let hasMatch = false
  const result = rule.selectors.map(selectorNode => {
    const selector = parseSelectorForElement(matches, element, selectorNode, options, depth)
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
 * @param {Object} selectorNode
 * @param {Object} options
 * @param {Number} depth
 * @returns {Array<String>}
 */
function parseSelectorForElement (matches, element, selectorNode, options, depth) {
  const {nodes, selector} = selectorNode
  if (options.includePartialMatches) {
    if (isMatchable(nodes)) {
      const lastIndex = nodes.length - 1
      const index = findMatchIndex(matches, element, depth, selectorNode, lastIndex, options)
      return selectorArrayToString([nodes.slice(0, index), nodes.slice(index)])
    }
  } else if (isFullMatchable(nodes, options)) {
    if (matches(element, selector)) {
      return ['', selector]
    }
  }

  return [selector, '']
}

/**
 * when the <body> is not included
 * in the user-provided HTML, we don't
 * allow selectors with "body >" in them,
 * because that makes an assumption about
 * the position of the element in the dom
 * @param {Array<Object>} nodes
 * @param {Object} options
 * @returns {Boolean}
 */
function isFullMatchable (nodes, options) {
  if (nodes.length === 0) {
    return false
  }

  if (options.isHtmlOrBodyTag) {
    return true
  }

  const node = nodes.find(node => findBodyToken(node.tokens))
  return !node || node.combinator === ' '
}

/**
 * some basic selector validation
 * <html> tags - no ancestors or siblings
 * <body> tags - no siblings
 * @param {Array<Object>} nodes
 * @returns {Boolean}
 */
function isMatchable (nodes) {
  if (nodes.length === 0) {
    return false
  }

  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i]
    if (i && findHtmlToken(node.tokens)) {
      return false
    }

    if (findBodyToken(node.tokens)) {
      if (node.combinator === '+' || node.combinator === '~') {
        return false
      }

      if (i && !findHtmlToken(nodes[i - 1].tokens)) {
        return false
      }
    }
  }

  return true
}

/**
 * @param {Function} matches
 * @param {DOMElement} element
 * @param {Number} elementDepth
 * @param {Object} selectorNode
 * @param {Number} index - current token index
 * @param {Object} options
 * @returns {Number}
 */
function findMatchIndex (matches, element, elementDepth, selectorNode, index, options) {
  if (index < 0) return 0
  const node = selectorNode.nodes[index]
  if (!options.isHtmlOrBodyTag && element.tagName === 'BODY' && node.combinator === '>') {
    return validateMatchIndex(element, selectorNode.nodes, index + 1, options)
  }

  const NO_MATCH = selectorNode.nodes.length
  const isMatch = matches(element, node.selector)
  if (elementDepth < 0 && (!isMatch || !isElementOrUniversalNode(node))) {
    return validateMatchIndex(element, selectorNode.nodes, index + 1, options)
  } else if (isMatch) {
    if (index < 1) {
      return 0
    }
  } else {
    return NO_MATCH
  }

  const {combinator} = selectorNode.nodes[index - 1]
  const {elements, depth} = combinatorQuery(element, combinator, elementDepth)

  if (elements.length === 0) {
    if (elementDepth < 1 || combinator === ' ') {
      return validateMatchIndex(element, selectorNode.nodes, index, options)
    } else {
      return NO_MATCH
    }
  }

  const indices = elements.map((element, i) => {
    const _depth = combinator === ' ' ? depth - i : depth
    return findMatchIndex(matches, element, _depth, selectorNode, index - 1, options)
  })

  return Math.min(...indices)
}

/**
 * validate the unmatched part of a "match"
 * @param {DOMElement} element
 * @param {Array<Object>} nodes
 * @param {Number} index
 * @param {Object} options
 * @returns {Number}
 */
function validateMatchIndex (element, nodes, index, options) {
  if (index === 0) {
    return index
  }

  if (index < 0 || index >= nodes.length) {
    return nodes.length
  }

  // case for when the <body> is matched by a selector
  // that could also match another element (such as *)
  if (options.tagName === 'body') {
    // the unmatched part before the <body> element can only have an <html>
    // selector followed by an optional combinator; this does not account
    // for some weird edge cases like "html.a > head.b + body"
    if (index > 2 || !findHtmlToken(nodes[0].tokens)) {
      return nodes.length
    }
  }

  // defined ids should not be included
  // in the unmatched parts of selectors
  const unmatched = nodes.slice(0, index)
  const hasUnusedIdFromList = (options.ids || []).some(id => {
    return unmatched.some(node => findIdToken(node.tokens, id))
  })

  if (hasUnusedIdFromList) {
    return nodes.length
  }

  return index
}

/**
 * @param {Object} rule
 * @param {Array<Array<String>>} selector
 * @param {Object} options
 * @returns {Object}
 */
function formatRule (rule, selector, options) {
  const result = {selector}
  const media = getMediaText(rule.rule)
  if (media) {
    result.media = media
  }

  if (options.includeCss === true) {
    result.css = cssTextToArray(rule.rule.cssText)
  }

  if (options.includePartialMatches) {
    result.isPartialMatch = selector.every(([unmatched]) => unmatched)
  }

  return result
}

export {
  tokenIsMatch,
  findMatchingToken,
  findHtmlToken,
  findBodyToken,
  findIdToken,
  isElementOrUniversalNode,
  findRulesForElements,
  parseRuleForElement,
  parseSelectorForElement,
  isFullMatchable,
  isMatchable,
  findMatchIndex,
  validateMatchIndex,
  formatRule
}
