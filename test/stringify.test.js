/* eslint-env jest */

const {cssTextToArray, stringifySelectors} = require('../__test__/index')

describe('cssTextToArray', () => {
  const result = cssTextToArray('div, div .class { padding: 40px; font-size: 20px; transform: translate(30px, 20px) rotate(20deg); }')
  expect(result).toEqual([
    'padding: 40px',
    'font-size: 20px',
    'transform: translate(30px, 20px) rotate(20deg)'
  ])
})

describe('stringifySelectors', () => {
  it('should stringify selector arrays and convert cssText strings to arrays', () => {
    const input = {
      matches: [{
        css: 'div, div .class { padding: 40px; font-size: 20px; }',
        selector: [
          ['div', ' '],
          ['div', '.class']
        ]
      }],
      children: [{
        matches: [{
          css: 'div > div { color: blue; margin: 0px 0px 10px 20px; }',
          selector: [
            ['div >', ' div ']
          ]
        }],
        children: []
      }, {
        matches: [{
          css: 'div > div div, div {}',
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
