import chalk from 'chalk'

// TODO remove hash (also remove it from package.json)

/**
 * @param {Object} param
 * @param {Array} param.selectors
 * @param {Array} param.children
 * @param {String} indent
 * @return {String}
 */
function stringify ({selectors, children}, indent = '') {
  let result = selectors.map(({mediaText, selector, hash}) => {
    return `${indent}\n${formatSelector(mediaText, selector, hash, indent)}`
  }).join('\n')

  result += children.map(child => {
    return `\n\n${stringify(child, `${indent}  `)}`
  }).join('')

  return result
}

/**
 *
 * @param {String} mediaText
 * @param {Array<Object>} selectors
 * @param {String} hash
 * @param {String} indent
 * @return {String}
 */
function formatSelector (mediaText, selectors, hash, indent) {
  const selector = selectors.map(([unmatched, matched]) => {
    let result = chalk.yellow(unmatched)
    if (unmatched && matched) result += ' '
    result += chalk.green.underline(matched)
    return result
  }).join(', ')

  return `${indent}${mediaText ? `${chalk.yellow(mediaText)}\n${indent}` : ''}${selector} ${chalk.dim(hash)}`
}

export {
  stringify
}
