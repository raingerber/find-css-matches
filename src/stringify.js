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

      return result
    })
  }

  if (children) {
    result.children = children.map(child => stringifySelectors(child, options))
  }

  return result
}

export {
  stringifySelectors
}
