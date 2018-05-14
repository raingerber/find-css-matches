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
  it('localOptions take precedence over instanceOptions', async () => {
    const findMatches = await findMatchesFactory(styles, {recursive: false})
    const matches = await findMatches(html, {recursive: true})
    await findMatches.close()
    expect(matches.children).toBeInstanceOf(Array)
  })
  it('throws when findMatches(...) is called after findMatches.close()', async () => {
    const findMatches = await findMatchesFactory(styles)
    await findMatches.close()
    const result = findMatches(html)
    expect(result).rejects.toMatchSnapshot()
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
  it('should ignore DOM children when options.recursive === false', async () => {
    const options = {
      recursive: false
    }
    const result = await findMatches(styles, html, options)
    expect(Object.keys(result)).toEqual(['matches']) // no "children" key
  })
  it('should include css arrays when option.includeCss is true', async () => {
    const options = {
      recursive: true,
      includeCss: true
    }
    const result = await findMatches(styles, html, options)
    expect(result).toMatchSnapshot()
  })
  it('should ignore partial matches when options.includePartialMatches is false', async () => {
    const options = {
      formatSelector,
      recursive: true,
      includePartialMatches: false
    }
    const result = await findMatches(styles, html, options)
    expect(result).toMatchSnapshot()
  })
  it('should include partial matches when options.includePartialMatches is true', async () => {
    const options = {
      formatSelector,
      recursive: true,
      includePartialMatches: true
    }
    const result = await findMatches(styles, html, options)
    expect(result).toMatchSnapshot()
  })
  it('should find matches for multiple root elements', async () => {
    const options = {
      recursive: true,
      includePartialMatches: false
    }
    const styles = `
      .b {
        font-size: 2px;
      }
      .c {
        font-size: 3px;
      }
      div + div {
        color: purple;
      }
    `
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
  // TODO deal with edge cases involving the body and html tags
  // it('should not return "body >" inside a full match', async () => {
  //   const options = {
  //     formatSelector,
  //     recursive: false,
  //     includePartialMatches: true
  //   }
  //   const styles = `
  //     body > * {
  //       color: green;
  //     }
  //   `
  //   const html = `
  //     <div></div>
  //   `
  //   const result = await findMatches(styles, html, options)
  //   expect(result).toMatchSnapshot()
  // })
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
