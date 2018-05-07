/* lynchpin
 *
 * what to javascript connects us
 * will likely be the death of us
 *
 * — fin
 */
// descriptor affordances
const _has_own_prop = Object.hasOwnProperty
const _get_own_prop = Object.getOwnPropertyDescriptor
export const own_descriptors = Object.getOwnPropertyDescriptors
export const of_properties   = descs => Object.create(null, descs)
export const has_own         = name  => o => _has_own_prop.call(o, name)
export const get_descriptor  = name  => o => _get_own_prop(o, name)
// descriptor mutators
const _defprop = Object.defineProperty
const _defprops = Object.defineProperties
export const define_property = key => desc => o => (_defprop(o, key, desc), o)
export const define_properties = props => o => (_defprops(o, props), o)

/**
 * consistency is important in API design. This is why, in JavaScript, the functions:
 *
 * - Object.getOwnPropertyNames   : returns an array of all string property keys
 * - Object.getOwnPropertySymbols : returns an array of all Symbol property keys
 *
 * follow a clear naming convention suggesting similar function signatures, with small variation in
 * name (-Names vs. -Symbols) distinguishing them into cases by their return type.
 *
 * ECMAScript is not always so consistent, however. for example:
 *
 * - Object.keys   : returns an array of string keys of enumerable own (not inherited) properties
 * - Object.values : returns an array of the values of enumerable own string-keyed properties
 *
 * where the names 'keys' and 'values' are ambiguous as to what qualifies as 'keys' or 'values', and
 * there does not exist any comparable set of functions for Symbol-keyed properties or
 * non-enumerable properties.
 *
 * fortunately, we're here writing a lynchpin for a pretty bad utility library that no one will use,
 * so we have the freedom to write a consistent API layer on top of these weird building blocks.
 *
 * to wit:
 *
 * - functions operating on string-keyed properties will always clearly indicate string-keyed-ness
 * - functions operating on symbol-keyed properties will always clearly indicate symbol-keyed-ness
 * - functions operating on both string- and symbol-keyed properties will give no specifier
 * - functions are never restricted to enumerable properties by default
 *
 * and all functions will adhere to the following naming conventions:
 *
 * keyed-ness specifiers
 *   - string_(keyed_)* : string-keyed
 *   - symbol_(keyed_)* : symbol-keyed
 * return type specifiers
 *   - *value(s)        : codomain of keys
 *   - *entr(y|ies)     : key, value pair(s)
 *   - *propert(y|ies)  : key, descriptor pair(s)
 *
 * and the return type is always an array.
 *
 * so if you see:
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
 * if you wish to filter out non-enumerable results, there is a pinning for
 * Object.protoype.propertyIsEnumerable that can be combined with filter.
 */
export const string_keys   = Object.getOwnPropertyNames
export const symbol_keys   = Object.getOwnPropertySymbols
export const keys          = Reflect.ownKeys
const _prop_is_enumerable  = Object.propertyIsEnumerable
export const is_enumerable = key => o => _prop_is_enumerable.call(o, key)
export const enumerable_string_keys          = Object.keys
export const enumerable_string_keyed_values  = Object.values
export const enumerable_string_keyed_entries = Object.entries

// function affordances
/*
 * stack traces unwinding
 * but nothing finding
 * bugs are made nameless
 * by function rebinding
 *
 * — fin
 */
export const Fn    = Function
export const arity = f   => f.length
export const bind  = ctx => f => Fn.bind.call(f, ctx)
export const call_context  = ctx => f =>  arg => Fn.call .call(f, ctx,  arg)
export const apply_context = ctx => f => args => Fn.apply.call(f, ctx, args)

// array affordances
const _ap     = f => ctx => args => f.apply(ctx, args)
const _splice = arr => args => _ap([].splice)(arr)(args)
const _args   = (a=[]) => (b=[]) => concat(a)(b)
const _folder = f => (acc, v) => f(v)(acc)
export const len     = a => a.length
export const pop     = arr      => []        .pop.call(arr)
export const shift   = arr      => []      .shift.call(arr)
export const reverse = arr      => []    .reverse.call(arr)
export const map     = f => arr => []        .map.call(arr, f)
export const find    = f => arr => []       .find.call(arr, f)
export const join    = v => arr => []       .join.call(arr, v)
export const push    = v => arr => []       .push.call(arr, v)
export const some    = f => arr => []       .some.call(arr, f)
export const sort    = f => arr => []       .sort.call(arr, f)
export const every   = f => arr => []      .every.call(arr, f)
export const concat  = a => b   => []     .concat.call([], a, b)
export const filter  = f => arr => []     .filter.call(arr, f)
export const each    = f => arr => []    .forEach.call(arr, f)
export const index   = v => arr => []    .indexOf.call(arr, v)
export const unshift = v => arr => []    .unshift.call(arr, v)
export const findex  = f => arr => []  .findIndex.call(arr, f)
export const slice   = i => j => arr => [].slice.call(arr, i, j)
export const fill    = v => i => j => arr => [].fill.call(arr, v, i, j)
export const splice  = i => n => vs => arr => _splice(arr)(_args([ i, n ])(vs))
export const fold    = f => init => arr => [].reduce.call(arr, _folder(f), init)
export const includes = v => arr => [].includes.call(arr, v)
