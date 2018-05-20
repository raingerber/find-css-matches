/* eslint-env jest */

const Tokenizer = require('css-selector-tokenizer')

function parse (selector) {
  return Tokenizer.parse(selector).nodes[0].nodes
}

const {
  parseCssRules,
  findHtmlToken,
  findBodyToken,
  findIdToken,
  isFullMatchable,
  isMatchable,
  selectorStringToArray,
  selectorArrayToString
} = require('../__test__')

function createRules (selectorText) {
  const parsed = parseCssRules([{selectorText}])
  return parsed[0].selectors[0].nodes
}

describe('findHtmlToken', () => {
  it('"body.html" should be falsey', () => {
    expect(findHtmlToken(parse('body.html'))).toBeUndefined()
  })
  it('"html" should be truthy', () => {
    expect(findHtmlToken(parse('html'))).toBeTruthy()
  })
  it('"html.class" should be truthy', () => {
    expect(findHtmlToken(parse('html.class'))).toBeTruthy()
  })
})

describe('findBodyToken', () => {
  it('"html.body" should be falsey', () => {
    expect(findBodyToken(parse('html.body'))).toBeUndefined()
  })
  it('"body" should be truthy', () => {
    expect(findBodyToken(parse('body'))).toBeTruthy()
  })
  it('"body.class" should be truthy', () => {
    expect(findBodyToken(parse('body.class'))).toBeTruthy()
  })
})

describe('findIdToken', () => {
  it('truthy when the selector has a matching id', () => {
    expect(findIdToken(parse('div#test-id'), 'test-id')).toBeTruthy()
  })
  it('undefined when selector has an id that does not match the input', () => {
    expect(findIdToken(parse('div#test-id'), 'wrong-id')).toBeUndefined()
  })
  it('undefined when the selector does not have an id', () => {
    expect(findIdToken(parse('div.test-id'), 'test-id')).toBeUndefined()
  })
})

describe('isFullMatchable', () => {
  it('true when options.isHtmlOrBodyTag is true', () => {
    expect(isFullMatchable(createRules('body > div'), {isHtmlOrBodyTag: true})).toBe(true)
  })
  it('true when the selector does not reference <body>', () => {
    expect(isFullMatchable(createRules('.a .b .c'), {})).toBe(true)
  })
  it('true when the selector references a descendent of <body>', () => {
    expect(isFullMatchable(createRules('body div'), {})).toBe(true)
  })
  it('false when the selector references a direct child of <body>', () => {
    expect(isFullMatchable(createRules('body > div'), {})).toBe(false)
  })
  it('false for empty strings', () => {
    expect(isFullMatchable(createRules(''), {}, {isHtmlOrBodyTag: true})).toBe(false)
  })
})

describe('isMatchable', () => {
  it('true when <html> is the root element', () => {
    expect(isMatchable(createRules('html.class'))).toBe(true)
  })
  it('false when <html> has a parent', () => {
    expect(isMatchable(createRules('div > html.class'))).toBe(false)
  })
  it('true when <body> is the root element', () => {
    expect(isMatchable(createRules('body'))).toBe(true)
  })
  it('true when <body> is preceded by "html >"', () => {
    expect(isMatchable(createRules('html > body'))).toBe(true)
  })
  it('false when <body> is preceded by "+"', () => {
    expect(isMatchable(createRules('div + body'))).toBe(false)
  })
  it('false when <body> is preceded by "~"', () => {
    expect(isMatchable(createRules('div ~ body'))).toBe(false)
  })
  it('false when <body> has a non-html tag as a parent', () => {
    expect(isMatchable(createRules('div > body'))).toBe(false)
  })
  it('false for empty strings', () => {
    expect(isMatchable(createRules(''), {})).toBe(false)
  })
})

describe('selectorStringToArray', () => {
  it('[] for empty string', () => {
    expect(selectorStringToArray('')).toEqual([])
  })
  it('transform string to array with selectors and combinators', () => {
    const input = 'html > body div ~ .class1 + .class2 span'
    const expected = [
      {
        selector: 'html',
        combinator: '>'
      },
      {
        selector: 'body',
        combinator: ' '
      },
      {
        selector: 'div',
        combinator: '~'
      },
      {
        selector: '.class1',
        combinator: '+'
      },
      {
        selector: '.class2',
        combinator: ' '
      },
      {
        selector: 'span',
        combinator: null
      }
    ]
    expect(selectorStringToArray(input)).toEqual(expected)
  })
})

describe('selectorArrayToString', () => {
  it('["", ""] for empty input', () => {
    expect(selectorArrayToString([[], []])).toEqual(['', ''])
  })
  it('concatenate parts of selector with no extra spaces', () => {
    const input = [
      [
        {
          selector: '.a',
          combinator: '>'
        },
        {
          selector: '.b',
          combinator: ' '
        },
        {
          selector: '.c',
          combinator: '+'
        },
        {
          selector: '.d',
          combinator: null
        }
      ],
      [
        {
          selector: '#e',
          combinator: ' '
        },
        {
          selector: 'div',
          combinator: null
        }
      ]
    ]
    const expected = ['.a > .b .c + .d', '#e div']
    expect(selectorArrayToString(input)).toEqual(expected)
  })
})
