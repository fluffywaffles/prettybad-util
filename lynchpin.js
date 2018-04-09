/* lynchpin
 *
 * what to javascript connects us
 * will likely be the death of us
 *
 * — fin
 */
// descriptor affordances
export const own_descs = Object.getOwnPropertyDescriptors
export const get_desc  = name  => obj => Object.getOwnPropertyDescriptor(obj, name)
export const of_descs  = descs => Object.create(null, descs)
// leading underscores indicate package-internal functions
export const _defprop  = name  => desc => obj => (Object.defineProperty(obj, name, desc), obj)
export const _defprops = props => obj => (Object.defineProperties(obj, props), obj)

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
export const string_keys = Object.getOwnPropertyNames
export const symbol_keys = Object.getOwnPropertySymbols
export const keys        = Reflect.ownKeys

// function affordances
/*
 * stack traces unwinding
 * but nothing finding
 * bugs are made nameless
 * by function rebinding
 *
 * — fin
 */
export const bind = ctx => f => Function.bind.call(f, ctx)
