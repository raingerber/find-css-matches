# Find All Matches

Given some HTML and CSS, find the selectors that *could* apply to each element. Uses [Puppeteer](https://github.com/GoogleChrome/puppeteer).

```js
const { findMatches } = require('find-css-matches')

const html = `
  <div id="target">
    Using findMatches, we'll get the CSS
    selectors that apply to this element.
  </div>
`

const styles = `
  div#target {
    padding: 40px;
  }
  div#ignore-me {
    opacity: .5;
  }
  .class-that-could-exist #target {
    font-size: 18px;
  }
`

const options = {
  findPartialMatches: true
}

const result = findMatches(styles, html, options)

// RESULT:
//
// {
//   matches: [
//     {
//       selector: "div#target",
//       isPartialMatch: false
//     },
//     {
//       selector: ".class-that-could-exist #target",
//       isPartialMatch: true
//     }
//   ]
// }
```

## Partial Matching

If you write some HTML, it's difficult to know what CSS *could* be applied to it, espcially if you have large, possibly external stylesheets. Take this example:

```js
const html = `
  <div>
    I am the HTML for a simple component.
  </div>
`

const styles = `
  .class span {
    color: yellow;
  }
  .class div {
    color: purple;
  }
`
```

We know that `.class span` will never apply to a `div`, but the text in the `div` *might* be purple, depending on whether a parent node has `.class` applied to it. That's where partial matching comes in.

Partial matching returns the selectors that could apply to an element. In this example, `.class div` is a partial match, where `.class` is the "unmatched" portion and `div` is the "matched" portion. See below for a more detailed example.

## API

**findMatches(styles, html, [options])**

Returns a promise

**html**

type: `string`

The HTML to search for CSS matches. There should be a single root element.

**styles**

type: `string | array`

Either a CSS string, or an array of objects that each have a **url**, **path**, or **content** key. Objects are forwarded to [Puppeteer#addStyleTag](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageaddstyletagoptions)

**options.cssText**

type: `boolean`

default: `false`

Include the CSS text for each matching selector

**options.recursive**

type: `boolean`

default: `true`

Include matches for the child elements (the returned object will have a **children** key)

**options.findPartialMatches**

type: `boolean`

default: `true`

Include partial matches

**options.formatSelector**

type: `function`

default: `(unmatched, matched) => [unmatched, matched]`

When **findPartialMatches** is true, this can be used to format matching selectors. It should return an array of two strings, which will be joined with a single space to create the final selector string.

## Example

```js
const { findMatches } = require('find-css-matches')

const html = `
  <div class="cadabra">
    <span class="cadabra">
      The work of magic is this,
      that it breathes and at every
      breath transforms realities.
    </span>
  </div>
`

const styles = [{ path: './index.css' }]

const options = {
  recursive: true,
  findPartialMatches: true
}

findMatches(styles, html, options)
```

`index.css`

```css
.abra {
  color: purple;
}

.cadabra {
  color: blue;
}

.abra .cadabra {
  color: magenta;
}

.abra > .cadabra {
  color: red;
}

.abra + .cadabra {
  color: green;
}

.abra ~ .cadabra {
  color: yellow;
}
```

### Matches for the parent element:

```html
<span class="cadabra">
```

Excluded:

`❌  .abra`

Full Matches:

`✅  .cadabra`

Partial Matches:

`✅  .abra .cadabra`

`✅  .abra > .cadabra`

`✅  .abra + .cadabra`

`✅  .abra ~ .cadabra`

### Matches for the child element:

Partial matching for chidren is more restricted, because the parent and siblings are known elements, so there's less ambiguity.

```html
<div class="cadabra">
  👉 <span class="cadabra"> 👈
```

Excluded:

`❌  .abra`

`❌  .abra > .cadabra`

`❌  .abra + .cadabra`

`❌  .abra ~ .cadabra`

Full Matches:

`✅  .cadabra`

Partial Matches:

`✅  .abra .cadabra`

## See Also:

[jest-css-match-serializer](https://github.com/raingerber/jest-css-match-serializer) - take snapshots of the CSS that applies to an HTML snippet
