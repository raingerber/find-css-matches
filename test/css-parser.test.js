/* eslint-env jest */

const {getElementQuery} = require('../__test__/index')

describe('getElementQuery', () => {
  it('should return the first tagName from the string', async () => {
    const tagName = getElementQuery('<div><span></span></div>')
    expect(tagName).toBe('div:first-of-type')
  })
})
