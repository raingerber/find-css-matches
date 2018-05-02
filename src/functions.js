/**
 * @param {Function} matches
 * @param {Array<CSSRule>} allRules
 * @param {DOMElement} element
 * @param {Object} options
 * @param {Boolean} isRoot
 * @return {Object}
 */
function findMatchingRules (matches, allRules, element, options, isRoot) {
  const result = {
    matches: allRules.reduce((acc, rule) => {
      let hasMatch = false
      const selectorParts = rule.selectorText.trim().split(/\s*,\s*/)
      const segments = selectorParts.map(part => {
        let segmented
        if (options.findPartialMatches) {
          segmented = findMatchingSegment(matches, element, part, isRoot)
        } else if (matches(element, part)) {
          segmented = ['', part]
        } else {
          segmented = [part, '']
        }

        if (segmented[1]) {
          hasMatch = true
        }

        return segmented
      })

      if (hasMatch) {
        const formatted = formatRule(segments, rule, options)
        acc.push(formatted)
      }

      return acc
    }, [])
  }

  if (options.recursive === true) {
    result.children = Array.prototype.map.call(element.children, child => {
      return findMatchingRules(matches, allRules, child, options, false)
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
    ruleObj.cssText = rule.cssText
  }

  return ruleObj
}

export {
  findMatchingRules,
  findMatchingSegment,
  formatRule
}
