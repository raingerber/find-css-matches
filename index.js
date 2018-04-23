import {getMatchingSelectors} from './src/css-parser'

function parseOptions (userOptions = {}) {
  let {recursive, cssText} = userOptions
  if (typeof recursive !== 'boolean') recursive = false
  if (typeof cssText !== 'boolean') cssText = false
  return {recursive, cssText}
}

// TODO use await?
function getMatches (styles, html, userOptions) {
  const options = parseOptions(userOptions)
  const matches = getMatchingSelectors(styles, html, options)
  return matches
}

export {getMatches}

/* TODO
2. add unit tests
4. get <body> and <html> tags working (add tests for this)
5. document how the order of selectors is determined in the output
6. if the same selector is used multiple times, how is that handled?
7. cssText option
8. add a note that the html needs to have a single root element
9. warn that it uses async / await
*/
