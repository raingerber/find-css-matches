'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var puppeteer = _interopDefault(require('puppeteer'));

/* eslint-disable no-multi-spaces */

// https://developer.mozilla.org/en-US/docs/Web/API/CSSRule

const CSS_RULE_TYPES = [
  'UNKNOWN_RULE',                // 0
  'STYLE_RULE',                  // 1
  'CHARSET_RULE',                // 2
  'IMPORT_RULE',                 // 3
  'MEDIA_RULE',                  // 4
  'FONT_FACE_RULE',              // 5
  'PAGE_RULE',                   // 6
  'KEYFRAMES_RULE',              // 7
  'KEYFRAME_RULE',               // 8
  null,                          // 9
  'NAMESPACE_RULE',              // 10
  'COUNTER_STYLE_RULE',          // 11
  'SUPPORTS_RULE',               // 12
  'DOCUMENT_RULE',               // 13
  'FONT_FEATURE_VALUES_RULE',    // 14
  'VIEWPORT_RULE',               // 15
  'REGION_STYLE_RULE'            // 16
];

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
  };

  if (children) {
    result.children = children.map(child => stringifySelectors(child, options));
  }

  return result
}

// TODO add standard linting to test files?

/**
 * @param {String} html
 * @return {String}
 */
function getElementQuery (html) {
  // TODO what if there's a comment in the html?
  const match = /<\s*([a-z]+)/i.exec(html);
  if (!match) {
    throw new Error('Input HTML does not contain a valid tag.')
  }

  const tagName = match[1].toLowerCase();
  const selector = `${tagName}:first-of-type`;
  return selector
}

/**
 * @param {Browser} browser
 * @param {Array<Object>} styles
 * @param {String} html
 * @return {Object}
 */
async function createPage (browser, styles, html) {
  const page = await browser.newPage();
  await page.setContent(html);
  for (let style of styles) {
    await page.addStyleTag(style);
  }

  page.on('console', msg => console.log(msg.text()));
  return page
}

/**
 * needs to be run in a browser context
 * @param {Object} CSS_RULE_TYPES
 * @param {String} elementQuery
 * @param {Object} options
 * @return {Array<Object>}
 */
function findMatchingRules (CSS_RULE_TYPES$$1, elementQuery, options) {
  const matches = Function.call.bind(window.Element.prototype.webkitMatchesSelector);

  function findRulesForElement(matches, rules, element, options, depth) {
    const result = {
      matches: rules.reduce((acc, rule) => {
        let hasMatch = false;
        const selector = rule.selectorText.split(/\s*,\s*/).map(part => {
          let parsed;
          if (options.findPartialMatches) {
            parsed = findMatchingPartOfSelector(matches, element, part, depth);
          } else if (matches(element, part)) {
            parsed = ['', part];
          } else {
            parsed = [part, ''];
          }

          if (parsed[1]) {
            hasMatch = true;
          }

          return parsed
        });

        if (hasMatch) {
          acc.push(formatRule(selector, rule, options));
        }

        return acc
      }, [])
    };

    if (options.recursive === true) {
      const depthOfChildren = depth + 1;
      result.children = Array.prototype.map.call(element.children, child => {
        return findRulesForElement(matches, rules, child, options, depthOfChildren)
      });
    }

    return result
  }

  function findMatchingPartOfSelector(matches, element, selector, depth) {
    const parts = selector.split(/\s+/);
    for (let i = 0, part = parts[i]; part; part = parts[++i]) {
      const unmatched = parts.slice(0, i).join(' ');
      if (/[>+~]/.test(part)) {
        if (combinatorPreventsMatch(matches, element, unmatched, part, depth)) {
          break
        }

        continue
      }

      const matched = parts.slice(i).join(' ');
      if (matches(element, matched)) {
        return [unmatched, matched]
      }
    }

    return [selector, '']
  }

  function combinatorPreventsMatch(matches, element, selector, combinator, _depth) {
    if (_depth < 1) {
      return false
    }

    const {elements, depth} = getElementsUsingCombinator(element, combinator, _depth);
    return !elements.some(node => {
      return findMatchingPartOfSelector(matches, node, selector, depth)[1]
    })
  }

  function getElementsUsingCombinator(element, combinator, depth) {
    const elements = [];
    let depthOfElements = depth;
    if (combinator === '>') {
      elements.push(element.parentNode);
      depthOfElements--;
    } else if (combinator === '+' || combinator === '~') {
      let el = element;
      while ((el = el.previousElementSibling)) {
        elements.unshift(el);
        if (combinator === '+') {
          break
        }
      }
    }

    return {depth: depthOfElements, elements}
  }

  function formatRule(selector, rule, options) {
    const ruleObj = {selector};
    if (rule.parentRule && rule.parentRule.media) {
      ruleObj.mediaText = rule.parentRule.media.mediaText;
    }

    if (options.cssText === true) {
      ruleObj.cssText = rule.cssText;
    }

    if (options.findPartialMatches) {
      ruleObj.isPartialMatch = selector.every(([unmatched]) => unmatched);
    }

    return ruleObj
  }

  let rules = [];
  for (let {cssRules} of document.styleSheets) {
    for (let rule of cssRules) {
      switch (CSS_RULE_TYPES$$1[rule.type]) {
        case 'STYLE_RULE':
          rules.push(rule);
          break
        case 'MEDIA_RULE':
          rules.push(...rule.cssRules);
          break
      }
    }
  }

  const element = document.querySelector(elementQuery);

  // eslint-disable-next-line no-undef
  return findRulesForElement(matches, rules, element, options, 0)
}

/**
 * @param {Array<Object>} styles
 * @param {String} html
 * @param {Object} options
 * @return {Object}
 */
async function findMatchesFromPage (styles, html, options) {
  const elementQuery = getElementQuery(html);
  const browser = await puppeteer.launch();
  const page = await createPage(browser, styles, html);
  let selectors = await page.evaluate(
    findMatchingRules,
    CSS_RULE_TYPES,
    elementQuery,
    options
  );

  browser.close();
  selectors = stringifySelectors(selectors, options);
  return selectors
}

/**
 * @param {Function} matches
 * @param {Array<CSSRule>} rules
 * @param {DOMElement} element
 * @param {Object} options
 * @param {Number} depth
 * @return {Object}
 */
function findRulesForElement (matches, rules, element, options, depth) {
  const result = {
    matches: rules.reduce((acc, rule) => {
      let hasMatch = false;
      const selector = rule.selectorText.split(/\s*,\s*/).map(part => {
        let parsed;
        if (options.findPartialMatches) {
          parsed = findMatchingPartOfSelector(matches, element, part, depth);
        } else if (matches(element, part)) {
          parsed = ['', part];
        } else {
          parsed = [part, ''];
        }

        if (parsed[1]) {
          hasMatch = true;
        }

        return parsed
      });

      if (hasMatch) {
        acc.push(formatRule(selector, rule, options));
      }

      return acc
    }, [])
  };

  if (options.recursive === true) {
    const depthOfChildren = depth + 1;
    result.children = Array.prototype.map.call(element.children, child => {
      return findRulesForElement(matches, rules, child, options, depthOfChildren)
    });
  }

  return result
}

/**
 * returns an array that contains 2 strings: [<unmatched>, <matched>]
 * joining the two strings with a space will produce the original selector
 * if the <matched> string is empty, there was NO MATCH found
 * if neither string is empty, it was a partial match
 * @param {Function} matches
 * @param {DOMElement} element
 * @param {String} selector
 * @param {Number} depth
 * @return {Array<String>}
 */
function findMatchingPartOfSelector (matches, element, selector, depth) {
  const parts = selector.split(/\s+/);
  for (let i = 0, part = parts[i]; part; part = parts[++i]) {
    const unmatched = parts.slice(0, i).join(' ');
    if (/[>+~]/.test(part)) {
      if (combinatorPreventsMatch(matches, element, unmatched, part, depth)) {
        break
      }

      continue
    }

    const matched = parts.slice(i).join(' ');
    if (matches(element, matched)) {
      return [unmatched, matched]
    }
  }

  return [selector, '']
}

/**
 * @param {Function} matches
 * @param {DOMElement} element
 * @param {String} selector
 * @param {String} combinator
 * @param {Number} _depth
 * @return {Boolean}
 */
function combinatorPreventsMatch (matches, element, selector, combinator, _depth) {
  if (_depth < 1) {
    return false
  }

  const {elements, depth} = getElementsUsingCombinator(element, combinator, _depth);
  return !elements.some(node => {
    return findMatchingPartOfSelector(matches, node, selector, depth)[1]
  })
}

/**
 * @param {DOMElement} element
 * @param {String} combinator
 * @param {Number} depth
 * @return {Object}
 */
function getElementsUsingCombinator (element, combinator, depth) {
  const elements = [];
  let depthOfElements = depth;
  if (combinator === '>') {
    elements.push(element.parentNode);
    depthOfElements--;
  } else if (combinator === '+' || combinator === '~') {
    let el = element;
    while ((el = el.previousElementSibling)) {
      elements.unshift(el);
      if (combinator === '+') {
        break
      }
    }
  }

  return {depth: depthOfElements, elements}
}

/**
 * @param {Array<Array<String>>} selector
 * @param {CSSRule} rule
 * @param {Object} options
 * @return {Object}
 */
function formatRule (selector, rule, options) {
  const ruleObj = {selector};
  if (rule.parentRule && rule.parentRule.media) {
    ruleObj.mediaText = rule.parentRule.media.mediaText;
  }

  if (options.cssText === true) {
    ruleObj.cssText = rule.cssText;
  }

  if (options.findPartialMatches) {
    ruleObj.isPartialMatch = selector.every(([unmatched]) => unmatched);
  }

  return ruleObj
}

const DEFAULT_OPTIONS = {
  cssText: false,
  recursive: true,
  findPartialMatches: true,
  formatSelector: (a, b) => [a, b]
};

/**
 * @param {Object|Array<Object>} styles
 * @param {String} html
 * @param {Object} userOptions
 * @return {Promise<Object>}
 */
function findMatches (styles, html, userOptions) {
  const stylesArray = Array.isArray(styles) ? styles : [styles];
  const options = Object.assign({}, DEFAULT_OPTIONS, userOptions);
  return findMatchesFromPage(stylesArray, html, options)
}

// function elementUsesTagName (element, tagName) {
//   return element.is(tagName) || !!element.querySelector(tagName)
// }

// function checkForSpecialTags (element) {
//   const tagData = {
//     html: elementUsesTagName(element, 'html'),
//     body: elementUsesTagName(element, 'body')
//   }
// }

exports.CSS_RULE_TYPES = CSS_RULE_TYPES;
exports.createPage = createPage;
exports.findMatchesFromPage = findMatchesFromPage;
exports.findRulesForElement = findRulesForElement;
exports.findMatchingPartOfSelector = findMatchingPartOfSelector;
exports.combinatorPreventsMatch = combinatorPreventsMatch;
exports.getElementsUsingCombinator = getElementsUsingCombinator;
exports.formatRule = formatRule;
exports.findMatches = findMatches;
exports.stringifySelectors = stringifySelectors;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9jb25zdGFudHMuanMiLCIuLi9zcmMvc3RyaW5naWZ5LmpzIiwiLi4vc3JjL2Nzcy1wYXJzZXIuanMiLCIuLi9zcmMvZnVuY3Rpb25zLmpzIiwiLi4vc3JjL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLW11bHRpLXNwYWNlcyAqL1xuXG4vLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvQ1NTUnVsZVxuXG5leHBvcnQgY29uc3QgQ1NTX1JVTEVfVFlQRVMgPSBbXG4gICdVTktOT1dOX1JVTEUnLCAgICAgICAgICAgICAgICAvLyAwXG4gICdTVFlMRV9SVUxFJywgICAgICAgICAgICAgICAgICAvLyAxXG4gICdDSEFSU0VUX1JVTEUnLCAgICAgICAgICAgICAgICAvLyAyXG4gICdJTVBPUlRfUlVMRScsICAgICAgICAgICAgICAgICAvLyAzXG4gICdNRURJQV9SVUxFJywgICAgICAgICAgICAgICAgICAvLyA0XG4gICdGT05UX0ZBQ0VfUlVMRScsICAgICAgICAgICAgICAvLyA1XG4gICdQQUdFX1JVTEUnLCAgICAgICAgICAgICAgICAgICAvLyA2XG4gICdLRVlGUkFNRVNfUlVMRScsICAgICAgICAgICAgICAvLyA3XG4gICdLRVlGUkFNRV9SVUxFJywgICAgICAgICAgICAgICAvLyA4XG4gIG51bGwsICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA5XG4gICdOQU1FU1BBQ0VfUlVMRScsICAgICAgICAgICAgICAvLyAxMFxuICAnQ09VTlRFUl9TVFlMRV9SVUxFJywgICAgICAgICAgLy8gMTFcbiAgJ1NVUFBPUlRTX1JVTEUnLCAgICAgICAgICAgICAgIC8vIDEyXG4gICdET0NVTUVOVF9SVUxFJywgICAgICAgICAgICAgICAvLyAxM1xuICAnRk9OVF9GRUFUVVJFX1ZBTFVFU19SVUxFJywgICAgLy8gMTRcbiAgJ1ZJRVdQT1JUX1JVTEUnLCAgICAgICAgICAgICAgIC8vIDE1XG4gICdSRUdJT05fU1RZTEVfUlVMRScgICAgICAgICAgICAvLyAxNlxuXVxuIiwiLyoqXG4gKiB0aGlzIG5lZWRzIHRvIGJlIGNhbGxlZCBvdXRzaWRlIHB1cHBldGVlcixcbiAqIGJlY2F1c2UgaXQgdXNlcyB0aGUgZm9ybWF0U2VsZWN0b3IgZnVuY3Rpb24sXG4gKiBidXQgZnVuY3Rpb25zIGNhbid0IGJlIHBhc3NlZCB0byBwYWdlLmV2YWx1YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gcGFyYW0wXG4gKiBAcGFyYW0ge0FycmF5fSBwYXJhbTAubWF0Y2hlc1xuICogQHBhcmFtIHtBcnJheX0gcGFyYW0wLmNoaWxkcmVuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHtGdW5jdGlvbn0gb3B0aW9ucy5mb3JtYXRTZWxlY3RvclxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5mdW5jdGlvbiBzdHJpbmdpZnlTZWxlY3RvcnMgKHttYXRjaGVzLCBjaGlsZHJlbn0sIG9wdGlvbnMpIHtcbiAgY29uc3QgcmVzdWx0ID0ge1xuICAgIG1hdGNoZXM6IG1hdGNoZXMubWFwKG1hdGNoID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLm1hdGNoLFxuICAgICAgICBzZWxlY3RvcjogbWF0Y2guc2VsZWN0b3IubWFwKHBhcnQgPT4ge1xuICAgICAgICAgIHJldHVybiBvcHRpb25zLmZvcm1hdFNlbGVjdG9yKC4uLnBhcnQpLmpvaW4oJyAnKS50cmltKClcbiAgICAgICAgfSkuam9pbignLCAnKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBpZiAoY2hpbGRyZW4pIHtcbiAgICByZXN1bHQuY2hpbGRyZW4gPSBjaGlsZHJlbi5tYXAoY2hpbGQgPT4gc3RyaW5naWZ5U2VsZWN0b3JzKGNoaWxkLCBvcHRpb25zKSlcbiAgfVxuXG4gIHJldHVybiByZXN1bHRcbn1cblxuZXhwb3J0IHtcbiAgc3RyaW5naWZ5U2VsZWN0b3JzXG59XG4iLCJpbXBvcnQgcHVwcGV0ZWVyIGZyb20gJ3B1cHBldGVlcidcblxuaW1wb3J0IHtDU1NfUlVMRV9UWVBFU30gZnJvbSAnLi9jb25zdGFudHMnXG5cbmltcG9ydCB7c3RyaW5naWZ5U2VsZWN0b3JzfSBmcm9tICcuL3N0cmluZ2lmeSdcblxuLy8gVE9ETyBhZGQgc3RhbmRhcmQgbGludGluZyB0byB0ZXN0IGZpbGVzP1xuXG4vKipcbiAqIEBwYXJhbSB7U3RyaW5nfSBodG1sXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGdldEVsZW1lbnRRdWVyeSAoaHRtbCkge1xuICAvLyBUT0RPIHdoYXQgaWYgdGhlcmUncyBhIGNvbW1lbnQgaW4gdGhlIGh0bWw/XG4gIGNvbnN0IG1hdGNoID0gLzxcXHMqKFthLXpdKykvaS5leGVjKGh0bWwpXG4gIGlmICghbWF0Y2gpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0lucHV0IEhUTUwgZG9lcyBub3QgY29udGFpbiBhIHZhbGlkIHRhZy4nKVxuICB9XG5cbiAgY29uc3QgdGFnTmFtZSA9IG1hdGNoWzFdLnRvTG93ZXJDYXNlKClcbiAgY29uc3Qgc2VsZWN0b3IgPSBgJHt0YWdOYW1lfTpmaXJzdC1vZi10eXBlYFxuICByZXR1cm4gc2VsZWN0b3Jcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0Jyb3dzZXJ9IGJyb3dzZXJcbiAqIEBwYXJhbSB7QXJyYXk8T2JqZWN0Pn0gc3R5bGVzXG4gKiBAcGFyYW0ge1N0cmluZ30gaHRtbFxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5hc3luYyBmdW5jdGlvbiBjcmVhdGVQYWdlIChicm93c2VyLCBzdHlsZXMsIGh0bWwpIHtcbiAgY29uc3QgcGFnZSA9IGF3YWl0IGJyb3dzZXIubmV3UGFnZSgpXG4gIGF3YWl0IHBhZ2Uuc2V0Q29udGVudChodG1sKVxuICBmb3IgKGxldCBzdHlsZSBvZiBzdHlsZXMpIHtcbiAgICBhd2FpdCBwYWdlLmFkZFN0eWxlVGFnKHN0eWxlKVxuICB9XG5cbiAgcGFnZS5vbignY29uc29sZScsIG1zZyA9PiBjb25zb2xlLmxvZyhtc2cudGV4dCgpKSlcbiAgcmV0dXJuIHBhZ2Vcbn1cblxuLyoqXG4gKiBuZWVkcyB0byBiZSBydW4gaW4gYSBicm93c2VyIGNvbnRleHRcbiAqIEBwYXJhbSB7T2JqZWN0fSBDU1NfUlVMRV9UWVBFU1xuICogQHBhcmFtIHtTdHJpbmd9IGVsZW1lbnRRdWVyeVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge0FycmF5PE9iamVjdD59XG4gKi9cbmZ1bmN0aW9uIGZpbmRNYXRjaGluZ1J1bGVzIChDU1NfUlVMRV9UWVBFUywgZWxlbWVudFF1ZXJ5LCBvcHRpb25zKSB7XG4gIGNvbnN0IG1hdGNoZXMgPSBGdW5jdGlvbi5jYWxsLmJpbmQod2luZG93LkVsZW1lbnQucHJvdG90eXBlLndlYmtpdE1hdGNoZXNTZWxlY3RvcilcblxuICAvLyBTVFVCOmZpbmRSdWxlc0ZvckVsZW1lbnRcblxuICAvLyBTVFVCOmZpbmRNYXRjaGluZ1BhcnRPZlNlbGVjdG9yXG5cbiAgLy8gU1RVQjpjb21iaW5hdG9yUHJldmVudHNNYXRjaFxuXG4gIC8vIFNUVUI6Z2V0RWxlbWVudHNVc2luZ0NvbWJpbmF0b3JcblxuICAvLyBTVFVCOmZvcm1hdFJ1bGVcblxuICBsZXQgcnVsZXMgPSBbXVxuICBmb3IgKGxldCB7Y3NzUnVsZXN9IG9mIGRvY3VtZW50LnN0eWxlU2hlZXRzKSB7XG4gICAgZm9yIChsZXQgcnVsZSBvZiBjc3NSdWxlcykge1xuICAgICAgc3dpdGNoIChDU1NfUlVMRV9UWVBFU1tydWxlLnR5cGVdKSB7XG4gICAgICAgIGNhc2UgJ1NUWUxFX1JVTEUnOlxuICAgICAgICAgIHJ1bGVzLnB1c2gocnVsZSlcbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICdNRURJQV9SVUxFJzpcbiAgICAgICAgICBydWxlcy5wdXNoKC4uLnJ1bGUuY3NzUnVsZXMpXG4gICAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbGVtZW50UXVlcnkpXG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVuZGVmXG4gIHJldHVybiBmaW5kUnVsZXNGb3JFbGVtZW50KG1hdGNoZXMsIHJ1bGVzLCBlbGVtZW50LCBvcHRpb25zLCAwKVxufVxuXG4vKipcbiAqIEBwYXJhbSB7QXJyYXk8T2JqZWN0Pn0gc3R5bGVzXG4gKiBAcGFyYW0ge1N0cmluZ30gaHRtbFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZmluZE1hdGNoZXNGcm9tUGFnZSAoc3R5bGVzLCBodG1sLCBvcHRpb25zKSB7XG4gIGNvbnN0IGVsZW1lbnRRdWVyeSA9IGdldEVsZW1lbnRRdWVyeShodG1sKVxuICBjb25zdCBicm93c2VyID0gYXdhaXQgcHVwcGV0ZWVyLmxhdW5jaCgpXG4gIGNvbnN0IHBhZ2UgPSBhd2FpdCBjcmVhdGVQYWdlKGJyb3dzZXIsIHN0eWxlcywgaHRtbClcbiAgbGV0IHNlbGVjdG9ycyA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoXG4gICAgZmluZE1hdGNoaW5nUnVsZXMsXG4gICAgQ1NTX1JVTEVfVFlQRVMsXG4gICAgZWxlbWVudFF1ZXJ5LFxuICAgIG9wdGlvbnNcbiAgKVxuXG4gIGJyb3dzZXIuY2xvc2UoKVxuICBzZWxlY3RvcnMgPSBzdHJpbmdpZnlTZWxlY3RvcnMoc2VsZWN0b3JzLCBvcHRpb25zKVxuICByZXR1cm4gc2VsZWN0b3JzXG59XG5cbmV4cG9ydCB7XG4gIGNyZWF0ZVBhZ2UsXG4gIGZpbmRNYXRjaGVzRnJvbVBhZ2Vcbn1cbiIsIi8qKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gbWF0Y2hlc1xuICogQHBhcmFtIHtBcnJheTxDU1NSdWxlPn0gcnVsZXNcbiAqIEBwYXJhbSB7RE9NRWxlbWVudH0gZWxlbWVudFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBwYXJhbSB7TnVtYmVyfSBkZXB0aFxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5mdW5jdGlvbiBmaW5kUnVsZXNGb3JFbGVtZW50IChtYXRjaGVzLCBydWxlcywgZWxlbWVudCwgb3B0aW9ucywgZGVwdGgpIHtcbiAgY29uc3QgcmVzdWx0ID0ge1xuICAgIG1hdGNoZXM6IHJ1bGVzLnJlZHVjZSgoYWNjLCBydWxlKSA9PiB7XG4gICAgICBsZXQgaGFzTWF0Y2ggPSBmYWxzZVxuICAgICAgY29uc3Qgc2VsZWN0b3IgPSBydWxlLnNlbGVjdG9yVGV4dC5zcGxpdCgvXFxzKixcXHMqLykubWFwKHBhcnQgPT4ge1xuICAgICAgICBsZXQgcGFyc2VkXG4gICAgICAgIGlmIChvcHRpb25zLmZpbmRQYXJ0aWFsTWF0Y2hlcykge1xuICAgICAgICAgIHBhcnNlZCA9IGZpbmRNYXRjaGluZ1BhcnRPZlNlbGVjdG9yKG1hdGNoZXMsIGVsZW1lbnQsIHBhcnQsIGRlcHRoKVxuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoZXMoZWxlbWVudCwgcGFydCkpIHtcbiAgICAgICAgICBwYXJzZWQgPSBbJycsIHBhcnRdXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGFyc2VkID0gW3BhcnQsICcnXVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBhcnNlZFsxXSkge1xuICAgICAgICAgIGhhc01hdGNoID0gdHJ1ZVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHBhcnNlZFxuICAgICAgfSlcblxuICAgICAgaWYgKGhhc01hdGNoKSB7XG4gICAgICAgIGFjYy5wdXNoKGZvcm1hdFJ1bGUoc2VsZWN0b3IsIHJ1bGUsIG9wdGlvbnMpKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gYWNjXG4gICAgfSwgW10pXG4gIH1cblxuICBpZiAob3B0aW9ucy5yZWN1cnNpdmUgPT09IHRydWUpIHtcbiAgICBjb25zdCBkZXB0aE9mQ2hpbGRyZW4gPSBkZXB0aCArIDFcbiAgICByZXN1bHQuY2hpbGRyZW4gPSBBcnJheS5wcm90b3R5cGUubWFwLmNhbGwoZWxlbWVudC5jaGlsZHJlbiwgY2hpbGQgPT4ge1xuICAgICAgcmV0dXJuIGZpbmRSdWxlc0ZvckVsZW1lbnQobWF0Y2hlcywgcnVsZXMsIGNoaWxkLCBvcHRpb25zLCBkZXB0aE9mQ2hpbGRyZW4pXG4gICAgfSlcbiAgfVxuXG4gIHJldHVybiByZXN1bHRcbn1cblxuLyoqXG4gKiByZXR1cm5zIGFuIGFycmF5IHRoYXQgY29udGFpbnMgMiBzdHJpbmdzOiBbPHVubWF0Y2hlZD4sIDxtYXRjaGVkPl1cbiAqIGpvaW5pbmcgdGhlIHR3byBzdHJpbmdzIHdpdGggYSBzcGFjZSB3aWxsIHByb2R1Y2UgdGhlIG9yaWdpbmFsIHNlbGVjdG9yXG4gKiBpZiB0aGUgPG1hdGNoZWQ+IHN0cmluZyBpcyBlbXB0eSwgdGhlcmUgd2FzIE5PIE1BVENIIGZvdW5kXG4gKiBpZiBuZWl0aGVyIHN0cmluZyBpcyBlbXB0eSwgaXQgd2FzIGEgcGFydGlhbCBtYXRjaFxuICogQHBhcmFtIHtGdW5jdGlvbn0gbWF0Y2hlc1xuICogQHBhcmFtIHtET01FbGVtZW50fSBlbGVtZW50XG4gKiBAcGFyYW0ge1N0cmluZ30gc2VsZWN0b3JcbiAqIEBwYXJhbSB7TnVtYmVyfSBkZXB0aFxuICogQHJldHVybiB7QXJyYXk8U3RyaW5nPn1cbiAqL1xuZnVuY3Rpb24gZmluZE1hdGNoaW5nUGFydE9mU2VsZWN0b3IgKG1hdGNoZXMsIGVsZW1lbnQsIHNlbGVjdG9yLCBkZXB0aCkge1xuICBjb25zdCBwYXJ0cyA9IHNlbGVjdG9yLnNwbGl0KC9cXHMrLylcbiAgZm9yIChsZXQgaSA9IDAsIHBhcnQgPSBwYXJ0c1tpXTsgcGFydDsgcGFydCA9IHBhcnRzWysraV0pIHtcbiAgICBjb25zdCB1bm1hdGNoZWQgPSBwYXJ0cy5zbGljZSgwLCBpKS5qb2luKCcgJylcbiAgICBpZiAoL1s+K35dLy50ZXN0KHBhcnQpKSB7XG4gICAgICBpZiAoY29tYmluYXRvclByZXZlbnRzTWF0Y2gobWF0Y2hlcywgZWxlbWVudCwgdW5tYXRjaGVkLCBwYXJ0LCBkZXB0aCkpIHtcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgY29udGludWVcbiAgICB9XG5cbiAgICBjb25zdCBtYXRjaGVkID0gcGFydHMuc2xpY2UoaSkuam9pbignICcpXG4gICAgaWYgKG1hdGNoZXMoZWxlbWVudCwgbWF0Y2hlZCkpIHtcbiAgICAgIHJldHVybiBbdW5tYXRjaGVkLCBtYXRjaGVkXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBbc2VsZWN0b3IsICcnXVxufVxuXG4vKipcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG1hdGNoZXNcbiAqIEBwYXJhbSB7RE9NRWxlbWVudH0gZWxlbWVudFxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yXG4gKiBAcGFyYW0ge1N0cmluZ30gY29tYmluYXRvclxuICogQHBhcmFtIHtOdW1iZXJ9IF9kZXB0aFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gY29tYmluYXRvclByZXZlbnRzTWF0Y2ggKG1hdGNoZXMsIGVsZW1lbnQsIHNlbGVjdG9yLCBjb21iaW5hdG9yLCBfZGVwdGgpIHtcbiAgaWYgKF9kZXB0aCA8IDEpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGNvbnN0IHtlbGVtZW50cywgZGVwdGh9ID0gZ2V0RWxlbWVudHNVc2luZ0NvbWJpbmF0b3IoZWxlbWVudCwgY29tYmluYXRvciwgX2RlcHRoKVxuICByZXR1cm4gIWVsZW1lbnRzLnNvbWUobm9kZSA9PiB7XG4gICAgcmV0dXJuIGZpbmRNYXRjaGluZ1BhcnRPZlNlbGVjdG9yKG1hdGNoZXMsIG5vZGUsIHNlbGVjdG9yLCBkZXB0aClbMV1cbiAgfSlcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0RPTUVsZW1lbnR9IGVsZW1lbnRcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb21iaW5hdG9yXG4gKiBAcGFyYW0ge051bWJlcn0gZGVwdGhcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuZnVuY3Rpb24gZ2V0RWxlbWVudHNVc2luZ0NvbWJpbmF0b3IgKGVsZW1lbnQsIGNvbWJpbmF0b3IsIGRlcHRoKSB7XG4gIGNvbnN0IGVsZW1lbnRzID0gW11cbiAgbGV0IGRlcHRoT2ZFbGVtZW50cyA9IGRlcHRoXG4gIGlmIChjb21iaW5hdG9yID09PSAnPicpIHtcbiAgICBlbGVtZW50cy5wdXNoKGVsZW1lbnQucGFyZW50Tm9kZSlcbiAgICBkZXB0aE9mRWxlbWVudHMtLVxuICB9IGVsc2UgaWYgKGNvbWJpbmF0b3IgPT09ICcrJyB8fCBjb21iaW5hdG9yID09PSAnficpIHtcbiAgICBsZXQgZWwgPSBlbGVtZW50XG4gICAgd2hpbGUgKChlbCA9IGVsLnByZXZpb3VzRWxlbWVudFNpYmxpbmcpKSB7XG4gICAgICBlbGVtZW50cy51bnNoaWZ0KGVsKVxuICAgICAgaWYgKGNvbWJpbmF0b3IgPT09ICcrJykge1xuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7ZGVwdGg6IGRlcHRoT2ZFbGVtZW50cywgZWxlbWVudHN9XG59XG5cbi8qKlxuICogQHBhcmFtIHtBcnJheTxBcnJheTxTdHJpbmc+Pn0gc2VsZWN0b3JcbiAqIEBwYXJhbSB7Q1NTUnVsZX0gcnVsZVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuZnVuY3Rpb24gZm9ybWF0UnVsZSAoc2VsZWN0b3IsIHJ1bGUsIG9wdGlvbnMpIHtcbiAgY29uc3QgcnVsZU9iaiA9IHtzZWxlY3Rvcn1cbiAgaWYgKHJ1bGUucGFyZW50UnVsZSAmJiBydWxlLnBhcmVudFJ1bGUubWVkaWEpIHtcbiAgICBydWxlT2JqLm1lZGlhVGV4dCA9IHJ1bGUucGFyZW50UnVsZS5tZWRpYS5tZWRpYVRleHRcbiAgfVxuXG4gIGlmIChvcHRpb25zLmNzc1RleHQgPT09IHRydWUpIHtcbiAgICBydWxlT2JqLmNzc1RleHQgPSBydWxlLmNzc1RleHRcbiAgfVxuXG4gIGlmIChvcHRpb25zLmZpbmRQYXJ0aWFsTWF0Y2hlcykge1xuICAgIHJ1bGVPYmouaXNQYXJ0aWFsTWF0Y2ggPSBzZWxlY3Rvci5ldmVyeSgoW3VubWF0Y2hlZF0pID0+IHVubWF0Y2hlZClcbiAgfVxuXG4gIHJldHVybiBydWxlT2JqXG59XG5cbmV4cG9ydCB7XG4gIGZpbmRSdWxlc0ZvckVsZW1lbnQsXG4gIGZpbmRNYXRjaGluZ1BhcnRPZlNlbGVjdG9yLFxuICBjb21iaW5hdG9yUHJldmVudHNNYXRjaCxcbiAgZ2V0RWxlbWVudHNVc2luZ0NvbWJpbmF0b3IsXG4gIGZvcm1hdFJ1bGVcbn1cbiIsImltcG9ydCB7ZmluZE1hdGNoZXNGcm9tUGFnZX0gZnJvbSAnLi9jc3MtcGFyc2VyJ1xuXG5jb25zdCBERUZBVUxUX09QVElPTlMgPSB7XG4gIGNzc1RleHQ6IGZhbHNlLFxuICByZWN1cnNpdmU6IHRydWUsXG4gIGZpbmRQYXJ0aWFsTWF0Y2hlczogdHJ1ZSxcbiAgZm9ybWF0U2VsZWN0b3I6IChhLCBiKSA9PiBbYSwgYl1cbn1cblxuLyoqXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheTxPYmplY3Q+fSBzdHlsZXNcbiAqIEBwYXJhbSB7U3RyaW5nfSBodG1sXG4gKiBAcGFyYW0ge09iamVjdH0gdXNlck9wdGlvbnNcbiAqIEByZXR1cm4ge1Byb21pc2U8T2JqZWN0Pn1cbiAqL1xuZnVuY3Rpb24gZmluZE1hdGNoZXMgKHN0eWxlcywgaHRtbCwgdXNlck9wdGlvbnMpIHtcbiAgY29uc3Qgc3R5bGVzQXJyYXkgPSBBcnJheS5pc0FycmF5KHN0eWxlcykgPyBzdHlsZXMgOiBbc3R5bGVzXVxuICBjb25zdCBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9PUFRJT05TLCB1c2VyT3B0aW9ucylcbiAgcmV0dXJuIGZpbmRNYXRjaGVzRnJvbVBhZ2Uoc3R5bGVzQXJyYXksIGh0bWwsIG9wdGlvbnMpXG59XG5cbmV4cG9ydCB7ZmluZE1hdGNoZXN9XG5cbi8vIGZ1bmN0aW9uIGVsZW1lbnRVc2VzVGFnTmFtZSAoZWxlbWVudCwgdGFnTmFtZSkge1xuLy8gICByZXR1cm4gZWxlbWVudC5pcyh0YWdOYW1lKSB8fCAhIWVsZW1lbnQucXVlcnlTZWxlY3Rvcih0YWdOYW1lKVxuLy8gfVxuXG4vLyBmdW5jdGlvbiBjaGVja0ZvclNwZWNpYWxUYWdzIChlbGVtZW50KSB7XG4vLyAgIGNvbnN0IHRhZ0RhdGEgPSB7XG4vLyAgICAgaHRtbDogZWxlbWVudFVzZXNUYWdOYW1lKGVsZW1lbnQsICdodG1sJyksXG4vLyAgICAgYm9keTogZWxlbWVudFVzZXNUYWdOYW1lKGVsZW1lbnQsICdib2R5Jylcbi8vICAgfVxuLy8gfVxuIl0sIm5hbWVzIjpbIkNTU19SVUxFX1RZUEVTIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7O0FBSUEsQUFBWSxNQUFDLGNBQWMsR0FBRztFQUM1QixjQUFjO0VBQ2QsWUFBWTtFQUNaLGNBQWM7RUFDZCxhQUFhO0VBQ2IsWUFBWTtFQUNaLGdCQUFnQjtFQUNoQixXQUFXO0VBQ1gsZ0JBQWdCO0VBQ2hCLGVBQWU7RUFDZixJQUFJO0VBQ0osZ0JBQWdCO0VBQ2hCLG9CQUFvQjtFQUNwQixlQUFlO0VBQ2YsZUFBZTtFQUNmLDBCQUEwQjtFQUMxQixlQUFlO0VBQ2YsbUJBQW1CO0NBQ3BCOztBQ3RCRDs7Ozs7Ozs7Ozs7QUFXQSxTQUFTLGtCQUFrQixFQUFFLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxFQUFFLE9BQU8sRUFBRTtFQUN6RCxNQUFNLE1BQU0sR0FBRztJQUNiLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSTtNQUM1QixPQUFPO1FBQ0wsR0FBRyxLQUFLO1FBQ1IsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSTtVQUNuQyxPQUFPLE9BQU8sQ0FBQyxjQUFjLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFO1NBQ3hELENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO09B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
