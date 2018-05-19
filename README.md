# Find CSS Matches

Given some HTML and CSS, find the selectors that match each element, including [partial matches](#partial-matching).

Uses [Puppeteer](https://github.com/GoogleChrome/puppeteer).

## Why?

In web projects, it can be difficult to know what CSS selectors will apply to static HTML, especially with larger stylesheets or third-party CSS. This library makes the relationship between markup and CSS more transparent. When developing HTML, it can show the CSS that will apply to the rendered elements, and it's the core behind [jest-css-match-serializer](https://www.npmjs.com/package/jest-css-match-serializer).

```js
const { findMatches } = require('find-css-matches')

const styles = `
  div#target {
    padding: 40px;
  }
  div#not-being-used {
    opacity: .5;
  }
  .class-that-could-exist #target {
    font-size: 18px;
  }
`

const html = `
  <div id="target">
    Using findMatches, we'll get the CSS
    selectors that apply to this element.
  </div>
`

const options = {
  recursive: false,
  includePartialMatches: true,
  formatSelector: (a, b) => [a, b ? `??${b}??` : b]
}

const result = await findMatches(styles, html, options)
```

**result:**

```js
{
  matches: [
    {
      selector: 'div#target',
      isPartialMatch: false
    },
    {
      selector: '.class-that-could-exist ??#target??',
      isPartialMatch: true
    }
  ]
}
```

## API

### findMatches(styles, html, [options])

Returns a promise that resolves to an object, or an array of objects if the HTML has multiple root elements.

```
{
  matches: {
    selector: <String>,
    [isPartialMatch]: <Boolean>,
    [media]: <String>,
    [css]: Array<String>
  },
  [children]: Array<Object>,
  [html]: <String>
}
```

**html**

type: `string`

The HTML to search for matches.

**styles**

type: `string | object | array`

Either a CSS string, or an object or array of objects that each have a **url**, **path**, or **content** property. Objects are forwarded to [Puppeteer#addStyleTag](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageaddstyletagoptions).

**options.recursive**

type: `boolean`

default: `true`

Include matches for the child elements (the returned object will have a **children** property).

**options.includePartialMatches**

type: `boolean`

default: `true`

Include partial matches.

**options.formatSelector**

type: `function`

default: `(unmatched, matched) => [unmatched, matched]`

When **includePartialMatches** is true, this can be used to format matching selectors. It should return an array of two strings, which are joined with a single space to create the final selector string.

**options.includeHtml**

type: `boolean`

default: `false`

Include an HTML string for each element that's visited.

**options.includeCss**

type: `boolean`

default: `false`

Include the CSS declarations for each matching selector.

### findMatchesFactory(styles, [instanceOptions])

Returns a function where the styles have been partially applied:

`findMatches(html, [options])`

In this function, the `options` override the `instanceOptions`, and each call uses the same Puppeteer instance (unlike the default version, which creates a new instance for each call). This can improve performance, and the async `findMatches.close` will destroy the Puppeteer instance.

```js
const { findMatchesFactory } = require('find-css-matches')

const findMatches = await findMatchesFactory(styles, options)

const matches1 = await findMatches(html1, {/* local options */})

const matches2 = await findMatches(html2, {/* local options */})

await findMatches.close()
```

## Partial Matching

Partial matches are selectors that *could* apply to an element. They're useful because selectors can reference siblings and ancestors, but those might be unknown when testing an HTML fragment. Take this example:

```js
const html = `
  <div>
    I am the HTML for a simple component.
  </div>
`

const styles = `
  #id span {
    color: yellow;
  }
  #id div {
    color: purple;
  }
`
```

We know that `#id span` will never apply to a `div`, but `#id div` *might* apply, depending on whether or not an ancestor has `#id`. This means that `#id div` is a partial match, where `#id` is the "unmatched" portion and `div` is the "matched" portion.

## Example #1

Using `options.includeHtml` and `options.includeCss`:

```js
const styles = `
  @media (max-width: 599px) {
    #parent {
      margin: 20px;
    }
  }
  #parent > span ~ span {
    font-weight: 800;
  }
`

const html = `
  <div id="parent">
    <span>child 1</span>
    <span>child 2</span>
  </div>
`

const options = {
  recursive: true,
  includeHtml: true,
  includeCss: true,
  includePartialMatches: false
}

const result = await findMatches(styles, html, options)
```

**result:**

```js
{
  matches: [
    {
      selector: '#parent',
      media: '(max-width: 599px)',
      css: [
        'margin: 20px'
      ]
    }
  ],
  html: '<div id="parent">',
  children: [
    {
      matches: [],
      html: '<span>',
      children: []
    },
    {
      matches: [
        {
          selector: '#parent > span ~ span',
          css: [
            'font-weight: 800'
          ]
        }
      ],
      html: '<span>',
      children: []
    }
  ]
}
```

## Example #2

Partial match examples:

`index.css`

```css
.abra {
  color: purple;
}

.cadabra {
  color: blue;
}

.abra .cadabra {
  color: green;
}

.abra + .cadabra {
  color: green;
}
```

`index.js`

```js
const { findMatches } = require('find-css-matches')

const styles = [{ path: './index.css' }]

const html = `
  <div class="cadabra">
    <span class="cadabra">
      The work of magic is this,
      that it breathes and at every
      breath transforms realities.
    </span>
  </div>
`

const options = {
  recursive: true,
  includePartialMatches: true,
  formatSelector: (a, b) => [a, b ? `??${b}??` : b]
}

const result = await findMatches(styles, html, options)
```

**result:**

```js
{
  matches: [
    {
      selector: '??.cadabra??',
      isPartialMatch: false
    },
    {
      selector: '.abra ??.cadabra??',
      isPartialMatch: true
    },
    {
      selector: '.abra + ??.cadabra??',
      isPartialMatch: true
    }
  ],
  children: [
    {
      matches: [
        {
          selector: '??.cadabra??',
          isPartialMatch: false
        },
        {
          selector: '.abra ??.cadabra??',
          isPartialMatch: true
        }
      ],
      children: []
    }
  ]
}
```

### Matches for the parent element:

```html
<span class="cadabra"> 👈
  <div class="cadabra">
```

**Excluded:**

`❌  .abra`

**Full Matches:**

`✅  .cadabra`

**Partial Matches:**

`✅  .abra .cadabra`

`✅  .abra + .cadabra`

### Matches for the child element:

```html
<div class="cadabra">
  <span class="cadabra"> 👈
```

Partial matching for chidren is more restricted, because the parent and siblings are known elements, so there's less ambiguity.

**Excluded:**

`❌  .abra`

`❌  .abra + .cadabra`

**Full Matches:**

`✅  .cadabra`

**Partial Matches:**

`✅  .abra .cadabra`

## See Also:

[jest-css-match-serializer](https://www.npmjs.com/package/jest-css-match-serializer) - take snapshots of the CSS that applies to an HTML snippet
