import mem from 'mem'
import {parse} from 'css-selector-tokenizer'

const tokenizer = {
  parse: mem(parse, {cacheKey: key => key})
}

export {mem, tokenizer}
