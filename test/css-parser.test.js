/* eslint-env jest */

const puppeteer = require('puppeteer')

const {getElementQuery} = require('../__test__/index')

describe('getElementQuery', () => {
  let browser
  async function getQuery (html, domHtml = html) {
    browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.setContent(domHtml)
    return getElementQuery(page, html)
  }
  afterEach(async () => {
    await browser.close()
  })
  it('should return the first tagName from the string', async () => {
    const tagName = await getQuery('<div><span></span></div>')
    expect(tagName).toBe('div:first-of-type')
  })
  it('should throw when no tagName is found in the string', async () => {
    return getQuery('')
      .then(result => result)
      .catch(result => {
        expect(result).toBeInstanceOf(Error)
        expect(result).toMatchSnapshot()
      })
  })
  it('should throw when the tagName selector is not found in the DOM', async () => {
    return getQuery('<div><span></span></div>', '<span></span>')
      .then(result => result)
      .catch(result => {
        expect(result).toBeInstanceOf(Error)
        expect(result).toMatchSnapshot()
      })
  })
})
