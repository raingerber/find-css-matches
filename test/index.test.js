/* eslint-env jest */

// TODO use <template> tag
const {findMatches} = require('../__test__/index')

const formatSelector = (a, b) => [a, b ? `???${b}???` : b]

/**

should include cssText when options.cssText === true  (make it recursive)

should ignore partial matches when options.findPartialMatches === false (make it recursive with "div div" selector)

**/

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
            selector: "???div???"
          }
        ],
        children: [
          {
            matches: [
              {
                selector: "???div???"
              },
              {
                selector: "???div > div???"
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
      // expect(1).toBe(1)
      expect(result).toMatchSnapshot()
    })

    // return findMatches(styles, html, options).then(result => {
    //   // console.log(JSON.stringify(result, null, 2))
    //   expect(result).toMatchSnapshot()
    // })
  })
})

/**

what about this selector:

body > div (or anything else that's relative to body or html)
this does not really treat the html as a "fragment"

in general, there's gonna be strange behavior when body and html are used at all

partial match where the parent also needs to have a partial match from the unmatched portion of the selector

*/

// impossible cases - where an ID is used already but the selector expects the ID somewhere else