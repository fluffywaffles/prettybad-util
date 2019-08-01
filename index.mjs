/*
 * UTF-8 Mappings
 * μ : U+03bc
 * ᐅ : U+1405
 */

import d from './d'
import * as mutative from './mutton'
import {
  is,
  len,
  join,
  keys,
  index,
  filter,
  findex,
  string_keys,
  symbol_keys,
  is_enumerable,
  some as any,
  every as all,
} from './linchpin'
import * as js from './linchpin'

// re-exports
export { default as d } from './d'
export {
  is,
  len,
  bind,
  join,
  keys,
  index,
  filter,
  findex,
  string_keys,
  symbol_keys,
  is_enumerable,
  some as any,
  every as all,
  create as from_descriptors,
} from './linchpin'

// general
const proxy = traps => target => new Proxy(target, traps)
const None = proxy({
  get (target, key, receiver) {
    // NOTE: `get` returns `None` if `key` is not an "own-property"
    return get(key)(target)
  },
  apply () {
    return None
  },
})(js.define_properties({
  // stringify cases
  toString : { value () { return `None` } },
  // error cases
  [Symbol.toPrimitive] : {
    value (hint) {
      if (hint === 'string') return `None`
      throw new Error(`Symbol.toPrimitive: None is not a primitive!`)
    }
  },
  // name cases
  name                 : { value: `None` },
  [Symbol.toStringTag] : { value: `None` },
  // other cases
  [Symbol.isConcatSpreadable] : { value: false },
})(function () {}))

// utilities
const value_or = replacement => ᐅwhen(not(is_value))(ret(replacement))

export {
  None,
  proxy,
  value_or,
}

// functions
const id      = v => v
const ret     = v  => _ => v
const call    = f  => v => f(v)
const pass    = v  => f => f(v)
const and     = fs => v => all(pass(v))(fs)
const or      = fs => v => any(pass(v))(fs)
const fmap    = fs => v => map(pass(v))(fs)
const times   = n  => f => v => fold(call)(v)(n_of(f)(n))
const or_none = predicate => fn => ᐅif(predicate)(fn)(ret(None))
const over    = fn => values => result => fold(fn)(result)(values)
const flatfmap = fns => ᐅ([ fmap(fns), flatten ])

export {
  id,
  or,
  and,
  ret,
  call,
  fmap,
  over,
  pass,
  times,
  or_none,
  flatfmap,
}

const apply  = f => ᐅwhen(args => len(args) > 0)(fold(pass))(f)
const apply1 = f => a =>           apply(f)([ a ])
const apply2 = f => a => b =>      apply(f)([ a, b ])
const apply3 = f => a => b => c => apply(f)([ a, b, c ])

export {
  apply,
  apply1,
  apply2,
  apply3,
}

// Fallibles: they're not Promises. I know, I know. But they aren't.
/* EXPLANATION(jordan): A "fallible" either `pose`s a result, or it
 * `fail`s without computing one. Why use these names?
 *
 * A posed result can still become a failure in a composition of
 * fallibles. Thus, the result is "posed:" it isn't a "success" or a
 * "resolution." When a fallible poses a result, this does not signify the
 * completion of the computation. It merely poses an option. A failure,
 * however, cannot compose. When a fallible fails, its result is not
 * available in the next step of the computation; when a fallible fails,
 * the composition fails.
 *
 * Fallibles, unlike Promises, are not designed for failure recovery at
 * the site of the error. They are designed for failure recovery only at
 * the boundary, when a completed composition of fallibles becomes a
 * result - or doesn't. Either a final posed result is accepted, or a
 * failure is exposed and must be handled.
 *
 * This is a stricter, less friendly, formulation of a similar
 * control-flow to (synchronous) Promises. Fallibles are not designed to
 * make it easy to "make it work." They're designed to expose the
 * fallibility of a computation, and to make that hard to ignore.
 *
 * Fallibles also do not allow error messages. It is my belief that the
 * error message should be generated for the user, not used in the code;
 * in the code, it tends to be unwieldy, often leading to error-handling
 * code that parses the message to determine what error is being handled.
 *
 * Instead, a chain of fallibles that fails will highlight the
 * failing fallible and provide the last-posed-result. In this way, it may
 * be possible to mitigate certain errors at the boundary of the
 * composition, by detecting which fallible was at fault and by recovering
 * some state of the execution from the last-posed-result. Alternatively,
 * these 2 pieces of information can instead be used to produce an error
 * message for display, or converted into a normal JavaScript Error.
 */
// REFACTOR(jordan): module
const fallible_create = definition => value => definition({
  pose: result => [ true, result ],
  fail: _      => [ false, value ],
})(value)

// 'Guard's a function with a predicate in a fallible
function fallible_guard (pred) {
  return fn => fallible_create(({ pose, fail }) => value => {
    return pred(value) ? pose(fn(value)) : fail()
  })
}

// Forces a fallible composition to succeed or Error fatally
const fallible_fatalize = fallible => v => {
  const [ succeeded, result ] = fallible(v)
  if (succeeded) return result
  else throw new Error(`fatalized fallible failed on ${v}`)
}

// Folds fallibles over results until one fails to pose a next result
function fallible_fold (folder) {
  return initial => fold_indexed(index => value => {
    const thread_shuttle = ᐅ([ get(1), folder(value), push(index) ])
    return ᐅif(get(0))(thread_shuttle)(ret(fold.break))
  })([ true, initial, -1 ])
}

// 'Break's on the first fallible to pose a result
function fallible_first (fallibles) {
  return fallible_create(({ pose, fail }) => value => {
    for (const fallible of fallibles) {
      const [ succeeded, result ] = fallible(value)
      if (succeeded) return pose(result)
    }
    return fail()
  })
}

// 'Chain's a series of fallibles, until one fails to pose a next result
function fallible_ᐅ (fallibles) {
  return value => fallible_fold(call)(value)(fallibles)
}
function fallible_ᐅdo (fallibles) {
  return fallible_create(({}) => value => {
    const do_folder = fallible => args => {
      const target = last(args)
      const [ succeeded, result ] = apply(fallible)(args)
      return [ succeeded, [ result, target ] ]
    }
    return ᐅ([
      fallible_fold(do_folder)([ value ]),
      array_update(1)(get(0)), // drop the carried 2nd argument
    ])(fallibles)
  })
}

function fallible_atomic (fallible) {
  return fallible_create(({ pose, fail }) => value => {
    const [ succeeded, result ] = fallible(value)
    return succeeded ? pose(result) : fail()
  })
}

function fallible_fail () {
  return fallible_create(({ fail }) => _ => fail())
}
function fallible_unfailing (fn) {
  return fallible_create(({ pose }) => value => pose(fn(value)))
}

function fallible_unwrap ([ succeeded, result, index = None ]) {
  if (succeeded) return result
  throw new Error(
    `fallible.assert: fallible did not succeed; last result: ${result}`
  )
}

function fallible_succeeded ([ succeeded, result ]) {
  return succeeded
}

const fallible_assert = fallible => value => {
  return fallible_unwrap(fallible(value))
}

const fallible = js.assign({
  // Composers
  ᐅ         : fallible_ᐅ,
  ᐅdo       : fallible_ᐅdo,
  fold      : fallible_fold,
  first     : fallible_first,
  // Modifiers
  atomic    : fallible_atomic,
  fatalize  : fallible_fatalize,
  // Wrappers
  fail      : fallible_fail,
  guard     : fallible_guard,
  unfailing : fallible_unfailing,
  // Unwrappers
  assert    : fallible_assert,
  unwrap    : fallible_unwrap,
  succeeded : fallible_succeeded,
})(fallible_create)

export {
  fallible,
}

// binding and calling methods
const method_of = obj => name => js.bind(obj)(get(name)(obj))
const method  = name => args => obj => apply(method_of(obj)(name))(args)
const method0 = name => method(name)([])
const method1 = name => a => method(name)([a])
const method2 = name => a => b => method(name)([a,b])
const method3 = name => a => b => c => method(name)([a,b,c])
const method_exists = name => obj => name in obj

export {
  method,
  method0,
  method1,
  method2,
  method3,
  method_of,
  method_exists,
}

// predicates
const not      = f => v => !f(v)
const is_value = v => v != null        // [1]
/* NOTE(jordan):
 *
 * [1]: Using the *fancy* rules for {truthy,falsy}ness, one can determine
 * that this returns `true` when a value is not `undefined` or `null`.
 */

export {
  /* NOTE(jordan): `is` was exported from linchpin above */
  not,
  is_value,
}

// pipelining

const ᐅ     = fns => over(call)(fns)
const ᐅif   = predicate => tf => ff => v => (predicate(v) ? tf : ff)(v)
const ᐅwhen = predicate => tf => ᐅif(predicate)(tf)(id)
const ᐅeffect = f => target => (f(target), target)
const ᐅlog    = v => ᐅeffect(v => console.dir(v, { depth: null }))(v)

// NOTE(jordan): continue passing the target as the last argument
const ᐅdo = fns => target => {
  const do_folder = fn => args => [ apply(fn)(args), last(args) ]
  return ᐅ([ fold(do_folder)([target]), get(0) ])(fns)
}

export {
  ᐅ,
  ᐅdo,
  ᐅif,
  ᐅwhen,
  ᐅeffect,
  ᐅlog,
  ᐅ       as pipe,
  ᐅdo     as pipe_do,
  ᐅif     as pipe_if,
  ᐅwhen   as pipe_when,
  ᐅeffect as pipe_effect,
  ᐅlog    as pipe_log,
}

/* primitive types
 *    boolean
 *    undefined
 *    number
 *    string
 *    symbol
 *    object
 * weirdo types
 *    null
 *      - typeof null === 'object'
 *      - null instanceof Object === false
 *    NaN
 *      - NaN != NaN
 *      - typeof NaN === 'number'
 *      - NaN instanceof Number === false
 * object types
 *    literally everything else
 *      - boxed types (Number, Boolean, String, Function, ...)
 *      - user objects (function, class, ...)
 *      - etc.
 */
// REFACTOR(jordan): module
export const types = (function () {
  // number literals, Number(), but not new Number (which is object)
  const number = 'number'
  // constructed instances (e.g. new class), literal objects
  const object = 'object'
  // string literals, String(), but not new String (which is object)
  const string = 'string'
  // symbols, well-known Symbols (e.g. Symbol.iterator)
  const symbol = 'symbol'
  // true, false, Boolean(), but not new Boolean (which is object)
  const boolean = 'boolean'
  // functions, classes
  const function_ = 'function'
  // free variables, literal undefined
  const undefined = 'undefined'
  return {
    number,
    object,
    string,
    symbol,
    boolean,
    undefined,
    function: function_,
  }
})()

// TODO(jordan): untested
const type     = t => v => typeof v === t
const instance = C => v => v instanceof C
export const reflex = {
  type: js.assign({
    object    : type(types.object),
    number    : type(types.number),
    string    : type(types.string),
    symbol    : type(types.symbol),
    boolean   : type(types.boolean),
    function  : type(types.function),
    undefined : type(types.undefined),
  })(type),
  instance: js.assign({
    Map      : instance(Map),
    Set      : instance(Set),
    Date     : instance(Date),
    Array    : instance(Array),
    Number   : instance(Number),
    Object   : instance(Object),
    RegExp   : instance(RegExp),
    Boolean  : instance(Boolean),
    Function : instance(Function),
  })(instance),
}

// polymorphic object/array copiers
const array_copy  = arr => concat(arr)([])
const object_copy = obj => ᐅ([ js.own_descriptors, js.create ])(obj)
const copy = object => fallible.assert(fallible.first([
  fallible.guard(reflex.instance.Array)(array_copy),
  fallible.guard(reflex.type.object)(object_copy),
]))(object)
const copy_and    = f => obj  => ᐅ([ copy, f ])(obj)
const copy_apply  = f => args => copy_and(apply(f)(args))
const copy_apply0 = f =>                copy_apply(f)([])
const copy_apply1 = f => a =>           copy_apply(f)([ a ])
const copy_apply2 = f => a => b =>      copy_apply(f)([ a, b ])
const copy_apply3 = f => a => b => c => copy_apply(f)([ a, b, c ])

export {
  array_copy,
  object_copy,
  copy,
  copy_and,
  copy_apply,
  copy_apply0,
  copy_apply1,
  copy_apply2,
  copy_apply3,
}

// utilities for hiding some imperative code

/* NOTE(jordan): this code is terrifying and you just shouldn't think too
 * hard about it.
 *
 * The unfortunate complexity arises from the short-circuiting mechanism.
 * It was already a somewhat ugly piece of imperative looping code, but as
 * soon as it was "enhanced" with a conditional short-circuit mechanism it
 * became... well, this.
 *
 * This is the cleanest formulation I've been able to construct.
 */
const breakloop = ({ marker, body, latch = _ => {} }) => array => {
  let index = 0, result = marker
  while (index < array.length) {
    result = body(array[index], index)
    if (result === marker) break
    latch(result, index++)
  }
}

const map = js.define_properties({
  break: { value: Symbol(`map: short-circuit marker`) },
})(mutative.from(fn => array => {
  return ᐅeffect(breakloop({
    marker : map.break,
    body   : (item,   index) => fn(item, index, array),
    latch  : (result, index) => array[index] = result,
  }))(array)
})(copy_apply1))

const fold = js.define_properties({
  break: { value: Symbol(`fold: short-circuit marker`) },
})(folder => initial => array => {
  let accumulator = initial
  breakloop({
    marker : fold.break,
    body   : (item, index) => folder(item, index, array)(accumulator),
    latch  : (result) => accumulator = result,
  })(array)
  return accumulator
})

export {
  map,
  fold,
}

// arrays
// const string_array_case = ({ string: string_fn, array: array_fn }) => {
//   return ᐅif(reflex.type(types.string))(string_fn)(array_fn)
// }
// const slice    = mutative.with(array_slice.mut)(i => j => string_array_case({
//   string : s => ''.slice.call(s, i, j),
//   array  : a => [].slice.call(a, i, j),
// }))

const each     = f => ᐅeffect(js.each(f)) // NOTE: could mutate...
const find     = f => arr => value_or(None)(js.find(f)(arr))
const n_of     = x => n => fill.mut(x)(new Array(n))
const concat   = mutative.with(a => each(v => push.mut(v)(a)))(js.concat)
const sort     = mutative.from(js.sort)(copy_apply1)
const fill     = mutative.from(v => js.fill(v)(/*i*/)(/*j*/))(copy_apply1)
const cons     = mutative.from(v => ᐅeffect(js.unshift(v)))(copy_apply1)
const push     = mutative.from(v => ᐅeffect(js.push(v)))(copy_apply1)
const includes = v => js.includes(v)
const last     = a => ᐅ([ skip(-1), get(0) ])(a)
const split_at = n => fmap([ take(n), skip(n) ])
const split_on = v => a => ᐅdo([ index(v), split_at ])(a)
const reverse  = mutative.from(js.reverse)(copy_and)
const splice   = mutative.from(start => count => to_insert => {
  return ᐅeffect(js.splice(start)(count)(to_insert))
})(copy_apply3)

export {
  cons,
  each,
  find,
  last,
  n_of,
  push,
  sort,
  concat,
  splice,
  reverse,
  includes,
  split_at,
  split_on,
}

const resize = mutative.wrap(len => set_value('length')(len))
const wrap   = l => n => n < 0 ? n + l : n

const slice = mutative.from(i => j => array => {
  const [ start, end ] = map(wrap(len(array)))([ i, j ])
  return ᐅ([ offset.mut(start), resize.mut(end - start) ])(array)
})(copy_apply2)

export {
  slice,
}

const flatten = mutative.from(ᐅeffect(as => {
  let length = len(as)
  for (let index = 0; index < length; index++) {
    const [ item ] = pop.mut(as)
    ᐅif(reflex.instance.Array)(append.mut)(push.mut)(item)(as)
  }
}))(copy_apply0)
const flatmap = mutative.from(fn => array => {
  return ᐅ([ map.mut(fn), flatten.mut ])(array)
})(copy_apply1)

export {
  flatten,
  flatmap,
}

const interlace = a => b => map_indexed(i => k => [ k, get(i)(b) ])(a)
const disinterlace = kvs => fold(([ k, v ]) => ([ ks, vs ]) => {
  return [ push(k)(ks), push(v)(vs) ]
})([[], []])(kvs)

export {
  interlace,
  disinterlace,
}

const indexed = f => g => f((it,ix) => g(ix)(it))
const all_indexed = f => indexed(all)(f)
const any_indexed = f => indexed(any)(f)
const map_indexed = f => indexed(map)(f)
const each_indexed = f => indexed(each)(f)
const fold_indexed = f => indexed(fold)(f)
const filter_indexed = f => indexed(filter)(f)

export {
  all_indexed,
  any_indexed,
  map_indexed,
  each_indexed,
  fold_indexed,
  filter_indexed,
}

const mapper = mutative.derive(map)
const offset = mapper(map => o => map((_, ix, ar) => ar[ix + o]))
const til    = mapper(map => n => map((_, i) => i > n ? map.break : i))
const thru   = mutative.derive(til)(til => n => til(n + 1))

export {
  til,
  thru,
}

const concatenator = mutative.derive(concat)
const append = concatenator(concat => a => b => concat(b)(a))

export {
  append,
}

const slicer = mutative.derive(slice)
const take = slicer(slice => j => slice(0)(j))
const skip = slicer(slice => i => a => slice(i)(len(a))(a))

export {
  skip,
  take,
}

const taker = mutative.derive(take)
const drop_end = taker(take => n => take(-n))
const but_last = mutative.derive(drop_end)(drop_end => drop_end(1))

export {
  drop_end,
  but_last,
}

const rest = mutative.derive(skip)(skip => a => skip(1)(a))

export {
  rest,
}

const splicer = mutative.derive(splice)
const insert  = splicer(splice => i => v => splice(i)(0)([v]))
const remdex  = splicer(splice => i => splice(i)(1)([]))
const replace = splicer(splice => i => v => splice(i)(1)([v]))

export {
  insert,
  remdex,
  replace,
}

const array_update = mutative.derive(replace)(replace => {
  return i => f => ᐅdo([ ᐅ([ get(i), call(f) ]), replace(i) ])
})

export {
  array_update,
}

const remdexer = mutative.derive(remdex)
const remove = remdexer(remdex => v => ᐅdo([ index(v), remdex ]))
const pop    = remdexer(remdex => a => fmap([ get(0), remdex(0) ])(a))

export {
  remove,
  pop,
}

// objects & arrays

// key selectors
const on_string_keys = fn => ᐅdo([ string_keys, fn ])
const on_symbol_keys = fn => ᐅdo([ symbol_keys, fn ])
const on_keys = fn => flatfmap([ on_string_keys(fn), on_symbol_keys(fn) ])

export {
  on_string_keys,
  on_symbol_keys,
  on_keys,
}

// getter predicates
// NOTE(jordan): `has(...)` is shallow; `in` or Reflect.has would be deep
const is_key     = v => includes(typeof v)([`string`,`number`,`symbol`])
const unsafe_has = key => obj => and([ is_value, js.has_own(key) ])(obj)
const has        = key => obj => is_key(key) && unsafe_has(key)(obj)
const has_path   = p => obj => fallible.succeeded(maybe_get_path(p)(obj))

export {
  is_key,
  unsafe_has,
  has,
}

// getters
// base value getters
const get_value      = key => or_none(has(key))(obj => obj[key])
const get_values     = keys => fmap(map(get)(keys))

// flipped base value getter
const get_value_in   = o => k => get_value(k)(o)

// base entry, property, descriptor getters
const get_entry      = key => obj => [ key, get(key)(obj) ]
const get_property   = key => obj => [ key, get_descriptor(key)(obj) ]
const get_descriptor = key => or_none(has(key))(js.get_descriptor(key))

const map_keys        = fn => keys => obj => map(k => fn(k)(obj))(keys)
const get_entries     = keys => map_keys(get_entry)(keys)
const get_properties  = keys => map_keys(get_property)(keys)
const get_descriptors = keys => map_keys(get_descriptor)(keys)

// base path getters
const get_path_value = path => obj => fold(get)(obj)(path)
const at_path = getter => path => ᐅ([
  fmap([ last, ᐅ([ but_last, get_path_value ]) ]),
  apply(getter),
])(path)
/*
 * at_path(get_entry)([ 'a', 'b' ])({ a: { b: 5 } }) // => [ 'b', 5 ]
 * ... and so on, for get_property, get_properties, get_descriptor, etc.
 */

// categorized getters
const get = js.assign({
  // for_{key,keys,path}
  for_key: {
    value      : get_value,
    entry      : get_entry,
    property   : get_property,
    descriptor : get_descriptor,
  },
  for_keys: {
    values      : get_values,
    entries     : get_entries,
    properties  : get_properties,
    descriptors : get_descriptors,
  },
  for_path: {
    value       : get_path_value,
    values      : at_path(get_values),
    entry       : at_path(get_entry),
    entries     : at_path(get_entries),
    property    : at_path(get_property),
    properties  : at_path(get_properties),
    descriptor  : at_path(get_descriptor),
    descriptors : at_path(get_descriptors),
  },
  // for all keys
  string_keyed: {
    values      : on_string_keys(get_values),
    entries     : on_string_keys(get_entries),
    properties  : on_string_keys(get_properties),
    descriptors : on_string_keys(get_descriptors),
  },
  symbol_keyed: {
    values      : on_symbol_keys(get_values),
    entries     : on_symbol_keys(get_entries),
    properties  : on_symbol_keys(get_properties),
    descriptors : on_symbol_keys(get_descriptors),
  },
  all: {
    values      : on_keys(get_values),
    entries     : on_keys(get_entries),
    properties  : on_keys(get_properties),
    descriptors : on_keys(get_descriptors),
  },
  // get "in" (flipped getters)
  in: object => {
    return js.assign({
      for_key: {
        value       : get_value_in,
        entry       : k  => get.for_key.entry(k)(object),
        property    : k  => get.for_key.property(k)(object),
        descriptor  : k  => get.for_key.descriptor(k)(object),
      },
      for_keys: {
        values      : ks => get.for_keys.values(ks)(object),
        entries     : ks => get.for_keys.entries(ks)(object),
        properties  : ks => get.for_keys.properties(ks)(object),
        descriptors : ks => get.for_keys.descriptors(ks)(object),
      },
      for_path: {
        value       : p => get.for_path.value(p)(object),
        values      : p => get.for_path.values(p)(object),
        entry       : p => get.for_path.entry(p)(object),
        entries     : p => get.for_path.entries(p)(object),
        property    : p => get.for_path.property(p)(object),
        properties  : p => get.for_path.properties(p)(object),
        descriptor  : p => get.for_path.descriptor(p)(object),
        descriptors : p => get.for_path.descriptors(p)(object),
      },
      string_keyed: {
        values      : ks => get.string_keyed.values(ks)(object),
        entries     : ks => get.string_keyed.entries(ks)(object),
        properties  : ks => get.string_keyed.properties(ks)(object),
        descriptors : ks => get.string_keyed.descriptors(ks)(object),
      },
      symbol_keyed: {
        values      : ks => get.symbol_keyed.values(ks)(object),
        entries     : ks => get.symbol_keyed.entries(ks)(object),
        properties  : ks => get.symbol_keyed.properties(ks)(object),
        descriptors : ks => get.symbol_keyed.descriptors(ks)(object),
      },
      all: {
        values      : ks => get.all.values(ks)(object),
        entries     : ks => get.all.entries(ks)(object),
        properties  : ks => get.all.properties(ks)(object),
        descriptors : ks => get.all.descriptors(ks)(object),
      },
      /* EXPLANATION(jordan): cannot modify get_value_in directly or it
       * becomes circular! Create a wrapper and modify that instead.
       */
    })(object => get_value_in(object))
  },
  /* EXPLANATION(jordan): cannot modify get_value directly or it becomes
   * circular! Create a wrapper and modify that instead.
   */
})(key => get_value(key))
/* get(k)(obj)                      -- same as: get.for_key.value(k)(obj)
 * get.for_key.entry(k)(obj)
 * get.for_keys.entries(ks)(obj)
 * get.for_path.value(p)(obj)
 * get.for_path.descriptors(p)(obj)
 * get.string_keyed.entries(obj)
 * get.symbol_keyed.properties(obj)
 * get.in(obj)(k)                   -- get.in(obj).for_key.value(k)
 * get.in(obj).for_key.value(k)
 * get.in(obj).for_path.value(p)
 * get.in(obj).for_path.entries(p)
 * &c.
 */

// getter short hand
js.assign({
  value       : js.assign({ in : o => get.in(o).value       })(get.for_key.value),
  entry       : js.assign({ in : o => get.in(o).entry       })(get.for_key.entry),
  values      : js.assign({ in : o => get.in(o).values      })(get.for_keys.values),
  entries     : js.assign({ in : o => get.in(o).entries     })(get.for_keys.entries),
  property    : js.assign({ in : o => get.in(o).property    })(get.for_key.property),
  properties  : js.assign({ in : o => get.in(o).properties  })(get.for_keys.properties),
  descriptor  : js.assign({ in : o => get.in(o).descriptor  })(get.for_key.descriptor),
  descriptors : js.assign({ in : o => get.in(o).descriptors })(get.for_keys.descriptors),
  path: {
    value       : js.assign({ in : o => get.in(o).for_path.value       })(get.for_path.value),
    entry       : js.assign({ in : o => get.in(o).for_path.entry       })(get.for_path.entry),
    values      : js.assign({ in : o => get.in(o).for_path.values      })(get.for_path.values),
    entries     : js.assign({ in : o => get.in(o).for_path.entries     })(get.for_path.entries),
    property    : js.assign({ in : o => get.in(o).for_path.property    })(get.for_path.property),
    properties  : js.assign({ in : o => get.in(o).for_path.properties  })(get.for_path.properties),
    descriptor  : js.assign({ in : o => get.in(o).for_path.descriptor  })(get.for_path.descriptor),
    descriptors : js.assign({ in : o => get.in(o).for_path.descriptors })(get.for_path.descriptors),
  },
})(get)
/* get.value(k)(obj)             -- get.for_key.value(k)(obj)
 * get.value.in(obj)(k)          -- get.in(obj).for_key.value(k)
 * get.descriptors(ks)(obj)      -- get.for_keys(ks).descriptors(obj)
 * get.descriptors.in(obj)(ks)   -- get.in(obj).for_keys.descriptors(obj)
 * get.path.value(p)(obj)        -- get.for_path.value(p)(obj)
 * get.path.value.in(obj)(p)     -- get.in(obj).for_path.value(p)(obj)
 * get.path.descriptors(ks)(obj) -- get.for_path.descriptors(ks)(obj)
 * &c.
 */

export {
  get,
}

// TODO(jordan): bring fallible getters into the unified 'get' object
// Fallible getters
const maybe_get = key => fallible.guard(has(key))(get(key))
const maybe_get_path = keys => fallible.ᐅ(map(maybe_get)(keys))

export {
  maybe_get,
  maybe_get_path,
}

// Object manipulators
// key, (value|descriptor)
const set_value = mutative.from(k => v => o => (o[k] = v, o))(copy_apply2)
const set_descriptor = mutative.from(js.define_property)(copy_apply2)

// { [key]: (value|descriptor), ... }
const set_values      = mutative.from(js.assign)(copy_apply1)
const set_descriptors = mutative.from(js.define_properties)(copy_apply1)

// [ key, (value|descriptor) ]
const set_entry    = mutative.derive(set_value)(apply)
const set_property = mutative.derive(set_descriptor)(apply)

// [ [ key, (value|descriptor) ], ... ]
const set_entries    = mutative.derive(set_entry)(over)
const set_properties = mutative.derive(set_property)(over)

const set = js.assign({
  // one-key setters
  value      : set_value,
  entry      : set_entry,
  property   : set_property,
  descriptor : set_descriptor,
  // many-key setters
  values      : set_values,
  entries     : set_entries,
  properties  : set_properties,
  descriptors : set_descriptors,
})(set_value)

export {
  set,
}

const from_entries    = pairs => set_entries.mut(pairs)({})
const from_properties = pairs => set_properties.mut(pairs)({})

export {
  from_entries,
  from_properties,
}

const merge_by = ([ get, join ]) => ᐅ([ map(get), flatten, join ])
const merge_entries    = vs => merge_by([ get.all.entries, from_entries ])(vs)
const merge_properties = vs => merge_by([ get.all.properties, from_properties ])(vs)

export {
  merge_by,
  merge_entries,
  merge_properties,
}

const merge = a => b => merge_properties([ a, b ])
const map_as = convert => undo => f => ᐅ([ convert, f, undo ])
const on_properties = f => map_as(get.all.properties)(from_properties)(f)
const on_entries    = f => map_as(get.all.entries)(from_entries)(f)
const map_properties = f => on_properties(map(f))
const map_entries    = f => on_entries(map(f))
const filter_properties = f => on_properties(filter(f))
const filter_entries    = f => on_entries(filter(f))
const swap = k => v => fmap([ get(k), o => merge(o)({ [k]: v }) ])
const enumerable_keys = o => ᐅ([ keys, filter(k => is_enumerable(k)(o)) ])(o)
const enumerable_entries = o => ᐅdo([ enumerable_keys, get.for_keys.entries ])(o)

const zip   = ks  => vs => ᐅ([ interlace(ks), from_entries ])(vs)
const unzip = obj => ᐅ([ entries, disinterlace ])(obj)

export {
  merge,
  map_as,
  on_properties,
  map_properties,
  map_entries,
  filter_properties,
  filter_entries,
  swap,
  enumerable_keys,
  enumerable_entries,
  zip,
  unzip,
  // DEPRECATED(jordan)
  merge as mixin,
}

// TODO(jordan): clean-up
const update_path = path => final_updater => {
  return fold(key => value_updater => fallible.ᐅdo([
    fallible.atomic(fallible.ᐅ([ maybe_get(key), value_updater ])),
    new_value => fallible.unfailing(set_value(key)(new_value)),
  ]))(fallible.unfailing(final_updater))(reverse(path))
}
const update = key => fn => ᐅ([ update_path([ key ])(fn), take(2) ])
// const update_with = ups => o => fold(apply(update))(o)(entries(ups))

export {
  update,
  update_path,
  // update_with,
}

// strings
// NOTE(jordan): most array functions also work on strings
// REFACTOR(jordan): _is_object should probably be a predicate we export
// IDEA(jordan): we should have a type_is.{object,&c} predicate object
const _is_object    = v => reflex.type(types.object)(v)
const _is_symbol    = v => reflex.type(types.symbol)(v)
const _has_toString = o => method_exists(`toString`)(o)
const _stringable_object = v => and([ _is_object, _has_toString ])(v)
const _stringable = v => or([ _stringable_object, _is_symbol ])(v)

const string = v => `${ᐅwhen(_stringable)(v => v.toString())(v)}`
const lowercase = str => ''.toLowerCase.call(str)
const uppercase = str => ''.toUpperCase.call(str)
const string_split = delimiter => str => ''.split.call(str, delimiter)

export {
  string,
  lowercase,
  uppercase,
  string_split,
}

export function test (suite) {
  const to6 = [ 1, 2, 3, 4, 5 ]
  const sym_a = Symbol(`a`)

  function throws (fn) {
    try { fn() } catch (e) { return true }
    return false
  }

  return suite(`prettybad/μtil: worse than underscore`, [
    t => t.suite(`None`, {
      'perpetuates itself': t => {
        return true
            && t.eq(None.a.b.c.hi())(None)
            // NOTE(jordan): Symbol.isConcatSpreadable tests
            && t.eq(concat(None)(5))([ None, 5 ])
            && t.eq(flatten([ `a`, None, `c` ]))([ `a`, None, `c` ])
      },
      'throws when used as a number': t => {
        return true
            && t.ok(throws(_ => +None))
            && t.ok(throws(_ => None + 0))
            && t.ok(throws(_ => None * 2))
      },
      'always stringifies as `None`': t => {
        return true
            && t.eq(get(`name`)(None))(`None`)
            && t.eq(None.toString())('None')
            && t.eq(String(None))('None')
            && t.eq(`${None}`)('None')
            && t.eq(None[Symbol.toStringTag])(`None`)
      },
    }),
    t => t.suite('pipelining', {
      'ᐅ: pipelines functions':
        t => t.eq(ᐅ([ id, x => x + 1 ])(1))(2),
      'ᐅdo: chains together calls on a common target': t => {
        const object = { a: 0, b: `c`, d: true }
        const values = [ 0, `c`, true ]
        return t.eq(ᐅdo([ js.keys, get.for_keys.values ])(object))(values)
      },
      'ᐅif: inline if': t => {
        const approach_10 = ᐅif(v => v < 10)(v => v + 1)(v => v - 1)
        return true
          && t.eq(approach_10(5))(6)
          && t.eq(approach_10(12))(11)
      },
      'ᐅwhen: one-armed inline if': t => {
        const inc_when_even = ᐅwhen(v => v % 2 === 0)(v => v + 1)
        return true
          && t.eq(inc_when_even(2))(3)
          && t.eq(inc_when_even(1))(1)
      },
    }),
    t => t.suite('functions', {
      'id: id(6) is 6':
        t => t.eq(id(6))(6),
      'id: works on objects':
        t => {
          const object = { a: 5 }
          return t.refeq(id(object))(object)
        },
      'call: calls func':
        t => t.eq(call(id)(1))(1),
      'bind: binds ctx':
        t => t.eq(js.bind(5)(function () { return this })())(5),
      'ret: returns a computed value':
        t => t.eq(ret(5)())(5),
      'apply: applies function to array of args':
        t => {
          return t.eq(apply(function (a) { return b => a + b })([ 1, 2 ]))(3)
              && t.eq(apply(_ => 5)([])())(5)
        },
      'times: repeats a function a set number of times':
        t => t.eq(times(3)(x => x * 2)(2))(16),
      'or_none: if <cond>, do <fn>; otherwise return None':
        t => {
          return true
              && t.eq(or_none(a => a.length > 0)(a => a[0])([1]))(1)
              && t.eq(or_none(a => a.length > 0)(a => a[0])([]))(None)
        },
      'and: true if all predicates are true':
        t => t.ok(and([ x => x % 2 === 0, x => x % 3 === 0 ])(6)),
      'or: true if any predicate is true':
        t => t.ok(or([ x => x + 1 === 3, x => x + 1 === 2 ])(1)),
      'fmap: runs a series of functions on an object':
        t => t.eq(fmap([ v => v + 1, v => v / 2 ])(4))([ 5, 2 ]),
      'method{n}: calls a named method with argument(s)':
        t => {
          const obj = {
            multiply  (value) { return mutiplicand => mutiplicand * value },
            double    (value) { return this.multiply(value)(2) },
            raise_sum (power) { return a => b => Math.pow(a + b, power) },
          }
          return true
              && t.eq(method(`multiply`)([ 3, 3 ])(obj))(9)
              && t.eq(method(`double`)([ 4 ])(obj))(8)
              && t.eq(method1(`double`)(5)(obj))(10)
              && t.eq(method2(`multiply`)(5)(4)(obj))(20)
              && t.eq(method3(`raise_sum`)(2)(3)(4)(obj))(49)
        },
    }),
    t => t.suite('fallibles', {
      'wraps a calculation that may fail':
        t => {
          const poses5 = fallible(({ pose }) => _ => pose(5))
          const fails  = fallible(({ fail }) => _ => fail())
          const poses_uppercase = fallible(({ pose, fail }) => value => {
            if (typeof value !== 'string') {
              return fail()
            } else {
              return pose(value.toUpperCase())
            }
          })
          return true
              && t.eq(poses5(NaN))([ true, 5 ])
              && t.eq(fails('abc'))([ false, 'abc' ])
              && t.eq(poses_uppercase(5))([ false, 5 ])
              && t.eq(poses_uppercase('abc'))([ true, 'ABC' ])
        },
      'fallible.unfailing: poses the result of a normal function':
        t => {
          return t.eq(fallible.unfailing(v => v + 1)(5))([ true, 6 ])
        },
      'fallible.fail: immediately fails':
        t => {
          return t.eq(fallible.fail()(5))([ false, 5 ])
        },
      'fallible.ᐅ: chains a series of fallibles':
        t => {
          const arbitrary_pipe = fallible.ᐅ([
            fallible.guard(v => typeof v === 'number')(id),
            fallible.guard(v => v > 5)(v => v * 2),
            fallible.guard(v => v % 2 === 0)(v => v - 1),
          ])
          return true
              && t.eq(arbitrary_pipe('abc'))([ false, 'abc', 0 ])
              && t.eq(arbitrary_pipe(5))([ false, 5, 1 ])
              && t.eq(arbitrary_pipe(7))([ true, 13, 2 ])
        },
      'fallible.first: returns the first successful fallible':
        t => {
          const gt5 = fallible.guard(v => v > 5)(ret(`5`))
          const gt1 = fallible.guard(v => v > 1)(ret(`1`))
          return true
              && t.eq(fallible.first([ gt5, gt1 ])(3))([ true, `1` ])
              && t.eq(fallible.first([ gt5, gt1 ])(7))([ true, `5` ])
              && t.eq(fallible.first([ gt1, gt5 ])(0))([ false, 0  ])
        },
    }),
    t => t.suite(`objects`, {
      'string_keys: lists string keys':
        t => t.eq(string_keys({ [sym_a]: `hi`, a: 4 }))(['a']),
      'symbol_keys: lists symbol keys':
        t => t.eq(symbol_keys({ [sym_a]: `hi`, a: 4 }))([sym_a]),
      'keys: lists both string and symbol keys':
        t => t.eq(keys({ [sym_a]: `hi`, a: 4 }))(['a', sym_a]),
      'get.string_keyed.values: lists string-keyed values':
        t => t.eq(get.string_keyed.values({ [sym_a]: `hi`, a: 4 }))([4]),
      'get.symbol_keyed.values: lists symbol-keyed values':
        t => t.eq(get.symbol_keyed.values({ [sym_a]: `hi`, a: 4 }))([ `hi` ]),
      'get.all.values: lists both symbol values and non-symbol values':
        t => t.eq(get.all.values({ [sym_a]: `hi`, a: 4 }))([ 4, `hi` ]),
      'get.descriptor: gets property descriptor':
        t => t.eq(get.descriptor('a')({ a: 4 }))(d.default({ v: 4 })),
      'set_descriptors.mut: copies descriptors from an object':
        t => {
          const o = { a: 5 }
          set_descriptors.mut({ b: { value: 3 } })(o)
          set_descriptors.mut({ a: { value: 6, enumerable: false } })(o)
          return true
            && t.eq(o.b)(3)
            && t.eq(o.a)(6)
            && t.eq(Object.keys(o))([])
        },
      'set_descriptor.mut: sets a single descriptor on an object':
        t => {
          const o = { a: 1 }
          set_descriptor.mut('b')({ value: 5 })(o)
          set_descriptor.mut('a')({ enumerable: false })(o)
          return true
            && t.eq(o.b)(5)
            && t.eq(o.a)(1)
            && t.eq(Object.keys(o))([])
        },
      'get.string_keyed.properties: gets non-symbol properties':
        t => {
          return t.eq(get.string_keyed.properties({ a: 5 }))([
            ['a', d.default({ v: 5 }) ],
          ])
        },
      'get.symbol_keyed.properties: gets symbol properties':
        t => {
          return t.eq(get.symbol_keyed.properties({ [Symbol.split]: `hi` }))([
            [Symbol.split, d.default({ v: `hi` })],
          ])
        },
      'get.all.properties: gets all properties':
        t => {
          return t.eq(get.all.properties({ a: 5, [Symbol.split]: `hi` }))([
            [ 'a',          d.default({ v: 5 })    ],
            [ Symbol.split, d.default({ v: `hi` }) ],
          ])
        },
      'from_properties: converts [prop, desc] pairs to an object':
        t => t.eq(from_properties([['a',d.default({ v: 5 })]]))({ a: 5 }),
      'object_copy: (shallowly) clones an object':
        t => {
          return true
              && t.eq(object_copy({ a: 5 }))({ a: 5 })
              && t.refeq(object_copy({ f: to6 }).f)(to6)
        },
      'merge: combines properties of 2 source objects':
        t => t.eq(merge({ a: 4 })({ a: 5 }))({ a: 5 }),
      'has: returns true if a key is valid and present in an object':
        t => {
          return true
              && t.ok(has(`a`)({ a: `b` }))
              && t.ok(has(0)([1]))
              && !t.ok(has(0)([]))
              && !t.ok(has([`a`])({ a: `b` }))
        },
      'has_path: returns true if a path is valid and present in an object':
        t => {
          return true
              && t.ok(has_path([ 'a', 'b', 'c' ])({ a: { b: { c: 5 } } }))
              && t.ok(has_path([ 1, 1 ])([ 0, [ 0, 1 ] ]))
              && !t.ok(has_path([ 'z' ])({ a: { b: { c: 5 } } }))
              && !t.ok(has_path([ 1, 1, 0 ])([ 0, [ 0, 1 ] ]))
        },
      'get: gets a key/index or None if not present':
        t => {
          return true
              && t.eq(get(0)([5]))(5)
              && t.eq(get('a')({}))(None)
              && !t.eq(get(['a'])({ 'a': 'b' }))('b')
        },
      'get.for_path.value: gets a path, or returns None if path does not exist':
        t => {
          return true
              && t.eq(get.for_path.value(['a','b','c'])({'a': {'b': {'c': 5}}}))(5)
              && t.eq(get.for_path.value(['a','b','d'])({'a': {'b': {'c': 5}}}))(None)
        },
      'get.in(object).for_path.value: gets a path of keys/indices in a target object':
        t => t.eq(get.in({'a': {'b': {'c': 5 }}}).for_path.value(['a','b','c']))(5),
      'maybe_get: conditionally gets a key and returns success':
        t => {
          return true
              && t.eq(maybe_get(0)([`a`]))([ true, `a` ])
              && t.eq(maybe_get(`a`)({ b: 0 }))([ false, { b: 0 } ])
              && t.eq(maybe_get(0)([]))([ false, [] ])
        },
      'maybe_get_path: conditionally gets a path and returns success':
        t => {
          return true
              && t.eq(maybe_get_path([0, 1])([[0, 1]]))([ true, 1, 1 ])
              && t.eq(maybe_get_path([`a`, `b`])({ a: 0 }))([ false, 0, 1 ])
        },
      'get.all.entries: gets {key,symbol}, value pairs':
        t => {
          return t.eq(get.all.entries({ a: 5, [Symbol.split]: `hi` }))([
            ['a', 5],
            [Symbol.split, `hi`],
          ])
        },
      'from_entries: turns {key,symbol}, value pairs into an object':
        t => t.eq(from_entries([['a', 5],['b', `hi`]]))({a: 5, b: `hi`}),
      'swap: swaps the current value of a key for another':
        t => t.eq(swap(`a`)(14)({ a: 5 }))([ 5, { a: 14 } ]),
      'update: replaces a key by a v -> v function':
        t => {
          const inc = v => v + 1
          return true
            && t.eq(update(`a`)(inc)({ a: 4 }))([ true, { a: 5 } ])
            && t.eq(update(`a`)(inc)({}))([ false, {} ])
            && t.eq(update(`a`)(v => 5)({}))([ false, {} ])
            && t.ok(ᐅ([ update(0)(inc), get(1) ])([ 1 ]) instanceof Array)
            && t.eq(update(0)(inc)([ 1 ]))([ true, [ 2 ] ])
        },
      'update_path: replace a nested key by a v -> v function':
        t => {
          const update_ab = update_path([ `a`, `b` ])
          const inc = v => v + 1
          return true
            && t.eq(update_ab(inc)({ a: { b: 2 } }))([ true, { a: { b : 3 } }, 1 ])
            && t.eq(update_ab(inc)({ z: 1 }))([ false, { z: 1 }, 0 ])
            && t.eq(update_ab(inc)({ a: 3 }))([ false, { a: 3 }, 0 ])
            && t.ok(ᐅ([ update_path([ 0, 1 ])(inc), get(1) ])([ [ 1, 2 ], 3 ]) instanceof Array)
            && t.eq(update_path([ 0, 1 ])(inc)([ [ 1, 2 ], 3 ]))([ true, [ [ 1, 3 ], 3 ], 1 ])
        },
      'enumerable_entries: entries, filtered by js.is_enumerable':
        t => {
          const example = js.create({
            a: d.default({ v: 5 }),
            b: d.nothing({ v: 'hidden' }),
          })
          return t.eq(enumerable_entries(example))([[ 'a', 5 ]])
        },
      // 'update_with: update with an object of updaters':
      //   t => {
      //     const example = { a: 3, b: { c: 'd' }, hi: true }
      //     const updaters = {
      //       a: v => v + 1,
      //       b: update(`c`)(v => v.toUpperCase()),
      //       hi: v => !v,
      //     }
      //     return t.eq(update_with(updaters)(example))({
      //       a: 4,
      //       b: { c: `D` },
      //       hi: false,
      //     })
      //   },
    }),
    t => t.suite('value predicates', {
      'is':
        t => {
          return true
              && t.ok(is(null)(null))
              && t.ok(is(undefined)(undefined))
              && t.ok(is(0)(0))
              && t.ok(is("hello")("hello"))
              && !t.ok(is("hello")("goodbye"))
              && !t.ok(is(0)(1))
              && !t.ok(is(null)(undefined))
              && !t.ok(is(false)(undefined))
              && !t.ok(is(null)(false))
        },
      'not':
        t => {
          return true
              && t.ok(not(v => v < 5)(6))
              && !t.ok(not(v => v === "hello")("hello"))
        },
      'is_value':
        t => {
          return true
              && t.ok(is_value(0))
              && t.ok(is_value(false))
              && t.ok(is_value(NaN))
              && !t.ok(is_value(undefined))
              && !t.ok(is_value(null))
        },
    }),
    t => t.suite('arrays', {
      'each: no effect':
        t => t.eq(each(v => v * v)(to6))(to6),
      'map: adds 1':
        t => t.eq(map(v => v + 1)(to6))([ 2, 3, 4, 5, 6 ]),
      'filter: keeps between 1 and 4':
        t => t.eq(filter(v => v < 4 && v > 1)(to6))([ 2, 3 ]),
      'concat: to6 and 123':
        t => t.eq(concat(to6)([ 1, 2, 3 ]))([ 1, 2, 3, 4, 5, 1, 2, 3 ]),
      'all: all to6 > 0':
        t => t.ok(all(v => v > 0)(to6)),
      'all: not all to6 < 1':
        t => !t.ok(all(v => v < 1)(to6)),
      'any: at least one of to6 is even':
        t => t.ok(any(v => v % 2 == 0)(to6)),
      'any: none of to6 is divisible by 10':
        t => !t.ok(any(v => v % 10 == 0)(to6)),
      'sort: sort() (default algorithm) of shuffled to6 is to6':
        t => t.eq(sort()([3, 1, 5, 4, 2]))(to6),
      'includes: to6 includes 5':
        t => t.ok(includes(5)(to6)),
      'includes: to6 does not include 0':
        t => !t.ok(includes(0)(to6)),
      'index: 3 is index 2 in to6':
        t => t.eq(index(3)(to6))(2),
      'index: -1 when not found':
        t => t.eq(index(123)(to6))(-1),
      'find: first even of to6 is 2':
        t => {
          return true
              && t.eq(find(v => v % 2 == 0)(to6))(2)
              && t.eq(find(v => v === 0)([ 0, false ]))(0)
              && t.eq(find(v => v === false)([ 0, false ]))(false)
              && t.eq(find(v => !v)([ 0, false ]))(0)
              && t.eq(find(v => !v)([ 14, true ]))(None)
        },
      'findex: first even of to6 is at index 1':
        t => {
          return true
              && t.eq(findex(v => v % 2 == 0)(to6))(1)
              && t.eq(findex(v => v > 10)(to6))(-1)
        },
      'join: joins an array into a string':
        t => t.eq(join('+')(to6))('1+2+3+4+5'),
      'slice(0)(0): nothing':
        t => t.eq(slice(0)(0)(to6))([]),
      'slice(1)(5): of to6 is 2..5':
        t => t.eq(slice(1)(5)(to6))([ 2, 3, 4, 5 ]),
      'slice(0)(3): of to6 is 1..3':
        t => t.eq(slice(0)(3)(to6))([ 1, 2, 3 ]),
      'skip(1): of to6 is same as slice(1)(5)':
        t => t.eq(skip(1)(to6))([ 2, 3, 4, 5 ]),
      'take(3): of to6 is same as slice(0)(3)':
        t => t.eq(take(3)(to6))([ 1, 2, 3 ]),
      'rest: same as slice(1)':
        t => t.eq(rest(to6))([ 2, 3, 4, 5 ]),
      'fold: sum of to6 is 15':
        t => t.eq(fold(v => acc => v + acc)(0)(to6))(15),
      'cons: cons [0] to to6 gives [0],1..5':
        t => t.eq(cons([ 0 ])(to6))([ [ 0 ], 1, 2, 3, 4, 5 ]),
      'len: len of to6 is 5':
        t => t.eq(len(to6))(5),
      'fill: fills an array with a value':
        t => {
          return true
              && t.eq(fill(5)(to6))([ 5, 5, 5, 5, 5 ])
              && t.eq(to6)([ 1, 2, 3, 4, 5 ])
        },
      'n_of: n_of 0 where n is 5 gives 5 zeroes':
        t => t.eq(n_of(0)(5))([ 0, 0, 0, 0, 0 ]),
      'push: to6 push [6] is 1..5,[6]':
        t => t.eq(push([ 6 ])(to6))([ 1, 2, 3, 4, 5, [ 6 ] ]),
      'flatten: flattening arbitrarily partitioned to6 is to6':
        t => {
          return true
              && t.eq(flatten([[1], [2, 3], 4, [5]]))(to6)
              && t.eq(flatten([ 1, [ 2, 3 ], [], [], 4 ]))([ 1, 2, 3, 4 ])
              && t.eq(flatten([[ 1, 2, 3 ]]))([ 1, 2, 3 ])
        },
      'flatmap: maps then flattens':
        t => t.eq(flatmap(v => [ v, v + 5 ])([ 1, 2 ]))([ 1, 6, 2, 7 ]),
      'array_copy: makes new copy of array':
        t => {
          return true
              && t.eq(array_copy(to6))(to6)
              && !t.refeq(array_copy(to6))(to6)
        },
      'reverse: reverse of to6 is 5..1':
        t => t.eq(reverse(to6))([ 5, 4, 3, 2, 1 ]),
      'remove: removing 2 from to6 drops index 1':
        t => t.eq(remove(2)(to6))([ 1, 3, 4, 5 ]),
      'remdex: removing index 1 from to6 drops 2':
        t => t.eq(remdex(1)(to6))([ 1, 3, 4, 5 ]),
      'insert: inserts a value at an index':
        t => t.eq(insert(3)(1)(to6))([ 1, 2, 3, 1, 4, 5 ]),
          // Here's a fun FAILING test: sparse arrays are only accidental!
          // && t.eq(insert(3)(0)([1, 2]))([ 1, 2, , 0 ]),
      'interlace: make pairs out of same-length arrays':
        t => t.eq(interlace([1,2])([`a`,`b`]))([[1,`a`],[2,`b`]]),
      'disinterlace: make same-length arrays out of pairs':
        t => t.eq(disinterlace([[1,`a`],[2,`b`]]))([[1,2], [`a`,`b`,]]),
      'drop_end: drops n items from end of array':
        t => t.eq(drop_end(2)([ 1, 2, 3 ]))([ 1 ]),
    }),
    t => t.suite(`strings`, {
      'string: stringifies a thing':
        t => {
          return true
              && t.eq(string({ toString() { return 'hello' } }))('hello')
              && t.eq(string(function f () {}))('function f () {}')
              && t.eq(string(5))('5')
              && t.eq(string([ `a`, `b`, `c`, ]))('a,b,c')
              && t.eq(string(true))('true')
              && t.eq(string(Symbol(`abc`)))('Symbol(abc)')
        },
      'lowercase: lower-cases a string':
        t => t.eq(lowercase('aBCdEfChgaksldFS'))('abcdefchgaksldfs'),
      'uppercase: upper-cases a string':
        t => t.eq(uppercase('aBCdEfChgaksldFS'))('ABCDEFCHGAKSLDFS'),
      'string_split: splits a string around a delimiter':
        t => t.eq(string_split(',')('a,b,c'))(['a', 'b', 'c']),
    }),
  ])
}
