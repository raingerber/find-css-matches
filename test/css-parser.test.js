/* eslint-env jest */

const {JSDOM} = require('jsdom')

const {
  getCssRules
} = require('../__test__/index')

describe('getCssRules', () => {
  it('should return an array with each cssRule in order', () => {
    const sheets = [{
      cssRules: [{
        type: 1,
        cssText: 'one'
      }, {
        type: 4,
        cssRules: [{
          type: 1,
          cssText: 'two'
        }, {
          type: 1,
          cssText: 'three'
        }]
      }]
    }, {
      cssRules: [{
        type: 1,
        cssText: 'four'
      }]
    }]

    expect(getCssRules(sheets)).toEqual([
      {
        type: 1,
        cssText: 'one'
      },
      {
        type: 1,
        cssText: 'two'
      },
      {
        type: 1,
        cssText: 'three'
      },
      {
        type: 1,
        cssText: 'four'
      }
    ])
  })
})
