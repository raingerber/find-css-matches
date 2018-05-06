/* eslint-env jest */

const {stringifySelectors} = require('../__test__/index')

// TODO this probably isn't necessary - since it will be tested from other functions

describe('stringifySelectors', () => {
  it('should stringify selector arrays without modifying other keys', () => {
    const input = {
      matches: [{
        cssText: '<placeholder>',
        selector: [
          ['div', ' '],
          ['div', '.class']
        ]
      }],
      children: [{
        matches: [{
          cssText: '<placeholder>',
          selector: [
            ['div >', ' div ']
          ]
        }],
        children: []
      }, {
        matches: [{
          cssText: '<placeholder>',
          mediaText: 'max-width: 888px',
          selector: [
            [' div > ', ' div div'],
            ['', 'div']
          ]
        }],
        children: []
      }]
    }
    const options = {
      formatSelector: (a, b) => [a, b]
    }
    const result = stringifySelectors(input, options)
    expect(result).toMatchSnapshot()
  })
})