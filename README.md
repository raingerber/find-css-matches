# Find All Matches

Given a stylesheet and a snippet of HTML, find the CSS selectors that could apply to each of the elements. Uses [Puppeteer](https://github.com/GoogleChrome/puppeteer).

## Example

`index.js`

```js
const { getMatchingSelectors } = require('find-all-matches')

const html = `
<div class="cadabra">
  <span class="cadabra">
    Behold... the power of magic!
  </span>
</div>
`

const styles = [{ path: './index.css' }]

const options = { recursive: true }

getMatchingSelectors(html, styles, options).then(selectors => {
  console.log(selectors)
})
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
<div class="cadabra">
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

We return partial matches in case the snippet is rendered on a page where those selectors apply. For example, the `.cadabra` element *could* have a parent or sibling with the `.abra` class.

For the child in the snippet, we can ignore the `>`, `~`, and `+` combinators, because the parent and siblings are known already.

### Matches for the child element:

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

## API

```getMatchingSelectors(html, styles, [options])```

Returns a promise

**html**

an HTML snippet

**styles**

an array of objects, where each object has a `url`, `path`, or `content` key. These objects are forwarded to [Puppeteer#addStyleTag](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageaddstyletagoptions)

**options**

optional config

**options.recursive**

when this is **true**, we return matches for the child elements along with the top-level element

### Return Value Format

This part is better shown by example:

`index.html`

```html
<div class="child"></div>
```

`index.css`

```css
@media (max-width: 500px) {
  .child {
    color: yellow;
  }
}

.parent .child {
  color: green;
}
```

Each CSS rule is represented by an array of arrays. Input selectors might have commas, so the top array reflects that. For example, the `.a, .b, .c` selector is translated to an array with 3 elements.

Each of those parts is represented by a length 2 array of strings.

* String #1 is the `unmatched` part of the selector
* String #2 is the `matched` part of the selector (matches always include the last part of the selector, but they don't always start at the beginning).

Joining the parts with a space will return the full selector.

```js
{
  selectors: [
    {
      // TODO maybe this key should be "rule" instead of "selector"
      selector: [
        // this is a full match, so the
        // first part's an empty string
        [
          '',
          '.child'
        ]
      ],
      mediaText: '(max-width: 500px)',
      // these are unique hashes for
      // the actual styles in the rule
      // TODO have an option for disabling this;
      // it's only there to support jest-css-match-serializer
      hash: 'cb361c6573a2309aec634c4bbfe88babf35017f8'
    },
    {
      selector: [
        // this is a partial match where ".parent"
        // is the unmatched portion of the selector
        [
          '.parent',
          '.child'
        ]
      ],
      mediaText: '',
      hash: 'faae4d6410b0a4850d8006f7b4c0d559be683378'
    }
  ],
  // TODO when recursive is false, the returned
  // value might just be the selectors array...

  // this object is only populated when options.recursive === true
  children: [
    {
      selectors: [],
      children: []
    }
  ]
}
```

## See Also:

[jest-css-match-serializer](https://github.com/raingerber/jest-css-match-serializer) - take snapshots of the CSS that applies to an HTML snippet or React component