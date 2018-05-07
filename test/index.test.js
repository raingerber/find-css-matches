/* eslint-env jest */

const {normalizeStyles, findMatches} = require('../__test__/index')

const formatSelector = (a, b) => [a, b ? `???${b}???` : b]

/**

should include cssText when options.cssText === true  (make it recursive)

should ignore partial matches when options.findPartialMatches === false (make it recursive with "div div" selector)

**/

// TODO test with passing a string / array / object as styles (maybe have a normalizeStyles?)
// TODO add css with media queries in them

// TODO - bother testing this?
// describe('normalizeStyles', () => {
//   it('should resolve a string', () => {

//   })
// })

describe('findMatches with different options', () => {
  const styles = {
    content: `
      div {
        color: red;
      }
      div > div {
        color: blue;
      }
      div > div > div {
        color: green;
      }
    `
  }

  const html = `
    <div class="parent">
      <div class="child">
      </div>
    </div>
  `
  it('should ignore DOM children when options.recursive === false', () => {
    const options = {
      recursive: false
    }

    return findMatches(styles, html, options).then(result => {
      expect(Object.keys(result)).toEqual(['matches']) // no "children" key
    })
  })
  it('should include cssText for each matching selector when that option is true', () => {
    const options = {
      recursive: true,
      cssText: true
    }

    return findMatches(styles, html, options).then(result => {
      // should have correct cssText properties for each object in the matches arrays
      expect(result).toMatchSnapshot()
    })
  })
  it('findPartialMatches === false', () => {
    const options = {
      formatSelector,
      recursive: true,
      findPartialMatches: false
    }

    return findMatches(styles, html, options).then(result => {
      expect(result).toEqual({
        matches: [
          {
            selector: '???div???'
          }
        ],
        children: [
          {
            matches: [
              {
                selector: '???div???'
              },
              {
                selector: '???div > div???'
              }
            ],
            children: []
          }
        ]
      })
    })
  })
})

describe('findMatches', () => {
  const options = {
    cssText: false,
    recursive: false,
    findPartialMatches: true,
    formatSelector: (a, b) => [a, b ? `???${b}???` : b]
  }

  it('should return the correct selectors (non-recursive)', () => {
    const styles = {
      content: `
      div {
        color: red;
      }
      div div {
        color: blue;
      }
      `
    }
    const html = `
      <div class='parent'>
        <div class='child'>
        </div>
      </div>
    `

    return findMatches(styles, html, options).then(result => {
      // console.log(JSON.stringify(result, null, 2))
      expect(result).toMatchSnapshot()
    })

    // return findMatches(styles, html, options).then(result => {
    //   // console.log(JSON.stringify(result, null, 2))
    //   expect(result).toMatchSnapshot()
    // })
  })
})
