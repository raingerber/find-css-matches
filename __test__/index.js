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
 * @param {String} html
 * @return {String}
 */
function getSelector (html) {
  const match = /<\s*([a-z]+)/i.exec(html);
  if (!match) {
    throw new Error('Input HTML does not contain a valid tag.')
  }

  const tagName = match[1].toLowerCase();
  const selector = `${tagName}:first-of-type`;
  return selector
}

/**
 * needs to be run in a browser context
 * @param {Object} CSS_RULE_TYPES
 * @param {String} elementQuery
 * @param {Object} options
 * @return {Array<Object>}
 */
function findMatchingSelectors (CSS_RULE_TYPES$$1, elementQuery, options) {
  const matches = Function.call.bind(window.Element.prototype.webkitMatchesSelector);

  function findMatchingRules(matches, allRules, element, options, isRoot) {
    const result = {
      matches: allRules.reduce((acc, rule) => {
        let hasMatch = false;
        const selectorParts = rule.selectorText.trim().split(/\s*,\s*/);
        const segments = selectorParts.map(part => {
          let segmented;
          if (options.findPartialMatches) {
            segmented = findMatchingSegment(matches, element, part, isRoot);
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
          const formatted = formatRule(segments, rule, options);
          acc.push(formatted);
        }

        return acc
      }, [])
    };

    if (options.recursive === true) {
      result.children = Array.prototype.map.call(element.children, child => {
        return findMatchingRules(matches, allRules, child, options, false)
      });
    }

    return result
  }

  function findMatchingSegment(matches, element, selector, isRoot) {
    const parts = selector.split(/\s+/);
    let i = isRoot ? parts.length - 1 : 0;
    while (i < parts.length && !/[+~>]/.test(parts[i])) {
      const segment = parts.slice(i).join(' ');
      if (matches(element, segment)) {
        return [parts.slice(0, i).join(' '), segment]
      }

      i++;
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
  return findMatchingRules(matches, rules, element, options, true)
}

/**
 * this needs to be called outside the browser scope,
 * because it uses options.unmatched and options.matched,
 * but functions can't be passed into page.evaluate
 * @param {Object} param0
 * @param {Array} param0.matches
 * @param {Array} param0.children
 * @param {Object} options
 * @return {Object}
 */
function stringify ({matches, children}, options) {
  const result = {
    matches: matches.map(match => {
      return {
        ...match,
        selector: match.selector.map(([unmatched, matched]) => {
          return `${options.unmatched(unmatched)} ${options.matched(matched)}`.trim()
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
 * @param {Array<Object>} styles
 * @param {String} html
 * @param {Object} options
 * @return {Object}
 */
async function getMatchingSelectors (styles, html, options) {
  const elementQuery = getSelector(html);
  const browser = await puppeteer.launch();
  const page = await createPage(browser, styles, html);
  let selectors = await page.evaluate(
    findMatchingSelectors,
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
 * @param {Array<CSSRule>} allRules
 * @param {DOMElement} element
 * @param {Object} options
 * @param {Boolean} isRoot
 * @return {Object}
 */
function findMatchingRules (matches, allRules, element, options, isRoot) {
  const result = {
    matches: allRules.reduce((acc, rule) => {
      let hasMatch = false;
      const selectorParts = rule.selectorText.trim().split(/\s*,\s*/);
      const segments = selectorParts.map(part => {
        let segmented;
        if (options.findPartialMatches) {
          segmented = findMatchingSegment(matches, element, part, isRoot);
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
        const formatted = formatRule(segments, rule, options);
        acc.push(formatted);
      }

      return acc
    }, [])
  };

  if (options.recursive === true) {
    result.children = Array.prototype.map.call(element.children, child => {
      return findMatchingRules(matches, allRules, child, options, false)
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
function findMatchingSegment (matches, element, selector, isRoot) {
  const parts = selector.split(/\s+/);
  let i = isRoot ? parts.length - 1 : 0;
  while (i < parts.length && !/[+~>]/.test(parts[i])) {
    const segment = parts.slice(i).join(' ');
    if (matches(element, segment)) {
      return [parts.slice(0, i).join(' '), segment]
    }

    i++;
  }

  return [parts.join(' '), '']
}

/**
 * @param {String} selector
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

  return ruleObj
}

const identity = input => input;

const castArray = input => Array.isArray(input) ? input : [input];

/**
 * @param {Object} rawOptions
 * @return {Object}
 */
function normalizeOptions (rawOptions) {
  let {findPartialMatches, recursive, cssText, unmatched, matched} = rawOptions;
  if (typeof findPartialMatches !== 'boolean') findPartialMatches = true;
  if (typeof recursive !== 'boolean') recursive = false;
  if (typeof cssText !== 'boolean') cssText = false;
  if (typeof unmatched !== 'function') unmatched = identity;
  if (typeof matched !== 'function') matched = identity;
  return {findPartialMatches, recursive, cssText, unmatched, matched}
}

/**
 * @param {Object|Array} styles
 * @param {String} html
 * @param {Object} rawOptions
 * @return {Promise<Object>}
 */
function findMatches (styles, html, rawOptions = {}) {
  const options = normalizeOptions(rawOptions);
  return getMatchingSelectors(castArray(styles), html, options)
}

exports.CSS_RULE_TYPES = CSS_RULE_TYPES;
exports.getMatchingSelectors = getMatchingSelectors;
exports.findMatchingRules = findMatchingRules;
exports.findMatchingSegment = findMatchingSegment;
exports.formatRule = formatRule;
exports.findMatches = findMatches;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9jb25zdGFudHMuanMiLCIuLi9zcmMvY3NzLXBhcnNlci5qcyIsIi4uL3NyYy9mdW5jdGlvbnMuanMiLCIuLi9zcmMvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tbXVsdGktc3BhY2VzICovXG5cbi8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9DU1NSdWxlXG5cbmV4cG9ydCBjb25zdCBDU1NfUlVMRV9UWVBFUyA9IFtcbiAgJ1VOS05PV05fUlVMRScsICAgICAgICAgICAgICAgIC8vIDBcbiAgJ1NUWUxFX1JVTEUnLCAgICAgICAgICAgICAgICAgIC8vIDFcbiAgJ0NIQVJTRVRfUlVMRScsICAgICAgICAgICAgICAgIC8vIDJcbiAgJ0lNUE9SVF9SVUxFJywgICAgICAgICAgICAgICAgIC8vIDNcbiAgJ01FRElBX1JVTEUnLCAgICAgICAgICAgICAgICAgIC8vIDRcbiAgJ0ZPTlRfRkFDRV9SVUxFJywgICAgICAgICAgICAgIC8vIDVcbiAgJ1BBR0VfUlVMRScsICAgICAgICAgICAgICAgICAgIC8vIDZcbiAgJ0tFWUZSQU1FU19SVUxFJywgICAgICAgICAgICAgIC8vIDdcbiAgJ0tFWUZSQU1FX1JVTEUnLCAgICAgICAgICAgICAgIC8vIDhcbiAgbnVsbCwgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDlcbiAgJ05BTUVTUEFDRV9SVUxFJywgICAgICAgICAgICAgIC8vIDEwXG4gICdDT1VOVEVSX1NUWUxFX1JVTEUnLCAgICAgICAgICAvLyAxMVxuICAnU1VQUE9SVFNfUlVMRScsICAgICAgICAgICAgICAgLy8gMTJcbiAgJ0RPQ1VNRU5UX1JVTEUnLCAgICAgICAgICAgICAgIC8vIDEzXG4gICdGT05UX0ZFQVRVUkVfVkFMVUVTX1JVTEUnLCAgICAvLyAxNFxuICAnVklFV1BPUlRfUlVMRScsICAgICAgICAgICAgICAgLy8gMTVcbiAgJ1JFR0lPTl9TVFlMRV9SVUxFJyAgICAgICAgICAgIC8vIDE2XG5dXG4iLCJpbXBvcnQgcHVwcGV0ZWVyIGZyb20gJ3B1cHBldGVlcidcblxuaW1wb3J0IHtDU1NfUlVMRV9UWVBFU30gZnJvbSAnLi9jb25zdGFudHMnXG5cbi8qKlxuICogQHBhcmFtIHtTdHJpbmd9IGh0bWxcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZ2V0U2VsZWN0b3IgKGh0bWwpIHtcbiAgY29uc3QgbWF0Y2ggPSAvPFxccyooW2Etel0rKS9pLmV4ZWMoaHRtbClcbiAgaWYgKCFtYXRjaCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW5wdXQgSFRNTCBkb2VzIG5vdCBjb250YWluIGEgdmFsaWQgdGFnLicpXG4gIH1cblxuICBjb25zdCB0YWdOYW1lID0gbWF0Y2hbMV0udG9Mb3dlckNhc2UoKVxuICBjb25zdCBzZWxlY3RvciA9IGAke3RhZ05hbWV9OmZpcnN0LW9mLXR5cGVgXG4gIHJldHVybiBzZWxlY3RvclxufVxuXG4vKipcbiAqIG5lZWRzIHRvIGJlIHJ1biBpbiBhIGJyb3dzZXIgY29udGV4dFxuICogQHBhcmFtIHtPYmplY3R9IENTU19SVUxFX1RZUEVTXG4gKiBAcGFyYW0ge1N0cmluZ30gZWxlbWVudFF1ZXJ5XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7QXJyYXk8T2JqZWN0Pn1cbiAqL1xuZnVuY3Rpb24gZmluZE1hdGNoaW5nU2VsZWN0b3JzIChDU1NfUlVMRV9UWVBFUywgZWxlbWVudFF1ZXJ5LCBvcHRpb25zKSB7XG4gIGNvbnN0IG1hdGNoZXMgPSBGdW5jdGlvbi5jYWxsLmJpbmQod2luZG93LkVsZW1lbnQucHJvdG90eXBlLndlYmtpdE1hdGNoZXNTZWxlY3RvcilcblxuICAvLyBTVFVCOmZpbmRNYXRjaGluZ1J1bGVzXG5cbiAgLy8gU1RVQjpmaW5kTWF0Y2hpbmdTZWdtZW50XG5cbiAgLy8gU1RVQjpmb3JtYXRSdWxlXG5cbiAgbGV0IHJ1bGVzID0gW11cbiAgZm9yIChsZXQge2Nzc1J1bGVzfSBvZiBkb2N1bWVudC5zdHlsZVNoZWV0cykge1xuICAgIGZvciAobGV0IHJ1bGUgb2YgY3NzUnVsZXMpIHtcbiAgICAgIHN3aXRjaCAoQ1NTX1JVTEVfVFlQRVNbcnVsZS50eXBlXSkge1xuICAgICAgICBjYXNlICdTVFlMRV9SVUxFJzpcbiAgICAgICAgICBydWxlcy5wdXNoKHJ1bGUpXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAnTUVESUFfUlVMRSc6XG4gICAgICAgICAgcnVsZXMuc3BsaWNlKHJ1bGVzLmxlbmd0aCwgMCwgLi4ucnVsZS5jc3NSdWxlcylcbiAgICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW1lbnRRdWVyeSlcblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW5kZWZcbiAgcmV0dXJuIGZpbmRNYXRjaGluZ1J1bGVzKG1hdGNoZXMsIHJ1bGVzLCBlbGVtZW50LCBvcHRpb25zLCB0cnVlKVxufVxuXG4vKipcbiAqIHRoaXMgbmVlZHMgdG8gYmUgY2FsbGVkIG91dHNpZGUgdGhlIGJyb3dzZXIgc2NvcGUsXG4gKiBiZWNhdXNlIGl0IHVzZXMgb3B0aW9ucy51bm1hdGNoZWQgYW5kIG9wdGlvbnMubWF0Y2hlZCxcbiAqIGJ1dCBmdW5jdGlvbnMgY2FuJ3QgYmUgcGFzc2VkIGludG8gcGFnZS5ldmFsdWF0ZVxuICogQHBhcmFtIHtPYmplY3R9IHBhcmFtMFxuICogQHBhcmFtIHtBcnJheX0gcGFyYW0wLm1hdGNoZXNcbiAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtMC5jaGlsZHJlblxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuZnVuY3Rpb24gc3RyaW5naWZ5ICh7bWF0Y2hlcywgY2hpbGRyZW59LCBvcHRpb25zKSB7XG4gIGNvbnN0IHJlc3VsdCA9IHtcbiAgICBtYXRjaGVzOiBtYXRjaGVzLm1hcChtYXRjaCA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi5tYXRjaCxcbiAgICAgICAgc2VsZWN0b3I6IG1hdGNoLnNlbGVjdG9yLm1hcCgoW3VubWF0Y2hlZCwgbWF0Y2hlZF0pID0+IHtcbiAgICAgICAgICByZXR1cm4gYCR7b3B0aW9ucy51bm1hdGNoZWQodW5tYXRjaGVkKX0gJHtvcHRpb25zLm1hdGNoZWQobWF0Y2hlZCl9YC50cmltKClcbiAgICAgICAgfSkuam9pbignLCAnKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBpZiAoY2hpbGRyZW4pIHtcbiAgICByZXN1bHQuY2hpbGRyZW4gPSBjaGlsZHJlbi5tYXAoY2hpbGQgPT4gc3RyaW5naWZ5KGNoaWxkLCBvcHRpb25zKSlcbiAgfVxuXG4gIHJldHVybiByZXN1bHRcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0Jyb3dzZXJ9IGJyb3dzZXJcbiAqIEBwYXJhbSB7QXJyYXk8T2JqZWN0Pn0gc3R5bGVzXG4gKiBAcGFyYW0ge1N0cmluZ30gaHRtbFxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5hc3luYyBmdW5jdGlvbiBjcmVhdGVQYWdlIChicm93c2VyLCBzdHlsZXMsIGh0bWwpIHtcbiAgY29uc3QgcGFnZSA9IGF3YWl0IGJyb3dzZXIubmV3UGFnZSgpXG4gIGF3YWl0IHBhZ2Uuc2V0Q29udGVudChodG1sKVxuICBmb3IgKGxldCBzdHlsZSBvZiBzdHlsZXMpIHtcbiAgICBhd2FpdCBwYWdlLmFkZFN0eWxlVGFnKHN0eWxlKVxuICB9XG5cbiAgcGFnZS5vbignY29uc29sZScsIG1zZyA9PiBjb25zb2xlLmxvZyhtc2cudGV4dCgpKSlcbiAgcmV0dXJuIHBhZ2Vcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0FycmF5PE9iamVjdD59IHN0eWxlc1xuICogQHBhcmFtIHtTdHJpbmd9IGh0bWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdldE1hdGNoaW5nU2VsZWN0b3JzIChzdHlsZXMsIGh0bWwsIG9wdGlvbnMpIHtcbiAgY29uc3QgZWxlbWVudFF1ZXJ5ID0gZ2V0U2VsZWN0b3IoaHRtbClcbiAgY29uc3QgYnJvd3NlciA9IGF3YWl0IHB1cHBldGVlci5sYXVuY2goKVxuICBjb25zdCBwYWdlID0gYXdhaXQgY3JlYXRlUGFnZShicm93c2VyLCBzdHlsZXMsIGh0bWwpXG4gIGxldCBzZWxlY3RvcnMgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKFxuICAgIGZpbmRNYXRjaGluZ1NlbGVjdG9ycyxcbiAgICBDU1NfUlVMRV9UWVBFUyxcbiAgICBlbGVtZW50UXVlcnksXG4gICAgb3B0aW9uc1xuICApXG5cbiAgYnJvd3Nlci5jbG9zZSgpXG4gIHNlbGVjdG9ycyA9IHN0cmluZ2lmeShzZWxlY3RvcnMsIG9wdGlvbnMpXG4gIHJldHVybiBzZWxlY3RvcnNcbn1cblxuZXhwb3J0IHtcbiAgZ2V0TWF0Y2hpbmdTZWxlY3RvcnNcbn1cbiIsIi8qKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gbWF0Y2hlc1xuICogQHBhcmFtIHtBcnJheTxDU1NSdWxlPn0gYWxsUnVsZXNcbiAqIEBwYXJhbSB7RE9NRWxlbWVudH0gZWxlbWVudFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNSb290XG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbmZ1bmN0aW9uIGZpbmRNYXRjaGluZ1J1bGVzIChtYXRjaGVzLCBhbGxSdWxlcywgZWxlbWVudCwgb3B0aW9ucywgaXNSb290KSB7XG4gIGNvbnN0IHJlc3VsdCA9IHtcbiAgICBtYXRjaGVzOiBhbGxSdWxlcy5yZWR1Y2UoKGFjYywgcnVsZSkgPT4ge1xuICAgICAgbGV0IGhhc01hdGNoID0gZmFsc2VcbiAgICAgIGNvbnN0IHNlbGVjdG9yUGFydHMgPSBydWxlLnNlbGVjdG9yVGV4dC50cmltKCkuc3BsaXQoL1xccyosXFxzKi8pXG4gICAgICBjb25zdCBzZWdtZW50cyA9IHNlbGVjdG9yUGFydHMubWFwKHBhcnQgPT4ge1xuICAgICAgICBsZXQgc2VnbWVudGVkXG4gICAgICAgIGlmIChvcHRpb25zLmZpbmRQYXJ0aWFsTWF0Y2hlcykge1xuICAgICAgICAgIHNlZ21lbnRlZCA9IGZpbmRNYXRjaGluZ1NlZ21lbnQobWF0Y2hlcywgZWxlbWVudCwgcGFydCwgaXNSb290KVxuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoZXMoZWxlbWVudCwgcGFydCkpIHtcbiAgICAgICAgICBzZWdtZW50ZWQgPSBbJycsIHBhcnRdXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2VnbWVudGVkID0gW3BhcnQsICcnXVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNlZ21lbnRlZFsxXSkge1xuICAgICAgICAgIGhhc01hdGNoID0gdHJ1ZVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNlZ21lbnRlZFxuICAgICAgfSlcblxuICAgICAgaWYgKGhhc01hdGNoKSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZCA9IGZvcm1hdFJ1bGUoc2VnbWVudHMsIHJ1bGUsIG9wdGlvbnMpXG4gICAgICAgIGFjYy5wdXNoKGZvcm1hdHRlZClcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGFjY1xuICAgIH0sIFtdKVxuICB9XG5cbiAgaWYgKG9wdGlvbnMucmVjdXJzaXZlID09PSB0cnVlKSB7XG4gICAgcmVzdWx0LmNoaWxkcmVuID0gQXJyYXkucHJvdG90eXBlLm1hcC5jYWxsKGVsZW1lbnQuY2hpbGRyZW4sIGNoaWxkID0+IHtcbiAgICAgIHJldHVybiBmaW5kTWF0Y2hpbmdSdWxlcyhtYXRjaGVzLCBhbGxSdWxlcywgY2hpbGQsIG9wdGlvbnMsIGZhbHNlKVxuICAgIH0pXG4gIH1cblxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qKlxuICogcmV0dXJucyBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIDIgc3RyaW5nczogWzx1bm1hdGNoZWQ+LCA8bWF0Y2hlZD5dXG4gKiBqb2luaW5nIHRoZSB0d28gc3RyaW5ncyB3aXRoIGEgc3BhY2Ugd2lsbCBwcm9kdWNlIHRoZSBvcmlnaW5hbCBzZWxlY3RvclxuICogaWYgdGhlIDxtYXRjaGVkPiBzdHJpbmcgaXMgZW1wdHksIHRoZXJlIHdhcyBOTyBNQVRDSCBmb3VuZFxuICogaWYgbmVpdGhlciBzdHJpbmcgaXMgZW1wdHksIGl0IHdhcyBhIHBhcnRpYWwgbWF0Y2hcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG1hdGNoZXNcbiAqIEBwYXJhbSB7RE9NRWxlbWVudH0gZWxlbWVudFxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGlzUm9vdFxuICogQHJldHVybiB7QXJyYXk8U3RyaW5nPn1cbiAqL1xuZnVuY3Rpb24gZmluZE1hdGNoaW5nU2VnbWVudCAobWF0Y2hlcywgZWxlbWVudCwgc2VsZWN0b3IsIGlzUm9vdCkge1xuICBjb25zdCBwYXJ0cyA9IHNlbGVjdG9yLnNwbGl0KC9cXHMrLylcbiAgbGV0IGkgPSBpc1Jvb3QgPyBwYXJ0cy5sZW5ndGggLSAxIDogMFxuICB3aGlsZSAoaSA8IHBhcnRzLmxlbmd0aCAmJiAhL1srfj5dLy50ZXN0KHBhcnRzW2ldKSkge1xuICAgIGNvbnN0IHNlZ21lbnQgPSBwYXJ0cy5zbGljZShpKS5qb2luKCcgJylcbiAgICBpZiAobWF0Y2hlcyhlbGVtZW50LCBzZWdtZW50KSkge1xuICAgICAgcmV0dXJuIFtwYXJ0cy5zbGljZSgwLCBpKS5qb2luKCcgJyksIHNlZ21lbnRdXG4gICAgfVxuXG4gICAgaSsrXG4gIH1cblxuICByZXR1cm4gW3BhcnRzLmpvaW4oJyAnKSwgJyddXG59XG5cbi8qKlxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yXG4gKiBAcGFyYW0ge0NTU1J1bGV9IHJ1bGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbmZ1bmN0aW9uIGZvcm1hdFJ1bGUgKHNlbGVjdG9yLCBydWxlLCBvcHRpb25zKSB7XG4gIGNvbnN0IHJ1bGVPYmogPSB7c2VsZWN0b3J9XG4gIGlmIChydWxlLnBhcmVudFJ1bGUgJiYgcnVsZS5wYXJlbnRSdWxlLm1lZGlhKSB7XG4gICAgcnVsZU9iai5tZWRpYVRleHQgPSBydWxlLnBhcmVudFJ1bGUubWVkaWEubWVkaWFUZXh0XG4gIH1cblxuICBpZiAob3B0aW9ucy5jc3NUZXh0ID09PSB0cnVlKSB7XG4gICAgcnVsZU9iai5jc3NUZXh0ID0gcnVsZS5jc3NUZXh0XG4gIH1cblxuICByZXR1cm4gcnVsZU9ialxufVxuXG5leHBvcnQge1xuICBmaW5kTWF0Y2hpbmdSdWxlcyxcbiAgZmluZE1hdGNoaW5nU2VnbWVudCxcbiAgZm9ybWF0UnVsZVxufVxuIiwiaW1wb3J0IHtnZXRNYXRjaGluZ1NlbGVjdG9yc30gZnJvbSAnLi9jc3MtcGFyc2VyJ1xuXG5jb25zdCBpZGVudGl0eSA9IGlucHV0ID0+IGlucHV0XG5cbmNvbnN0IGNhc3RBcnJheSA9IGlucHV0ID0+IEFycmF5LmlzQXJyYXkoaW5wdXQpID8gaW5wdXQgOiBbaW5wdXRdXG5cbi8qKlxuICogQHBhcmFtIHtPYmplY3R9IHJhd09wdGlvbnNcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuZnVuY3Rpb24gbm9ybWFsaXplT3B0aW9ucyAocmF3T3B0aW9ucykge1xuICBsZXQge2ZpbmRQYXJ0aWFsTWF0Y2hlcywgcmVjdXJzaXZlLCBjc3NUZXh0LCB1bm1hdGNoZWQsIG1hdGNoZWR9ID0gcmF3T3B0aW9uc1xuICBpZiAodHlwZW9mIGZpbmRQYXJ0aWFsTWF0Y2hlcyAhPT0gJ2Jvb2xlYW4nKSBmaW5kUGFydGlhbE1hdGNoZXMgPSB0cnVlXG4gIGlmICh0eXBlb2YgcmVjdXJzaXZlICE9PSAnYm9vbGVhbicpIHJlY3Vyc2l2ZSA9IGZhbHNlXG4gIGlmICh0eXBlb2YgY3NzVGV4dCAhPT0gJ2Jvb2xlYW4nKSBjc3NUZXh0ID0gZmFsc2VcbiAgaWYgKHR5cGVvZiB1bm1hdGNoZWQgIT09ICdmdW5jdGlvbicpIHVubWF0Y2hlZCA9IGlkZW50aXR5XG4gIGlmICh0eXBlb2YgbWF0Y2hlZCAhPT0gJ2Z1bmN0aW9uJykgbWF0Y2hlZCA9IGlkZW50aXR5XG4gIHJldHVybiB7ZmluZFBhcnRpYWxNYXRjaGVzLCByZWN1cnNpdmUsIGNzc1RleHQsIHVubWF0Y2hlZCwgbWF0Y2hlZH1cbn1cblxuLyoqXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheX0gc3R5bGVzXG4gKiBAcGFyYW0ge1N0cmluZ30gaHRtbFxuICogQHBhcmFtIHtPYmplY3R9IHJhd09wdGlvbnNcbiAqIEByZXR1cm4ge1Byb21pc2U8T2JqZWN0Pn1cbiAqL1xuZnVuY3Rpb24gZmluZE1hdGNoZXMgKHN0eWxlcywgaHRtbCwgcmF3T3B0aW9ucyA9IHt9KSB7XG4gIGNvbnN0IG9wdGlvbnMgPSBub3JtYWxpemVPcHRpb25zKHJhd09wdGlvbnMpXG4gIHJldHVybiBnZXRNYXRjaGluZ1NlbGVjdG9ycyhjYXN0QXJyYXkoc3R5bGVzKSwgaHRtbCwgb3B0aW9ucylcbn1cblxuZXhwb3J0IHtmaW5kTWF0Y2hlc31cbiJdLCJuYW1lcyI6WyJDU1NfUlVMRV9UWVBFUyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7OztBQUlBLEFBQVksTUFBQyxjQUFjLEdBQUc7RUFDNUIsY0FBYztFQUNkLFlBQVk7RUFDWixjQUFjO0VBQ2QsYUFBYTtFQUNiLFlBQVk7RUFDWixnQkFBZ0I7RUFDaEIsV0FBVztFQUNYLGdCQUFnQjtFQUNoQixlQUFlO0VBQ2YsSUFBSTtFQUNKLGdCQUFnQjtFQUNoQixvQkFBb0I7RUFDcEIsZUFBZTtFQUNmLGVBQWU7RUFDZiwwQkFBMEI7RUFDMUIsZUFBZTtFQUNmLG1CQUFtQjtDQUNwQjs7QUNsQkQ7Ozs7QUFJQSxTQUFTLFdBQVcsRUFBRSxJQUFJLEVBQUU7RUFDMUIsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUM7RUFDeEMsSUFBSSxDQUFDLEtBQUssRUFBRTtJQUNWLE1BQU0s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
