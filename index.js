import {getMatchingSelectors} from './src/css-parser'
import {stringify} from './src/formatter'

// const identity = input => input

const defaultOptions = () => ({
  format: {},
  recursive: false,
  delimeter: '|||',
  cssText: false,
  raw: false
})

function getValue (expectedType, value, defaultValue) {
  return typeof value === expectedType ? value : defaultValue
}

function parseOptions (userOptions) {
  const options = defaultOptions()
  if (typeof userOptions.format === 'object') {
  // options.format.unmatched = getValue('boolean', userOptions.format.unmatched, false)
  // options.format.matched = getValue('boolean', userOptions.format.matched, false)
    if (typeof userOptions.format.unmatched === 'function') {
      options.format.unmatched = userOptions.format.unmatched
    }

    if (typeof userOptions.format.matched === 'function') {
      options.format.matched = userOptions.format.matched
    }
  }

  options.recursive = getValue('boolean', userOptions.recursive, false)
  options.delimeter = getValue('string', userOptions.delimeter, '|||')
  options.cssText = getValue('boolean', userOptions.cssText, false)
  options.raw = getValue('boolean', userOptions.raw, false)

  return options
}

// TODO use await?
function getMatches (styles, html, userOptions = {}) {
  const options = parseOptions(userOptions)
  const matches = getMatchingSelectors(styles, html, options)
  if (options.raw === true) {
    return matches
  }

  return matches.then(result => stringify(result, options, ''))
}

export {getMatches}

/* TODO
2. add unit tests
3. add options.delimeter features (+ documentation)
4. get <body> and <html> tags working (add tests for this)
5. document how the order of selectors is determined in the output
6. if the same selector is used multiple times, how is that handled?
7. cssText option
8. add a note that the html needs to have a single root element
9. warn that it uses async / await
*/
