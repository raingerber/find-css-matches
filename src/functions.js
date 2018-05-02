/**
 * @param {Function} matches
 * @param {Array<CSSRule>} rules
 * @param {DOMElement} element
 * @param {Object} options
 * @param {Boolean} isRoot
 * @return {Object}
 */
function findRulesForElement (matches, rules, element, options, isRoot) {
  const result = {
    matches: rules.reduce((acc, rule) => {
      let hasMatch = false
      const selector = rule.selectorText.split(/\s*,\s*/).map(part => {
        let segmented
        if (options.findPartialMatches) {
          segmented = findMatchingPartOfSelector(matches, element, part, isRoot)
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
        acc.push(formatRule(selector, rule, options))
      }

      return acc
    }, [])
  }

  if (options.recursive === true) {
    result.children = Array.prototype.map.call(element.children, child => {
      return findRulesForElement(matches, rules, child, options, false)
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
function findMatchingPartOfSelector (matches, element, selector, isRoot) {
  const parts = selector.split(/\s+/)
  for (let i = 0; i < parts.length; i++) {
    if (!isRoot && /[+~>]/.test(parts[i])) {
      break
    }

    const _selector = parts.slice(i).join(' ')
    if (matches(element, _selector)) {
      return [parts.slice(0, i).join(' '), _selector]
    }
  }

  return [parts.join(' '), '']
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
  formatRule
}
