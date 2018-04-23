// TODO what about this case .a>.b -- do we need to account for combinators without spaces around them? or does chrome format them with spaces?

/**
 * @param {Function} matches
 * @param {Array<CSSRule>} allRules
 * @param {DOMElement} element
 * @param {Boolean} isRoot
 * @return {Object}
 */
function findMatchingRules (matches, allRules, element, options, isRoot) {
  const selectors = allRules.reduce((acc, rule) => {
    let hasMatch = false
    const selectors = rule.selectorText.trim().split(/\s*,\s*/)
    const segments = selectors.map(selector => {
      const segmented = findMatchingSegment(matches, element, selector, isRoot)
      if (segmented[1]) {
        hasMatch = true
      }

      return segmented
    })

    if (hasMatch) {
      acc.push(formatRule(segments, rule, options))
    }

    return acc
  }, [])

  if (options.recursive !== true) {
    return {selectors}
  }

  const children = Array.prototype.map.call(element.children, child => {
    return findMatchingRules(matches, allRules, child, options, false)
  })

  return {selectors, children}
}

/**
 * @param {Function} matches
 * @param {DOMElement} element
 * @param {String} selector
 * @param {Boolean} isRoot
 * @return {Array<String>}
 */
function findMatchingSegment (matches, element, selector, isRoot) {
  const parts = selector.split(/\s+/)
  let i = isRoot ? parts.length - 1 : 0
  while (i < parts.length && !/[+~>]/.test(parts[i])) {
    const segment = parts.slice(i).join(' ')
    if (matches(element, segment)) {
      return [parts.slice(0, i).join(' '), segment]
    }

    i++
  }

  return [parts.join(' '), '']
}

/**
 * @param {String} selector
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
    ruleObj.cssText = rule.cssText // TODO not cssText, but the actual style rules should be returned
  }

  return ruleObj
}

export {
  findMatchingRules,
  findMatchingSegment,
  formatRule
}
