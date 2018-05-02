/* eslint-env jest */

// TODO add test fixtures
// TODO how to handle empty / invalid html strings?
const {findMatches} = require('../__test__/index')

describe('findMatches', () => {
  // it('should not find anything', () => {
  //   return findMatchingRules([], 'sdfsdf', {}).then(result => {
  //     console.log(JSON.stringify(result, null, 2))
  //   })
  // })
  // it('should return the correct selectors', () => {
  //   const styles = [{
  //     content: `
  //     body > div {
  //       color: green;
  //     }
  //     div {
  //       color: yellow;
  //     }
  //     `
  //   }]
  //   const html = `
  //     <div class="container">
  //       <ul class="unordered-list">
  //         <li class="list-item"></li>
  //         <li class="list-item"></li>
  //         <li class="list-item"></li>
  //       </ul>
  //     </div>
  //   `
  //   const options = {
  //     recursive: true
  //   }
  //   return findMatchingRules(styles, html, options).then(result => {
  //     console.log(JSON.stringify(result, null, 2))
  //   })
  // })

  it('should return the correct selectors', () => {
    const styles = {
      content: `
      .thing body {
        color: pink;
      }
      body, * {
        color: green;
      }
      * {
        color: red;
      }
      `
    }
    const html = `
      <body class='parent'>
        <div class='child'>
        </div>
      </body>
    `
    const options = {
      cssText: false,
      recursive: false,
      findPartialMatches: true,
      formatSelector: (a, b) => [a, b ? `---${b}---` : b]
    }
    expect(1).toEqual(1)
    return findMatches(styles, html, options).then(result => {
      console.log(result)
      expect(result).toMatchSnapshot()
      // expect(1).toEqual(1)
      // console.log(JSON.stringify(result, null, 2))
    })
  })
})