/**
 * @param {NodeList} nodes
 * @param {Array} result
 * @returns {Array}
 */
function getIds (nodes, result = []) {
  for (const node of nodes) {
    node.id && result.push(node.id)
    getIds(node.children, result)
  }

  return result
}

/**
 * @param {StyleSheetList|Array<CSSRule>} styles
 * @returns {Array<CSSRule>}
 */
function getCssRules (styles) {
  // https://developer.mozilla.org/en-US/docs/Web/API/CSSRule
  const CSS_RULE_TYPES = [
    /* eslint-disable no-multi-spaces */
    'UNKNOWN_RULE',              // 0
    'STYLE_RULE',                // 1
    'CHARSET_RULE',              // 2
    'IMPORT_RULE',               // 3
    'MEDIA_RULE',                // 4
    'FONT_FACE_RULE',            // 5
    'PAGE_RULE',                 // 6
    'KEYFRAMES_RULE',            // 7
    'KEYFRAME_RULE',             // 8
    null,                        // 9
    'NAMESPACE_RULE',            // 10
    'COUNTER_STYLE_RULE',        // 11
    'SUPPORTS_RULE',             // 12
    'DOCUMENT_RULE',             // 13
    'FONT_FEATURE_VALUES_RULE',  // 14
    'VIEWPORT_RULE',             // 15
    'REGION_STYLE_RULE'          // 16
    /* eslint-enable no-multi-spaces */
  ]

  const rules = []
  for (const {cssRules} of styles) {
    for (const rule of cssRules) {
      switch (CSS_RULE_TYPES[rule.type]) {
        case 'STYLE_RULE':
          rules.push(rule)
          break
        case 'MEDIA_RULE':
          rules.push(...getCssRules([rule]))
          break
      }
    }
  }

  return rules
}

/**
 * @param {DOMElement} element
 * @param {String} combinator
 * @param {Number} depth
 * @returns {Object}
 */
function combinatorQuery (element, combinator, depth) {
  const elements = []
  let depthOfElements = depth
  if (combinator === '>') {
    if (element.parentElement) {
      elements.push(element.parentElement)
    }
    depthOfElements--
  } else if (combinator === '+') {
    if (element.previousElementSibling) {
      elements.push(element.previousElementSibling)
    }
  } else if (combinator === '~') {
    let el = element
    while ((el = el.previousElementSibling)) {
      elements.unshift(el)
    }
  } else if (combinator === ' ') {
    let el = element
    while ((el = el.parentElement)) {
      elements.push(el)
    }
    depthOfElements--
  }

  return {elements, depth: depthOfElements}
}

/**
 * @param {DOMElement} element
 * @returns {String}
 */
function stringifyElement (element) {
  const match = element.outerHTML.match(/[^>]*>/)
  return match ? match[0] : ''
}

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
 * @param {CSSRule} rule
 * @returns {String}
 */
function getMediaText (rule) {
  let media = ''
  let current = rule
  while ((current = current.parentRule) && current.media) {
    if (media) {
      media = `${current.media.mediaText} AND ${media}`
    } else {
      media = current.media.mediaText
    }
  }

  return media
}

export {
  getIds,
  getCssRules,
  combinatorQuery,
  stringifyElement,
  cssTextToArray,
  getMediaText
}
