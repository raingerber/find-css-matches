'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var puppeteer = _interopDefault(require('puppeteer'));
var chalk = _interopDefault(require('chalk'));

/* eslint-disable no-multi-spaces */

// https://developer.mozilla.org/en-US/docs/Web/API/CSSRule

var CSS_RULE_TYPES = [
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
]

/**
 * @param {String} html
 * @return {String}
 */
function getSelector (html) {
  const match = /<\s*([a-z]+)/i.exec(html); // TODO what's the difference between exec and match again?
  if (!match) {
    throw new Error(`Input HTML was not valid. Received:\n"${html}"`) // TODO truncate the html?
  }

  const tagName = match[1].toLowerCase();
  // console.log('tagName:', tagName, html)
  // TODO are there other singletons?
  // TODO this tagName should be taken into account when doing isRoot
  if (['html', 'head', 'body'].includes(tagName)) {
    return tagName
  }

  return `body > ${tagName}` // TODO use first child of type instead?
}

/**
 * needs to be run in a browser context
 * @param {Object} CSS_RULE_TYPES TODO - should this be a stub as well
 * @param {String} elementQuery
 * @param {Boolean} options
 * @return {Array}
 */
function findMatchingSelectors (CSS_RULE_TYPES$$1, elementQuery, options) {
  // TODO are both of these necessary?
  const matches = Function.call.bind(
    window.Element.prototype.matchesSelector ||
    window.Element.prototype.webkitMatchesSelector
  );

function getMatchingRules(matches, rules, element, options, isRoot) {
  const result = {};
  const matchingRules = getRulesForElement(matches, rules, element, isRoot);
  result.selectors = matchingRules.map(({selector, rule}) => {
    const ruleObj = {selector};
    if (rule.parentRule && rule.parentRule.media) {
      ruleObj.mediaText = rule.parentRule.media.mediaText;
    }

    if (options.cssText === true) {
      ruleObj.cssText = rule.cssText;
    }

    return ruleObj
  });

  if (options.recursive !== true) {
    return result
  }

  // TODO children or childNodes?
  result.children = Array.prototype.map.call(element.children, child => {
    return getMatchingRules(matches, rules, child, options, false)
  });

  return result
}

function getRulesForElement(matches, rules, element, isRoot) {
  return rules.reduce((acc, rule) => {
    let foundMatch = false;
    const parts = rule.selectorText.trim().split(/\s*,\s*/);
    const selector = parts.map(segment => {
      const segmented = findMatchingSegment(matches, element, segment, isRoot);
      if (segmented[1]) {
        foundMatch = true;
      }

      return segmented
    });

    if (foundMatch) {
      acc.push({selector, rule});
    }

    return acc
  }, [])
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

  let rules = [];
  for (let {cssRules} of document.styleSheets) {
    rules = rules.concat(addCssRules(cssRules)); // TODO use splice?
  }

  function addCssRules (rules, result = []) {
    for (let rule of rules) {
      switch (CSS_RULE_TYPES$$1[rule.type]) {
        case 'STYLE_RULE':
          result.push(rule);
          break
        case 'MEDIA_RULE':
          result = addCssRules(rule.cssRules, result);
          break
      }
    }

    return result
  }

  const element = document.querySelector(elementQuery);

  // eslint-disable-next-line no-undef
  return getMatchingRules(matches, rules, element, options, true)
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
  // console.log(await page.content())
  for (let i = 0; i < styles.length; i++) {
    await page.addStyleTag(styles[i]);
  }

  await page.on('console', msg => console.log(msg.text())); // TODO is await needed here?
  return page
}

/**
 * @param {Array<Object>} styles
 * @param {String} html
 * @param {Object} options
 * @return {Promise<Array>}
 */
async function getMatchingSelectors (styles, html, options) {
  styles = Array.isArray(styles) ? styles : [styles];
  const elementQuery = getSelector(html);
  return puppeteer.launch().then(async browser => {
    const page = await createPage(browser, styles, html);
    const selectors = await page.evaluate(
      findMatchingSelectors,
      CSS_RULE_TYPES,
      elementQuery,
      options
    );

    browser.close();
    return selectors
  })
}

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
  }).join('\n');

  result += children.map(child => {
    return `\n\n${stringify(child, `${indent}  `)}`
  }).join('');

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
    let result = chalk.yellow(unmatched);
    if (unmatched && matched) result += ' ';
    result += chalk.green.underline(matched);
    return result
  }).join(', ');

  return `${indent}${mediaText ? `${chalk.yellow(mediaText)}\n${indent}` : ''}${selector} ${chalk.dim(hash)}`
}

// TODO what about this case .a>.b -- do we need to account for combinators without spaces around them? or does chrome format them with spaces?

/**
 * @param {Function} matches
 * @param {Array<CSSRule>} rules
 * @param {DOMElement} element
 * @param {Object} options
 * @param {Boolean} isRoot
 * @return {Object}
 */
function getMatchingRules (matches, rules, element, options, isRoot) {
  const result = {};
  const matchingRules = getRulesForElement(matches, rules, element, isRoot);
  result.selectors = matchingRules.map(({selector, rule}) => {
    const ruleObj = {selector};
    if (rule.parentRule && rule.parentRule.media) {
      ruleObj.mediaText = rule.parentRule.media.mediaText;
    }

    if (options.cssText === true) {
      ruleObj.cssText = rule.cssText;
    }

    return ruleObj
  });

  if (options.recursive !== true) {
    return result
  }

  // TODO children or childNodes?
  result.children = Array.prototype.map.call(element.children, child => {
    return getMatchingRules(matches, rules, child, options, false)
  });

  return result
}

/**
 * @param {Function} matches
 * @param {Array<CSSRule>} rules
 * @param {DOMElement} element
 * @param {Boolean} isRoot
 * @return {Array<String>}
 */
function getRulesForElement (matches, rules, element, isRoot) {
  return rules.reduce((acc, rule) => {
    let foundMatch = false;
    const parts = rule.selectorText.trim().split(/\s*,\s*/);
    const selector = parts.map(segment => {
      const segmented = findMatchingSegment(matches, element, segment, isRoot);
      if (segmented[1]) {
        foundMatch = true;
      }

      return segmented
    });

    if (foundMatch) {
      acc.push({selector, rule});
    }

    return acc
  }, [])
}

/**
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

exports.getMatchingSelectors = getMatchingSelectors;
exports.stringify = stringify;
exports.getMatchingRules = getMatchingRules;
exports.getRulesForElement = getRulesForElement;
exports.findMatchingSegment = findMatchingSegment;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9jc3MtcnVsZS10eXBlcy5qcyIsIi4uL3NyYy9jc3MtcGFyc2VyLmpzIiwiLi4vc3JjL2Zvcm1hdHRlci5qcyIsIi4uL3NyYy9mdW5jdGlvbnMuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tbXVsdGktc3BhY2VzICovXG5cbi8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9DU1NSdWxlXG5cbmV4cG9ydCBkZWZhdWx0IFtcbiAgJ1VOS05PV05fUlVMRScsICAgICAgICAgICAgICAvLyAwXG4gICdTVFlMRV9SVUxFJywgICAgICAgICAgICAgICAgLy8gMVxuICAnQ0hBUlNFVF9SVUxFJywgICAgICAgICAgICAgIC8vIDJcbiAgJ0lNUE9SVF9SVUxFJywgICAgICAgICAgICAgICAvLyAzXG4gICdNRURJQV9SVUxFJywgICAgICAgICAgICAgICAgLy8gNFxuICAnRk9OVF9GQUNFX1JVTEUnLCAgICAgICAgICAgIC8vIDVcbiAgJ1BBR0VfUlVMRScsICAgICAgICAgICAgICAgICAvLyA2XG4gICdLRVlGUkFNRVNfUlVMRScsICAgICAgICAgICAgLy8gN1xuICAnS0VZRlJBTUVfUlVMRScsICAgICAgICAgICAgIC8vIDhcbiAgbnVsbCwgICAgICAgICAgICAgICAgICAgICAgICAvLyA5XG4gICdOQU1FU1BBQ0VfUlVMRScsICAgICAgICAgICAgLy8gMTBcbiAgJ0NPVU5URVJfU1RZTEVfUlVMRScsICAgICAgICAvLyAxMVxuICAnU1VQUE9SVFNfUlVMRScsICAgICAgICAgICAgIC8vIDEyXG4gICdET0NVTUVOVF9SVUxFJywgICAgICAgICAgICAgLy8gMTNcbiAgJ0ZPTlRfRkVBVFVSRV9WQUxVRVNfUlVMRScsICAvLyAxNFxuICAnVklFV1BPUlRfUlVMRScsICAgICAgICAgICAgIC8vIDE1XG4gICdSRUdJT05fU1RZTEVfUlVMRScgICAgICAgICAgLy8gMTZcbl1cbiIsImltcG9ydCBwdXBwZXRlZXIgZnJvbSAncHVwcGV0ZWVyJ1xuXG5pbXBvcnQgQ1NTX1JVTEVfVFlQRVMgZnJvbSAnLi9jc3MtcnVsZS10eXBlcydcblxuLyoqXG4gKiBAcGFyYW0ge1N0cmluZ30gaHRtbFxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5mdW5jdGlvbiBnZXRTZWxlY3RvciAoaHRtbCkge1xuICBjb25zdCBtYXRjaCA9IC88XFxzKihbYS16XSspL2kuZXhlYyhodG1sKSAvLyBUT0RPIHdoYXQncyB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIGV4ZWMgYW5kIG1hdGNoIGFnYWluP1xuICBpZiAoIW1hdGNoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnB1dCBIVE1MIHdhcyBub3QgdmFsaWQuIFJlY2VpdmVkOlxcblwiJHtodG1sfVwiYCkgLy8gVE9ETyB0cnVuY2F0ZSB0aGUgaHRtbD9cbiAgfVxuXG4gIGNvbnN0IHRhZ05hbWUgPSBtYXRjaFsxXS50b0xvd2VyQ2FzZSgpXG4gIC8vIGNvbnNvbGUubG9nKCd0YWdOYW1lOicsIHRhZ05hbWUsIGh0bWwpXG4gIC8vIFRPRE8gYXJlIHRoZXJlIG90aGVyIHNpbmdsZXRvbnM/XG4gIC8vIFRPRE8gdGhpcyB0YWdOYW1lIHNob3VsZCBiZSB0YWtlbiBpbnRvIGFjY291bnQgd2hlbiBkb2luZyBpc1Jvb3RcbiAgaWYgKFsnaHRtbCcsICdoZWFkJywgJ2JvZHknXS5pbmNsdWRlcyh0YWdOYW1lKSkge1xuICAgIHJldHVybiB0YWdOYW1lXG4gIH1cblxuICByZXR1cm4gYGJvZHkgPiAke3RhZ05hbWV9YCAvLyBUT0RPIHVzZSBmaXJzdCBjaGlsZCBvZiB0eXBlIGluc3RlYWQ/XG59XG5cbi8qKlxuICogbmVlZHMgdG8gYmUgcnVuIGluIGEgYnJvd3NlciBjb250ZXh0XG4gKiBAcGFyYW0ge09iamVjdH0gQ1NTX1JVTEVfVFlQRVMgVE9ETyAtIHNob3VsZCB0aGlzIGJlIGEgc3R1YiBhcyB3ZWxsXG4gKiBAcGFyYW0ge1N0cmluZ30gZWxlbWVudFF1ZXJ5XG4gKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnNcbiAqIEByZXR1cm4ge0FycmF5fVxuICovXG5mdW5jdGlvbiBmaW5kTWF0Y2hpbmdTZWxlY3RvcnMgKENTU19SVUxFX1RZUEVTLCBlbGVtZW50UXVlcnksIG9wdGlvbnMpIHtcbiAgLy8gVE9ETyBhcmUgYm90aCBvZiB0aGVzZSBuZWNlc3Nhcnk/XG4gIGNvbnN0IG1hdGNoZXMgPSBGdW5jdGlvbi5jYWxsLmJpbmQoXG4gICAgd2luZG93LkVsZW1lbnQucHJvdG90eXBlLm1hdGNoZXNTZWxlY3RvciB8fFxuICAgIHdpbmRvdy5FbGVtZW50LnByb3RvdHlwZS53ZWJraXRNYXRjaGVzU2VsZWN0b3JcbiAgKVxuXG4gIC8vIFNUVUI6Z2V0TWF0Y2hpbmdSdWxlc1xuXG4gIC8vIFNUVUI6Z2V0UnVsZXNGb3JFbGVtZW50XG5cbiAgLy8gU1RVQjpmaW5kTWF0Y2hpbmdTZWdtZW50XG5cbiAgbGV0IHJ1bGVzID0gW11cbiAgZm9yIChsZXQge2Nzc1J1bGVzfSBvZiBkb2N1bWVudC5zdHlsZVNoZWV0cykge1xuICAgIHJ1bGVzID0gcnVsZXMuY29uY2F0KGFkZENzc1J1bGVzKGNzc1J1bGVzKSkgLy8gVE9ETyB1c2Ugc3BsaWNlP1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkQ3NzUnVsZXMgKHJ1bGVzLCByZXN1bHQgPSBbXSkge1xuICAgIGZvciAobGV0IHJ1bGUgb2YgcnVsZXMpIHtcbiAgICAgIHN3aXRjaCAoQ1NTX1JVTEVfVFlQRVNbcnVsZS50eXBlXSkge1xuICAgICAgICBjYXNlICdTVFlMRV9SVUxFJzpcbiAgICAgICAgICByZXN1bHQucHVzaChydWxlKVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ01FRElBX1JVTEUnOlxuICAgICAgICAgIHJlc3VsdCA9IGFkZENzc1J1bGVzKHJ1bGUuY3NzUnVsZXMsIHJlc3VsdClcbiAgICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW1lbnRRdWVyeSlcblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tdW5kZWZcbiAgcmV0dXJuIGdldE1hdGNoaW5nUnVsZXMobWF0Y2hlcywgcnVsZXMsIGVsZW1lbnQsIG9wdGlvbnMsIHRydWUpXG59XG5cbi8qKlxuICogQHBhcmFtIHtCcm93c2VyfSBicm93c2VyXG4gKiBAcGFyYW0ge0FycmF5PE9iamVjdD59IHN0eWxlc1xuICogQHBhcmFtIHtTdHJpbmd9IGh0bWxcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuYXN5bmMgZnVuY3Rpb24gY3JlYXRlUGFnZSAoYnJvd3Nlciwgc3R5bGVzLCBodG1sKSB7XG4gIGNvbnN0IHBhZ2UgPSBhd2FpdCBicm93c2VyLm5ld1BhZ2UoKVxuICBhd2FpdCBwYWdlLnNldENvbnRlbnQoaHRtbClcbiAgLy8gY29uc29sZS5sb2coYXdhaXQgcGFnZS5jb250ZW50KCkpXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc3R5bGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgYXdhaXQgcGFnZS5hZGRTdHlsZVRhZyhzdHlsZXNbaV0pXG4gIH1cblxuICBhd2FpdCBwYWdlLm9uKCdjb25zb2xlJywgbXNnID0+IGNvbnNvbGUubG9nKG1zZy50ZXh0KCkpKSAvLyBUT0RPIGlzIGF3YWl0IG5lZWRlZCBoZXJlP1xuICByZXR1cm4gcGFnZVxufVxuXG4vKipcbiAqIEBwYXJhbSB7QXJyYXk8T2JqZWN0Pn0gc3R5bGVzXG4gKiBAcGFyYW0ge1N0cmluZ30gaHRtbFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge1Byb21pc2U8QXJyYXk+fVxuICovXG5hc3luYyBmdW5jdGlvbiBnZXRNYXRjaGluZ1NlbGVjdG9ycyAoc3R5bGVzLCBodG1sLCBvcHRpb25zKSB7XG4gIHN0eWxlcyA9IEFycmF5LmlzQXJyYXkoc3R5bGVzKSA/IHN0eWxlcyA6IFtzdHlsZXNdXG4gIGNvbnN0IGVsZW1lbnRRdWVyeSA9IGdldFNlbGVjdG9yKGh0bWwpXG4gIHJldHVybiBwdXBwZXRlZXIubGF1bmNoKCkudGhlbihhc3luYyBicm93c2VyID0+IHtcbiAgICBjb25zdCBwYWdlID0gYXdhaXQgY3JlYXRlUGFnZShicm93c2VyLCBzdHlsZXMsIGh0bWwpXG4gICAgY29uc3Qgc2VsZWN0b3JzID0gYXdhaXQgcGFnZS5ldmFsdWF0ZShcbiAgICAgIGZpbmRNYXRjaGluZ1NlbGVjdG9ycyxcbiAgICAgIENTU19SVUxFX1RZUEVTLFxuICAgICAgZWxlbWVudFF1ZXJ5LFxuICAgICAgb3B0aW9uc1xuICAgIClcblxuICAgIGJyb3dzZXIuY2xvc2UoKVxuICAgIHJldHVybiBzZWxlY3RvcnNcbiAgfSlcbn1cblxuZXhwb3J0IHtcbiAgZ2V0TWF0Y2hpbmdTZWxlY3RvcnNcbn1cbiIsImltcG9ydCBjaGFsayBmcm9tICdjaGFsaydcblxuLy8gVE9ETyByZW1vdmUgaGFzaCAoYWxzbyByZW1vdmUgaXQgZnJvbSBwYWNrYWdlLmpzb24pXG5cbi8qKlxuICogQHBhcmFtIHtPYmplY3R9IHBhcmFtXG4gKiBAcGFyYW0ge0FycmF5fSBwYXJhbS5zZWxlY3RvcnNcbiAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtLmNoaWxkcmVuXG4gKiBAcGFyYW0ge1N0cmluZ30gaW5kZW50XG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIHN0cmluZ2lmeSAoe3NlbGVjdG9ycywgY2hpbGRyZW59LCBpbmRlbnQgPSAnJykge1xuICBsZXQgcmVzdWx0ID0gc2VsZWN0b3JzLm1hcCgoe21lZGlhVGV4dCwgc2VsZWN0b3IsIGhhc2h9KSA9PiB7XG4gICAgcmV0dXJuIGAke2luZGVudH1cXG4ke2Zvcm1hdFNlbGVjdG9yKG1lZGlhVGV4dCwgc2VsZWN0b3IsIGhhc2gsIGluZGVudCl9YFxuICB9KS5qb2luKCdcXG4nKVxuXG4gIHJlc3VsdCArPSBjaGlsZHJlbi5tYXAoY2hpbGQgPT4ge1xuICAgIHJldHVybiBgXFxuXFxuJHtzdHJpbmdpZnkoY2hpbGQsIGAke2luZGVudH0gIGApfWBcbiAgfSkuam9pbignJylcblxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qKlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBtZWRpYVRleHRcbiAqIEBwYXJhbSB7QXJyYXk8T2JqZWN0Pn0gc2VsZWN0b3JzXG4gKiBAcGFyYW0ge1N0cmluZ30gaGFzaFxuICogQHBhcmFtIHtTdHJpbmd9IGluZGVudFxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5mdW5jdGlvbiBmb3JtYXRTZWxlY3RvciAobWVkaWFUZXh0LCBzZWxlY3RvcnMsIGhhc2gsIGluZGVudCkge1xuICBjb25zdCBzZWxlY3RvciA9IHNlbGVjdG9ycy5tYXAoKFt1bm1hdGNoZWQsIG1hdGNoZWRdKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IGNoYWxrLnllbGxvdyh1bm1hdGNoZWQpXG4gICAgaWYgKHVubWF0Y2hlZCAmJiBtYXRjaGVkKSByZXN1bHQgKz0gJyAnXG4gICAgcmVzdWx0ICs9IGNoYWxrLmdyZWVuLnVuZGVybGluZShtYXRjaGVkKVxuICAgIHJldHVybiByZXN1bHRcbiAgfSkuam9pbignLCAnKVxuXG4gIHJldHVybiBgJHtpbmRlbnR9JHttZWRpYVRleHQgPyBgJHtjaGFsay55ZWxsb3cobWVkaWFUZXh0KX1cXG4ke2luZGVudH1gIDogJyd9JHtzZWxlY3Rvcn0gJHtjaGFsay5kaW0oaGFzaCl9YFxufVxuXG5leHBvcnQge1xuICBzdHJpbmdpZnlcbn1cbiIsIi8vIFRPRE8gd2hhdCBhYm91dCB0aGlzIGNhc2UgLmE+LmIgLS0gZG8gd2UgbmVlZCB0byBhY2NvdW50IGZvciBjb21iaW5hdG9ycyB3aXRob3V0IHNwYWNlcyBhcm91bmQgdGhlbT8gb3IgZG9lcyBjaHJvbWUgZm9ybWF0IHRoZW0gd2l0aCBzcGFjZXM/XG5cbi8qKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gbWF0Y2hlc1xuICogQHBhcmFtIHtBcnJheTxDU1NSdWxlPn0gcnVsZXNcbiAqIEBwYXJhbSB7RE9NRWxlbWVudH0gZWxlbWVudFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNSb290XG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbmZ1bmN0aW9uIGdldE1hdGNoaW5nUnVsZXMgKG1hdGNoZXMsIHJ1bGVzLCBlbGVtZW50LCBvcHRpb25zLCBpc1Jvb3QpIHtcbiAgY29uc3QgcmVzdWx0ID0ge31cbiAgY29uc3QgbWF0Y2hpbmdSdWxlcyA9IGdldFJ1bGVzRm9yRWxlbWVudChtYXRjaGVzLCBydWxlcywgZWxlbWVudCwgaXNSb290KVxuICByZXN1bHQuc2VsZWN0b3JzID0gbWF0Y2hpbmdSdWxlcy5tYXAoKHtzZWxlY3RvciwgcnVsZX0pID0+IHtcbiAgICBjb25zdCBydWxlT2JqID0ge3NlbGVjdG9yfVxuICAgIGlmIChydWxlLnBhcmVudFJ1bGUgJiYgcnVsZS5wYXJlbnRSdWxlLm1lZGlhKSB7XG4gICAgICBydWxlT2JqLm1lZGlhVGV4dCA9IHJ1bGUucGFyZW50UnVsZS5tZWRpYS5tZWRpYVRleHRcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5jc3NUZXh0ID09PSB0cnVlKSB7XG4gICAgICBydWxlT2JqLmNzc1RleHQgPSBydWxlLmNzc1RleHRcbiAgICB9XG5cbiAgICByZXR1cm4gcnVsZU9ialxuICB9KVxuXG4gIGlmIChvcHRpb25zLnJlY3Vyc2l2ZSAhPT0gdHJ1ZSkge1xuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIC8vIFRPRE8gY2hpbGRyZW4gb3IgY2hpbGROb2Rlcz9cbiAgcmVzdWx0LmNoaWxkcmVuID0gQXJyYXkucHJvdG90eXBlLm1hcC5jYWxsKGVsZW1lbnQuY2hpbGRyZW4sIGNoaWxkID0+IHtcbiAgICByZXR1cm4gZ2V0TWF0Y2hpbmdSdWxlcyhtYXRjaGVzLCBydWxlcywgY2hpbGQsIG9wdGlvbnMsIGZhbHNlKVxuICB9KVxuXG4gIHJldHVybiByZXN1bHRcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBtYXRjaGVzXG4gKiBAcGFyYW0ge0FycmF5PENTU1J1bGU+fSBydWxlc1xuICogQHBhcmFtIHtET01FbGVtZW50fSBlbGVtZW50XG4gKiBAcGFyYW0ge0Jvb2xlYW59IGlzUm9vdFxuICogQHJldHVybiB7QXJyYXk8U3RyaW5nPn1cbiAqL1xuZnVuY3Rpb24gZ2V0UnVsZXNGb3JFbGVtZW50IChtYXRjaGVzLCBydWxlcywgZWxlbWVudCwgaXNSb290KSB7XG4gIHJldHVybiBydWxlcy5yZWR1Y2UoKGFjYywgcnVsZSkgPT4ge1xuICAgIGxldCBmb3VuZE1hdGNoID0gZmFsc2VcbiAgICBjb25zdCBwYXJ0cyA9IHJ1bGUuc2VsZWN0b3JUZXh0LnRyaW0oKS5zcGxpdCgvXFxzKixcXHMqLylcbiAgICBjb25zdCBzZWxlY3RvciA9IHBhcnRzLm1hcChzZWdtZW50ID0+IHtcbiAgICAgIGNvbnN0IHNlZ21lbnRlZCA9IGZpbmRNYXRjaGluZ1NlZ21lbnQobWF0Y2hlcywgZWxlbWVudCwgc2VnbWVudCwgaXNSb290KVxuICAgICAgaWYgKHNlZ21lbnRlZFsxXSkge1xuICAgICAgICBmb3VuZE1hdGNoID0gdHJ1ZVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gc2VnbWVudGVkXG4gICAgfSlcblxuICAgIGlmIChmb3VuZE1hdGNoKSB7XG4gICAgICBhY2MucHVzaCh7c2VsZWN0b3IsIHJ1bGV9KVxuICAgIH1cblxuICAgIHJldHVybiBhY2NcbiAgfSwgW10pXG59XG5cbi8qKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gbWF0Y2hlc1xuICogQHBhcmFtIHtET01FbGVtZW50fSBlbGVtZW50XG4gKiBAcGFyYW0ge1N0cmluZ30gc2VsZWN0b3JcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNSb290XG4gKiBAcmV0dXJuIHtBcnJheTxTdHJpbmc+fVxuICovXG5mdW5jdGlvbiBmaW5kTWF0Y2hpbmdTZWdtZW50IChtYXRjaGVzLCBlbGVtZW50LCBzZWxlY3RvciwgaXNSb290KSB7XG4gIGNvbnN0IHBhcnRzID0gc2VsZWN0b3Iuc3BsaXQoL1xccysvKVxuICBsZXQgaSA9IGlzUm9vdCA/IHBhcnRzLmxlbmd0aCAtIDEgOiAwXG4gIHdoaWxlIChpIDwgcGFydHMubGVuZ3RoICYmICEvWyt+Pl0vLnRlc3QocGFydHNbaV0pKSB7XG4gICAgY29uc3Qgc2VnbWVudCA9IHBhcnRzLnNsaWNlKGkpLmpvaW4oJyAnKVxuICAgIGlmIChtYXRjaGVzKGVsZW1lbnQsIHNlZ21lbnQpKSB7XG4gICAgICByZXR1cm4gW3BhcnRzLnNsaWNlKDAsIGkpLmpvaW4oJyAnKSwgc2VnbWVudF1cbiAgICB9XG5cbiAgICBpKytcbiAgfVxuXG4gIHJldHVybiBbcGFydHMuam9pbignICcpLCAnJ11cbn1cblxuZXhwb3J0IHtcbiAgZ2V0TWF0Y2hpbmdSdWxlcyxcbiAgZ2V0UnVsZXNGb3JFbGVtZW50LFxuICBmaW5kTWF0Y2hpbmdTZWdtZW50XG59XG4iXSwibmFtZXMiOlsiQ1NTX1JVTEVfVFlQRVMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7O0FBSUEscUJBQWU7RUFDYixjQUFjO0VBQ2QsWUFBWTtFQUNaLGNBQWM7RUFDZCxhQUFhO0VBQ2IsWUFBWTtFQUNaLGdCQUFnQjtFQUNoQixXQUFXO0VBQ1gsZ0JBQWdCO0VBQ2hCLGVBQWU7RUFDZixJQUFJO0VBQ0osZ0JBQWdCO0VBQ2hCLG9CQUFvQjtFQUNwQixlQUFlO0VBQ2YsZUFBZTtFQUNmLDBCQUEwQjtFQUMxQixlQUFlO0VBQ2YsbUJBQW1CO0NBQ3BCOztBQ2xCRDs7OztBQUlBLFNBQVMsV0FBVyxFQUFFLElBQUksRUFBRTtFQUMxQixNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQztFQUN4QyxJQUFJLENBQUMsS0FBSyxFQUFFO0lBQ1YsTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFDLHNDQUFzQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUNsRTs7RUFFRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENB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
