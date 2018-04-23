import chalk from 'chalk'

/**
 * @param {Array} param1.selectors
 * @param {Array} param1.children
 * @param {Object} options
 * @param {String} indent
 * @return {String}
 */
function stringify ({selectors, children = []}, options, indent = '') {
  // console.log('stringifying')
  let result = selectors.map(({mediaText, selector}) => {
    return `${indent}${formatSelector(mediaText, selector, options, indent)}`
  }).join('\n') || `${indent}...`
  // console.log(`"${result}"`)
  result += children.map((child, index) => {
    return `\n\n${indent}  ${index}\n${stringify(child, options, `${indent}  `)}`
  }).join('')

  // result += children.map(child => {
  //   return `\n\n${stringify(child, options, `${indent}  `)}`
  // }).join('')

  return result
}

/**
 * @param {String} mediaText
 * @param {Array<Object>} selectors
 * @param {Object} options
 * @param {String} indent
 * @return {String}
 */
function formatSelector (mediaText, selectors, options, indent) {
  // TODO have an option for the mediaText
  const unmatched = options.format.unmatched || chalk.yellow
  const matched = options.format.matched || chalk.green.underline

  const parts = selectors.map(item => {
    return `${unmatched(item[0])} ${matched(item[1])}`.trim()
  })

  const selector = parts.join(', ')

  const media = mediaText ? `${chalk.yellow(mediaText)}\n${indent}` : ''

  // return indent + media + selector

  return `${indent}${media}${selector}`
}

export {
  stringify
}
