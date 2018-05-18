/* eslint-env jest */

const {JSDOM} = require('jsdom')
const cases = require('jest-in-case')

const {
  DEFAULT_OPTIONS,
  mergeOptions,
  getCssRules,
  stringifyElement,
  findRulesForElement,
  splitPartOfSelector,
  combinatorQuery,
  getMediaText,
  formatRule
} = require('../__test__/index')

function createDom (html, selector, options) {
  const dom = new JSDOM(html)
  const element = dom.window.document.querySelector(selector)
  const matches = Function.call.bind(dom.window.Element.prototype.matches)
  return {dom, element, matches, options: mergeOptions(html, DEFAULT_OPTIONS, options)}
}

describe('getCssRules', () => {
  it('should return an array with each cssRule in order', () => {
    const styles = [{
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
    expect(getCssRules(styles)).toEqual([
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

cases('splitPartOfSelector with includePartialMatches === true', opts => {
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
  const result = splitPartOfSelector(matches, element, ...opts.args, {
    includePartialMatches: true
  })

  expect(result).toEqual(opts.result)
}, [{
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
}, {
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

cases('combinatorQuery', opts => {
  const html = `
    <div class="container">
      <div class="child-1">xxx</div>
      Text node to ignore
      <div class="child-2">yyy</div>
      Text node to ignore
      <div class="child-3">
        <div class="grand-child-1">zzz</div>
      </div>
    </div>
  `
  const {element} = createDom(html, opts.selector)
  const result = combinatorQuery(element, ...opts.args)
  const identifiers = result.elements.map(el => {
    return el.getAttribute('class') || el.tagName
  })

  expect(identifiers).toEqual(opts.identifiers)
  expect(result.depth).toEqual(opts.finalDepth)
}, [{
  name: 'should return the parent element for the > combinator',
  selector: '.child-3',
  args: ['>', 1], // combinator, depth
  identifiers: ['container'],
  finalDepth: 0 // depth should decrease by 1
}, {
  name: 'should return the ancestor elements for the " " combinator',
  selector: '.grand-child-1',
  args: [' ', 2],
  identifiers: ['child-3', 'container', 'BODY', 'HTML'],
  finalDepth: 1 // depth should decrease by 1
}, {
  name: 'should return the previous sibling element for the + combinator',
  selector: '.child-3',
  args: ['+', 1],
  identifiers: ['child-2'],
  finalDepth: 1
}, {
  name: 'should return the previous sibling elements for the ~ combinator',
  selector: '.child-3',
  args: ['~', 1],
  identifiers: ['child-1', 'child-2'],
  finalDepth: 1
}, {
  name: 'should return an empty array for the + combinator when no previous sibling is found',
  selector: '.child-1',
  args: ['+', 1],
  identifiers: [],
  finalDepth: 1
}, {
  name: 'should return an empty array for the ~ combinator when no previous siblings are found',
  selector: '.child-1',
  args: ['~', 1],
  identifiers: [],
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
  const result = formatRule(opts.rule, opts.selector, opts.options)
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
