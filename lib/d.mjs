import {
  assign,
} from './linchpin.mjs'

/**
 * descriptor factory
 * borrowing shamelessly from d.js: https://www.npmjs.com/package/d
 *
 * npm's `d` has a few problems: the api is not uniform, the code is a bit
 * complicated, and the number of dependencies is non-zero [0].
 *
 * regarding api uniformity, npm's `d` has two apis: one for values, and
 * one for getters/setters:
 *   d('cew', value)
 *   d.gs('cew', getter, setter)
 *
 * this `d` has one api:
 *   d('cew')({ v: value })
 *   d('cew')({ g: getter, s: setter })
 *
 * additionally, this `d` omits superfluous features [1], and fits in
 * about 50 non-comment lines of code (including named shorthands) [2].
 *
 * finally, where npm's `d` contrives a default descriptor [3], this `d`
 * uses the same default as if you did `o['key'] = value` -- that is, its
 * default is the same as if you just assigned the property in plain js.
 *
 * 0: why do you need 5 imports to build an object with ≤5 keys?
 * 1: d/lazy? c'mon! it is not MY job to make YOUR properties lazy :P
 * 2: as opposed to... 50ish lines in the index, and ??? lines total
 * 3: i'm really not sure where
 *      { configurable: true, enumerable: false, writable: true }
 *    comes from, but i don't know of any way you can get a javascript
 *    runtime to create a property with that descriptor except
 *    intentionally setting it using `Object.defineProperty`
 */
const d = assign({
  /**
   * Internal configuration
   */
  _: {
    /* TODO(jordan): better unknown input handling; defaulting to default
     * configuration swallows errors.
     */
    unknown_parse: c => _ => ({
      writable:     true,
      enumerable:   true,
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
})(make_descriptor)

/**
 * Descriptor factory api
 *
 * Usage:
 *   d('ew')({ v: 'drops' }) → { enumerable: true, writable: true, value: 'drops' }
 */
function make_descriptor (cew) {
  const parse = typeof cew === 'string'
    ? d.parse_cew_string
    : d._.unknown_parse
  const configuration_create = parse(cew)
  return ({ v: value, g: getter, s: setter }) => {
    const configuration = configuration_create()
    if (value  !== undefined) configuration.value = value
    if (getter !== undefined) configuration.get   = getter
    if (setter !== undefined) configuration.set   = setter
    return configuration
  }
}

/**
 * Descriptor configuration option shorthands
 *
 * Usage:
 *   d.default({ v: 5 })       → { configurable: true, enumerable: true, writable: true, value: 5 }
 *   d.nothing({ g: _ => 4 })  → { get: _ => 4 }
 *   d.enumerable({ v: 'hi' }) → { enumerable: true, value: 'hi' }
 */
assign({
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
})(d)

export default d
