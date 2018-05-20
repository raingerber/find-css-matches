import * as functions from './modules'

// placeholder for unit testing
const window = {modules: functions}

/**
 * @param {String} input
 * @returns {Boolean}
 */
function isCombinator (input) {
  return input === '>' || input === '+' || input === '~' || input === ' '
}

// Example parseCssRules return value
//
// {
//   selector: 'div + div',
//   nodes: [
//     {
//       selector: 'div',
//       combinator: '+',
//       tokens: [
//         {
//           type: 'element',
//           name: 'div'
//         }
//       ]
//     },
//     {
//       selector: 'div',
//       combinator: null,
//       tokens: [
//         {
//           type: 'element',
//           name: 'div'
//         }
//       ]
//     }
//   ]
// }

/**
 * @param {Array<CSSRule>} rules
 * @returns {Array<Object>}
 */
function parseCssRules (rules) {
  return rules.map(rule => {
    const selectors = rule.selectorText.split(/\s*,\s*/).map(selector => {
      const nodes = selectorStringToArray(selector).map(node => {
        const parsed = window.modules.tokenizer.parse(node.selector)
        node.tokens = parsed.nodes[0].nodes
        return node
      })

      return {selector, nodes}
    })

    return {rule, selectors}
  })
}

/**
 * @param {String} selector
 * @returns {Array<String>}
 */
function selectorStringToArray (selector) {
  let match
  const tokens = []
  const REGEX = /\s[>+~]\s|\s+|[^\s]+/g
  while ((match = REGEX.exec(selector))) {
    const token = match[0].trim() || match[0]
    if (isCombinator(token)) {
      tokens[tokens.length - 1].combinator = token
    } else {
      tokens.push({
        selector: token,
        combinator: null
      })
    }
  }

  return tokens
}

/**
 * @param {Array<Array<String>>} selector
 * @returns {Array<String>}
 */
function selectorArrayToString (selector) {
  return selector.map(tokens => {
    return tokens.reduce((acc, {selector, combinator}) => {
      return `${acc} ${selector} ${combinator || ''}`.trim()
    }, '').trim()
  })
}

export {
  isCombinator,
  parseCssRules,
  selectorStringToArray,
  selectorArrayToString
}
