import { own_descriptors } from './lynchpin'
import { define_properties } from './mutton'

/* TODO(jordan):
 *
 * distinguish data descriptors (value) from accessor descriptors
 * (get/set)
 *
 * the 'writable' option is only applicable to data descriptors you'll get
 * a TypeError if you have { writable: true } with an accessor descriptor
 * ... which right now is possible to do with d, and it shouldn't be
 */

/**
 * descriptor factory
 * borrowing shamelessly from d.js: https://www.npmjs.com/package/d
 */
const d = define_properties.mut(own_descriptors({
  /**
   * Internal configuration
   */
  _: {
    /* TODO(jordan): better unknown input handling; defaulting to default
     * configuration swallows errors.
     */
    unknown_parse: c => _ => ({
      writable: true,
      enumerable: true,
      configurable: true,
    }),
    cew: {
      c: 'configurable',
      e:   'enumerable',
      w:     'writable',
    },
  },
  /**
   * Parse a string of cew into a constructor for its descriptor
   * configuration object.
   */
  parse_cew_string: ([ c1, c2, c3 ]) => _ => {
    return  c1 && c2 && c3 ? { [d._.cew[c1]]: true, [d._.cew[c2]]: true, [d._.cew[c3]]: true }
          : c1 && c2       ? { [d._.cew[c1]]: true, [d._.cew[c2]]: true }
          : c1             ? { [d._.cew[c1]]: true }
          : {}
  },
}))(make_descriptor)

/**
 * Descriptor factory api
 *
 * Usage:
 *   d('ew')({ v: 'drops' }) ⇒ { enumerable: true, writable: true, value: 'drops' }
 */
function make_descriptor (cew) {
  const parse = typeof cew === 'string'
    ? d.parse_cew_string
    : d._.unknown_parse
  const Conf = parse(cew)
  return ({ v, g, s }) => {
    const inst = Conf()
    if (v !== undefined) inst.value = v
    if (g !== undefined) inst.get   = g
    if (s !== undefined) inst.set   = s
    return inst
  }
}

/**
 * Descriptor configuration option shorthands
 *
 * Usage:
 *   d.default({ v: 5 })      ⇒ { configurable: true, enumerable: true, writable: true, value: 5 }
 *   d.nothing({ g: ret(4) }) ⇒ { get: ret(4) }
 *   d.enumerable({ v: 'hi' }) ⇒ { enumerable: true, value: 'hi' }
 */
define_properties.mut(own_descriptors({
  // Default descriptor: all permissions
  default          : d(`cew`),
  // Single permission inclusion descriptors
  configurable     : d(`c`  ),
  enumerable       : d( `e` ),
  writable         : d(  `w`),
  // Single permission exclusion descriptors
  non_configurable : d( `ew`),
  non_enumerable   : d( `cw`),
  non_writable     : d( `ce`),
  // Nothing descriptor: no permissions
  nothing          : d(   ``),
}))(d)

export default d
