/**
 * this needs to be called outside puppeteer,
 * because it uses the formatSelector function,
 * but functions can't be passed to page.evaluate
 * @param {Object} param0
 * @param {Array} param0.matches
 * @param {Array} param0.children
 * @param {Object} options
 * @param {Function} options.formatSelector
 * @return {Object}
 */
function stringifySelectors ({matches, children}, options) {
  const result = {
    matches: matches.map(match => {
      return {
        ...match,
        selector: match.selector.map(part => {
          return options.formatSelector(...part).join(' ').trim()
        }).join(', ')
      }
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
