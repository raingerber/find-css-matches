import {getMatchingSelectors} from './src/css-parser'

const identity = input => input

function parseOptions ({
  recursive = false,
  delimeter = '|||',
  raw = false
}) {
  if (typeof delimeter === 'object') {
    const {matched = identity, unmatched = identity} = delimeter
    delimeter = {matched, unmatched}
  }

  return {recursive, delimeter, raw}
}

// function getMatchingSelectors (styles, html, rawOptions = {}) {
//   const options = parseOptions(rawOptions)
// }

export {getMatchingSelectors}

/* TODO
1. exclude /dist from linting
2. add unit tests
3. add options.delimeter features (+ documentation)
4. get <body> and <html> tags working
5. document how the order is determined
6. if the same selector is used multiple times, how is that handled?
7. option for if you want to generate a hash
   could also return all the computed styles
8. add a note that the html needs to have a single root element
9. warn the it uses async / await
*/
