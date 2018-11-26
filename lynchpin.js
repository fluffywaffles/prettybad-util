/* lynchpin
 *
 * what to javascript connects us
 * will likely be the death of us
 *
 * — fin
 */
// descriptor affordances
const Obj             = Object
const has_own         = key => o => Obj.hasOwnProperty.call(o, key)
const of_properties   = descriptors => Object.create(null, descriptors)
const get_descriptor  = key => o => Obj.getOwnPropertyDescriptor(o, key)
const own_descriptors = Object.getOwnPropertyDescriptors

export {
  Obj,
  has_own,
  of_properties,
  get_descriptor,
  own_descriptors,
}

// descriptor mutators
const _defprop  = Obj.defineProperty
const _defprops = Obj.defineProperties
const define_property   = key => desc => o => (_defprop(o, key, desc), o)
const define_properties = descs => o => (_defprops(o, descs), o)

export {
  define_property,
  define_properties,
}

/**
 * Consistency is important in API design. This is why, in JavaScript, the
 * functions:
 *
 * - Object.getOwnPropertyNames
 *   : returns an array of all string property keys
 * - Object.getOwnPropertySymbols
 *   : returns an array of all Symbol property keys
 *
 * follow a clear naming convention suggesting similar function
 * signatures, with small variation in name (-Names vs. -Symbols)
 * distinguishing them into cases by their return type.
 *
 * ECMAScript is not always so consistent, however. for example:
 *
 * - Object.keys
 *   : returns an array of string keys of enumerable own (not inherited)
 *     properties
 * - Object.values
 *   : returns an array of the values of enumerable own string-keyed
 *     properties
 *
 * Where the names 'keys' and 'values' are ambiguous as to what qualifies
 * as 'keys' or 'values', and there does not exist any comparable set of
 * functions for Symbol-keyed properties or non-enumerable properties.
 *
 * Fortunately, we're here writing a lynchpin for a pretty bad utility
 * library that no one will use, so we have the freedom to write a
 * consistent API layer on top of these weird building blocks.
 *
 * To wit:
 *
 * - functions on string-keyed properties clearly state string-keyed-ness
 * - functions on symbol-keyed properties clearly state symbol-keyed-ness
 * - functions on both string- and symbol-keyed properties state neither
 * - functions are never restricted to enumerable properties by default
 *
 * and all functions will adhere to the following naming conventions:
 *
 * Keyed-ness specifiers
 *   - string_(keyed_)* : string-keyed
 *   - symbol_(keyed_)* : symbol-keyed
 * Return type specifiers
 *   - *value(s)        : codomain of keys
 *   - *entr(y|ies)     : key, value pair(s)
 *   - *propert(y|ies)  : key, descriptor pair(s)
 *
 * and the return type is always an array.
 *
 * So if you see:
 *
 * fmap([
 *   string_keys,
 *   string_keyed_values,
 *   string_keyed_entries,
 *   string_keyed_properties,
 *   symbol_keys,
 *   symbol_keyed_values,
 *   symbol_keyed_entries,
 *   symbol_keyed_properties,
 *   keys,
 *   values,
 *   entries,
 *   properties,
 * ])({ a: 5, [Symbol('hello')]: 6 })
 *
 * you should know exactly what to expect for the output of each function.
 *
 * If you wish to filter out non-enumerable results, there is a pinning
 * for Object.protoype.propertyIsEnumerable that can be combined with
 * filter.
 */
const string_keys   = Obj.getOwnPropertyNames
const symbol_keys   = Obj.getOwnPropertySymbols
const keys          = Reflect.ownKeys

export {
  string_keys,
  symbol_keys,
  keys,
}

const is_enumerable = key => o => Obj.propertyIsEnumerable.call(o, key)
const enumerable_string_keys          = Obj.keys
const enumerable_string_keyed_values  = Obj.values
const enumerable_string_keyed_entries = Obj.entries

export {
  is_enumerable,
  enumerable_string_keys,
  enumerable_string_keyed_values,
  enumerable_string_keyed_entries,
}

// function affordances
/*
 * stack traces unwinding
 * but nothing finding
 * bugs are made nameless
 * by function rebinding
 *
 * — fin
 */
const Fn    = Function
const arity = f   => f.length
const bind  = ctx => f => Fn.bind.call(f, ctx)
const call  = ctx => f =>  arg => Fn.call.call(f, ctx,  arg)
const apply = ctx => f => args => Fn.apply.call(f, ctx, args)
const method = name => args => obj => apply(obj)(obj[name])(args)

export {
  Fn,
  arity,
  bind,
  call,
  apply,
  method,
}

// array affordances
const _splice = arr => args => apply(arr)([].splice)(args)
const _args   = (a=[]) => (b=[]) => concat(a)(b)
const _folder = f => (acc, v) => f(v)(acc)

const len     = a => a.length
const pop     = arr      => []        .pop.call(arr)
const shift   = arr      => []      .shift.call(arr)
const reverse = arr      => []    .reverse.call(arr)
// const map     = f => arr => []        .map.call(arr, f)
const find    = f => arr => []       .find.call(arr, f)
const join    = v => arr => []       .join.call(arr, v)
const push    = v => arr => []       .push.call(arr, v)
const some    = f => arr => []       .some.call(arr, f)
const sort    = f => arr => []       .sort.call(arr, f)
const every   = f => arr => []      .every.call(arr, f)
const concat  = a => b   => []     .concat.call([], a, b)
const filter  = f => arr => []     .filter.call(arr, f)
const each    = f => arr => []    .forEach.call(arr, f)
const index   = v => arr => []    .indexOf.call(arr, v)
const unshift = v => arr => []    .unshift.call(arr, v)
const findex  = f => arr => []  .findIndex.call(arr, f)
const slice   = i => j => arr => [].slice.call(arr, i, j)
const fill    = v => i => j => arr => [].fill.call(arr, v, i, j)
const splice  = i => n => vs => arr => _splice(arr)(_args([ i, n ])(vs))
// const fold    = f => init => arr => [].reduce.call(arr, _folder(f), init)
const includes = v => arr => [].includes.call(arr, v)

const map = mapper => array => {
  const len = array.length
  let result = new Array(len)
  for (let ix = 0; ix < len; ix++) result[ix] = mapper(array[ix], ix)
  return result
}

const fold = folder => initial => array => {
  let result = initial
  for (let [ index, item ] of Object.entries(array)) {
    result = folder(item, index)(result)
  }
  return result
}

export {
  len,
  pop,
  shift,
  reverse,
  map,
  find,
  join,
  push,
  some,
  sort,
  every,
  concat,
  filter,
  each,
  index,
  unshift,
  findex,
  slice,
  fill,
  splice,
  fold,
  includes,
}

// ES6 (Weak)Map affordances
/* NOTE(jordan): this funny juggling works around rollup's name-mangling
 * so that we can export the Map built-in under its own name.
 */
const jsMap = Map
export { jsMap as Map }
/* NOTE(jordan): we cannot use the name Map here, otherwise every
 * reference to Map will get rewritten by Rollup to terms like Map$$1,
 * which of course won't work because the JavaScript built-in is called
 * Map, not Map$$1.
 */
const Map_get = key => method(`get`)([key])
const Map_has = key => method(`has`)([key])
const Map_set = key => value => method(`set`)([key, value])
const Map_keys = method(`keys`)([])
const Map_clear = method(`clear`)([])
const Map_values = method(`values`)([])
const Map_entries = method(`entries`)([])

export {
  Map_get,
  Map_has,
  Map_set,
  Map_keys,
  Map_clear,
  Map_values,
  Map_entries,
}
