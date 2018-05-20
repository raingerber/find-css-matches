/* eslint-env jest */

const {JSDOM} = require('jsdom')
const cases = require('jest-in-case')

const {
  mergeOptions,
  DEFAULT_OPTIONS,
  getIds,
  getCssRules,
  combinatorQuery,
  stringifyElement,
  // cssTextToArray
  getMediaText
} = require('../__test__/index')

function createDom (html, selector, options) {
  const dom = new JSDOM(html)
  const element = dom.window.document.querySelector(selector)
  const matches = Function.call.bind(dom.window.Element.prototype.matches)
  return {dom, element, matches, options: mergeOptions(html, DEFAULT_OPTIONS, options)}
}

describe('getIds', () => {
  it('should get the ids from every element', () => {
    const dom = new JSDOM(`
      <html id="root">
        <head></head>
        <body id="body">
          <div>
            <ul id="list">
              <li></li>
              <li id="list-item"></li>
            </ul>
            <span id="span"></span>
          </div>
        </body>
      </html
    `)
    const ids = getIds(dom.window.document.children)
    expect(ids).toEqual(['root', 'body', 'list', 'list-item', 'span'])
  })
})

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
