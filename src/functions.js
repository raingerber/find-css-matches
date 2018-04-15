// TODO what about this case .a>.b -- do we need to account for combinators without spaces around them? or does chrome format them with spaces?

/**
 * @param {Function} matches
 * @param {Array<CSSRule>} rules
 * @param {DOMElement} element
 * @param {Object} options
 * @param {Boolean} isRoot
 * @return {Object}
 */
function getMatchingRules (matches, rules, element, options, isRoot) {
  const result = {}
  const matchingRules = getRulesForElement(matches, rules, element, isRoot)
  result.selectors = matchingRules.map(({selector, rule}) => {
    const ruleObj = {selector}
    if (rule.parentRule && rule.parentRule.media) {
      ruleObj.mediaText = rule.parentRule.media.mediaText
    }

    if (options.cssText === true) {
      ruleObj.cssText = rule.cssText
    }

    return ruleObj
  })

  if (options.recursive !== true) {
    return result
  }

  // TODO children or childNodes?
  result.children = Array.prototype.map.call(element.children, child => {
    return getMatchingRules(matches, rules, child, options, false)
  })

  return result
}

/**
 * @param {Function} matches
 * @param {Array<CSSRule>} rules
 * @param {DOMElement} element
 * @param {Boolean} isRoot
 * @return {Array<String>}
 */
function getRulesForElement (matches, rules, element, isRoot) {
  return rules.reduce((acc, rule) => {
    let foundMatch = false
    const parts = rule.selectorText.split(/\s*,\s*/)
    const selector = parts.map(segment => {
      const segmented = findMatchingSegment(matches, element, segment, isRoot)
      if (segmented[1]) {
        foundMatch = true
      }

      return segmented
    })

    if (foundMatch) {
      acc.push({selector, rule})
    }

    return acc
  }, [])
}

/**
 * @param {Function} matches
 * @param {DOMElement} element
 * @param {String} selector
 * @param {Boolean} isRoot
 * @return {Array<String>}
 */
function findMatchingSegment (matches, element, selector, isRoot) {
  const parts = selector.trim().split(/\s+/) // split on whitespace
  for (let i = 0; i < parts.length; i++) {
    if (/[+~>]/.test(parts[i])) {
      if (isRoot) {
        continue
      } else {
        break
      }
    }

    const segment = parts.slice(i).join(' ')
    if (matches(element, segment)) {
      return [parts.slice(0, i).join(' '), segment]
    }
  }

  return [selector, '']
}

export {
  getMatchingRules,
  getRulesForElement,
  findMatchingSegment
}
