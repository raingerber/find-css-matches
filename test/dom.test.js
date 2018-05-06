/* eslint-env jest */

const {JSDOM} = require('jsdom')
const cases = require('jest-in-case')

const {
  findRulesForElement,
  findMatchingPartOfSelector,
  getElementsUsingCombinator,
  combinatorPreventsMatch
} = require('../__test__/index')

// TODO for this one, it should mainly test selectors with commas in them
// and does not need to test as many scenarios as the ones for findMatchingPartOfSelector
// findRulesForElement

// TODO use a helper for generating the DOM html

function getDom () {
  return new JSDOM(`
    <div class="container">
      <div class="child-1">one</div>
      Text node to ignore
      <div class="child-2">two</div>
      Text node to ignore
      <div class="child-3">three</div>
    </div>
  `)
}

cases('findRulesForElement', opts => {
  const dom = getDom()
  const element = dom.window.document.querySelector('.container')
  const matches = Function.call.bind(dom.window.Element.prototype.matches)
  const rules = findRulesForElement(matches, opts.rules, element, opts.options, 1)
  // console.log(JSON.stringify(rules, null, 2))
  expect(rules).toMatchSnapshot
}, [{
  rules: [{
    selectorText: '.container, ul'
  }, {
    selectorText: 'ul, section .container'
  }],
  options: {
    findPartialMatches: false,
    recursive: false
  },
}, {
  rules: [{
    selectorText: '.container, ul'
  }, {
    selectorText: 'ul, section .container'
  }],
  options: {
    findPartialMatches: true,
    recursive: false
  }
}, {
  rules: [{
    selectorText: 'section div > .child-2'
  }],
  options: {
    findPartialMatches: true,
    recursive: true
  }
}])

// // TODO have a separate cases for isRoot vs child
cases('findMatchingPartOfSelector', opts => {
  const dom = getDom()
  const matches = Function.call.bind(dom.window.Element.prototype.matches)
  const element = dom.window.document.querySelector(opts.selector)
  const result = findMatchingPartOfSelector(matches, element, ...opts.args)
  expect(result).toEqual(opts.result)
}, [{
  name: 'returns empty strings when selector is an empty string',
  selector: '.container',
  args: ['', 0],
  result: ['', '']
}, {
  name: 'returns partial match',
  selector: '.container',
  args: ['body .container', 0],
  result: ['', 'body .container'] // **TODO** this should actually return ['body', '.container]
}, {
  skip: true // **TODO** when the above bug is fixed, add more tests like this one
  // name: 'returns partial match',
  // selector: '.container',
  // args: ['body > .container', 0],
  // result: ['', 'body .container']
}, {
  name: '" " okay 1',
  selector: '.child-3',
  args: ['.container .child-3', 1],
  result: ['', '.container .child-3']  
}, {
  name: '" " okay 2',
  selector: '.child-3',
  args: ['.could-exist .child-3', 1],
  result: ['.could-exist', '.child-3']  
}, {
  name: '" " okay 3',
  selector: '.child-3',
  args: ['.could-exist .container .child-3', 1],
  result: ['.could-exist', '.container .child-3']  
}, {
  name: 'okay 2 >',
  selector: '.child-3',
  args: ['.could-exist .container > .child-3', 1],
  result: ['.could-exist', '.container > .child-3']
}, {
  name: 'okay 2 >',
  selector: '.child-3',
  args: ['.could-exist .container > .child-3', 1],
  result: ['.could-exist', '.container > .child-3']
}, {
  name: 'okay 1 +',
  selector: '.child-3',
  args: ['.child-2 + .child-3', 1],
  result: ['', '.child-2 + .child-3']
}, {
  name: 'not okay 1 +',
  selector: '.child-3',
  args: ['.child-1 + .child-3', 1],
  result: ['.child-1 + .child-3', '']
}, {
  name: 'okay 2',
  selector: '.child-3',
  args: ['.child-1 ~ .child-3', 1],
  result: ['', '.child-1 ~ .child-3']
}, {
  name: 'not okay 2',
  selector: '.child-3',
  args: ['.null ~ .child-3', 1],
  result: ['.null ~ .child-3', '']
}])

// TODO have more chained selectors? (that could go in the integration testing though)

cases('getElementsUsingCombinator', opts => {
  const dom = getDom()
  const element = dom.window.document.querySelector('.child-3')
  const {elements, depth} = getElementsUsingCombinator(element, ...opts.args)
  const classNames = elements.map(el => el.getAttribute('class'))
  expect(classNames).toEqual(opts.classNames)
  expect(depth).toEqual(opts.depth)
}, [{
  name: 'gets the parent element for >',
  args: ['>', 1],
  classNames: ['container'],
  depth: 0 // depth should decrease by 1
}, {
  name: 'gets the previous sibling element for +',
  args: ['+', 1],
  classNames: ['child-2'],
  depth: 1
}, {
  name: 'gets the previous sibling elements for ~',
  args: ['~', 1],
  classNames: ['child-1', 'child-2'],
  depth: 1
}])

cases('combinatorPreventsMatch', opts => {
  const dom = getDom()
  const matches = Function.call.bind(dom.window.Element.prototype.matches)
  const element = dom.window.document.querySelector('.child-3')
  const result = combinatorPreventsMatch(matches, element, ...opts.args)
  expect(result).toBe(opts.result)
}, [{
  // TODO put the *not* cases second
  name: 'always false when depth is less than 1',
  args: ['.null', '>', 0],
  result: false
}, {
  name: 'true for > when parent does *not* match the selector',
  args: ['.null', '>', 1],
  result: true
}, {
  name: 'false for > when parent does match the selector',
  args: ['.container', '>', 1],
  result: false
}, {
  name: 'true for + when previous sibling does *not* match the selector',
  args: ['.null', '+', 1],
  result: true
}, {
  name: 'false for + when previous sibling does match the selector',
  args: ['.child-2', '+', 1],
  result: false
}, {
  name: 'true for ~ when previous siblings do *not* match the selector',
  args: ['.null', '~', 1],
  result: true
}, {
  name: 'false for ~ when a previous sibling does match the selector',
  args: ['.child-1', '~', 1],
  result: false
}])

cases('combinatorPreventsMatch', opts => {
  const dom = getDom()
  const matches = Function.call.bind(dom.window.Element.prototype.matches)
  const element = dom.window.document.querySelector('.child-3')
  const result = combinatorPreventsMatch(matches, element, ...opts.args)
  expect(result).toBe(opts.result)
}, [{
  // TODO put the *not* cases second
  name: 'always false when depth is less than 1',
  args: ['.null', '>', 0],
  result: false
}, {
  name: 'true for > when parent does *not* match the selector',
  args: ['.null', '>', 1],
  result: true
}, {
  name: 'false for > when parent does match the selector',
  args: ['.container', '>', 1],
  result: false
}, {
  name: 'true for + when previous sibling does *not* match the selector',
  args: ['.null', '+', 1],
  result: true
}, {
  name: 'false for + when previous sibling does match the selector',
  args: ['.child-2', '+', 1],
  result: false
}, {
  name: 'true for ~ when previous siblings do *not* match the selector',
  args: ['.null', '~', 1],
  result: true
}, {
  name: 'false for ~ when a previous sibling does match the selector',
  args: ['.child-1', '~', 1],
  result: false
}])

