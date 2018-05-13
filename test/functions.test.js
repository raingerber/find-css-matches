/* eslint-env jest */

const {JSDOM} = require('jsdom')
const cases = require('jest-in-case')

const {
  mergeOptions,
  getCssRules,
  findRulesForElement,
  testIfSelectorIsMatch,
  findMatchingPartOfSelector,
  combinatorPreventsMatch,
  selectorHasDescendentCombinator,
  getElementsUsingCombinator,
  stringifyElement,
  formatRule,
  getMediaText
} = require('../__test__/index')

function createDom (html, selector, options) {
  const dom = new JSDOM(html)
  const element = dom.window.document.querySelector(selector)
  const matches = Function.call.bind(dom.window.Element.prototype.matches)
  return {dom, element, matches, options: mergeOptions(options, html)}
}

describe('getCssRules', () => {
  it('should return an array with each cssRule in order', () => {
    const sheets = [{
      cssRules: [{
        type: 1,
        cssText: 'one'
      }, {
        type: 4,
        cssRules: [{
          type: 1,
          cssText: 'two'
        }, {
          type: 1,
          cssText: 'three'
        }]
      }]
    }, {
      cssRules: [{
        type: 1,
        cssText: 'four'
      }]
    }]
    expect(getCssRules(sheets)).toEqual([
      {
        type: 1,
        cssText: 'one'
      },
      {
        type: 1,
        cssText: 'two'
      },
      {
        type: 1,
        cssText: 'three'
      },
      {
        type: 1,
        cssText: 'four'
      }
    ])
  })
})

cases('findRulesForElement', opts => {
  const html = `
    <div class="container">
      <div class="child-1">xxx</div>
      <div class="child-2">yyy</div>
      <div class="child-3">zzz</div>
    </div>
  `
  const {matches, element, options} = createDom(html, '.container', opts.options)
  const rules = findRulesForElement(matches, opts.rules, element, options, 0)
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

describe('testIfSelectorIsMatch', () => {
  it('should return a "matching" array when matches returns true', () => {
    const matches = (element, selector) => {
      return element === 'dummy' && selector === 'div'
    }
    const result = testIfSelectorIsMatch(matches, 'dummy', 'div')
    // in a "matching" array, the second element is a non-empty string
    expect(result).toEqual(['', 'div'])
  })
  it('should return a "non-matching" array when matches returns false', () => {
    const matches = (element, selector) => {
      return !(element === 'dummy' && selector === 'div')
    }
    const result = testIfSelectorIsMatch(matches, 'dummy', 'div')
    // in a "non-matching" array, the second element is an empty string
    expect(result).toEqual(['div', ''])
  })
})

cases('findMatchingPartOfSelector', opts => {
  const html = `
    <div class="container">
      <div class="child-1">xxx</div>
      Text node to ignore
      <div class="child-2">yyy</div>
      Text node to ignore
      <div class="child-3">
        <div class="grandchild-1">zzz</div>
      </div>
    </div>
  `
  const {matches, element} = createDom(html, opts.selector)
  const result = findMatchingPartOfSelector(matches, element, ...opts.args)
  expect(result).toEqual(opts.result)
}, [{
  name: "returns ['', ''] when selector is an empty string",
  selector: '.container',
  args: ['', 0],
  result: ['', '']
},
// full matches for child elements (the function does not *only* return partial matches)
{
  name: 'full match for child when using " "',
  selector: '.child-3',
  args: ['.container .child-3', 1],
  result: ['', '.container .child-3']
}, {
  name: 'full match for child when using "+"',
  selector: '.child-3',
  args: ['.child-2 + .child-3', 1],
  result: ['', '.child-2 + .child-3']
}, {
  name: 'full match for child when using "~"',
  selector: '.child-3',
  args: ['.child-1 ~ .child-3', 1],
  result: ['', '.child-1 ~ .child-3']
},
// partial matches for child elements
{
  name: 'partial match for child element #1',
  selector: '.child-3',
  args: ['.could-exist .child-3', 1],
  result: ['.could-exist', '.child-3']
}, {
  name: 'partial match for child element #2',
  selector: '.child-3',
  args: ['.could-exist .container > .child-3', 1],
  result: ['.could-exist', '.container > .child-3']
}, {
  name: 'partial match for child element #3',
  selector: '.grandchild-1',
  args: ['.could-exist div > .container > .child-3 > .grandchild-1', 2],
  result: ['.could-exist div >', '.container > .child-3 > .grandchild-1']
}, {
  name: 'partial match for child element #4',
  selector: '.grandchild-1',
  args: ['#a .b > .c ~ .d .grandchild-1', 2],
  result: ['#a .b > .c ~ .d', '.grandchild-1']
},
// non-matching selectors when depth === 1
// combinatorPreventsMatch prevents these selectors
// from being incorrectly treated as partial matches
{
  name: 'non-matching selector for child when using "+"',
  selector: '.child-3',
  args: ['.child-1 + .child-3', 1],
  result: ['.child-1 + .child-3', '']
}, {
  name: 'non-matching selector for child when using ">"',
  selector: '.child-3',
  args: ['.null > .child-3', 1],
  result: ['.null > .child-3', '']
}, {
  name: 'non-matching selector for child when using "~"',
  selector: '.child-3',
  args: ['.null ~ .child-3', 1],
  result: ['.null ~ .child-3', '']
}])

// NOTE that many of the selectors tested here are NOT matches,
// but this tests an intermediate check before the selector can
// be disqualified (so, we're testing to avoid false negatives)
cases('combinatorPreventsMatch', opts => {
  const html = `
    <div class="container">
      <div class="child-1">xxx</div>
      <div class="child-2">yyy</div>
      <div class="child-3">
        <div class="grandchild-1">zzz</div>
      </div>
    </div>
  `
  const {matches, element} = createDom(html, '.child-3')
  const result = combinatorPreventsMatch(matches, element, ...opts.args)
  expect(result).toBe(opts.result)
}, [{
  name: 'false when depth is less than 1',
  args: [null, 0, 0], // parts, index, depth
  result: false
}, {
  name: 'false when the array contains enough ">" combinators',
  args: [['.a', '>', '.b', '>', '.c', '>', '.d', '>', '.e'], 1, 3],
  result: false
}, {
  name: 'false when a descendent combinator follows the index',
  // the descendent is implied between the .c and .d elements
  args: [['.a', '>', '.b', '+', '.c', '.d'], 1, 50],
  result: false
}, {
  name: 'false for > when parent matches the selector',
  args: [['.could-exist', '.container', '>', '.blah-blah-blah'], 2, 1],
  result: false
}, {
  name: 'true for > when parent does *not* match the selector',
  args: [['.null', '>', '.blah-blah-blah'], 1, 1],
  result: true
}, {
  name: 'false for + when previous sibling matches the selector',
  args: [['.could-exist', '.child-2', '+', '.child-3'], 2, 1],
  result: false
}, {
  name: 'true for + when previous sibling does *not* match the selector',
  args: [['.null', '+', '.child-2'], 1, 1],
  result: true
}, {
  name: 'false for ~ when a previous sibling matches the selector',
  args: [['.could-exist', '.child-1', '~', '.child-3'], 2, 1],
  result: false
}, {
  name: 'true for ~ when previous siblings do *not* match the selector',
  args: [['.null', '~', '.child-3'], 1, 1],
  result: true
}])

cases('selectorHasDescendentCombinator', opts => {
  const result = selectorHasDescendentCombinator(opts.selector, opts.index)
  expect(result).toBe(opts.result)
}, [{
  name: 'true case where index starts at -1',
  selector: ['a', '>', 'b', 'c'],
  index: -1,
  result: true
}, {
  name: 'false case where index starts at -1',
  selector: ['a', '>', 'b', '>', 'c'],
  index: -1,
  result: false
}, {
  name: 'true case where index starts with a known combinator',
  selector: ['a', '>', 'b', '~', 'c', 'd'],
  index: 1,
  result: true
}, {
  name: 'false case where index starts with a known combinator',
  selector: ['a', '>', 'b', '~', 'c', '+', 'd'],
  index: 1,
  result: false
}])

cases('getElementsUsingCombinator', opts => {
  const html = `
    <div class="container">
      <div class="child-1">xxx</div>
      Text node to ignore
      <div class="child-2">yyy</div>
      Text node to ignore
      <div class="child-3">zzz</div>
    </div>
  `
  const {element} = createDom(html, opts.selector)
  const result = getElementsUsingCombinator(element, ...opts.args)
  const classNames = result.elements.map(el => el.getAttribute('class'))
  expect(classNames).toEqual(opts.classNames)
  expect(result.depth).toEqual(opts.finalDepth)
}, [{
  name: 'should return the parent element for the > combinator',
  selector: '.child-3',
  args: ['>', 1],
  classNames: ['container'],
  finalDepth: 0 // depth should decrease by 1
}, {
  name: 'should return the previous sibling element for the + combinator',
  selector: '.child-3',
  args: ['+', 1],
  classNames: ['child-2'],
  finalDepth: 1
}, {
  name: 'should return the previous sibling elements for the ~ combinator',
  selector: '.child-3',
  args: ['~', 1],
  classNames: ['child-1', 'child-2'],
  finalDepth: 1
}, {
  name: 'should return an empty array for the + combinator when no previous sibling is found',
  selector: '.child-1',
  args: ['+', 1],
  classNames: [],
  finalDepth: 1
}, {
  name: 'should return an empty array for the ~ combinator when no previous siblings are found',
  selector: '.child-1',
  args: ['~', 1],
  classNames: [],
  finalDepth: 1
}])

describe('stringifyElement', () => {
  it("should stringify the element's opening tag", () => {
    const dom = new JSDOM('<section class="a b" data-attribute="true"><div></div></section>')
    const html = '<section class="a b" data-attribute="true">'
    const element = dom.window.document.querySelector('section')
    expect(stringifyElement(element)).toBe(html)
  })
})

cases('formatRule', opts => {
  const result = formatRule(opts.selector, opts.rule, opts.options)
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

cases('getMediaText', opts => {
  expect(getMediaText(opts.rule)).toBe(opts.result)
}, [{
  name: 'should return an empty string for a rule with no parentRule',
  rule: {},
  result: ''
}, {
  name: 'should concatenate mediaText properties from nested media rules',
  rule: {
    parentRule: {
      media: {
        mediaText: '(max-width: 499px)'
      },
      parentRule: {
        media: {
          mediaText: '(orientation: landscape)'
        }
      }
    }
  },
  result: '(orientation: landscape) AND (max-width: 499px)'
}])
