/* eslint-env jest */

const {JSDOM} = require('jsdom')
const cases = require('jest-in-case')

const {
  parseCssRules,
  DEFAULT_OPTIONS,
  mergeOptions,
  findRulesForElements,
  formatRule
} = require('../__test__/index')

function createDom (html, selector, options) {
  const dom = new JSDOM(html)
  const element = dom.window.document.querySelector(selector)
  const matches = Function.call.bind(dom.window.Element.prototype.matches)
  return {dom, element, matches, options: mergeOptions(html, DEFAULT_OPTIONS, options)}
}

cases('findRulesForElements', opts => {
  const html = `
    <div class="container">
      <div class="child-1">xxx</div>
      <div class="child-2">yyy</div>
      <div class="child-3">zzz</div>
    </div>
  `
  const inputRules = parseCssRules(opts.rules)
  const {matches, element, options} = createDom(html, '.container', opts.options)
  const rules = findRulesForElements(matches, inputRules, element, options, 0)
  expect(rules).toMatchSnapshot()
}, [{
  name: 'should respect options.includePartialMatches and options.recursive when they are false',
  rules: [{
    selectorText: 'div, ul' // full match, so it should be returned
  }, {
    selectorText: 'ul, section div' // partial match, but includePartialMatches === false
  }],
  options: {
    recursive: false,
    includePartialMatches: false
  }
}, {
  name: 'should include both full and partial matches when options.includePartialMatches is true',
  rules: [{
    selectorText: 'div.container, ul' // full match
  }, {
    selectorText: 'ul, section div' // partial match
  }],
  options: {
    recursive: false,
    includePartialMatches: true
  }
}, {
  name: 'should include matching children when options.recursive is true',
  rules: [{
    selectorText: '.absent-parent > div' // partial match for the parent
  }, {
    selectorText: 'section div > .child-2' // partial match for one of the children
  }],
  options: {
    recursive: true,
    includePartialMatches: true
  }
}, {
  name: 'should include the html property when options.includeHtml === true',
  rules: [],
  options: {
    recursive: true,
    includeHtml: true
  }
}])

cases('formatRule', opts => {
  const result = formatRule({rule: opts.rule}, opts.selector, opts.options)
  expect(result).toEqual(opts.result)
}, [{
  name: 'should return the selector without html, css, media, or isPartialMatch properties',
  selector: [['', 'div']],
  rule: {
    cssText: 'div { color: red }'
  },
  options: {},
  result: {
    selector: [['', 'div']]
  }
}, {
  name: 'should include the cssText when options.includeCss === true',
  selector: [['', 'div']],
  rule: {
    cssText: 'div { color: red }'
  },
  options: {
    includeCss: true
  },
  result: {
    selector: [['', 'div']],
    css: [
      'color: red'
    ]
  }
}, {
  name: 'should include the media property when parentRule.media.mediaText is defined',
  selector: [['', 'div']],
  rule: {
    cssText: 'div { color: red }',
    parentRule: {
      media: {
        mediaText: 'max-width: 888px'
      }
    }
  },
  options: {},
  result: {
    selector: [['', 'div']],
    media: 'max-width: 888px'
  }
}, {
  name: 'isPartialMatch is true when the selector contains at least one full match',
  selector: [['.the', '.last'], ['.one', '.is-a'], ['', '.full-match']],
  rule: {
    cssText: '.the .last, .one .is-a, .full-match { color: red }'
  },
  options: {
    includePartialMatches: true
  },
  result: {
    selector: [['.the', '.last'], ['.one', '.is-a'], ['', '.full-match']],
    isPartialMatch: false
  }
}, {
  name: 'isPartialMatch is false when the selector only contains partial matches',
  selector: [['.each', '.one'], ['.is', '.a'], ['.partial', '.match']],
  rule: {
    cssText: '.each .one, .is .a, .partial .match { color: red }'
  },
  options: {
    includePartialMatches: true
  },
  result: {
    selector: [['.each', '.one'], ['.is', '.a'], ['.partial', '.match']],
    isPartialMatch: true
  }
}])
