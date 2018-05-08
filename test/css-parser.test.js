/* eslint-env jest */

const {getElementQuery} = require('../__test__/index')

describe('getElementQuery', () => {
  it('should return a selector using the first tagName from the string', () => {
    const tagName = getElementQuery('<div><span></span></div>')
    expect(tagName).toBe('div:first-of-type')
  })
})
