/* eslint-env jest */

const {stringifySelectors} = require('../__test__/index')

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
      formatSelector: (a, b) => {
        return [a.trim() ? `?${a.trim()}?` : a, b.toUpperCase()]
      }
    }
    const result = stringifySelectors(input, options)
    expect(result).toMatchSnapshot()
  })
})
