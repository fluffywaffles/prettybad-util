/* linchpin
 *
 * what to javascript connects us
 * will likely be the death of us
 *
 * — fin
 */
// descriptor affordances
const is      = a => b => Object.is(a, b)
const assign  = source => target => Object.assign(target, source)
const has_own = key => o => Object.hasOwnProperty.call(o, key)

export {
  is,
  assign,
  has_own,
}

const create = proto => descriptors => Object.create(proto, descriptors)
const get_prototype   = Object.getPrototypeOf
const set_prototype   = p => o => Object.setPrototypeOf(o, p)
const get_descriptor  = k => o => Object.getOwnPropertyDescriptor(o, k)
const own_descriptors = Object.getOwnPropertyDescriptors

export {
  create,
  get_prototype,
  set_prototype,
  get_descriptor,
  own_descriptors,
}

// descriptor mutators
const define_property = k => d => o => (Object.defineProperty(o, k, d), o)
const define_properties = ds => o => (Object.defineProperties(o, ds), o)

export {
  define_property,
  define_properties,
}

const string_keys   = Object.getOwnPropertyNames
const symbol_keys   = Object.getOwnPropertySymbols
const keys          = Reflect.ownKeys

export {
  string_keys,
  symbol_keys,
  keys,
}

const is_enumerable = key => o => Object.propertyIsEnumerable.call(o, key)
const enumerable_string_keys          = Object.keys
const enumerable_string_keyed_values  = Object.values
const enumerable_string_keyed_entries = Object.entries

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
const arity  = f   => f.length
const bind   = ctx => f => Function.bind.call(f, ctx)
const call   = ctx => f =>  arg => Function.call.call(f, ctx, arg)
const apply  = ctx => f => args => Function.apply.call(f, ctx, args)
const method = name => args => obj => apply(obj)(obj[name])(args)

export {
  arity,
  bind,
  call,
  apply,
  method,
}

// array affordances
const len      = a => a.length
const pop      = a      => []       .pop.call(a)
const shift    = a      => []     .shift.call(a)
const reverse  = a      => []   .reverse.call(a)
const map      = f => a => []       .map.call(a, f)
const find     = f => a => []      .find.call(a, f)
const join     = v => a => []      .join.call(a, v)
const push     = v => a => []      .push.call(a, v)
const some     = f => a => []      .some.call(a, f)
const sort     = f => a => []      .sort.call(a, f)
const every    = f => a => []     .every.call(a, f)
const concat   = a => b => []    .concat.call([], a, b)
const filter   = f => a => []    .filter.call(a, f)
const each     = f => a => []   .forEach.call(a, f)
const index    = v => a => []   .indexOf.call(a, v)
const unshift  = v => a => []   .unshift.call(a, v)
const findex   = f => a => [] .findIndex.call(a, f)
const includes = v => a => []  .includes.call(a, v)
const slice    = i => j => a =>      [] .slice.call(a, i, j)
const fill     = v => i => j => a => []  .fill.call(a, v, i, j)
const splice = i => n => (vs = []) => a => {
  return [].splice.apply(a, [ i, n ].concat(vs))
}
const reduce = fn => initial => a => {
  return [].reduce.call(a, (acc, value) => fn(value)(acc), initial)
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
  reduce,
  includes,
}
