/* eslint-env jest */

const {
  isHtmlSelector,
  isBodySelector,
  isFullMatchable,
  isMatchable,
  selectorStringToArray,
  selectorArrayToString
} = require('../__test__')

describe('isHtmlSelector', () => {
  it('true for html', () => {
    expect(isHtmlSelector('html')).toBe(true)
  })
  it('true for html.class', () => {
    expect(isHtmlSelector('html.class')).toBe(true)
  })
  it('true for html#id.class', () => {
    expect(isHtmlSelector('html#id.class')).toBe(true)
  })
  it('true for html[data-attribute="true"]', () => {
    expect(isHtmlSelector('html')).toBe(true)
  })
  it('false for .html', () => {
    expect(isHtmlSelector('.html')).toBe(false)
  })
  it('false for html-hyphenated', () => {
    expect(isHtmlSelector('html-hyphenated')).toBe(false)
  })
  it('false for htmlhtml', () => {
    expect(isHtmlSelector('htmlhtml')).toBe(false)
  })
})

describe('isBodySelector', () => {
  it('true for body', () => {
    expect(isBodySelector('body')).toBe(true)
  })
  it('true for body.class', () => {
    expect(isBodySelector('body.class')).toBe(true)
  })
  it('true for body#id.class', () => {
    expect(isBodySelector('body#id.class')).toBe(true)
  })
  it('true for body[data-attribute="true"]', () => {
    expect(isBodySelector('body')).toBe(true)
  })
  it('false for .body', () => {
    expect(isBodySelector('.body')).toBe(false)
  })
  it('false for body-hyphenated', () => {
    expect(isBodySelector('body-hyphenated')).toBe(false)
  })
  it('false for bodybody', () => {
    expect(isBodySelector('bodybody')).toBe(false)
  })
})

describe('isFullMatchable', () => {
  it('true when options.isHtmlOrBodyTag is true', () => {
    expect(isFullMatchable(['body', '>', 'div'], {isHtmlOrBodyTag: true})).toBe(true)
  })
  it('true when the selector does not reference <body>', () => {
    expect(isFullMatchable(['.a', '.b', '.c'], {})).toBe(true)
  })
  it('true when the selector references a descendent of <body>', () => {
    expect(isFullMatchable(['body', ' ', 'div'], {})).toBe(true)
  })
  it('false when the selector references a direct child of <body>', () => {
    expect(isFullMatchable(['body', '>', 'div'], {})).toBe(false)
  })
  it('false for empty array', () => {
    expect(isFullMatchable([], {isHtmlOrBodyTag: true})).toBe(false)
  })
})

describe('isMatchable', () => {
  it('false for empty array', () => {
    expect(isMatchable([])).toBe(false)
  })
  it('true when <html> is the root element', () => {
    expect(isMatchable(['html.class'])).toBe(true)
  })
  it('false when <html> has a parent', () => {
    expect(isMatchable(['div', '>', 'html.class'])).toBe(false)
  })
  it('true when <body> is the root element', () => {
    expect(isMatchable(['body'])).toBe(true)
  })
  it('true when <body> is preceded by "html >"', () => {
    expect(isMatchable(['html', '>', 'body'])).toBe(true)
  })
  it('false when <body> is preceded by "+"', () => {
    expect(isMatchable(['div', '+', 'body'])).toBe(false)
  })
  it('false when <body> is preceded by "~"', () => {
    expect(isMatchable(['div', '~', 'body'])).toBe(false)
  })
  it('false when <body> has a non-html tag as a parent', () => {
    expect(isMatchable(['div', '>', 'body'])).toBe(false)
  })
})

describe('selectorStringToArray', () => {
  it('[] for empty string', () => {
    expect(selectorStringToArray('')).toEqual([])
  })
  it('transform string to array with all combinators', () => {
    const input = 'html > body div ~ .class1 + .class2 span'
    const expected = ['html', '>', 'body', ' ', 'div', '~', '.class1', '+', '.class2', ' ', 'span']
    expect(selectorStringToArray(input)).toEqual(expected)
  })
})

describe('selectorArrayToString', () => {
  it('["", ""] for empty input', () => {
    expect(selectorArrayToString([[], []])).toEqual(['', ''])
  })
  it('concatenate parts of selector with no extra spaces', () => {
    const input = [
      ['.a', '>', '.b', ' ', '.c', ' ', '.d'],
      ['#e', ' ', 'div']
    ]
    const expected = ['.a > .b .c .d', '#e div']
    expect(selectorArrayToString(input)).toEqual(expected)
  })
})
