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

// TODO isChild is no longer accurate -- uses depth now

describe('findMatchingPartOfSelector', () => {
  let matches
  beforeEach(() => {
    matches = jest.fn(() => false)
  })

  function helper (selector, segments, isChild) {
    const calls = segments.map(s => ['el', s])
    const result = findMatchingPartOfSelector(matches, 'el', selector, isChild)
    expect(matches.mock.calls).toEqual(calls)
    expect(result).toEqual([selector, '']) // no match
  }

  function combinatorHelper (combinator, isChild) {
    const selector = `.a .b .c ${combinator} .d`
    const segments = [
      `.a .b .c ${combinator} .d`,
      `.b .c ${combinator} .d`,
      `.c ${combinator} .d`
    ]
    helper(selector, segments, isChild)
  }

  // TODO it should NOT stop in this case
  it('should stop at the first > when isChild is true', () => {
    combinatorHelper('>', true)
  })

  it('should stop at the first ~ when isChild is true', () => {
    combinatorHelper('~', true)
  })

  it('should stop at the first + when isChild is true', () => {
    combinatorHelper('+', true)
  })
})
