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
  for (let i = 0, part = parts[i]; part; part = parts[++i]) {
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

  return {depth: depthOfElements, elements}
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
  findRulesForElement,
  findMatchingPartOfSelector,
  combinatorPreventsMatch,
  getElementsUsingCombinator,
  formatRule
}
