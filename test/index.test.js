/* eslint-env jest */

const {findMatchesFactory, findMatches} = require('../__test__/index')

const formatSelector = (a, b) => [a, b ? `???${b}???` : b]

describe('findMatchesFactory', async () => {
  const styles = `
    div {
      color: red;
    }
  `
  const html = `
    <div>
      <div>
      </div>
    </div>
  `
  it('findMatches.close() should not cancel pending requests', async () => {
    const _findMatches = await findMatchesFactory(styles, {recursive: false})
    const promises = Promise.all([
      _findMatches(html),
      _findMatches(html),
      _findMatches(html)
    ])

    await _findMatches.close()
    return promises
      .catch(error => error)
      .then(result => {
        expect(result[0]).toHaveProperty('matches')
        expect(result[1]).toHaveProperty('matches')
        expect(result[2]).toHaveProperty('matches')
      })
  })
  it('localOptions take precedence over instanceOptions', async () => {
    const _findMatches = await findMatchesFactory(styles, {recursive: false})
    const matches = await _findMatches(html, {recursive: true})
    await _findMatches.close()
    expect(matches.children).toBeInstanceOf(Array)
  })
  it('throws when findMatches(...) is called after findMatches.close()', async () => {
    const _findMatches = await findMatchesFactory(styles)
    await _findMatches.close()
    let result
    try {
      result = await _findMatches(html)
    } catch (error) {
      result = error
    }

    expect(result).toMatchSnapshot()
  })
})

describe('findMatches', () => {
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
  let _findMatches
  beforeAll(async () => {
    _findMatches = await findMatchesFactory(styles)
  })
  afterAll(async () => {
    await _findMatches.close()
  })
  it('should ignore DOM children when options.recursive === false', async () => {
    const options = {
      recursive: false
    }
    const result = await _findMatches(html, options)
    expect(Object.keys(result)).toEqual(['matches']) // no "children" key
  })
  it('should include css arrays when option.includeCss is true', async () => {
    const options = {
      recursive: true,
      includeCss: true
    }
    const result = await _findMatches(html, options)
    expect(result).toMatchSnapshot()
  })
  it('should ignore partial matches when options.includePartialMatches is false', async () => {
    const options = {
      formatSelector,
      recursive: true,
      includePartialMatches: false
    }
    const result = await _findMatches(html, options)
    expect(result).toMatchSnapshot()
  })
  it('should include partial matches when options.includePartialMatches is true', async () => {
    const options = {
      formatSelector,
      recursive: true,
      includePartialMatches: true
    }
    const result = await _findMatches(html, options)
    expect(result).toMatchSnapshot()
  })
  it('should find matches for multiple root elements', async () => {
    const options = {
      recursive: true,
      includePartialMatches: false
    }
    const styles = [
      `.b {
        font-size: 2px;
      }`,
      `.c {
        font-size: 3px;
      }`,
      {
        content: `
          div + div {
            color: purple;
          }
        `
      }
    ]
    const html = `
      <div class="a"></div>
      <div class="b"></div>
      <div class="c">
        <div class="d"></div>
      </div>
    `
    const result = await findMatches(styles, html, options)
    expect(result).toMatchSnapshot()
  })
  it('should work for a complex bit of html and css', async () => {
    const options = {
      formatSelector,
      recursive: true,
      includeHtml: true,
      includePartialMatches: true
    }
    const styles = `
      .container {
        padding: 5px;
      }
      .sibling ~ section {
        font-size: 50px;
      }
      html.namaste li:first-of-type ~ li {
        color: green;
      }
      @media (max-width: 500px) {
        .class1 > .class2 > section > div > * > li:first-of-type {
          color: purple;
        }
        .class1 > class2 li:first-of-type {
          color: yellow;
        }
      }
      @media (max-width: 1000px) {
        div[data-gloop="true"] > * {
          margin: 10px;
        }
      }
    `
    const html = `
      <section class="container">
        <div>
          <ul class="container">
            <li></li>
            <li></li>
            <li></li>
          </ul>
        </div>
      </section>
    `
    const result = await findMatches(styles, html, options)
    expect(result).toMatchSnapshot()
  })
})

describe('edge cases involving <html> and <body>', () => {
  it('should find matches for the <body> element', async () => {
    const options = {
      formatSelector,
      recursive: true,
      includePartialMatches: true
    }
    const styles = `
      ${/* full match */''}
      body {
        font-size: 50px;
      }
      ${/* full match */''}
      html body {
        background: yellow;
      }
      ${/* partial match */''}
      html.class body {
        background: yellow;
      }
      ${/* full match for child */''}
      body > div {
        color: magenta;
      }
      ${/* not a match */''}
      div ~ body {
        color: green;
      }
    `
    const html = `
      <body>
        <div></div>
      </body>
    `
    const result = await findMatches(styles, html, options)
    expect(result).toMatchSnapshot()
  })
  it('should not return "body >" in a full match when the snippet does not include <body>', async () => {
    const options = {
      formatSelector,
      recursive: false,
      includePartialMatches: true
    }
    const styles = `
      body > * {
        color: green;
      }
    `
    const html = `
      <div></div>
    `
    const result = await findMatches(styles, html, options)
    expect(result).toMatchSnapshot()
  })
  it('should include "body >" in a full match when the snippet includes <body>', async () => {
    const options = {
      formatSelector,
      recursive: true,
      includePartialMatches: false
    }
    const styles = `
      body > * {
        color: green;
      }
    `
    const html = `
      <body>
        <div></div>
      </body>
    `
    const result = await findMatches(styles, html, options)
    expect(result).toMatchSnapshot()
  })
  it('should not return a partial match for "body div *" or body > *" on the <body> tag itself', async () => {
    const options = {
      formatSelector,
      recursive: true,
      includePartialMatches: true
    }
    const styles = `
      ${/* this should NOT match the <div> */''}
      body div * {
        color: blue;
      }
      body > * {
        color: green;
      }
    `
    const html = `
      <body>
        <div></div>
      </body>
    `
    const result = await findMatches(styles, html, options)
    expect(result).toMatchSnapshot()
  })
  it('should work for a "snippet" with <html> as the root element', async () => {
    const options = {
      formatSelector,
      recursive: true,
      includePartialMatches: true
    }
    const styles = `
      ${/* full match */''}
      html {
        color: green
      }
      ${/* not a match */''}
      div ~ html {
        color: orange;
      }
      ${/* full match */''}
      html section {
        color: yellow
      }
      ${/* full match */''}
      body > section {
        color: magenta;
      }
      ${/* full match */''}
      body div + div {
        color: black;
      }
    `
    const html = `
      <html>
        ${/* puppeteer will add the <head> */''}
        <body>
          <section>
            <div></div>
            <div></div>
          </section>
        </body>
      </html>
    `
    const result = await findMatches(styles, html, options)
    expect(result).toMatchSnapshot()
  })
  it('should not include injected style tags in the output', async () => {
    const options = {
      recursive: true,
      includeHtml: true
    }
    const styles = `
      div {
        color: red;
      }
    `
    const html = `
      <html>
        <head>
          <style type="text/css">
            div {
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div>
          </div>
        </body>
      </html>
    `
    const result = await findMatches(styles, html, options)
    expect(result).toMatchSnapshot()
  })
})
