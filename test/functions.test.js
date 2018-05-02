/* eslint-env jest */

const {findMatchingPartOfSelector} = require('../__test__/index')

/*
TODO warn that it won't detect selectors with "body" or "html" in them

also does not detect invalid selectors: body ~ .class-name

ROOT

  skip all the sibling selectors

  should we only check the final selector?

  body > .a

  .a .b   .c
  .a .b > .c
  .a .b ~ .c
  .a .b + .c

CHILD

  stop as soon as you get to the first combinator

  .a .b   .c
  .a .b > .c
  .a .b ~ .c
  .a .b + .c

*/

describe('findMatchingPartOfSelector', () => {
  let matches
  beforeEach(() => {
    matches = jest.fn(() => false)
  })

  function helper (selector, segments, isRoot) {
    const calls = segments.map(s => ['el', s])
    const result = findMatchingPartOfSelector(matches, 'el', selector, isRoot)
    expect(matches.mock.calls).toEqual(calls)
    expect(result).toEqual([selector, '']) // no match
  }

  function combinatorHelper (combinator, isRoot) {
    const selector = `.a .b .c ${combinator} .d`
    const segments = [
      `.a .b .c ${combinator} .d`,
      `.b .c ${combinator} .d`,
      `.c ${combinator} .d`
    ]
    helper(selector, segments, isRoot)
  }

  it('should stop at the first > when isRoot is false', () => {
    combinatorHelper('>', false)
  })

  it('should stop at the first ~ when isRoot is false', () => {
    combinatorHelper('~', false)
  })

  it('should stop at the first + when isRoot is false', () => {
    combinatorHelper('+', false)
  })
})
