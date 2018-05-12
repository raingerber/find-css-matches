/* eslint-env jest */

const {getOpeningTagName} = require('../__test__/index')

describe('getOpeningTagName', () => {
  it('should return the first html tagName from the string', () => {
    expect(getOpeningTagName('<div><span></span></div>')).toBe('div')
  })
  it('should throw if the string does not contain an html tag', () => {
    expect(() => getOpeningTagName('<!-- <div></div> -->')).toThrowErrorMatchingSnapshot()
  })
})
