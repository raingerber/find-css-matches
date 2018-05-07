/* eslint-env jest */

const {JSDOM} = require('jsdom')
const cases = require('jest-in-case')

const {
  getCssRules,
  findRulesForElement,
  testIfSelectorIsMatch,
  findMatchingPartOfSelector,
  combinatorPreventsMatch,
  getElementsUsingCombinator,
  formatRule
} = require('../__test__/index')

function createDom (html, selector) {
  const dom = new JSDOM(html)
  const element = dom.window.document.querySelector(selector)
  const matches = Function.call.bind(dom.window.Element.prototype.matches)
  return {dom, element, matches}
}

// describe('getCssRules', () => {
//   it('should return an array with each cssRule in order', () => {
//     const sheets = [{
//       cssRules: [{
//         type: 1,
//         cssText: 'one'
//       }, {
//         type: 4,
//         cssRules: [{
//           type: 1,
//           cssText: 'two'
//         }, {
//           type: 1,
//           cssText: 'three'
//         }]
//       }]
//     }, {
//       cssRules: [{
//         type: 1,
//         cssText: 'four'
//       }]
//     }]
//     expect(getCssRules(sheets)).toEqual([
//       {
//         type: 1,
//         cssText: 'one'
//       },
//       {
//         type: 1,
//         cssText: 'two'
//       },
//       {
//         type: 1,
//         cssText: 'three'
//       },
//       {
//         type: 1,
//         cssText: 'four'
//       }
//     ])
//   })
// })
// // }, {
// //   // this test is important because, when creating the element in puppeteer,
// //   // it's usually a direct child of the <body>, but we'd like to treat it as
// //   // an isolated fragment that could show up *anywhere* in the dom - so, we have
// //   // special logic in the code for preventing "body >" from being a full match
// //   skip: true,
// //   name: '"body > *" should only result in partial matches',
// //   selector: '.container',
// //   args: ['body > *', 0],
// //   result: ['body >', '*']
// // }, {
// //   // this case is different, because the " " combinator is more generic than ">"
// //   name: '"body *" can result in full matches',
// //   selector: '.container',
// //   args: ['body *', 0],
// //   result: ['', 'body *']
// // },
// cases('findRulesForElement', opts => {
//   const html = `
//     <div class="container">
//       <div class="child-1">xxx</div>
//       <div class="child-2">yyy</div>
//       <div class="child-3">zzz</div>
//     </div>
//   `
//   const {matches, element} = createDom(html, '.container')
//   const rules = findRulesForElement(matches, opts.rules, element, opts.options, 1)
//   expect(rules).toMatchSnapshot()
// }, [{
//   name: 'should respect options.findPartialMatches and options.recursive when they are false',
//   rules: [{
//     selectorText: 'div, ul' // full match, so it should be returned
//   }, {
//     selectorText: 'ul, section div' // partial match, but findPartialMatches === false
//   }],
//   options: {
//     findPartialMatches: false,
//     recursive: false
//   }
// }, {
//   name: 'should include partial matches when options.findPartialMatches is true',
//   rules: [{
//     selectorText: 'div.container, ul' // full match
//   }, {
//     selectorText: 'ul, section div' // partial match
//   }],
//   options: {
//     findPartialMatches: true,
//     recursive: false
//   }
// }, {
//   name: 'should include matching children when options.recursive is true',
//   rules: [{
//     selectorText: 'div' // full match for both the parent and the children
//   }, {
//     selectorText: 'section div > .child-2' // partial match for one of the children
//   }],
//   options: {
//     findPartialMatches: true,
//     recursive: true
//   }
// }])

// describe('testIfSelectorIsMatch', () => {
//   it('should return a "matching" array when matches returns true', () => {
//     const matches = (element, selector) => {
//       return element === 'dummy' && selector === 'div'
//     }
//     const result = testIfSelectorIsMatch(matches, 'dummy', 'div')
//     // in a "matching" array, the second element is a non-empty string
//     expect(result).toEqual(['', 'div'])
//   })
//   it('should return a "non-matching" array when matches returns false', () => {
//     const matches = (element, selector) => {
//       return !(element === 'dummy' && selector === 'div')
//     }
//     const result = testIfSelectorIsMatch(matches, 'dummy', 'div')
//     // in a "non-matching" array, the second element is an empty string
//     expect(result).toEqual(['div', ''])
//   })
// })

cases('findMatchingPartOfSelector', opts => {
  const html = `
    <div class="container">
      <div class="child-1">xxx</div>
      Text node to ignore
      <div class="child-2">yyy</div>
      Text node to ignore
      <div class="child-3">
        <div class="grandchild-1">zzz</div>
      </div>
    </div>
  `
  const {matches, element} = createDom(html, opts.selector)
  const result = findMatchingPartOfSelector(matches, element, ...opts.args)
  expect(result).toEqual(opts.result)
}, [{
  name: "returns ['', ''] when selector is an empty string",
  selector: '.container',
  args: ['', 0],
  result: ['', '']
}, {
  // this test is important because, when creating the element in puppeteer,
  // it's usually a direct child of the <body>, but we'd like to treat it as
  // an isolated fragment that could show up *anywhere* in the dom - so, we have
  // special logic in the code for preventing "body >" from being a full match
  skip: true,
  name: '"body > *" should only result in partial matches',
  selector: '.container',
  args: ['body > *', 0],
  result: ['body >', '*']
}, {
  // this case is different, because the " " combinator is more generic than ">"
  name: '"body *" can result in full matches',
  selector: '.container',
  args: ['body *', 0],
  result: ['', 'body *']
},
// full matches for child elements (the function does not *only* return partial matches)
{
  name: 'full match for child when using " "',
  selector: '.child-3',
  args: ['.container .child-3', 1],
  result: ['', '.container .child-3']
}, {
  name: 'full match for child when using "+"',
  selector: '.child-3',
  args: ['.child-2 + .child-3', 1],
  result: ['', '.child-2 + .child-3']
}, {
  name: 'full match for child when using "~"',
  selector: '.child-3',
  args: ['.child-1 ~ .child-3', 1],
  result: ['', '.child-1 ~ .child-3']
},
// partial matches for child elements
{
  name: 'partial match for child element #1',
  selector: '.child-3',
  args: ['.could-exist .child-3', 1],
  result: ['.could-exist', '.child-3']
}, {
  name: 'partial match for child element #2',
  selector: '.child-3',
  args: ['.could-exist .container > .child-3', 1],
  result: ['.could-exist', '.container > .child-3']
}, {
  skip: true,
  name: 'partial match for child element #3',
  selector: '.grandchild-1',
  args: ['.could-exist body > .container > .child-3 > .grandchild-1', 2],
  result: ['.could-exist body >', '.container > .child-3 > .grandchild-1']
}, {
  // <div class="container">
  //   <div class="child-1">xxx</div>
  //   Text node to ignore
  //   <div class="child-2">yyy</div>
  //   Text node to ignore
  //   <div class="child-3">
  //     <div class="grandchild-1">zzz</div>
  //   </div>
  // </div>
  // only: true,
  name: 'partial match for child element #4',
  selector: '.grandchild-1',
  args: ['#a .b > .c ~ .d .grandchild-1', 2],
  result: ['#a .b > .c ~ .d', '.grandchild-1']
},
// non-matching selectors when depth === 1
// combinatorPreventsMatch prevents these selectors
// from being incorrectly treated as partial matches
{
  only: true,
  name: 'non-matching selector for child when using "+"',
  selector: '.child-3',
  args: ['.child-1 + .child-3', 1],
  result: ['.child-1 + .child-3', '']
}, {
  name: 'non-matching selector for child when using ">"',
  selector: '.child-3',
  args: ['.null > .child-3', 1],
  result: ['.null > .child-3', '']
}, {
  name: 'non-matching selector for child when using "~"',
  selector: '.child-3',
  args: ['.null ~ .child-3', 1],
  result: ['.null ~ .child-3', '']
}])

// cases('combinatorPreventsMatch', opts => {
//   const html = `
//     <div class="container">
//       <div class="child-1">xxx</div>
//       <div class="child-2">yyy</div>
//       <div class="child-3">zzz</div>
//     </div>
//   `
//   const {matches, element} = createDom(html, '.child-3')
//   const result = combinatorPreventsMatch(matches, element, ...opts.args)
//   expect(result).toBe(opts.result)
// }, [{
//   name: 'always false when depth is less than 1',
//   args: ['.null', '>', 0],
//   result: false
// }, {
//   name: 'false for > when parent does match the selector',
//   args: ['.container', '>', 1],
//   result: false
// }, {
//   name: 'true for > when parent does *not* match the selector',
//   args: ['.null', '>', 1],
//   result: true
// }, {
//   name: 'false for + when previous sibling does match the selector',
//   args: ['.child-2', '+', 1],
//   result: false
// }, {
//   name: 'true for + when previous sibling does *not* match the selector',
//   args: ['.null', '+', 1],
//   result: true
// }, {
//   name: 'false for ~ when a previous sibling does match the selector',
//   args: ['.child-1', '~', 1],
//   result: false
// }, {
//   name: 'true for ~ when previous siblings do *not* match the selector',
//   args: ['.null', '~', 1],
//   result: true
// }])

// cases('getElementsUsingCombinator', opts => {
//   const html = `
//     <div class="container">
//       <div class="child-1">xxx</div>
//       Text node to ignore
//       <div class="child-2">yyy</div>
//       Text node to ignore
//       <div class="child-3">zzz</div>
//     </div>
//   `
//   const {element} = createDom(html, '.child-3')
//   const result = getElementsUsingCombinator(element, ...opts.args)
//   const classNames = result.elements.map(el => el.getAttribute('class'))
//   expect(classNames).toEqual(opts.classNames)
//   expect(result.depth).toEqual(opts.finalDepth)
// }, [{
//   name: 'should return the parent element for the > combinator',
//   args: ['>', 1],
//   classNames: ['container'],
//   finalDepth: 0 // depth should decrease by 1
// }, {
//   name: 'should return the previous sibling element for the + combinator',
//   args: ['+', 1],
//   classNames: ['child-2'],
//   finalDepth: 1
// }, {
//   name: 'should return the previous sibling elements for the ~ combinator',
//   args: ['~', 1],
//   classNames: ['child-1', 'child-2'],
//   finalDepth: 1
// }])

// cases('formatRule', opts => {
//   const result = formatRule(opts.selector, opts.rule, opts.options)
//   expect(result).toEqual(opts.result)
// }, [{
//   name: 'should return the selector without cssText, mediaText, or findPartialMatches keys',
//   selector: [['', 'div']],
//   rule: {
//     cssText: '<placeholder>'
//   },
//   options: {},
//   result: {
//     selector: [['', 'div']]
//   }
// }, {
//   name: 'should include the cssText when options.cssText === true',
//   selector: [['', 'div']],
//   rule: {
//     cssText: '<placeholder>'
//   },
//   options: {
//     cssText: true
//   },
//   result: {
//     selector: [['', 'div']],
//     cssText: '<placeholder>'
//   }
// }, {
//   name: 'should include the mediaText when parentRule.media.mediaText is defined',
//   selector: [['', 'div']],
//   rule: {
//     cssText: '<placeholder>',
//     parentRule: {
//       media: {
//         mediaText: 'I am the MEDIA TEXT.'
//       }
//     }
//   },
//   options: {},
//   result: {
//     selector: [['', 'div']],
//     mediaText: 'I am the MEDIA TEXT.'
//   }
// }, {
//   name: 'isPartialMatch is true when the selector contains at least one full match',
//   selector: [['.the', '.last'], ['.one', '.is-a'], ['', '.full-match']],
//   rule: {
//     cssText: '<placeholder>'
//   },
//   options: {
//     findPartialMatches: true
//   },
//   result: {
//     selector: [['.the', '.last'], ['.one', '.is-a'], ['', '.full-match']],
//     isPartialMatch: false
//   }
// }, {
//   name: 'isPartialMatch is false when the selector only contains partial matches',
//   selector: [['.each', '.one'], ['.is', '.a'], ['.partial', '.match']],
//   rule: {
//     cssText: '<placeholder>'
//   },
//   options: {
//     findPartialMatches: true
//   },
//   result: {
//     selector: [['.each', '.one'], ['.is', '.a'], ['.partial', '.match']],
//     isPartialMatch: true
//   }
// }])
