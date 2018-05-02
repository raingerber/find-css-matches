/**
 * this needs to be called outside of puppeteer,
 * because it uses options.formatSelector but,
 * functions can't be passed to page.evaluate
 * @param {Object} param0
 * @param {Array} param0.matches
 * @param {Array} param0.children
 * @param {Object} options
 * @param {Function} options.format
 * @return {Object}
 */
function stringify ({matches, children}, options) {
  const result = {
    matches: matches.map(match => {
      return {
        ...match,
        selector: match.selector.map(([unmatched, matched]) => {
          return options.formatSelector(unmatched, matched).join(' ').trim()
        }).join(', ')
      }
    })
  }

  if (children) {
    result.children = children.map(child => stringify(child, options))
  }

  return result
}

export {
  stringify
}
