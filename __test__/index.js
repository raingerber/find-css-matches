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
  };

  if (children) {
    result.children = children.map(child => stringify(child, options));
  }

  return result
}

/**
 * @param {String} html
 * @return {String}
 */
function getElementQuery (html) {
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

  function findRulesForElement(matches, rules, element, options, isRoot) {
    const result = {
      matches: rules.reduce((acc, rule) => {
        let hasMatch = false;
        const selector = rule.selectorText.split(/\s*,\s*/).map(part => {
          let segmented;
          if (options.findPartialMatches) {
            segmented = findMatchingPartOfSelector(matches, element, part, isRoot);
          } else if (matches(element, part)) {
            segmented = ['', part];
          } else {
            segmented = [part, ''];
          }

          if (segmented[1]) {
            hasMatch = true;
          }

          return segmented
        });

        if (hasMatch) {
          acc.push(formatRule(selector, rule, options));
        }

        return acc
      }, [])
    };

    if (options.recursive === true) {
      result.children = Array.prototype.map.call(element.children, child => {
        return findRulesForElement(matches, rules, child, options, false)
      });
    }

    return result
  }

  function findMatchingPartOfSelector(matches, element, selector, isRoot) {
    const parts = selector.split(/\s+/);
    for (let i = 0; i < parts.length; i++) {
      if (!isRoot && /[+~>]/.test(parts[i])) {
        break
      }

      const _selector = parts.slice(i).join(' ');
      if (matches(element, _selector)) {
        return [parts.slice(0, i).join(' '), _selector]
      }
    }

    return [parts.join(' '), '']
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
          rules.splice(rules.length, 0, ...rule.cssRules);
          break
      }
    }
  }

  const element = document.querySelector(elementQuery);

  // eslint-disable-next-line no-undef
  return findRulesForElement(matches, rules, element, options, true)
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
  selectors = stringify(selectors, options);
  return selectors
}

/**
 * @param {Function} matches
 * @param {Array<CSSRule>} rules
 * @param {DOMElement} element
 * @param {Object} options
 * @param {Boolean} isRoot
 * @return {Object}
 */
function findRulesForElement (matches, rules, element, options, isRoot) {
  const result = {
    matches: rules.reduce((acc, rule) => {
      let hasMatch = false;
      const selector = rule.selectorText.split(/\s*,\s*/).map(part => {
        let segmented;
        if (options.findPartialMatches) {
          segmented = findMatchingPartOfSelector(matches, element, part, isRoot);
        } else if (matches(element, part)) {
          segmented = ['', part];
        } else {
          segmented = [part, ''];
        }

        if (segmented[1]) {
          hasMatch = true;
        }

        return segmented
      });

      if (hasMatch) {
        acc.push(formatRule(selector, rule, options));
      }

      return acc
    }, [])
  };

  if (options.recursive === true) {
    result.children = Array.prototype.map.call(element.children, child => {
      return findRulesForElement(matches, rules, child, options, false)
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
 * @param {Boolean} isRoot
 * @return {Array<String>}
 */
function findMatchingPartOfSelector (matches, element, selector, isRoot) {
  const parts = selector.split(/\s+/);
  for (let i = 0; i < parts.length; i++) {
    if (!isRoot && /[+~>]/.test(parts[i])) {
      break
    }

    const _selector = parts.slice(i).join(' ');
    if (matches(element, _selector)) {
      return [parts.slice(0, i).join(' '), _selector]
    }
  }

  return [parts.join(' '), '']
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
  recursive: false,
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

exports.CSS_RULE_TYPES = CSS_RULE_TYPES;
exports.findMatchesFromPage = findMatchesFromPage;
exports.findRulesForElement = findRulesForElement;
exports.findMatchingPartOfSelector = findMatchingPartOfSelector;
exports.formatRule = formatRule;
exports.findMatches = findMatches;
exports.stringify = stringify;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9jb25zdGFudHMuanMiLCIuLi9zcmMvc3RyaW5naWZ5LmpzIiwiLi4vc3JjL2Nzcy1wYXJzZXIuanMiLCIuLi9zcmMvZnVuY3Rpb25zLmpzIiwiLi4vc3JjL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLW11bHRpLXNwYWNlcyAqL1xuXG4vLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvQ1NTUnVsZVxuXG5leHBvcnQgY29uc3QgQ1NTX1JVTEVfVFlQRVMgPSBbXG4gICdVTktOT1dOX1JVTEUnLCAgICAgICAgICAgICAgICAvLyAwXG4gICdTVFlMRV9SVUxFJywgICAgICAgICAgICAgICAgICAvLyAxXG4gICdDSEFSU0VUX1JVTEUnLCAgICAgICAgICAgICAgICAvLyAyXG4gICdJTVBPUlRfUlVMRScsICAgICAgICAgICAgICAgICAvLyAzXG4gICdNRURJQV9SVUxFJywgICAgICAgICAgICAgICAgICAvLyA0XG4gICdGT05UX0ZBQ0VfUlVMRScsICAgICAgICAgICAgICAvLyA1XG4gICdQQUdFX1JVTEUnLCAgICAgICAgICAgICAgICAgICAvLyA2XG4gICdLRVlGUkFNRVNfUlVMRScsICAgICAgICAgICAgICAvLyA3XG4gICdLRVlGUkFNRV9SVUxFJywgICAgICAgICAgICAgICAvLyA4XG4gIG51bGwsICAgICAgICAgICAgICAgICAgICAgICAgICAvLyA5XG4gICdOQU1FU1BBQ0VfUlVMRScsICAgICAgICAgICAgICAvLyAxMFxuICAnQ09VTlRFUl9TVFlMRV9SVUxFJywgICAgICAgICAgLy8gMTFcbiAgJ1NVUFBPUlRTX1JVTEUnLCAgICAgICAgICAgICAgIC8vIDEyXG4gICdET0NVTUVOVF9SVUxFJywgICAgICAgICAgICAgICAvLyAxM1xuICAnRk9OVF9GRUFUVVJFX1ZBTFVFU19SVUxFJywgICAgLy8gMTRcbiAgJ1ZJRVdQT1JUX1JVTEUnLCAgICAgICAgICAgICAgIC8vIDE1XG4gICdSRUdJT05fU1RZTEVfUlVMRScgICAgICAgICAgICAvLyAxNlxuXVxuIiwiLyoqXG4gKiB0aGlzIG5lZWRzIHRvIGJlIGNhbGxlZCBvdXRzaWRlIG9mIHB1cHBldGVlcixcbiAqIGJlY2F1c2UgaXQgdXNlcyBvcHRpb25zLmZvcm1hdFNlbGVjdG9yIGJ1dCxcbiAqIGZ1bmN0aW9ucyBjYW4ndCBiZSBwYXNzZWQgdG8gcGFnZS5ldmFsdWF0ZVxuICogQHBhcmFtIHtPYmplY3R9IHBhcmFtMFxuICogQHBhcmFtIHtBcnJheX0gcGFyYW0wLm1hdGNoZXNcbiAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtMC5jaGlsZHJlblxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG9wdGlvbnMuZm9ybWF0XG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbmZ1bmN0aW9uIHN0cmluZ2lmeSAoe21hdGNoZXMsIGNoaWxkcmVufSwgb3B0aW9ucykge1xuICBjb25zdCByZXN1bHQgPSB7XG4gICAgbWF0Y2hlczogbWF0Y2hlcy5tYXAobWF0Y2ggPT4ge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4ubWF0Y2gsXG4gICAgICAgIHNlbGVjdG9yOiBtYXRjaC5zZWxlY3Rvci5tYXAoKFt1bm1hdGNoZWQsIG1hdGNoZWRdKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIG9wdGlvbnMuZm9ybWF0U2VsZWN0b3IodW5tYXRjaGVkLCBtYXRjaGVkKS5qb2luKCcgJykudHJpbSgpXG4gICAgICAgIH0pLmpvaW4oJywgJylcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgaWYgKGNoaWxkcmVuKSB7XG4gICAgcmVzdWx0LmNoaWxkcmVuID0gY2hpbGRyZW4ubWFwKGNoaWxkID0+IHN0cmluZ2lmeShjaGlsZCwgb3B0aW9ucykpXG4gIH1cblxuICByZXR1cm4gcmVzdWx0XG59XG5cbmV4cG9ydCB7XG4gIHN0cmluZ2lmeVxufVxuIiwiaW1wb3J0IHB1cHBldGVlciBmcm9tICdwdXBwZXRlZXInXG5cbmltcG9ydCB7Q1NTX1JVTEVfVFlQRVN9IGZyb20gJy4vY29uc3RhbnRzJ1xuXG5pbXBvcnQge3N0cmluZ2lmeX0gZnJvbSAnLi9zdHJpbmdpZnknXG5cbi8qKlxuICogQHBhcmFtIHtTdHJpbmd9IGh0bWxcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZ2V0RWxlbWVudFF1ZXJ5IChodG1sKSB7XG4gIGNvbnN0IG1hdGNoID0gLzxcXHMqKFthLXpdKykvaS5leGVjKGh0bWwpXG4gIGlmICghbWF0Y2gpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0lucHV0IEhUTUwgZG9lcyBub3QgY29udGFpbiBhIHZhbGlkIHRhZy4nKVxuICB9XG5cbiAgY29uc3QgdGFnTmFtZSA9IG1hdGNoWzFdLnRvTG93ZXJDYXNlKClcbiAgY29uc3Qgc2VsZWN0b3IgPSBgJHt0YWdOYW1lfTpmaXJzdC1vZi10eXBlYFxuICByZXR1cm4gc2VsZWN0b3Jcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0Jyb3dzZXJ9IGJyb3dzZXJcbiAqIEBwYXJhbSB7QXJyYXk8T2JqZWN0Pn0gc3R5bGVzXG4gKiBAcGFyYW0ge1N0cmluZ30gaHRtbFxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5hc3luYyBmdW5jdGlvbiBjcmVhdGVQYWdlIChicm93c2VyLCBzdHlsZXMsIGh0bWwpIHtcbiAgY29uc3QgcGFnZSA9IGF3YWl0IGJyb3dzZXIubmV3UGFnZSgpXG4gIGF3YWl0IHBhZ2Uuc2V0Q29udGVudChodG1sKVxuICBmb3IgKGxldCBzdHlsZSBvZiBzdHlsZXMpIHtcbiAgICBhd2FpdCBwYWdlLmFkZFN0eWxlVGFnKHN0eWxlKVxuICB9XG5cbiAgcGFnZS5vbignY29uc29sZScsIG1zZyA9PiBjb25zb2xlLmxvZyhtc2cudGV4dCgpKSlcbiAgcmV0dXJuIHBhZ2Vcbn1cblxuLyoqXG4gKiBuZWVkcyB0byBiZSBydW4gaW4gYSBicm93c2VyIGNvbnRleHRcbiAqIEBwYXJhbSB7T2JqZWN0fSBDU1NfUlVMRV9UWVBFU1xuICogQHBhcmFtIHtTdHJpbmd9IGVsZW1lbnRRdWVyeVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge0FycmF5PE9iamVjdD59XG4gKi9cbmZ1bmN0aW9uIGZpbmRNYXRjaGluZ1J1bGVzIChDU1NfUlVMRV9UWVBFUywgZWxlbWVudFF1ZXJ5LCBvcHRpb25zKSB7XG4gIGNvbnN0IG1hdGNoZXMgPSBGdW5jdGlvbi5jYWxsLmJpbmQod2luZG93LkVsZW1lbnQucHJvdG90eXBlLndlYmtpdE1hdGNoZXNTZWxlY3RvcilcblxuICAvLyBTVFVCOmZpbmRSdWxlc0ZvckVsZW1lbnRcblxuICAvLyBTVFVCOmZpbmRNYXRjaGluZ1BhcnRPZlNlbGVjdG9yXG5cbiAgLy8gU1RVQjpmb3JtYXRSdWxlXG5cbiAgbGV0IHJ1bGVzID0gW11cbiAgZm9yIChsZXQge2Nzc1J1bGVzfSBvZiBkb2N1bWVudC5zdHlsZVNoZWV0cykge1xuICAgIGZvciAobGV0IHJ1bGUgb2YgY3NzUnVsZXMpIHtcbiAgICAgIHN3aXRjaCAoQ1NTX1JVTEVfVFlQRVNbcnVsZS50eXBlXSkge1xuICAgICAgICBjYXNlICdTVFlMRV9SVUxFJzpcbiAgICAgICAgICBydWxlcy5wdXNoKHJ1bGUpXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAnTUVESUFfUlVMRSc6XG4gICAgICAgICAgcnVsZXMuc3BsaWNlKHJ1bGVzLmxlbmd0aCwgMCwgLi4ucnVsZS5jc3NSdWxlcylcbiAgICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW1lbnRRdWVyeSlcblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW5kZWZcbiAgcmV0dXJuIGZpbmRSdWxlc0ZvckVsZW1lbnQobWF0Y2hlcywgcnVsZXMsIGVsZW1lbnQsIG9wdGlvbnMsIHRydWUpXG59XG5cbi8qKlxuICogQHBhcmFtIHtBcnJheTxPYmplY3Q+fSBzdHlsZXNcbiAqIEBwYXJhbSB7U3RyaW5nfSBodG1sXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5hc3luYyBmdW5jdGlvbiBmaW5kTWF0Y2hlc0Zyb21QYWdlIChzdHlsZXMsIGh0bWwsIG9wdGlvbnMpIHtcbiAgY29uc3QgZWxlbWVudFF1ZXJ5ID0gZ2V0RWxlbWVudFF1ZXJ5KGh0bWwpXG4gIGNvbnN0IGJyb3dzZXIgPSBhd2FpdCBwdXBwZXRlZXIubGF1bmNoKClcbiAgY29uc3QgcGFnZSA9IGF3YWl0IGNyZWF0ZVBhZ2UoYnJvd3Nlciwgc3R5bGVzLCBodG1sKVxuICBsZXQgc2VsZWN0b3JzID0gYXdhaXQgcGFnZS5ldmFsdWF0ZShcbiAgICBmaW5kTWF0Y2hpbmdSdWxlcyxcbiAgICBDU1NfUlVMRV9UWVBFUyxcbiAgICBlbGVtZW50UXVlcnksXG4gICAgb3B0aW9uc1xuICApXG5cbiAgYnJvd3Nlci5jbG9zZSgpXG4gIHNlbGVjdG9ycyA9IHN0cmluZ2lmeShzZWxlY3RvcnMsIG9wdGlvbnMpXG4gIHJldHVybiBzZWxlY3RvcnNcbn1cblxuZXhwb3J0IHtcbiAgZmluZE1hdGNoZXNGcm9tUGFnZVxufVxuIiwiLyoqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBtYXRjaGVzXG4gKiBAcGFyYW0ge0FycmF5PENTU1J1bGU+fSBydWxlc1xuICogQHBhcmFtIHtET01FbGVtZW50fSBlbGVtZW50XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHBhcmFtIHtCb29sZWFufSBpc1Jvb3RcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuZnVuY3Rpb24gZmluZFJ1bGVzRm9yRWxlbWVudCAobWF0Y2hlcywgcnVsZXMsIGVsZW1lbnQsIG9wdGlvbnMsIGlzUm9vdCkge1xuICBjb25zdCByZXN1bHQgPSB7XG4gICAgbWF0Y2hlczogcnVsZXMucmVkdWNlKChhY2MsIHJ1bGUpID0+IHtcbiAgICAgIGxldCBoYXNNYXRjaCA9IGZhbHNlXG4gICAgICBjb25zdCBzZWxlY3RvciA9IHJ1bGUuc2VsZWN0b3JUZXh0LnNwbGl0KC9cXHMqLFxccyovKS5tYXAocGFydCA9PiB7XG4gICAgICAgIGxldCBzZWdtZW50ZWRcbiAgICAgICAgaWYgKG9wdGlvbnMuZmluZFBhcnRpYWxNYXRjaGVzKSB7XG4gICAgICAgICAgc2VnbWVudGVkID0gZmluZE1hdGNoaW5nUGFydE9mU2VsZWN0b3IobWF0Y2hlcywgZWxlbWVudCwgcGFydCwgaXNSb290KVxuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoZXMoZWxlbWVudCwgcGFydCkpIHtcbiAgICAgICAgICBzZWdtZW50ZWQgPSBbJycsIHBhcnRdXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2VnbWVudGVkID0gW3BhcnQsICcnXVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNlZ21lbnRlZFsxXSkge1xuICAgICAgICAgIGhhc01hdGNoID0gdHJ1ZVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNlZ21lbnRlZFxuICAgICAgfSlcblxuICAgICAgaWYgKGhhc01hdGNoKSB7XG4gICAgICAgIGFjYy5wdXNoKGZvcm1hdFJ1bGUoc2VsZWN0b3IsIHJ1bGUsIG9wdGlvbnMpKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gYWNjXG4gICAgfSwgW10pXG4gIH1cblxuICBpZiAob3B0aW9ucy5yZWN1cnNpdmUgPT09IHRydWUpIHtcbiAgICByZXN1bHQuY2hpbGRyZW4gPSBBcnJheS5wcm90b3R5cGUubWFwLmNhbGwoZWxlbWVudC5jaGlsZHJlbiwgY2hpbGQgPT4ge1xuICAgICAgcmV0dXJuIGZpbmRSdWxlc0ZvckVsZW1lbnQobWF0Y2hlcywgcnVsZXMsIGNoaWxkLCBvcHRpb25zLCBmYWxzZSlcbiAgICB9KVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG4vKipcbiAqIHJldHVybnMgYW4gYXJyYXkgdGhhdCBjb250YWlucyAyIHN0cmluZ3M6IFs8dW5tYXRjaGVkPiwgPG1hdGNoZWQ+XVxuICogam9pbmluZyB0aGUgdHdvIHN0cmluZ3Mgd2l0aCBhIHNwYWNlIHdpbGwgcHJvZHVjZSB0aGUgb3JpZ2luYWwgc2VsZWN0b3JcbiAqIGlmIHRoZSA8bWF0Y2hlZD4gc3RyaW5nIGlzIGVtcHR5LCB0aGVyZSB3YXMgTk8gTUFUQ0ggZm91bmRcbiAqIGlmIG5laXRoZXIgc3RyaW5nIGlzIGVtcHR5LCBpdCB3YXMgYSBwYXJ0aWFsIG1hdGNoXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBtYXRjaGVzXG4gKiBAcGFyYW0ge0RPTUVsZW1lbnR9IGVsZW1lbnRcbiAqIEBwYXJhbSB7U3RyaW5nfSBzZWxlY3RvclxuICogQHBhcmFtIHtCb29sZWFufSBpc1Jvb3RcbiAqIEByZXR1cm4ge0FycmF5PFN0cmluZz59XG4gKi9cbmZ1bmN0aW9uIGZpbmRNYXRjaGluZ1BhcnRPZlNlbGVjdG9yIChtYXRjaGVzLCBlbGVtZW50LCBzZWxlY3RvciwgaXNSb290KSB7XG4gIGNvbnN0IHBhcnRzID0gc2VsZWN0b3Iuc3BsaXQoL1xccysvKVxuICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKCFpc1Jvb3QgJiYgL1srfj5dLy50ZXN0KHBhcnRzW2ldKSkge1xuICAgICAgYnJlYWtcbiAgICB9XG5cbiAgICBjb25zdCBfc2VsZWN0b3IgPSBwYXJ0cy5zbGljZShpKS5qb2luKCcgJylcbiAgICBpZiAobWF0Y2hlcyhlbGVtZW50LCBfc2VsZWN0b3IpKSB7XG4gICAgICByZXR1cm4gW3BhcnRzLnNsaWNlKDAsIGkpLmpvaW4oJyAnKSwgX3NlbGVjdG9yXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBbcGFydHMuam9pbignICcpLCAnJ11cbn1cblxuLyoqXG4gKiBAcGFyYW0ge0FycmF5PEFycmF5PFN0cmluZz4+fSBzZWxlY3RvclxuICogQHBhcmFtIHtDU1NSdWxlfSBydWxlXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5mdW5jdGlvbiBmb3JtYXRSdWxlIChzZWxlY3RvciwgcnVsZSwgb3B0aW9ucykge1xuICBjb25zdCBydWxlT2JqID0ge3NlbGVjdG9yfVxuICBpZiAocnVsZS5wYXJlbnRSdWxlICYmIHJ1bGUucGFyZW50UnVsZS5tZWRpYSkge1xuICAgIHJ1bGVPYmoubWVkaWFUZXh0ID0gcnVsZS5wYXJlbnRSdWxlLm1lZGlhLm1lZGlhVGV4dFxuICB9XG5cbiAgaWYgKG9wdGlvbnMuY3NzVGV4dCA9PT0gdHJ1ZSkge1xuICAgIHJ1bGVPYmouY3NzVGV4dCA9IHJ1bGUuY3NzVGV4dFxuICB9XG5cbiAgaWYgKG9wdGlvbnMuZmluZFBhcnRpYWxNYXRjaGVzKSB7XG4gICAgcnVsZU9iai5pc1BhcnRpYWxNYXRjaCA9IHNlbGVjdG9yLmV2ZXJ5KChbdW5tYXRjaGVkXSkgPT4gdW5tYXRjaGVkKVxuICB9XG5cbiAgcmV0dXJuIHJ1bGVPYmpcbn1cblxuZXhwb3J0IHtcbiAgZmluZFJ1bGVzRm9yRWxlbWVudCxcbiAgZmluZE1hdGNoaW5nUGFydE9mU2VsZWN0b3IsXG4gIGZvcm1hdFJ1bGVcbn1cbiIsImltcG9ydCB7ZmluZE1hdGNoZXNGcm9tUGFnZX0gZnJvbSAnLi9jc3MtcGFyc2VyJ1xuXG5jb25zdCBERUZBVUxUX09QVElPTlMgPSB7XG4gIGNzc1RleHQ6IGZhbHNlLFxuICByZWN1cnNpdmU6IGZhbHNlLFxuICBmaW5kUGFydGlhbE1hdGNoZXM6IHRydWUsXG4gIGZvcm1hdFNlbGVjdG9yOiAoYSwgYikgPT4gW2EsIGJdXG59XG5cbi8qKlxuICogQHBhcmFtIHtPYmplY3R8QXJyYXk8T2JqZWN0Pn0gc3R5bGVzXG4gKiBAcGFyYW0ge1N0cmluZ30gaHRtbFxuICogQHBhcmFtIHtPYmplY3R9IHVzZXJPcHRpb25zXG4gKiBAcmV0dXJuIHtQcm9taXNlPE9iamVjdD59XG4gKi9cbmZ1bmN0aW9uIGZpbmRNYXRjaGVzIChzdHlsZXMsIGh0bWwsIHVzZXJPcHRpb25zKSB7XG4gIGNvbnN0IHN0eWxlc0FycmF5ID0gQXJyYXkuaXNBcnJheShzdHlsZXMpID8gc3R5bGVzIDogW3N0eWxlc11cbiAgY29uc3Qgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfT1BUSU9OUywgdXNlck9wdGlvbnMpXG4gIHJldHVybiBmaW5kTWF0Y2hlc0Zyb21QYWdlKHN0eWxlc0FycmF5LCBodG1sLCBvcHRpb25zKVxufVxuXG5leHBvcnQge2ZpbmRNYXRjaGVzfVxuIl0sIm5hbWVzIjpbIkNTU19SVUxFX1RZUEVTIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7O0FBSUEsQUFBWSxNQUFDLGNBQWMsR0FBRztFQUM1QixjQUFjO0VBQ2QsWUFBWTtFQUNaLGNBQWM7RUFDZCxhQUFhO0VBQ2IsWUFBWTtFQUNaLGdCQUFnQjtFQUNoQixXQUFXO0VBQ1gsZ0JBQWdCO0VBQ2hCLGVBQWU7RUFDZixJQUFJO0VBQ0osZ0JBQWdCO0VBQ2hCLG9CQUFvQjtFQUNwQixlQUFlO0VBQ2YsZUFBZTtFQUNmLDBCQUEwQjtFQUMxQixlQUFlO0VBQ2YsbUJBQW1CO0NBQ3BCOztBQ3RCRDs7Ozs7Ozs7Ozs7QUFXQSxTQUFTLFNBQVMsRUFBRSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsRUFBRSxPQUFPLEVBQUU7RUFDaEQsTUFBTSxNQUFNLEdBQUc7SUFDYixPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUk7TUFDNUIsT0FBTztRQUNMLEdBQUcsS0FBSztRQUNSLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxLQUFLO1VBQ3JELE9BQU8sT0FBTyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRTtTQUNuRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztPQUNkO0tBQ0YsQ0FBQztJQUNIOztFQUVE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
