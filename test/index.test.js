/* eslint-env jest */

// TODO add test fixtures
// TODO how to handle empty / invalid html strings?
const {findMatches} = require('../__test__/index')

describe('findMatches', () => {
  // it('should not find anything', () => {
  //   return getMatchingSelectors([], 'sdfsdf', {}).then(result => {
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
  //   return getMatchingSelectors(styles, html, options).then(result => {
  //     console.log(JSON.stringify(result, null, 2))
  //   })
  // })
  it('should return the correct selectors', () => {
    const styles = {
      content: `
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
      cssText: true,
      recursive: true,
      matched: s => s ? `---${s}---` : s
    }
    return findMatches(styles, html, options).then(result => {
      console.log(JSON.stringify(result, null, 2))
    })
  })
})