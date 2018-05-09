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
 * this needs to be called outside puppeteer,
 * because it uses the formatSelector function,
 * but functions can't be passed to page.evaluate
 * @param {Object} param0
 * @param {Array} param0.matches
 * @param {Array} param0.children
 * @param {Object} options
 * @param {Function} options.formatSelector
 * @returns {Object}
 */
function stringifySelectors ({matches, children}, options) {
  const result = {
    matches: matches.map(match => {
      const result = {
        ...match,
        selector: match.selector.map(part => {
          const [unmatched, matched] = options.formatSelector(...part)
          return `${unmatched} ${matched}`.trim().replace(/\s+/g, ' ')
        }).join(', ')
      }

      if (result.css) {
        result.css = cssTextToArray(result.css)
      }

      return result
    })
  }

  if (children) {
    result.children = children.map(child => stringifySelectors(child, options))
  }

  return result
}

export {
  cssTextToArray,
  stringifySelectors
}
