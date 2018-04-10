import { define } from './mutton'

/* TODO(jordan):
 *
 * distinguish data descriptors (value) from accessor descriptors (get/set)
 *
 * the 'writable' option is only applicable to data descriptors
 * you'll get a TypeError if you have { writable: true } with an accessor descriptor
 * ... which right now is possible to do with d, and it shouldn't be
 */

/**
 * descriptor factory
 * borrowing shamelessly from d.js: https://www.npmjs.com/package/d
 */
const d = define.mut({
  /**
   * Internal configuration
   */
  _: {
    unknown_parse: c => d.default,
    cew: {
      c: 'configurable',
      e:   'enumerable',
      w:     'writable',
    },
  },
  /**
   * Parse a string of cew into its descriptor configuration map
   */
  parse_cew_string: ([ c1, c2, c3 ]) => {
    return  c1 && c2 && c3 ? { [d._.cew[c1]]: true, [d._.cew[c2]]: true, [d._.cew[c3]]: true }
          : c1 && c2       ? { [d._.cew[c1]]: true, [d._.cew[c2]]: true }
          : c1             ? { [d._.cew[c1]]: true }
          : {}
  },
})(make_descriptor)
/**
 * Descriptor factory api
 *
 * Usage:
 *   d('ew')({ v: 'drops' }) ⇒ { enumerable: true, writable: true, value: 'drops' }
 */
function make_descriptor (cew) {
  const parse = typeof cew === 'string' ? d.parse_cew_string : d._.unknown_parse
  return ({ v, g, s }) => {
    const conf = parse(cew)
    if (v !== undefined) conf.value = v
    if (g !== undefined) conf.get   = g
    if (s !== undefined) conf.set   = s
    return conf
  }
}
/**
 * Descriptor configuration option shorthands
 *
 * Usage:
 *   d.default({ v: 5 })      ⇒ { configurable: true, enumerable: true, writable: true, value: 5 }
 *   d.nothing({ g: ret(4) }) ⇒ { get: ret(4) }
 *   d.iter_only({ v: 'hi' }) ⇒ { enumerable: true, value: 'hi' }
 */
define.mut({
  default    : d('cew'),
  no_conf    : d( 'ew'),
  no_write   : d( 'ce'),
  no_iter    : d( 'cw'),
  write_only : d(  'w'),
  iter_only  : d(  'e'),
  conf_only  : d(  'c'),
  nothing    : d(   ''),
})(d)

export default d
