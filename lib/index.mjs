/*
 * UTF-8 Mappings
 * ᐅ : pipe       : U+1405
 * ƒ : fallible   : U+0192
 * ✗ : "ballot x" : U+2717
 * ✓ : checkmark  : U+2713
 */

import d from './d.mjs'
import { mutative, from_mutative } from './mutton.mjs'
import {
  len,
  join,
  keys,
  arity,
  index,
  filter,
  findex,
  string_keys,
  symbol_keys,
  is_enumerable,
  some  as any,
  every as all,
} from './linchpin.mjs'
import * as js from './linchpin.mjs'
import * as performance from './performance.mjs'

// re-exports
export { default as d } from './d.mjs'
export {
  len,
  bind,
  join,
  keys,
  arity,
  index,
  filter,
  findex,
  string_keys,
  symbol_keys,
  is_enumerable,
  get_prototype,
  set_prototype,
  some  as any,
  every as all,
} from './linchpin.mjs'
export { performance }

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

export {
  None,
  proxy,
}

const trampoline = (
  it,
  {
    condition = ᐅon(`iterator`)(and([ not(is(None)), is.type.function ])),
  } = {},
) => value => {
  while (condition({ iterator: it, value })) { [ it, value ] = it(value) }
  return value
}

export {
  trampoline,
}

const time = thunk => performance.inject(({ performance }) => {
  const start = performance.now()
  const value = thunk()
  const end   = performance.now()
  const diff  = 1e6 * (end - start)
  return {
    value,
    resolutions: [ 's', 'ms', 'us', 'ns' ],
    summary: (() => {
      const s = (diff / 1e9) | 0
      let rem = diff - (s * 1e9)
      const m = (rem / 1e6) | 0
      rem     = rem - (m * 1e6)
      const u = (rem / 1e3) | 0
      const n = (rem - (u * 1e3)) | 0
      return { s, ms: m, us: u, ns: n }
    })(),
    summarize ({ resolution = 'ns' }) {
      console.assert(includes(resolution)(this.resolutions))
      return ᐅ([
        take(1 + index(resolution)(this.resolutions)),
        join(`\t`),
      ])([
        `${this.summary.s }s`,
        `${this.summary.ms}ms`,
        `${this.summary.us}μs`,
        `${this.summary.ns}ns`,
      ])
    },
    toString () { return this.summarize({}) },
    in: {
      ns: diff,
      get s  () { return this.ns / 1e9 },
      get ms () { return this.ns / 1e6 },
      get us () { return this.ns / 1e3 },
    },
  }
})

const timed = fn => args => time(() => apply(fn)(args))

export {
  time,
  timed,
}

// functions
const id      = v => v
const call    = f  => v => f(v)
const pass    = v  => f => f(v)
const and     = fs => v => all(pass(v))(fs)
const or      = fs => v => any(pass(v))(fs)
const fmap    = fs => v => map(pass(v))(fs)
const times   = n  => f => v => fold(call)(v)(fill.mut(f)(new Array(n)))
const or_none = predicate => f => ᐅif(predicate)(f)(_ => None)
const flatfmap = fs => ᐅ([ fmap(fs), flatten ])
const over     = f  => vs => result => fold(f)(result)(vs)
const fcross   = fs => vs => (
  is(len(fs))(len(vs))
    ? map(apply(call))(interlace(fs)(vs))
    : []
)

export {
  id,
  or,
  and,
  call,
  fmap,
  over,
  pass,
  times,
  fcross,
  or_none,
  flatfmap,
}

const apply  = f => args => len(args) > 0 ? fold(pass)(f)(args) : f()
const apply0 = f =>                f()
const apply1 = f => a =>           apply(f)([ a ])
const apply2 = f => a => b =>      apply(f)([ a, b ])
const apply3 = f => a => b => c => apply(f)([ a, b, c ])

export {
  apply,
  apply0,
  apply1,
  apply2,
  apply3,
}

// binding and calling methods
const method_exists = name => obj => name in obj
const method_of = obj => name => js.bind(obj)(get(name)(obj))
const method  = name => args => obj => apply(method_of(obj)(name))(args)
const method0 = name => _ =>           method(name)([])
const method1 = name => a =>           method(name)([ a ])
const method2 = name => a => b =>      method(name)([ a, b ])
const method3 = name => a => b => c => method(name)([ a, b, c ])

export {
  method,
  method0,
  method1,
  method2,
  method3,
  method_of,
  method_exists,
}

// Fallibles: they're not Promises. I know, I know. But they aren't.
/* EXPLANATION(jordan): A "fallible" either `pose`s a result, or it
 * `fail`s without computing one.
 *
 * Why use these names, pose and fail?
 *
 * A posed result can still become a failure in a composition of
 * fallibles. Thus, the result is "posed": it isn't a "success" or a
 * "resolution." A posed result may be unwrapped into a value, or it may
 * compose with additional fallible computations until a failure occurs.
 *
 * A failure is terminal: a failed composition will short-circuit and the
 * failure will be propagated through to its end. A failure must be
 * unwrapped and handled. Until it is, any later computations become
 * no-ops that simply carry over the failure.
 *
 * Fallibles, unlike Promises, are not designed for failure recovery. In
 * fact, a fallible cannot recover from a failure at all: the composition
 * must be aborted, and the failure unwrapped and the case handled.
 * (There's no equivalent to `.catch(...)` returning `undefined` and
 * implicitly `resolve`ing a failed Promise into a succeeding one.)
 *
 * This is a stricter, less friendly, semantics than Promises. Fallibles
 * are not designed to make it easy to "keep going." They're designed to
 * expose the fallibility of a computation.
 *
 * Fallibles do not allow error messages. An error message should be
 * generated for a user, not used in code; in code, it tends to be
 * unwieldy, often leading to error-handling logic built out of ad-hoc
 * error message parsers designed to heuristically identify the error.
 *
 * Instead, a failed chain of fallibles identifies the failing fallible
 * and saves the last-posed-result (which was its input). These two pieces
 * of information can then be used to produce an error message, or
 * determine how to recover from the failure.
 *
 */
const fallible_create = definition => value => definition({
  pose: result  => [ true, result, { /******/ } ],
  fail: trace   => [ false, value, { x: trace } ],
})(value)

// 'Guard's a function with a predicate in a fallible
function fallible_ᐅwhen (pred) {
  return fn => fallible_create(({ pose, fail }) => value => {
    return pred(value) ? pose(fn(value)) : fail({ ƒ: 'ᐅwhen' })
  })
}

// Folds fallibles into a result until one fails to pose a next value
function fallible_fold (folder) {
  return initial => fold_indexed(index => item => {
    const thread_shuttle = index => item => ᐅ([
      /* [ succeeded₁, result₁, {...}₁ ] → [ result₁, {...}₁ ] */
      skip(1),
      /* merge carry objects and set index */
      ᐅdo([
        /* result₁ → [ succeeded₂, result₂, {...}₂ ] */
        ᐅ([ get(0), folder(item) ]),
        /* [ succeeded₂, result₂, ({...}₁ × {...}₂ × { index }) ] */
        ([ succeeded2, result2, carry2 ]) => ([ _, carry1 ]) => ([
          succeeded2,
          result2,
          merge_properties(Object.prototype)([ carry1, carry2, { index } ]),
        ])
      ])
    ])
    return ᐅif(/* succeeded */get(0))(thread_shuttle(index)(item))(_ => ᐅ.break)
  })([ true, initial, { index: -1 } ])
}

// 'Break's on the first fallible to pose a result
function fallible_first (fallibles) {
  return fallible_create(({ pose, fail }) => value => {
    for (const fallible of fallibles) {
      const [ succeeded, result ] = fallible(value)
      if (succeeded) return pose(result)
    }
    return fail({ ƒ: 'first' })
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
      const [ succeeded, result, carry ] = apply(fallible)(args)
      return [ succeeded, [ result, target ], carry ]
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
    return succeeded ? pose(result) : fail({ ƒ: 'atomic' })
  })
}

function fallible_try (expecting) {
  return fallible_create(({ pose, fail }) => (args = []) => {
    try       { return pose(apply(expecting)(args)) }
    catch (e) { return fail({ ƒ: 'try', error: e }) }
  })
}

function fallible_fail (payload) {
  return fallible_create(({ fail }) => _ => fail(merge(payload)({ ƒ: 'fail' })))
}
function fallible_unfailing (fn) {
  return fallible_create(({ pose }) => value => pose(fn(value)))
}

function fallible_unwrap ([ succeeded, result, { index = None, x = None } = {} ]) {
  if (succeeded === true) {
    return result
  }
  throw ᐅwhen(not(is(None)))(note => js.assign({ note }))(x)(new Error(
    `fallible.unwrap: 'succeeded' is not true`
    + `\n  last result   : ${result}`
    + `\n  failure index : ${index}`
    + `\n  failure note  : ${JSON.stringify(x)}`
    + `\n\n`
  ))
}

function fallible_succeeded ([ succeeded, result ]) {
  return succeeded
}

function fallible_fatalize (fallible) {
  return ᐅ([ fallible, fallible_unwrap ])
}

const ƒ = js.assign({
  // Composers
  ᐅ         : fallible_ᐅ,
  ᐅdo       : fallible_ᐅdo,
  fold      : fallible_fold,
  first     : fallible_first,
  // Constructors
  try       : fallible_try,
  fail      : fallible_fail,
  unfailing : fallible_unfailing,
  // Wrappers
  ᐅwhen     : fallible_ᐅwhen,
  atomic    : fallible_atomic,
  fatalize  : fallible_fatalize,
  // Unwrappers
  unwrap    : fallible_unwrap,
  succeeded : fallible_succeeded,
})(fallible_create)

export {
  ƒ,
  ƒ as fallible,
}

// predicates
const not      = f => v => !f(v)
const is_value = v => v != null // [1]
const value_or = replacement => ᐅwhen(not(is_value))(_ => replacement)

/* NOTE(jordan):
 *
 * [1]: Using the *fancy* rules for {truthy,falsy}ness, one can determine
 * that this returns `true` when a value is not `undefined` or `null`.
 */

export {
  /* NOTE(jordan): `is` was exported from linchpin above */
  not,
  is_value,
  value_or,
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
export const types = (function () {
  // bigints, like 9000000000000000000n
  const bigint = 'bigint'
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
    bigint,
    number,
    object,
    string,
    symbol,
    boolean,
    undefined,
    function: function_,
  }
})()

const is_type     = t => v => typeof v === t
const is_instance = C => v => v instanceof C
const type = js.assign({
  bigint    : is_type(types.bigint),
  object    : is_type(types.object),
  number    : is_type(types.number),
  string    : is_type(types.string),
  symbol    : is_type(types.symbol),
  boolean   : is_type(types.boolean),
  function  : is_type(types.function),
  undefined : is_type(types.undefined),
})(is_type)
const instance = js.assign({
  Map      : is_instance(Map),
  Set      : is_instance(Set),
  Date     : is_instance(Date),
  Array    : is_instance(Array),
  Number   : is_instance(Number),
  Object   : is_instance(Object),
  RegExp   : is_instance(RegExp),
  Boolean  : is_instance(Boolean),
  Function : is_instance(Function),
})(is_instance)
export const is = js.assign({ type, instance })(js.is)

// polymorphic object/array copiers
const array_copy  = arr => concat(arr)([])
const object_copy = obj => ᐅdo([
  js.get_prototype,
  proto => ᐅ([ js.own_descriptors, js.create(proto) ])
])(obj)
const copy = object => ƒ.fatalize(ƒ.first([
  ƒ.ᐅwhen(is.instance.Array)(array_copy),
  ƒ.ᐅwhen(is.type.object)(object_copy),
]))(object)
const copy_and    = f => obj  => ᐅ([ copy, f ])(obj)
const copy_apply  = f => args => copy_and(apply(f)(args))
const copy_apply0 = f =>                copy_and(f)
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

/* NOTE(jordan): this code is a bit complicated.
 *
 * The complexity arises from wanting a short-circuiting mechanism, but
 * from within a functional loop like a `fold` or `map`. `fold` and `map`,
 * in particular, were already internally implemented as for-loops,
 * because performance with recursion was very poor. So, the obvious
 * solution was to create an API that would correspond to the `break`
 * keyword.
 *
 * Things got a little ugly. `fold` and `map` were already ugly pieces of
 * imperative looping code, but as soon they were "enhanced" with a
 * conditional short-circuit mechanism... Well.
 *
 * This is the cleanest formulation I've been able to construct.
 */
const breakloop = ({ marker, body, latch = _ => {} }) => array => {
  let index = 0, item_result = marker
  while (index < array.length) {
    item_result = body(array[index], index)
    if (item_result === marker) break
    latch(item_result, index++)
  }
}

const map = js.define_properties({
  break: { value: Symbol(`map: short-circuit marker`) },
})(from_mutative(fn => array => {
  return ᐅeffect(breakloop({
    marker : map.break,
    body   : (item,   index) => fn(item, index, array),
    latch  : (result, index) => array[index] = result,
  }))(array)
})(copy_apply1))

const fold = js.define_properties({
  break: { value: Symbol(`fold: short-circuit marker`) },
})(folder => accumulator => array => {
  breakloop({
    marker : fold.break,
    body   : (item, index) => folder(item, index, array)(accumulator),
    latch  : (result)      => accumulator = result,
  })(array)
  return accumulator
})

export {
  map,
  fold,
}

// pipelining

// chaining operators
const ᐅ = fns => over(call)(fns)
js.assign({ break: fold.break })(ᐅ)
// NOTE(jordan): continue passing the target as the last argument
const ᐅdo = fns => target => {
  const do_folder = fn => args => [ apply(fn)(args), last(args) ]
  return ᐅ([ fold(do_folder)([target]), get(0) ])(fns)
}
// chainable conditionals
const ᐅif   = test => tf => ff => v => (test(v) ? tf : ff)(v)
const ᐅwhen = test => tf => ᐅif(test)(tf)(id)
// chainable effects
const ᐅeffect = f => target => (f(target), target)
const ᐅlog    = v => ᐅeffect(v => console.dir(v, { depth: null }))(v)
// chainable navigators
// action-first... (as in fold)
const ᐅat_path = action => path => ᐅat(path)(action)
const ᐅin_path = update => path => ᐅin(path)(update)
const ᐅon_key  = action => key  => ᐅon( key)(action)
// path-first... (as in over)
const ᐅat = path => action => ᐅ([ get_path_value(path), action ])
const ᐅin = path => update => ƒ.fatalize(update_path(path)(update))
const ᐅon = key  => action => ᐅ([ get(key), action ])

export {
  // chaining operators
  ᐅ,
  ᐅdo,
  ᐅ   as pipe,
  ᐅdo as pipe_do,
  // chainable conditionals
  ᐅif,
  ᐅwhen,
  ᐅif   as pipe_if,
  ᐅwhen as pipe_when,
  // chainable effects
  ᐅeffect,
  ᐅlog,
  ᐅeffect as pipe_effect,
  ᐅlog    as pipe_log,
  // chainable navigators
  //   action-first...
  ᐅat_path,
  ᐅin_path,
  ᐅon_key,
  ᐅat_path as pipe_at_path,
  ᐅin_path as pipe_in_path,
  ᐅon_key  as pipe_on_key,
  //   path-first...
  ᐅat,
  ᐅin,
  ᐅon,
  ᐅat as pipe_at,
  ᐅin as pipe_in,
  ᐅon as pipe_on,
}

// array

const each     = f => ᐅeffect(js.each(f)) // NOTE: could mutate...
const find     = f => arr => value_or(None)(js.find(f)(arr))
const concat   = mutative.set(a => each(v => push.mut(v)(a)))(js.concat)
const sort     = from_mutative(js.sort)(copy_apply1)
const fill     = from_mutative(v => js.fill(v)(/*i*/)(/*j*/))(copy_apply1)
const cons     = from_mutative(v => ᐅeffect(js.unshift(v)))(copy_apply1)
const push     = from_mutative(v => ᐅeffect(js.push(v)))(copy_apply1)
const includes = v => js.includes(v)
const last     = a => ᐅ([ skip(-1), get(0) ])(a)
const reverse  = from_mutative(js.reverse)(copy_and)
const splice   = from_mutative(start => count => to_insert => {
  return ᐅeffect(js.splice(start)(count)(to_insert))
})(copy_apply3)
const split_at = n => fmap([ take(n), skip(n) ])
const split_on = v => ᐅdo([
  index(v),
  ᐅif(not(is(-1)))(split_at)(_ => ᐅdo([ len, split_at ])),
])

export {
  cons,
  each,
  find,
  last,
  push,
  sort,
  concat,
  splice,
  reverse,
  includes,
  split_at,
  split_on,
}

const resize = mutative(len => set_value('length')(len))
const wrap   = l => n => n < 0 ? n + l : n

const slice = from_mutative(i => j => array => {
  const [ start, end ] = map(wrap(len(array)))([ i, j ])
  return ᐅ([ offset.mut(start), resize.mut(end - start) ])(array)
})(copy_apply2)

export {
  slice,
  resize,
}

const flatten = from_mutative(ᐅeffect(as => {
  let length = len(as)
  for (let index = 0; index < length; index++) {
    const [ item ] = pop.mut(as)
    ᐅif(is.instance.Array)(append.mut)(push.mut)(item)(as)
  }
}))(copy_apply0)
const flatmap = from_mutative(fn => array => {
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
const offset = mapper(map => off => map((_, ix, ar) => ar[ix + off]))

export {
  offset,
}

const concatenator = mutative.derive(concat)
const append = concatenator(concat => a => b => concat(b)(a))

export {
  append,
}

const slicer = mutative.derive(slice)
const take = slicer(slice => j => ᐅ([
  ᐅwhen(_ => is(-0)(j))(_ => ᐅ.break),
  ᐅwhen(ᐅ([ len, l => l > j ]))(slice(0)(j)),
]))
const skip = slicer(slice => i => a => slice(i)(len(a))(a))

export {
  skip,
  take,
}

const taker = mutative.derive(take)
const drop_end = taker(take => n => ᐅif(not(ᐅ([ len, l => l > n ])))(_ => [])(ᐅ([
  ᐅwhen(_ => is(-0)(n))(_ => ᐅ.break),
  ᐅwhen(_ => not(is(0))(n))(take(-n)),
])))
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
const replace = splicer(splice => i => v => (
  ᐅwhen(ᐅ([ len, l => i < l ]))(splice(i)(1)([v]))
))

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
const has_path   = p => obj => ƒ.succeeded(maybe_get_path(p)(obj))

export {
  is_key,
  unsafe_has,
  has,
  has_path,
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
const getter_at_path = getter => path => ᐅ([
  get_path_value(but_last(path)),
  getter(last(path)),
])

/*
 * getter_at_path(get_entry)([ 'a', 'b' ])({ a: { b: 5 } })
 * // => [ 'b', 5 ]
 * ... and so on, for get_property, get_descriptor, ..
 */

// categorized getters
const get = js.assign({
  // for_{key,keys}
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
  // at_path
  at_path: js.assign({
    value       : get_path_value,
    entry       : getter_at_path(get_entry),
    property    : getter_at_path(get_property),
    descriptor  : getter_at_path(get_descriptor),
    values      : p => ks => ᐅat_path(get_values(ks))(p),
    entries     : p => ks => ᐅat_path(get_entries(ks))(p),
    properties  : p => ks => ᐅat_path(get_properties(ks))(p),
    descriptors : p => ks => ᐅat_path(get_descriptors(ks))(p),
  })(path => get_path_value(path)),
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
  string_keys: o => ᐅ([ keys, filter(is.type.string) ])(o),
  symbol_keys: o => ᐅ([ keys, filter(is.type.symbol) ])(o),
  all: {
    keys        : o => js.keys(o),
    values      : on_keys(get_values),
    entries     : on_keys(get_entries),
    properties  : on_keys(get_properties),
    descriptors : on_keys(get_descriptors),
  },
  // get "in" (flipped getters)
  in: object => {
    return js.assign({
      for_key: {
        value       : k  => get.for_key.value(k)(object),
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
      at_path: {
        value       : p => get.at_path.value(p)(object),
        entry       : p => get.at_path.entry(p)(object),
        property    : p => get.at_path.property(p)(object),
        descriptor  : p => get.at_path.descriptor(p)(object),
        values      : p => ks => get.at_path.values(p)(ks)(object),
        entries     : p => ks => get.at_path.entries(p)(ks)(object),
        properties  : p => ks => get.at_path.properties(p)(ks)(object),
        descriptors : p => ks => get.at_path.descriptors(p)(ks)(object),
      },
      // TODO: test
      string_keyed: {
        values      : _ => get.string_keyed.values(object),
        entries     : _ => get.string_keyed.entries(object),
        properties  : _ => get.string_keyed.properties(object),
        descriptors : _ => get.string_keyed.descriptors(object),
      },
      // TODO: test
      symbol_keyed: {
        values      : _ => get.symbol_keyed.values(object),
        entries     : _ => get.symbol_keyed.entries(object),
        properties  : _ => get.symbol_keyed.properties(object),
        descriptors : _ => get.symbol_keyed.descriptors(object),
      },
      // TODO: test
      all: {
        values      : _ => get.all.values(object),
        entries     : _ => get.all.entries(object),
        properties  : _ => get.all.properties(object),
        descriptors : _ => get.all.descriptors(object),
      },
    })(get_value_in(object))
  },
  /* EXPLANATION(jordan): cannot modify get_value directly or it becomes
   * circular! Create a wrapper and modify that instead.
   */
})(key => get_value(key))
/* get(k)(obj)                      -- same as: get.for_key.value(k)(obj)
 * get.for_key.entry(k)(obj)
 * get.for_keys.entries(ks)(obj)
 * get.at_path.value(p)(obj)
 * get.at_path.descriptors(p)(obj)
 * get.string_keyed.entries(obj)
 * get.symbol_keyed.properties(obj)
 * get.in(obj)(k)                   -- get.in(obj).for_key.value(k)
 * get.in(obj).for_key.value(k)
 * get.in(obj).at_path.value(p)
 * get.in(obj).at_path.entries(p)
 * &c.
 */

// getter short hand
js.assign({
  value       : js.assign({ in : o => get.in(o).for_key.value        })(get.for_key.value),
  entry       : js.assign({ in : o => get.in(o).for_key.entry        })(get.for_key.entry),
  property    : js.assign({ in : o => get.in(o).for_key.property     })(get.for_key.property),
  descriptor  : js.assign({ in : o => get.in(o).for_key.descriptor   })(get.for_key.descriptor),
  values      : js.assign({ in : o => get.in(o).for_keys.values      })(get.all.values),
  entries     : js.assign({ in : o => get.in(o).for_keys.entries     })(get.all.entries),
  properties  : js.assign({ in : o => get.in(o).for_keys.properties  })(get.all.properties),
  descriptors : js.assign({ in : o => get.in(o).for_keys.descriptors })(get.all.descriptors),
})(get)

export {
  get,
}

// TODO?(jordan): bring fallible getters into the unified 'get' object?
// Fallible getters
const maybe_get = key => ƒ.ᐅwhen(has(key))(get(key))
const maybe_get_path = keys => ƒ.ᐅ(map(maybe_get)(keys))

export {
  maybe_get,
  maybe_get_path,
}

// Object manipulators
// key, (value|descriptor)
const set_value = from_mutative(k => v => o => (o[k] = v, o))(copy_apply2)
const set_descriptor = from_mutative(key => descriptor => {
  /* NOTE(jordan): js.define_property _merges_ property descriptors. Since
   * set_descriptor is meant to *set* a descriptor, not to merge it with
   * the existing descriptor, we have to add to the given descriptor's
   * configuration  non-writable, non-enumerable, non-configurable
   * defaults. This is a strange default behavior, in my opinion, and
   * frankly the language specification is broken in this regard.
   */
  return js.define_property(key)(js.assign(descriptor)({
    writable:     false,
    enumerable:   false,
    configurable: false,
  }))
})(copy_apply2)

// { [key]: (value|descriptor), ... }
const set_values      = from_mutative(js.assign)(copy_apply1)
const set_descriptors = from_mutative(js.define_properties)(copy_apply1)

// [ key, (value|descriptor) ]
const set_entry    = mutative.derive(set_value)(apply)
const set_property = mutative.derive(set_descriptor)(apply)

// [ [ key, (value|descriptor) ], ... ]
const set_entries    = mutative.derive(set_entry)(over)
const set_properties = mutative.derive(set_property)(over)

const setter_at_path = _ => { throw new Error(`setter_at_path: TODO`) }

// TODO: test
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
  // path setters
  at_path: {
    value       : v  => setter_at_path(set_value(v)),
    entry       : e  => setter_at_path(set_entry(e)),
    values      : vs => setter_at_path(set_values(vs)),
    entries     : es => setter_at_path(set_entries(es)),
    property    : p  => setter_at_path(set_property(p)),
    properties  : ps => setter_at_path(set_properties(ps)),
    descriptor  : d  => setter_at_path(set_descriptor(d)),
    descriptors : ds => setter_at_path(set_descriptors(ds)),
  },
})(set_value)

export {
  set,
}

const from_entries     = proto => entries     => set_entries.mut(entries)(js.create(proto)({}))
const from_properties  = proto => properties  => set_properties.mut(properties)(js.create(proto)({}))
const from_descriptors = proto => descriptors => js.create(proto)(descriptors)

export {
  from_entries,
  from_properties,
  from_descriptors,
}

const merge_by    = ([ get, join ]) => ᐅ([ get, join ])
const merge_entries    = proto => merge_by([ ᐅ([ map(get.all.entries),    flatten ]), from_entries(proto)    ])
const merge_properties = proto => merge_by([ ᐅ([ map(get.all.properties), flatten ]), from_properties(proto) ])

export {
  merge_by,
  merge_entries,
  merge_properties,
}

const property_setter = mutative.derive(set.properties)
const entry_setter = mutative.derive(set.entries)

const on_properties = property_setter(set => f => {
  return ᐅdo([ ᐅ([ get.all.properties, f ]), apply2(set) ])
})
const on_entries = entry_setter(set => f => {
  return ᐅdo([ ᐅ([ get.all.entries, f ]), apply2(set) ])
})

const derived_on_properties = mutative.derive(on_properties)
const derived_on_entries = mutative.derive(on_entries)

const map_properties    = derived_on_properties(on => f => on(map(f)))
const filter_properties = derived_on_properties(on => f => on(filter(f)))
const map_entries       = derived_on_entries(on => f => on(map(f)))
const filter_entries    = derived_on_entries(on => f => on(filter(f)))

const merge = a => b => merge_properties(js.get_prototype(b))([ a, b ])
const swap = k => v => fmap([ get(k), set.value(k)(v) ])
const enumerable_keys = o => ᐅ([ keys, filter(k => is_enumerable(k)(o)) ])(o)
const enumerable_entries = o => ᐅdo([ enumerable_keys, get.for_keys.entries ])(o)

const zip   = ks  => vs => from_entries(Object.prototype)(interlace(ks)(vs))
const unzip = obj => ᐅ([ get.all.entries, disinterlace ])(obj)

export {
  merge,
  map_properties,
  map_entries,
  filter_properties,
  filter_entries,
  swap,
  enumerable_keys,
  enumerable_entries,
  zip,
  unzip,
}

// TODO(jordan): clean-up
/* NOTE(jordan): this code builds the update function from the end of the
 * path to the front, starting from the actual intended update and
 * wrapping it in a chain of maybe_get calls; effectively:
 *
 *   ᐅ([ maybe_get(key0), ... maybe_get(keyN-1), ᐅwhen(get(0))(updater) ])
 *
 */
const update_path = path => final_updater => {
  return fold(key => value_updater => ƒ.ᐅdo([
    ƒ.atomic(ƒ.ᐅ([ maybe_get(key), value_updater ])),
    new_value => ƒ.unfailing(set_value(key)(new_value)),
  ]))(ƒ.unfailing(final_updater))(reverse(path))
}
const update = key => fn => update_path([ key ])(fn)
// const update_with = ups => o => fold(apply(update))(o)(entries(ups))

export {
  update,
  update_path,
  // update_with,
}

const walk_breadth = js.assign({ recur: Symbol(`walk recur`) })(fn => ᐅ([
  ᐅdo([
    get.all.keys,
    ks => target => map(k => [ k, fn([ k, target ]) ])(ks),
    es => target => (
      map(
        ᐅwhen(ᐅ([ get(1), is(walk_breadth.recur) ]))
          (([ k ]) => [
            k,
            ᐅdo([
              walk_breadth(fn),
              result => ᐅwhen(is.instance.Array)(_ => Array.from(result)),
            ])(get(k)(target)),
          ])
      )(es)
    ),
  ]),
  from_entries(Object.prototype),
]))

const walk_depth = js.assign({ recur: Symbol(`walk recur`) })(fn => ᐅ([
  ᐅdo([
    get.all.keys,
    ks => target => (
      map(k => [
        k,
        ᐅwhen(is(walk_depth.recur))(_ => ᐅdo([
          walk_depth(fn),
          result => ᐅwhen(is.instance.Array)(_ => Array.from(result))
        ])(get(k)(target)))
        (fn([ k, target ]))
      ])(ks)
    ),
  ]),
  from_entries(Object.prototype),
]))

// const tree = {
//   a: 5,
//   b: {
//     c: 'hello'
//   },
//   e: [ 1, 2, 3 ],
//   d: true,
//   f: (new (class {
//     constructor(x) {
//       this.x = x
//     }
//     toString() {
//       return `my x is ${this.x}`
//     }
//   })('hello')),
// }

// ᐅlog(walk_breadth(ᐅif(not(apply(is_enumerable)))(apply(get))(ᐅ([
//   apply(get),
//   ᐅif(is.type.object)(_ => walk_breadth.recur)(ᐅ([
//     ᐅwhen(is.type.number)(v => v + 1),
//     ᐅwhen(is.type.string)(v => v + ', world'),
//   ])),
// ])))(tree))

// ᐅlog(walk_depth(ᐅif(not(apply(is_enumerable)))(apply(get))(ᐅ([
//   apply(get),
//   ᐅif(is.type.object)(_ => walk_depth.recur)(ᐅ([
//     ᐅwhen(is.type.number)(v => v + 1),
//     ᐅwhen(is.type.string)(v => v + ', world'),
//   ])),
// ])))(tree))

// strings
// NOTE(jordan): most array functions also work on strings
const stringable_object = v => and([
  is.type.object,
  method_exists(`toString`),
])(v)
const stringable = v => or([
  stringable_object,
  is.type.symbol,
])(v)

const string = v => `${ᐅwhen(stringable)(v => v.toString())(v)}`
const lowercase = str => ''.toLowerCase.call(str)
const uppercase = str => ''.toUpperCase.call(str)
const string_split = delimiter => str => ''.split.call(str, delimiter)

export {
  string,
  lowercase,
  uppercase,
  string_split,
}

export function test (harness) {
  const to6 = [ 1, 2, 3, 4, 5 ]
  const abc5 = { a: { b: { c: 5 } } }
  const xyhello = js.create(null)({
    x: d.nothing({ v: js.create(null)({
      y: d.nothing({ v: 'hello' })
    })})
  })
  const sym_a = Symbol(`a`)

  function throws (fn) {
    try { fn() } catch (e) { return true }
    return false
  }

  return harness.suite(`@prettybad/util: it's worse than underscore`, [
    t => t.suite(`None`, {
      'perpetuates itself': [
        t => {
          return true
              && t.eq(None.a.b.c.hi())(None)
              // NOTE(jordan): Symbol.isConcatSpreadable tests
              && t.eq(concat(None)(5))([ None, 5 ])
              && t.eq(flatten([ `a`, None, `c` ]))([ `a`, None, `c` ])
        },
      ],
      'throws when used as a number': [
        t => {
          return true
              && t.ok(throws(_ => +None))
              && t.ok(throws(_ => None + 0))
              && t.ok(throws(_ => None * 2))
        },
      ],
      'always stringifies as `None`': [
        t => {
          return true
              && t.eq(get(`name`)(None))(`None`)
              && t.eq(None.toString())('None')
              && t.eq(String(None))('None')
              && t.eq(`${None}`)('None')
              && t.eq(None[Symbol.toStringTag])(`None`)
        },
      ],
    }),
    t => t.suite('pipes (ᐅ)', {
      'ᐅ: pipelines functions': [
        t => t.eq(ᐅ([ x => x + 1, x =>   x * 3, x => x > 2 ])(1))(true),
        t => t.eq(ᐅ([ x => x + 1, _ => ᐅ.break, x => x > 2 ])(1))(2),
      ],
      'ᐅdo: chains together calls on a common target': [
        t => {
          const object = { a: 0, b: `c`, d: true }
          const values = [ 0, `c`, true ]
          return t.eq(ᐅdo([ js.keys, get.for_keys.values ])(object))(values)
        },
      ],
      'ᐅif: inline if': [
        t => {
          const approach_10 = ᐅif(v => v < 10)(v => v + 1)(v => v - 1)
          return true
            && t.eq(approach_10(5))(6)
            && t.eq(approach_10(12))(11)
        },
      ],
      'ᐅwhen: one-armed inline if': [
        t => {
          const inc_when_even = ᐅwhen(v => v % 2 === 0)(v => v + 1)
          return true
            && t.eq(inc_when_even(2))(3)
            && t.eq(inc_when_even(1))(1)
        },
      ],
      'ᐅeffect: returns affected object after performing an effect': [
        t => {
          const id = x => x
          const array = []
          return true
              && t.eq(ᐅeffect(id)(array))(array)
              && t.eq(ᐅeffect(a => a.push(2))(array))(array)
              && t.eq(array.length)(1)
              && t.eq(array[0])(2)
        },
      ],
      'ᐅlog: short-hand for ᐅeffect(console.log.bind(console))': [
        t => {
          function suspending_and_counting_logs (level, fn) {
            return (...args) => {
              let count       = 0
              const saved_log = console[level]
              console[level]  = _ => (count++)
              const result    = fn(...args)
              console[level]  = saved_log
              return { count, result }
            }
          }
          const testᐅlog = suspending_and_counting_logs('dir', ᐅlog)
          const array = [ 1, 2, 3 ]
          return true
              && t.eq(testᐅlog(    5))({ count: 1, result:     5 })
              && t.eq(testᐅlog(array))({ count: 1, result: array })
              && t.eq(array)([ 1, 2, 3 ])
        },
      ],
      'ᐅon{_key}: acts on a key in an object; returns value': [
        t => {
          const ab5 = { a: { b: 5 } }
          return true
            && t.eq(ᐅon(`a`)(ᐅon(`b`)(v => v + 1))(ab5))(6)
            && t.eq(ᐅon_key(ᐅon_key(v => v + 1)(`b`))(`a`)(ab5))(6)
        },
      ],
      'ᐅat_{path}: acts on a value in an object at a path; returns value': [
        t => {
          const ab5 = { a: { b: 5 } }
          const ab8 = { a: { b: 8 } }
          return true
            && t.eq(ᐅat([])(v => v + 1)(5))(6)
            && t.eq(ᐅat([ 'a', 'b' ])(v => v + 1)(ab5))(6)
            && t.eq(ᐅat([ 'a', 'b' ])(ᐅwhen(is(5))(v => v + 1))(ab5))(6)
            && t.eq(ᐅat([ 'a', 'b' ])(ᐅwhen(is(5))(v => v + 1))(ab8))(8)
            && t.eq(ᐅat_path(v => v + 1)([])(5))(6)
            && t.eq(ᐅat_path(v => v + 1)([ 'a', 'b' ])(ab5))(6)
            && t.eq(ᐅat_path(ᐅwhen(is(5))(v => v + 1))([ 'a', 'b' ])(ab5))(6)
            && t.eq(ᐅat_path(ᐅwhen(is(5))(v => v + 1))([ 'a', 'b' ])(ab8))(8)
        },
      ],
      'ᐅin{_path}: acts on an object in a value at a path; returns object': [
        t => {
          const ab5 = { a: { b: 5 } }
          const ab6 = { a: { b: 6 } }
          const ab8 = { a: { b: 8 } }
          return true
            && t.eq(ᐅin([])(v => v + 1)(5))(6)
            && t.eq(ᐅin([ 'a', 'b' ])(v => v + 1)(ab5))({ a: { b: 6 } })
            && t.eq(ᐅin([ 'a', 'b' ])(ᐅwhen(is(5))(v => v + 1))(ab5))(ab6)
            && t.eq(ᐅin([ 'a', 'b' ])(ᐅwhen(is(5))(v => v + 1))(ab8))(ab8)
            && t.eq(ᐅin_path(v => v + 1)([])(5))(6)
            && t.eq(ᐅin_path(v => v + 1)([ 'a', 'b' ])(ab5))({ a: { b: 6 } })
            && t.eq(ᐅin_path(ᐅwhen(is(5))(v => v + 1))([ 'a', 'b' ])(ab5))(ab6)
            && t.eq(ᐅin_path(ᐅwhen(is(5))(v => v + 1))([ 'a', 'b' ])(ab8))(ab8)
        },
      ],
    }),
    t => t.suite('functions', {
      'id: id(6) is 6': [
        t => t.eq(id(6))(6),
      ],
      'id: works on objects': [
        t => {
          const object = { a: 5 }
          return t.refeq(id(object))(object)
        },
      ],
      'or: true if any predicate is true': [
        t =>  t.ok(or([ x => x + 1 === 3, x => x + 1 === 2 ])(1)),
        t => !t.ok(or([ x => x % 2 === 0, x => x / 2 === 1 ])(1)),
      ],
      'and: true if all predicates are true': [
        t =>  t.ok(and([ x => x % 2 === 0, x => x % 3 === 0 ])(6)),
        t => !t.ok(and([ x => x % 2 === 0, x => x % 3 === 0 ])(2)),
      ],
      'bind: binds ctx': [
        t => t.eq(js.bind(5)(function () { return this })())(5),
      ],
      'call: calls a function': [
        t => t.eq(call(id)(1))(1),
      ],
      'fmap: runs a series of functions on an object': [
        t => t.eq(fmap([ v => v + 1, v => v / 2 ])(4))([ 5, 2 ]),
      ],
      'pass: passes a value into a function': [
        t => t.eq(pass(5)(id))(5),
      ],
      'apply: applies function to array of args': [
        t => {
          return t.eq(apply(function (a) { return b => a + b })([ 1, 2 ]))(3)
              && t.eq(apply(_ => 5)([]))(5)
        },
      ],
      'apply{n}: applies a function with argument(s)': [
        t => {
          const add = a => b => a + b
          const quadratic_add = a => b => c => {
            return (-b + Math.sqrt(Math.pow(b, 2) - 4 * a * c)) / (2 * a)
          }
          return true
              && t.eq(apply(add)([ 1, 2 ]))(3)
              && t.eq(apply(quadratic_add)([ 1, 2, 1 ]))(-1)
              && t.eq(apply1(x => x)('hello'))('hello')
              && t.eq(apply2(add)(5)(4))(9)
              && t.eq(apply3(quadratic_add)(-1)(5)(-4))(1)
        },
      ],
      'times: repeats a function a set number of times': [
        t => t.eq(times(3)(x => x * 2)(2))(16),
      ],
      'fcross: [f₁ f₂ ...] × [a₁ a₂ ... ] → [f₁(...a₁) f₂(...a₂) ...]': [
        t => t.eq(fcross([ JSON.parse, parseInt ])(['"a"', '3']))([ 'a', 3 ]),
        t => t.eq(fcross([ ({ x }) => x**2 ])([{x:5}]))([25]),
        t => t.eq(fcross([])([{x:5}]))([]),
        t => t.eq(fcross([ v => v + 1 ])([]))([]),
      ],
      'or_none: if <cond>, do <fn>; otherwise return None': [
        t => {
          return true
              && t.eq(or_none(a => a.length > 0)(a => a[0])([1]))(1)
              && t.eq(or_none(a => a.length > 0)(a => a[0])([]))(None)
        },
      ],
      'flatfmap: runs a series of functions on an object, then flattens': [
        t => t.eq(flatfmap([ v => [ v - 1, v + 1 ], v => [ v * 2, v / 2 ] ])(4))([ 3, 5, 8, 2 ]),
      ],
      'method_exists: check that a method exists on an object': [
        t =>  t.ok(method_exists('toString')({})),
        t => !t.ok(method_exists('foobar')({})),
      ],
      'method_of: retrieve and bind (own) method of an object': [
        t => t.eq(method_of({})(`toString`)())(None),
        t => {
          const x = function (_) { return this.v + 1 }
          return t.eq(method_of({ x, v: 0 })('x')())(js.bind({ v: 0 })(x)())
        },
      ],
      'method{n}: calls a named method[ with argument(s)]': [
        t => {
          const obj = {
            multiply  (value) { return mutiplicand => mutiplicand * value },
            double    (value) { return this.multiply(value)(2) },
            raise_sum (power) { return a => b => Math.pow(a + b, power) },
            pi        ()      { return Math.PI },
          }
          return true
              && t.eq(method(`multiply`)([ 3, 3 ])(obj))(9)
              && t.eq(method(`double`)([ 4 ])(obj))(8)
              && t.eq(method0(`pi`)()(obj))(Math.PI)
              && t.eq(method1(`double`)(5)(obj))(10)
              && t.eq(method2(`multiply`)(5)(4)(obj))(20)
              && t.eq(method3(`raise_sum`)(2)(3)(4)(obj))(49)
        },
      ],
    }),
    t => t.suite(`maybe getters`, {
      'maybe_get: conditionally gets a key and returns success': [
        t => {
          return true
              && t.eq(maybe_get(0)([`a`]))
                     ([ true, `a`, {} ])
              && t.eq(maybe_get(`a`)({ b: 0 }))
                     ([ false, { b: 0 }, { x: { ƒ: 'ᐅwhen' } } ])
              && t.eq(maybe_get(0)([]))
                     ([ false, [], { x: { ƒ: 'ᐅwhen' } } ])
        },
      ],
      'maybe_get_path: conditionally gets a path and returns success': [
        t => {
          return true
              && t.eq(maybe_get_path([0, 1])([[0, 1]]))
                     ([ true, 1, { index: 1 } ])
              && t.eq(maybe_get_path([`a`, `b`])({ a: 0 }))
                     ([ false, 0, { index: 1, x: { ƒ: 'ᐅwhen' } } ])
        },
      ],
    }),
    t => t.suite('fallibles (ƒ)', {
      'wraps a calculation that may fail': [
        t => {
          const poses5 = ƒ(({ pose }) => _ => pose(5))
          const fails  = ƒ(({ fail }) => _ => fail({}))
          const poses_uppercase = ƒ(({ pose, fail }) => value => {
            if (typeof value !== 'string') {
              return fail({ message: 'not a string' })
            } else {
              return pose(value.toUpperCase())
            }
          })
          return true
              && t.eq(poses5(NaN))([ true, 5, {} ])
              && t.eq(fails('abc'))([ false, 'abc', { x: {} } ])
              && t.eq(poses_uppercase(5))([ false, 5, { x: { message: 'not a string' } } ])
              && t.eq(poses_uppercase('abc'))([ true, 'ABC', {} ])
        },
      ],
      'ƒ.unfailing: poses the result of a normal function': [
        t => {
          return t.eq(ƒ.unfailing(v => v + 1)(5))([ true, 6, {} ])
        },
      ],
      'ƒ.fail: immediately fails': [
        t => {
          return t.eq(ƒ.fail({})(5))([ false, 5, { x: { ƒ: 'fail' } } ])
        },
      ],
      'ƒ.ᐅwhen: wrapper: guard execution with a predicate': [
        t => {
          const number = v => typeof v === 'number'
          return true
              && t.eq(ƒ.ᐅwhen(number)(x => x + 1)('string'))
                     ([ false, 'string', { x: { ƒ: 'ᐅwhen' } } ])
              && t.eq(ƒ.ᐅwhen(number)(x => x + 1)(5))
                     ([ true, 6, {} ])
        },
      ],
      'ƒ.ᐅ: pipelines a series of fallibles': [
        t => {
          const number = v => typeof v === 'number'
          const gt5 = v => v > 5
          const even = v => v % 2 === 0
          const arbitrary_pipe = ƒ.ᐅ([
            ƒ.ᐅwhen(number)(id),
            ƒ.ᐅwhen(gt5)(v => v * 2),
            ƒ.ᐅwhen(even)(v => v - 1),
          ])
          return true
              && t.eq(arbitrary_pipe('abc'))
                     ([ false, 'abc', { index: 0, x: { ƒ: 'ᐅwhen' } } ])
              && t.eq(arbitrary_pipe(5))
                     ([ false, 5, { index: 1, x: { ƒ: 'ᐅwhen' } } ])
              && t.eq(arbitrary_pipe(7))
                     ([ true, 13, { index: 2 } ])
        },
        t => {
          const get_optional_path = ƒ.ᐅ([
            maybe_get('optionalKey'),
            maybe_get('optionalSubkey'),
            ƒ.ᐅwhen(v => typeof v === 'number')(id),
          ])
          return true
              && t.eq(get_optional_path({ optionalKey: { optionalSubkey: 5 } }))
                     ([ true, 5, { index: 2 } ])
              && t.eq(get_optional_path({ optionalKey: { other: 'hello' } }))
                     ([ false, { other: 'hello' }, { index: 1, x: { ƒ: 'ᐅwhen' } } ])
              && t.eq(get_optional_path({ optionalKey: { optionalSubkey: '' } }))
                     ([ false, '', { index: 2, x: { ƒ: 'ᐅwhen' } } ])
              && t.eq(get_optional_path({ otherKey: false }))
                     ([ false, { otherKey: false }, { index: 0, x: { ƒ: 'ᐅwhen' } } ])
        },
      ],
      'ƒ.first: returns the first successful ƒ': [
        t => {
          const gt5 = ƒ.ᐅwhen(v => v > 5)(_ => `5`)
          const gt1 = ƒ.ᐅwhen(v => v > 1)(_ => `1`)
          return true
              && t.eq(ƒ.first([ gt5, gt1 ])(3))([ true, `1`, {} ])
              && t.eq(ƒ.first([ gt5, gt1 ])(7))([ true, `5`, {} ])
              && t.eq(ƒ.first([ gt1, gt5 ])(0))
                     ([ false, 0, { x: { ƒ: 'first' } } ])
        },
      ],
      'ƒ.ᐅdo: pipeline-carries a series of fallibles over an object': [
        t => {
          const get_key_in_target = ƒ.ᐅdo([
            maybe_get('key'),
            key => maybe_get_path([ 'target', key ]),
          ])
          return true
              && t.eq(get_key_in_target({ key: 'a', target: { a: 5 } }))
                     ([ true, 5, { index: 1 } ])
              && t.eq(get_key_in_target({ key: 'a', target: {} }))
                     ([ false, {}, { index: 1, x: { ƒ: 'ᐅwhen' } } ])
              && t.eq(get_key_in_target({ a: 5 }))
                     ([ false, { a: 5 }, { index: 0, x: { ƒ: 'ᐅwhen' } } ])
        },
      ],
      'ƒ.try: convert exceptions into simple failures': [
        t => {
          const json_parse  = json => ƒ.try(JSON.parse)([ json ])
          const simplify_error = ([ succeeded, result, { x } ]) => {
            return [ succeeded, result, {
              x: merge(x)('error' in x ? { error: x.error.name } : {})
            }]
          }
          return true
              && t.eq(json_parse('5'))([ true, 5, {} ])
              && t.eq(json_parse('"abc"'))([ true, 'abc', {} ])
              && t.eq(json_parse('[]'))([ true, [], {} ])
              && t.eq(json_parse('[ 1, true, "hello" ]'))
                     ([ true, [ 1, true, 'hello' ], {} ])
              && t.eq(json_parse('{ "number": 3.14 }'))
                     ([ true, { number: 3.14 }, {} ])
              && t.eq(simplify_error(json_parse('undefined')))
                     ([ false, [ 'undefined' ], { x: { ƒ: 'try', error: 'SyntaxError' } } ])
              && t.eq(simplify_error(json_parse('')))
                     ([ false, [ '' ], { x: { ƒ: 'try', error: 'SyntaxError' } } ])
              && t.eq(simplify_error(json_parse('{ "number": 5. }')))
                     ([ false, [ '{ "number": 5. }' ], { x: { ƒ: 'try', error: 'SyntaxError' } } ])
        },
      ],
      'ƒ.unwrap: unwrap fallible result or throw an Error': [
        t => {
          const x = { message: 'yikes', addtl: 14, error: new Error(`oh shiz`) }
          try {
            ƒ.unwrap([ false, 5, { x } ])
          } catch (e) {
            return t.eq(get('note')(e))(x)
          }
        },
      ],
      'ƒ.succeeded: inspect whether a fallible has succeeded': [
        t => {
          return true
              && t.ok(ƒ.succeeded([ true, {}, {} ]))
              && !t.ok(ƒ.succeeded([ false, {}, {} ]))
        },
      ],
      'ƒ.atomic: wrapper: roll back value if fallible fails': [
        t => {
          return true
              && t.eq(ƒ.atomic(ƒ.unfailing(() => 5))('hello'))
                     ([ true, 5, {} ])
              && t.eq(ƒ.atomic(ƒ.unfailing(v => v + 1))(0))
                     ([ true, 1, {} ])
              && t.eq(ƒ.atomic(ƒ.fail({}))('hello'))
                     ([ false, 'hello', { x: { ƒ: 'atomic' } } ])
              && t.eq(ƒ.atomic(ƒ.ᐅ([ ƒ.unfailing(v => v + 1), ƒ.fail({}) ]))(0))
                     ([ false, 0, { x: { ƒ: 'atomic' } } ])
        },
      ],
      'ƒ.fatalize: wrapper: throw on error, return on success': [
        t => {
          const number = v => typeof v === 'number'
          return true
              &&  t.ok(throws(ƒ.fatalize(ƒ.fail({}))))
              && !t.ok(throws(ƒ.fatalize(ƒ.unfailing(_ => 123))))
              &&  t.eq(ƒ.fatalize(ƒ.unfailing(id))(123))(123)
              &&  t.ok(throws(_ => ƒ.fatalize(ƒ.ᐅwhen(number)(v => v + 1))('a')))
              && !t.ok(throws(_ => ƒ.fatalize(ƒ.ᐅwhen(number)(v => v + 1))(2)))
              &&  t.eq(ƒ.fatalize(ƒ.ᐅwhen(number)(v => v + 1))(2))(3)
        },
      ],
    }),
    t => t.suite(`getters`, [
      t => t.suite(`for_key`, {
        'value: gets the value for a key': [
          t => t.eq(get.for_key.value(0)([5]))(5),
          t => t.eq(get.for_key.value('a')({}))(None),
          t => !t.eq(get.for_key.value(['a'])({ 'a': 'b' }))('b'),
        ],
        'entry: gets the [ key, value ] pair for a key': [
          t => t.eq(get.for_key.entry(0)([5]))([ 0, 5]),
        ],
        'property: gets the [ key, descriptor ] pair for a key': [
          t => t.eq(get.for_key.property(0)([5]))([ 0, d.default({ v: 5 }) ]),
          t => t.eq(get.for_key.property('a')({ a: 4 }))([ 'a', d.default({ v: 4 }) ]),
        ],
        'descriptor: gets the descriptor for a key': [
          t => t.eq(get.for_key.descriptor(0)([5]))(d.default({ v: 5 })),
          t => t.eq(get.for_key.descriptor('a')({ a: 4 }))(d.default({ v: 4 })),
        ],
      }),
      t => t.suite(`for_keys`, {
        'values': [
          t => t.eq(get.for_keys.values([ 1, 3 ])([ 'a', 'b', 'c', 'd' ]))([ 'b', 'd' ]),
          t => t.eq(get.for_keys.values([ 'x' ])({ x: { y: 123 } }))([{ y: 123 }]),
        ],
        'entries': [
          t => t.eq(get.for_keys.entries([ 0, 2 ])([ 'a', 'b', 'c', 'd' ]))
                   ([[0, 'a'], [2, 'c']]),
          t => t.eq(get.for_keys.entries([ 'x', 'k' ])({ x: { y: 123 }, k: true }))
                   ([['x', { y: 123 }],['k', true]]),
        ],
        'properties': [
          t => t.eq(get.for_keys.properties([ 0, 2 ])([ 'a', 'b', 'c', 'd' ]))
                   ([[0, d.default({ v: 'a' })], [2, d.default({ v: 'c' })]]),
          t => t.eq(get.for_keys.properties([ 'x', 'k' ])({ x: { y: 123 }, k: true }))
                   ([['x', d.default({ v: { y: 123 } })],['k', d.default({ v: true })]]),
          t => t.eq(get.for_keys.properties([ 'z' ])({ x: { y: 123 }, k: true }))
                   ([['z', None]]),
          t => t.eq(get.for_keys.properties([ sym_a ])(from_descriptors(Object.prototype)({ [sym_a]: d.nothing({ v: `hello` }) })))
                   ([
                      [sym_a, { value: `hello`, writable: false, enumerable: false, configurable: false }],
                    ]),
          t => t.eq(get.for_keys.properties([ 'x', 'k' ])(from_descriptors(Object.prototype)({ x: d.nothing({ v: 123 }) })))
                   ([
                      ['x', { value: 123, writable: false, enumerable: false, configurable: false }],
                      ['k', None],
                    ]),
        ],
        'descriptors': [
          t => t.eq(get.for_keys.descriptors([ 3, 1 ])([ 'a', 'b', 'c', 'd' ]))
                   ([ d.default({ v: 'd' }), d.default({ v: 'b' }) ]),
          t => t.eq(get.for_keys.descriptors([ 'x', 'k' ])({ x: {}, k: [1, 2, 3] }))
                   ([ d.default({ v: {} }), d.default({ v: [1, 2, 3] }) ]),
          t => t.eq(get.for_keys.descriptors([ 'x', 'k' ])({ x: {}, }))
                   ([ d.default({ v: {} }), None ]),
        ],
      }),
      t => t.suite(`at_path`, {
        'value: gets the value at a path': [
          t => t.eq(get.at_path.value([])(abc5))(abc5),
          t => t.eq(get.at_path.value([ 'a', 'b', 'c' ])(abc5))(5),
          t => t.eq(get.at_path.value([ 'a', 'b', 'd' ])(abc5))(None),
        ],
        'entry': [
          t => t.eq(get.at_path.entry([])(abc5))([ None, None ]),
          t => t.eq(get.at_path.entry([ 'a', 'b' ])(abc5))(['b', { c: 5 }]),
          t => t.eq(get.at_path.entry([ 'a', 'b', 'c' ])(abc5))(['c', 5]),
          t => t.eq(get.at_path.entry([ 0, 0 ])([[1]]))([0, 1]),
          t => t.eq(get.at_path.entry([ 'a', 'z' ])(abc5))(['z', None]),
        ],
        'property': [
          t => t.eq(get.at_path.property([])(abc5))([ None, None ]),
          t => t.eq(get.at_path.property([ 'a' ])(abc5))(['a', d.default({ v: { b: { c: 5 } } })]),
          t => t.eq(get.at_path.property([ 'a', 'b', 'c' ])(abc5))(['c', d.default({ v: 5 })]),
          t => t.eq(get.at_path.property([ 0, 0 ])([[3]]))([0, d.default({ v: 3 })]),
          t => t.eq(get.at_path.property([ 'x', 'y' ])(xyhello))
                   ([ 'y', { value: 'hello', writable: false, enumerable: false, configurable: false } ]),
        ],
        'descriptor': [
          t => t.eq(get.at_path.descriptor([])(abc5))(None),
          t => t.eq(get.at_path.descriptor([ 'a' ])(abc5))(d.default({ v: { b: { c: 5 } } })),
          t => t.eq(get.at_path.descriptor([ 'a', 'b', 'c' ])(abc5))(d.default({ v: 5 })),
          t => t.eq(get.at_path.descriptor([ 0, 0 ])([]))(None),
          t => t.eq(get.at_path.descriptor([ 0, 0, 0 ])([]))(None),
          t => t.eq(get.at_path.descriptor([ 'x', 'y' ])(xyhello))
                   ({ value: 'hello', writable: false, enumerable: false, configurable: false }),
        ],
        'values': [
          t => t.eq(get.at_path.values([ 'a' ])([ 'b', 'c' ])({ a: { b: 1, c: 2 } }))([1, 2]),
          t => t.eq(get.at_path.values([ 'a' ])([])({ a: { b: 1, c: 2 } }))([]),
          t => t.eq(get.at_path.values([ 'a', 'b' ])([ 'c' ])(abc5))([5]),
          t => t.eq(get.at_path.values([ 0, 0 ])([ 1, 2 ])([[[1,2,3]]]))([2,3]),
          t => t.eq(get.at_path.values([])([ 'a' ])(abc5))([{ b: { c: 5 } }]),
          t => t.eq(get.at_path.values([])([])(abc5))([]),
          t => t.eq(get.at_path.values([ 'x' ])([ 'y' ])(xyhello))(['hello']),
          t => t.eq(get.at_path.values([])([])(xyhello))([]),
        ],
        'entries': [
          t => t.eq(get.at_path.entries([ 'a' ])([ 'b', 'c' ])({ a: { b: 1, c: 2 } }))([['b', 1], ['c', 2]]),
          t => t.eq(get.at_path.entries([ 'a' ])([])({ a: { b: 1, c: 2 } }))([]),
          t => t.eq(get.at_path.entries([ 'a', 'b' ])([ 'c' ])(abc5))([['c', 5]]),
          t => t.eq(get.at_path.entries([ 0, 0 ])([ 1, 2 ])([[[1,2,3]]]))([[1, 2], [2, 3]]),
          t => t.eq(get.at_path.entries([])([ 'a' ])(abc5))([['a', { b: { c: 5 } }]]),
          t => t.eq(get.at_path.entries([])([])(abc5))([]),
          t => t.eq(get.at_path.entries([ 'x' ])([ 'y' ])(xyhello))([['y', 'hello']]),
          t => t.eq(get.at_path.entries([])([])(xyhello))([]),
        ],
        'properties': [
          t => t.eq(get.at_path.properties([])([ 'a' ])(abc5))([['a', d.default({ v: { b: { c: 5 } } })]]),
          t => t.eq(get.at_path.properties([])([])(abc5))([]),
          t => t.eq(get.at_path.properties([ 'a' ])([ 'b', 'c' ])({ a: { b: 1, c: 2 } }))
                   ([['b', d.default({ v: 1 })], ['c', d.default({ v: 2 })]]),
          t => t.eq(get.at_path.properties([ 'a', 'b' ])([ 'c' ])(abc5))
                   ([['c', d.default({ v: 5 })]]),
          t => t.eq(get.at_path.properties([ 0, 0 ])([ 1, 2 ])([[[1,2,3]]]))
                   ([[1, d.default({ v: 2 })], [2, d.default({ v: 3 })]]),
          t => t.eq(get.at_path.properties([])([ 'a' ])(abc5))
                   ([['a', d.default({ v: { b: { c: 5 } } })]]),
          t => t.eq(get.at_path.properties([ 'x' ])([ 'y' ])(xyhello))
                   ([['y', { value: 'hello', writable: false, enumerable: false, configurable: false }]]),
          t => t.eq(get.at_path.properties([])([])(xyhello))([]),
        ],
        'descriptors': [
          t => t.eq(get.at_path.descriptors([])([ 'a' ])(abc5))([d.default({ v: { b: { c: 5 } } })]),
          t => t.eq(get.at_path.descriptors([])([])(abc5))([]),
          t => t.eq(get.at_path.descriptors([ 'a' ])([ 'b', 'c' ])({ a: { b: 1, c: 2 } }))
                   ([d.default({ v: 1 }), d.default({ v: 2 })]),
          t => t.eq(get.at_path.descriptors([ 'a', 'b' ])([ 'c' ])(abc5))
                   ([d.default({ v: 5 })]),
          t => t.eq(get.at_path.descriptors([ 0, 0 ])([ 1, 2 ])([[[1,2,3]]]))
                   ([d.default({ v: 2 }), d.default({ v: 3 })]),
          t => t.eq(get.at_path.descriptors([])([ 'a' ])(abc5))
                   ([d.default({ v: { b: { c: 5 } } })]),
          t => t.eq(get.at_path.descriptors([ 'x' ])([ 'y' ])(xyhello))
                   ([{ value: 'hello', writable: false, enumerable: false, configurable: false }]),
          t => t.eq(get.at_path.descriptors([])([])(xyhello))([]),
        ],
      }),
      t => t.suite(`in(<object>)`, {
        '(<key>)': [
          t => t.eq(get.in({ a: 5 })(`a`))(5),
        ],
        'for_key': {
          'value': [
            t => t.eq(get.in({ a: 5 }).for_key.value('a'))(5),
          ],
          'entry': [
            t => t.eq(get.in({ a: 5 }).for_key.entry('a'))(['a', 5]),
          ],
          'property': [
            t => t.eq(get.in({ a: 5 }).for_key.property('a'))(['a', d.default({ v: 5 })]),
          ],
          'descriptor': [
            t => t.eq(get.in({ a: 5 }).for_key.descriptor('a'))(d.default({ v: 5 })),
          ],
        },
        'for_keys': {
          'values': [
            t => t.eq(get.in([1,2,3]).for_keys.values([0,2]))([1,3]),
          ],
          'entries': [
            t => t.eq(get.in([1,2,3]).for_keys.entries([1,0]))([[1,2],[0,1]]),
          ],
          'properties': [
            t => {
              const sym_a_hello = from_descriptors(Object.prototype)({ [sym_a]: d.nothing({ v: `hello` }) })
              return t.eq (get.in(sym_a_hello).for_keys.properties([ sym_a ]))
                      ([
                        [sym_a, { value: `hello`, writable: false, enumerable: false, configurable: false }],
                      ])
            },
            t => t.eq(get.in([1,2,3]).for_keys.properties([2,0,1]))([
              [2, d.default({ v: 3 })],
              [0, d.default({ v: 1 })],
              [1, d.default({ v: 2 })],
            ]),
          ],
          'descriptors': [
            t => t.eq(get.in([1,2,3]).for_keys.descriptors([2,0,1]))([
              d.default({ v: 3 }),
              d.default({ v: 1 }),
              d.default({ v: 2 }),
            ]),
          ],
        },
        'at_path': {
          'value': [
            t => t.eq(get.in(abc5).at_path.value(['a','b','c']))(5),
            t => t.eq(get.in(abc5).at_path.value([]))(abc5),
            t => t.eq(get.in(abc5).at_path.value(['k']))(None),
          ],
          'entry': [
            t => t.eq(get.in(abc5).at_path.entry(['a','b','c']))(['c',5]),
            t => t.eq(get.in(abc5).at_path.entry([]))([None,None]),
            t => t.eq(get.in(abc5).at_path.entry(['a']))(['a',{b:{c:5}}]),
            t => t.eq(get.in(abc5).at_path.entry(['k']))(['k',None]),
          ],
          'property': [
            t => t.eq(get.in(abc5).at_path.property(['a','b','c']))(['c',d.default({ v: 5 })]),
            t => t.eq(get.in(abc5).at_path.property([]))([None,None]),
            t => t.eq(get.in(abc5).at_path.property(['a']))(['a',d.default({ v: { b: { c: 5 } } })]),
            t => t.eq(get.in(abc5).at_path.property(['k']))(['k',None]),
          ],
          'descriptor': [
            t => t.eq(get.in(abc5).at_path.descriptor(['a','b','c']))(d.default({ v: 5 })),
            t => t.eq(get.in(abc5).at_path.descriptor([]))(None),
            t => t.eq(get.in(abc5).at_path.descriptor(['a']))(d.default({ v: { b: { c: 5 } } })),
            t => t.eq(get.in(abc5).at_path.descriptor(['k']))(None),
          ],
          'values': [
            t => t.eq(get.in({x:[3,1,2]}).at_path.values(['x'])([2,0]))([2,3]),
            t => t.eq(get.in({x:[3,1,2]}).at_path.values(['x'])([]))([]),
            t => t.eq(get.in({x:[3,1,2]}).at_path.values([])(['x']))([[3,1,2]]),
            t => t.eq(get.in({x:[3,1,2]}).at_path.values([])(['k']))([None]),
            t => t.eq(get.in({x:[3,1,2]}).at_path.values(['k'])([]))([]),
            t => t.eq(get.in({x:[3,1,2]}).at_path.values([])([]))([]),
          ],
          'entries': [
            t => t.eq(get.in({x:[3,1,2]}).at_path.entries(['x'])([1]))([[1,1]]),
            t => t.eq(get.in({x:[3,1,2]}).at_path.entries([])(['x']))([['x',[3,1,2]]]),
            t => t.eq(get.in({x:[3,1,2]}).at_path.entries(['x'])([]))([]),
            t => t.eq(get.in({x:[3,1,2]}).at_path.entries([])(['k']))([['k',None]]),
            t => t.eq(get.in({x:[3,1,2]}).at_path.entries([])([]))([]),
          ],
          'properties': [
            t => t.eq(get.in({x:[3,1,2]}).at_path.properties(['x'])([1]))([[1,d.default({v:1})]]),
            t => t.eq(get.in({x:[3,1,2]}).at_path.properties([])(['x']))([['x',d.default({v:[3,1,2]})]]),
            t => t.eq(get.in({x:[3,1,2]}).at_path.properties(['x'])([]))([]),
            t => t.eq(get.in({x:[3,1,2]}).at_path.properties([])(['k']))([['k',None]]),
            t => t.eq(get.in({x:[3,1,2]}).at_path.properties(['k'])([]))([]),
            t => t.eq(get.in({x:[3,1,2]}).at_path.properties([])([]))([]),
          ],
          'descriptors': [
            t => t.eq(get.in({x:[3,1,2]}).at_path.descriptors(['x'])([1]))([d.default({v:1})]),
            t => t.eq(get.in({x:[3,1,2]}).at_path.descriptors([])(['x']))([d.default({v:[3,1,2]})]),
            t => t.eq(get.in({x:[3,1,2]}).at_path.descriptors(['x'])([]))([]),
            t => t.eq(get.in({x:[3,1,2]}).at_path.descriptors([])(['k']))([None]),
            t => t.eq(get.in({x:[3,1,2]}).at_path.descriptors(['k'])([]))([]),
            t => t.eq(get.in({x:[3,1,2]}).at_path.descriptors([])([]))([]),
          ],
        },
      }),
      t => t.suite(`string_keyed`, {
        'values: gets all string-keyed values': [
          t => {
            return true
                && t.eq(get.string_keyed.values({ [sym_a]: `hi`, a: 4 }))([4])
          },
        ],
        'entries': [
          t => {
            return true
                && t.eq(get.string_keyed.entries({ [sym_a]: `hi`, a: 4 }))([[`a`,4]])
          },
        ],
        'properties: gets all string-keyed [ key, descriptor ] pairs': [
          t => {
            return t.eq(get.string_keyed.properties({ a: 5, b: 7, [sym_a]: 'hi' }))([
              ['a', d.default({ v: 5 }) ],
              ['b', d.default({ v: 7 }) ],
            ])
          },
        ],
        'descriptors': [
          t => {
            return t.eq(get.string_keyed.descriptors({ a: 5, b: 7, [sym_a]: 'hi' }))([
              d.default({ v: 5 }),
              d.default({ v: 7 }),
            ])
          },
        ],
      }),
      t => t.suite(`symbol_keyed`, {
        'values: gets all symbol-keyed values': [
          t => {
            return true
                && t.eq(get.symbol_keyed.values({ [sym_a]: `hi`, a: 4 }))([ `hi` ])
          },
        ],
        'entries': [
          t => {
            return true
                && t.eq(get.symbol_keyed.entries({ [sym_a]: `hi`, a: 4 }))([[ sym_a, `hi` ]])
          },
        ],
        'properties: gets all symbol-keyed [ key, descriptor ] pairs': [
          t => {
            return t.eq(get.symbol_keyed.properties({ [Symbol.split]: `there`, [sym_a]: `hi`, a: 7 }))([
              [Symbol.split, d.default({ v: `there` })],
              [sym_a,        d.default({ v: `hi`    })],
            ])
          },
        ],
        'descriptors': [
          t => {
            return t.eq(get.symbol_keyed.descriptors({ [Symbol.split]: `there`, [sym_a]: `hi`, a: 7 }))([
              d.default({ v: `there` }),
              d.default({ v: `hi`    }),
            ])
          },
        ],
      }),
      t => t.suite(`all`, {
        'values: gets all values (string and symbol keys)': [
          t => {
            return true
                && t.eq(get.all.values({ [sym_a]: `hi`, a: 4 }))([ 4, `hi` ])
          },
        ],
        'entries: gets all [ key, value ] pairs (string and symbol keys)': [
          t => {
            return t.eq(get.all.entries({ a: 5, [Symbol.split]: `hi` }))([
              ['a', 5],
              [Symbol.split, `hi`],
            ])
          },
        ],
        'properties: gets all [ key, descriptor ] pairs (string and symbol keys)': [
          t => {
            return t.eq(get.all.properties({ a: 5, [Symbol.split]: `hi` }))([
              [ 'a',          d.default({ v: 5 })    ],
              [ Symbol.split, d.default({ v: `hi` }) ],
            ])
          },
        ],
        'descriptors': [
          t => {
            return t.eq(get.all.descriptors({ a: 5, [Symbol.split]: `hi` }))([
              d.default({ v: 5 }),
              d.default({ v: `hi` }),
            ])
          },
        ],
      }),
      t => t.suite(`shorthand`, {
        'get: gets a key/index or None if not present': [
          t => {
            return true
                && t.eq(get(0)([5]))(5)
                && t.eq(get('a')({}))(None)
                && !t.eq(get(['a'])({ 'a': 'b' }))('b')
          },
        ],
        'get.value: get.for_key.value': [
          t => t.eq(get.value('a')({a: 5}))(5),
          t => t.eq(get.value('x')({a: 5}))(None),
        ],
        'get.entry: get.for_key.entry': [
          t => t.eq(get.entry('a')({a: 5}))(['a', 5]),
          t => t.eq(get.entry('x')({a: 5}))(['x', None]),
        ],
        'get.property: get.for_key.property': [
          t => t.eq(get.property('a')({a: 5}))(['a', d.default({v: 5})]),
          t => t.eq(get.property('x')({a: 5}))(['x', None]),
        ],
        'get.descriptor: get.for_key.descriptor': [
          t => t.eq(get.descriptor('a')({a: 5}))(d.default({v: 5})),
          t => t.eq(get.descriptor('x')({a: 5}))(None),
        ],
        'get.value.in: get.in(obj).for_key.value': [
          t => t.eq(get.value.in({a: 5})('a'))(5),
          t => t.eq(get.value.in({a: 5})('x'))(None),
        ],
        'get.entry.in: get.in(obj).for_key.entry': [
          t => t.eq(get.entry.in({a: 5})('a'))(['a', 5]),
          t => t.eq(get.entry.in({a: 5})('x'))(['x', None]),
        ],
        'get.property.in: get.in(obj).for_key.property': [
          t => t.eq(get.property.in({a: 5})('a'))(['a', d.default({v: 5})]),
          t => t.eq(get.property.in({a: 5})('x'))(['x', None]),
        ],
        'get.descriptor.in: get.in(obj).for_key.descriptor': [
          t => t.eq(get.descriptor.in({a: 5})('a'))(d.default({v: 5})),
          t => t.eq(get.descriptor.in({a: 5})('x'))(None),
        ],
        'get.values: get.all.values': [
          t => t.eq(get.values(to6))([ 1, 2, 3, 4, 5, 5 ]),
          t => t.eq(get.values({ a: 5, [sym_a]: 'hello' }))([ 5, 'hello' ]),
        ],
        'get.entries: get.all.entries': [
          t => t.eq(get.entries(to6))([
            [ '0', 1 ],
            [ '1', 2 ],
            [ '2', 3 ],
            [ '3', 4 ],
            [ '4', 5 ],
            [ 'length', 5 ],
          ]),
          t => t.eq(get.entries({ a: 5, [sym_a]: 'hello' }))([[ 'a', 5 ], [ sym_a, 'hello' ]]),
        ],
        'get.properties: get.all.properties': [
          t => t.eq(get.properties(to6))([
            [ '0', d.default({ v: 1 }) ],
            [ '1', d.default({ v: 2 }) ],
            [ '2', d.default({ v: 3 }) ],
            [ '3', d.default({ v: 4 }) ],
            [ '4', d.default({ v: 5 }) ],
            [ 'length', { value: 5, writable: true, configurable: false, enumerable: false } ],
          ]),
          t => t.eq(get.properties({ a: 5, [sym_a]: 'hello' }))([
            [ 'a',   d.default({ v: 5 }) ],
            [ sym_a, d.default({ v: 'hello' }) ],
          ]),
        ],
        'get.descriptors: get.all.descriptors': [
          t => t.eq(get.descriptors(to6))([
            d.default({ v: 1 }),
            d.default({ v: 2 }),
            d.default({ v: 3 }),
            d.default({ v: 4 }),
            d.default({ v: 5 }),
            { value: 5, writable: true, configurable: false, enumerable: false },
          ]),
          t => t.eq(get.descriptors({ a: 5, [sym_a]: 'hello' }))([
            d.default({ v: 5 }),
            d.default({ v: 'hello' }),
          ]),
        ],
        'get.values.in: get.in(obj).for_keys.values(...)': [
          t => t.eq(get.values.in(to6)([1, 'length']))([ 2, 5 ]),
          t => t.eq(get.values.in({ a: 5, [sym_a]: 'hello' })([sym_a]))([ 'hello' ]),
        ],
        'get.entries.in: get.in(obj).for_keys.entries(...)': [
          t => t.eq(get.entries.in(to6)([1,4]))([
            [ 1, 2 ],
            [ 4, 5 ],
          ]),
          t => t.eq(get.entries.in({ a: 5, [sym_a]: 'hello' })([sym_a]))
                   ([[ sym_a, 'hello' ]]),
        ],
        'get.properties.in: get.in(obj).for_keys.properties(...)': [
          t => t.eq(get.properties.in(to6)([ 0, 3, 'length' ]))([
            [ 0, d.default({ v: 1 }) ],
            [ 3, d.default({ v: 4 }) ],
            [ 'length', { value: 5, writable: true, configurable: false, enumerable: false } ],
          ]),
          t => t.eq(get.properties.in({ a: 5, [sym_a]: 'hello' })([ sym_a ]))([
            [ sym_a, d.default({ v: 'hello' }) ],
          ]),
        ],
        'get.descriptors.in: get.in(obj).for_keys.descriptors(...)': [
          t => t.eq(get.descriptors.in(to6)([ 0, 3, 'length' ]))([
            d.default({ v: 1 }),
            d.default({ v: 4 }),
            { value: 5, writable: true, configurable: false, enumerable: false },
          ]),
          t => t.eq(get.descriptors({ a: 5, [sym_a]: 'hello' }))([
            d.default({ v: 5 }),
            d.default({ v: 'hello' }),
          ]),
        ],
      }),
    ]),
    t => t.suite(`setters`, {
      // TODO(jordan): unify, similar to getters tests
      // TODO(jordan): test short-hand, path setters
      'set_descriptor.mut: sets a single descriptor on an object': [
        t => {
          const o = { a: 1 }
          set_descriptor.mut('b')({ value: 5 })(o)
          set_descriptor.mut('a')({ enumerable: false })(o)
          return true
            && t.eq(o.b)(5)
            && t.eq(o.a)(1)
            && t.eq(Object.keys(o))([])
        },
      ],
      'set_descriptors.mut: copies descriptors from an object': [
        t => {
          const o = { a: 5 }
          set_descriptors.mut({ b: { value: 3 } })(o)
          set_descriptors.mut({ a: { value: 6, enumerable: false } })(o)
          return true
            && t.eq(o.b)(3)
            && t.eq(o.a)(6)
            && t.eq(Object.keys(o))([])
        },
      ],
    }),
    t => t.suite(`objects`, {
      'string_keys: lists string keys': [
        t => t.eq(string_keys({ [sym_a]: `hi`, a: 4 }))(['a']),
      ],
      'symbol_keys: lists symbol keys': [
        t => t.eq(symbol_keys({ [sym_a]: `hi`, a: 4 }))([sym_a]),
      ],
      'keys: lists both string and symbol keys': [
        t => t.eq(keys({ [sym_a]: `hi`, a: 4 }))(['a', sym_a]),
      ],
      'from_properties: converts [prop, desc] pairs to an object': [
        t => t.eq(from_properties(Object.prototype)([['a',d.default({ v: 5 })]]))({ a: 5 }),
      ],
      'from_descriptors: converts {[key]: desc, ...} to an object': [
        t => t.eq(from_descriptors(Object.prototype)({ a: d.default({ v: 5 }) }))({ a: 5 }),
        t => t.eq(from_descriptors(Object.prototype)({ a: d.nothing({ v: 5 }) }))
                 (js.create(Object.prototype)({ a: { value: 5 } })),
        t => t.eq(from_descriptors(Object.prototype)({ [sym_a]: d.enumerable({ v: 'hello' }) }))
                 (js.create(Object.prototype)({
                   [sym_a]: { value: 'hello', enumerable: true }
                 })),
      ],
      'merge_by: merge into an object according to a getter and joiner': [
        t => {
          const array_merge = merge_by([
            ᐅ([ map(get.all.properties),           flatten    ]),
            ᐅ([ from_properties(Object.prototype), Array.from ]),
          ])
          return true
              && t.eq(array_merge([[ 1, 2, 3, ], [    0,             ]]))([ 0 ])
              && t.eq(array_merge([[ 1, 2, 3, ], [    0, /**/, /**/, ]]))([ 0, 2, 3 ])
              && t.eq(array_merge([[ 0,       ], [ /**/,    2,    3, ]]))([ 0, 2, 3 ])
              && t.eq(array_merge([[ 0,       ], [    1,    2,    3, ]]))([ 1, 2, 3 ])
        },
      ],
      'merge_entries: merge objects by their entries to given protoype': [
        t => t.eq(merge_entries(Object.prototype)([ abc5, xyhello ]))({
              a: { b: { c: 5 } },
              x: js.create(null)({ y: d.nothing({ v: 'hello' }) }),
            }),
        t => t.eq(merge_entries(Object.prototype)([ abc5 ]))(abc5),
        t => !t.refeq(merge_entries(null)([ xyhello ]))(xyhello),
        t => t.refeq(merge_entries(null)([ xyhello ]).x)(xyhello.x),
        t => t.refeq(merge_entries(Object.prototype)([ xyhello ]).x)(xyhello.x),
        t => t.eq(merge_entries(Object.prototype)([ xyhello ]))({ x: xyhello.x }),
        t => {
          const entried_xyhello = js.create(null)({
            // shallow merge, descriptor gets lost by *_entry api
            x: d.default({
              // shallow merge: value is a reference to xyhello.x
              v: js.create(null)({
                y: d.nothing({ v: 'hello' })
              })
            })
          })
          return t.eq(merge_entries(null)([ xyhello ]))(entried_xyhello)
        },
      ],
      'merge_properties: merge objects by their properties to given prototype': [
        t => { /* TODO */ },
      ],
      'merge: combines properties of 2 objects, with prototype of 2nd': [
        t => t.eq(merge({ a: 4 })({ a: 5 }))({ a: 5 }),
        t => {
          class TestClass { constructor(x) { this.x = x } }
          return t.eq(merge({ x: 4 })(new TestClass(3)))
                     (js.create(TestClass.prototype)({ x: d.default({ v: 3 }) }))
        },
        t => t.eq(merge(abc5)(xyhello))(js.create(null)({
          a: d.default({ v: abc5.a    }),
          x: d.nothing({ v: xyhello.x }),
        })),
        t => t.eq(merge(xyhello)(abc5))(js.create(Object.prototype)({
          a: d.default({ v: abc5.a    }),
          x: d.nothing({ v: xyhello.x }),
        })),
      ],
      'map_entries: map over and alter object entries': [
        t => { /* TODO */ },
      ],
      'map_properties: map over and alter object properties': [
        t => {
          const a = { a: 5 }
          const b = js.create(Object.prototype)({ a: d.nothing({ v: 5 }) })
          const make_private_immutable = ([ key, descriptor ]) => {
            return [ key, { value: descriptor.value } ]
          }
          return true
              && t.eq(map_properties(make_private_immutable)(a))(b)
        },
      ],
      'filter_entries: filter an object by a predicate on entries': [
        t => { /* TODO */ },
      ],
      'filter_properties: filter an object by a predicate on properties': [
        t => { /* TODO */ },
      ],
      'on_string_keys: call fn on string keys of target': [
        t => { /* TODO */ },
      ],
      'on_symbol_keys: call fn on symbol keys of target': [
        t => { /* TODO */ },
      ],
      'on_keys: call fn on all (string and symbol) keys of target': [
        t => { /* TODO */ },
      ],
      'is_key: validates that a value is a valid key': [
        t => { /* TODO */ },
      ],
      'unsafe_has: checks for an (unvalidated) key in an object': [
        t => { /* TODO */ },
      ],
      'has: returns true if a key is valid and present in an object': [
        t => {
          return true
              && t.ok(has(`a`)({ a: `b` }))
              && t.ok(has(0)([1]))
              && !t.ok(has(0)([]))
              && !t.ok(has([`a`])({ a: `b` }))
        },
      ],
      'has_path: returns true if a path is valid and present in an object': [
        t => {
          return true
              && t.ok(has_path([ 'a', 'b', 'c' ])({ a: { b: { c: 5 } } }))
              && t.ok(has_path([ 1, 1 ])([ 0, [ 0, 1 ] ]))
              && !t.ok(has_path([ 'z' ])({ a: { b: { c: 5 } } }))
              && !t.ok(has_path([ 1, 1, 0 ])([ 0, [ 0, 1 ] ]))
        },
      ],
      'from_entries: turns {key,symbol}, value pairs into an object': [
        t => t.eq(from_entries(Object.prototype)([['a', 5],['b', `hi`]]))({a: 5, b: `hi`}),
      ],
      'swap: swaps the current value of a key for another': [
        t => t.eq(swap(`a`)(14)({ a: 5 }))([ 5, { a: 14 } ]),
      ],
      'enumerable_keys: keys, filtered by js.is_enumerable': [
        t => { /* TODO */ },
      ],
      'enumerable_entries: entries, filtered by js.is_enumerable': [
        t => {
          const example = js.create(null)({
            a: d.default({ v: 5 }),
            b: d.nothing({ v: 'hidden' }),
          })
          return t.eq(enumerable_entries(example))([[ 'a', 5 ]])
        },
      ],
      'zip: zip an array of keys and an array of values into an object': [
        t => { /* TODO */ },
      ],
      'unzip: unzip an object into an array of keys and an array of values': [
        t => { /* TODO */ },
      ],
      'update: replaces a key by a v -> v function': [
        t => {
          const inc = v => v + 1
          return true
            && t.eq(update(`a`)(   inc)({ a: 4 }))([ true,  { a: 5 }, { index: 1                     } ])
            && t.eq(update(`a`)(   inc)({      }))([ false, {      }, { index: 0, x: { ƒ: 'atomic' } } ])
            && t.eq(update(`a`)(v => 5)({      }))([ false, {      }, { index: 0, x: { ƒ: 'atomic' } } ])
            && t.ok(ᐅ([ update(0)(inc), get(1) ])([ 1 ]) instanceof Array)
            && t.eq(update(0)(inc)([ 1 ]))([ true, [ 2 ], { index: 1 } ])
        },
      ],
      'update_path: replace a nested key by a v -> v function': [
        t => {
          const update_ab = update_path([ `a`, `b` ])
          const inc = v => v + 1
          return true
            && t.eq(update_ab(inc)({ a: { b: 2 } }))([ true,  { a: { b : 3 } }, { index: 1 }                     ])
            && t.eq(update_ab(inc)({ z: 1        }))([ false, { z: 1         }, { index: 0, x: { ƒ: 'atomic' } } ])
            && t.eq(update_ab(inc)({ a: 3        }))([ false, { a: 3         }, { index: 0, x: { ƒ: 'atomic' } } ])
            && t.ok(ᐅ([ update_path([ 0, 1 ])(inc), get(1) ])([ [ 1, 2 ], 3 ]) instanceof Array)
            && t.eq(update_path([ 0, 1 ])(inc)([ [ 1, 2 ], 3 ]))([ true, [ [ 1, 3 ], 3 ], { index: 1 } ])
        },
      ],
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
      'is': [
        t => {
          return true
              && t.ok(is(null)(null))
              && t.ok(is(undefined)(undefined))
              && t.ok(is(0)(0))
              && t.ok(is("hello")("hello"))
              && t.ok(is(NaN)(NaN))
              && !t.ok(is("hello")("goodbye"))
              && !t.ok(is(0)(1))
              && !t.ok(is(null)(undefined))
              && !t.ok(is(false)(undefined))
              && !t.ok(is(null)(false))
              && !t.ok(is(false)(NaN))
        },
      ],
      'not': [
        t =>  t.ok(not(v => v < 5)(6)),
        t => !t.ok(not(v => v === "hello")("hello")),
        t =>  t.ok(not(a => a === 2)(1)),
        t => !t.ok(not(a => a === 2)(2)),
        t =>  t.ok(not(and([ x => x % 2 === 0, x => x + 1 === 2 ]))(2)),
        t => !t.ok(not(and([ x => x % 2 === 0, x => x % 3 === 0 ]))(6)),
        t =>  t.ok(not(or ([ x => x % 2 === 0, x => x / 2 === 1 ]))(1)),
        t => !t.ok(not(or ([ x => x + 1 === 3, x => x + 1 === 2 ]))(1)),
      ],
      'is_value': [
        t => {
          return true
              && t.ok(is_value(0))
              && t.ok(is_value(false))
              && t.ok(is_value(NaN))
              && t.ok(is_value(''))
              && !t.ok(is_value(undefined))
              && !t.ok(is_value(null))
        },
      ],
      'value_or': [
        t => {
          return true
              && t.eq(value_or(5)(undefined))(5)
              && t.eq(value_or(None)(undefined))(None)
              && t.eq(value_or(None)(     null))(None)
              && t.eq(value_or(None)(false))(false)
              && t.eq(value_or(None)(NaN))(NaN)
              && t.eq(value_or(None)(0))(0)
              && t.eq(value_or(None)(''))('')
        },
      ],
    }),
    t => t.suite('is', [
      t =>  t.ok(is(5)(5)),
      t =>  t.ok(is(NaN)(NaN)),
      t =>  t.ok(is(true)(true)),
      t =>  t.ok(is(null)(null)),
      t =>  t.ok(is(undefined)(undefined)),
      t => !t.ok(is(null)(undefined)),
      t => !t.ok(is(undefined)(null)),
      t => !t.ok(is(5)(3)),
      t => !t.ok(is({})({})),
      t => !t.ok(is([])([])),
      t => t.suite('is.type', {
        'object': [
          t => {
            return true
                &&  t.ok(is.type.object([]))
                &&  t.ok(is.type.object({}))
                &&  t.ok(is.type.object(new Number()))
                &&  t.ok(is.type.object(new String()))
                &&  t.ok(is.type.object(new Boolean()))
                &&  t.ok(is.type.object(null))
                && !t.ok(is.type.object(undefined))
                && !t.ok(is.type.object(None))
                && !t.ok(is.type.object(_ => {}))
                && !t.ok(is.type.object(Symbol()))
                && !t.ok(is.type.object(900000000000000000n))
                && !t.ok(is.type.object(1))
                && !t.ok(is.type.object(NaN))
                && !t.ok(is.type.object(true))
                && !t.ok(is.type.object(false))
                && !t.ok(is.type.object('hello'))
          },
        ],
        'number': [
          t => {
            return true
                &&  t.ok(is.type.number(5))
                &&  t.ok(is.type.number(NaN))
                && !t.ok(is.type.number(undefined))
                && !t.ok(is.type.number(null))
                && !t.ok(is.type.number(None))
                && !t.ok(is.type.number(_ => {}))
                && !t.ok(is.type.number(Symbol()))
                && !t.ok(is.type.number(900000000000000000n))
                && !t.ok(is.type.number('hello'))
                && !t.ok(is.type.number(true))
                && !t.ok(is.type.number(false))
                && !t.ok(is.type.number({}))
                && !t.ok(is.type.number([]))
                && !t.ok(is.type.number(new Number()))
                && !t.ok(is.type.number(new String()))
                && !t.ok(is.type.number(new Boolean()))
          },
        ],
        'string': [
          t => {
            return true
                &&  t.ok(is.type.string('hello'))
                && !t.ok(is.type.string(undefined))
                && !t.ok(is.type.string(null))
                && !t.ok(is.type.string(None))
                && !t.ok(is.type.string(_ => {}))
                && !t.ok(is.type.string(Symbol()))
                && !t.ok(is.type.string(5))
                && !t.ok(is.type.string(NaN))
                && !t.ok(is.type.string(900000000000000000n))
                && !t.ok(is.type.string(true))
                && !t.ok(is.type.string(false))
                && !t.ok(is.type.string({}))
                && !t.ok(is.type.string([]))
                && !t.ok(is.type.string(new Number()))
                && !t.ok(is.type.string(new String()))
                && !t.ok(is.type.string(new Boolean()))
          },
        ],
        'symbol': [
          t => {
            return true
                &&  t.ok(is.type.symbol(Symbol()))
                && !t.ok(is.type.symbol(undefined))
                && !t.ok(is.type.symbol(null))
                && !t.ok(is.type.symbol(None))
                && !t.ok(is.type.symbol(_ => {}))
                && !t.ok(is.type.symbol('hello'))
                && !t.ok(is.type.symbol(5))
                && !t.ok(is.type.symbol(NaN))
                && !t.ok(is.type.symbol(900000000000000000n))
                && !t.ok(is.type.symbol(true))
                && !t.ok(is.type.symbol(false))
                && !t.ok(is.type.symbol({}))
                && !t.ok(is.type.symbol([]))
                && !t.ok(is.type.symbol(new Number()))
                && !t.ok(is.type.symbol(new String()))
                && !t.ok(is.type.symbol(new Boolean()))
          },
        ],
        'bigint': [
          t => {
            return true
                &&  t.ok(is.type.bigint(900000000000000000n))
                && !t.ok(is.type.bigint(undefined))
                && !t.ok(is.type.bigint(null))
                && !t.ok(is.type.bigint(None))
                && !t.ok(is.type.bigint(_ => {}))
                && !t.ok(is.type.bigint(Symbol()))
                && !t.ok(is.type.bigint('hello'))
                && !t.ok(is.type.bigint(5))
                && !t.ok(is.type.bigint(NaN))
                && !t.ok(is.type.bigint(true))
                && !t.ok(is.type.bigint(false))
                && !t.ok(is.type.bigint({}))
                && !t.ok(is.type.bigint([]))
                && !t.ok(is.type.bigint(new Number()))
                && !t.ok(is.type.bigint(new String()))
                && !t.ok(is.type.bigint(new Boolean()))
          },
        ],
        'boolean': [
          t => {
            return true
                &&  t.ok(is.type.boolean(true))
                &&  t.ok(is.type.boolean(false))
                && !t.ok(is.type.boolean(undefined))
                && !t.ok(is.type.boolean(null))
                && !t.ok(is.type.boolean(None))
                && !t.ok(is.type.boolean(_ => {}))
                && !t.ok(is.type.boolean(900000000000000000n))
                && !t.ok(is.type.boolean(Symbol()))
                && !t.ok(is.type.boolean('hello'))
                && !t.ok(is.type.boolean(5))
                && !t.ok(is.type.boolean(NaN))
                && !t.ok(is.type.boolean({}))
                && !t.ok(is.type.boolean([]))
                && !t.ok(is.type.boolean(new Number()))
                && !t.ok(is.type.boolean(new String()))
                && !t.ok(is.type.boolean(new Boolean()))
          },
        ],
        'function': [
          t => {
            return true
                &&  t.ok(is.type.function(_ => {}))
                &&  t.ok(is.type.function(None))
                && !t.ok(is.type.function(undefined))
                && !t.ok(is.type.function(null))
                && !t.ok(is.type.function(true))
                && !t.ok(is.type.function(false))
                && !t.ok(is.type.function(900000000000000000n))
                && !t.ok(is.type.function(Symbol()))
                && !t.ok(is.type.function('hello'))
                && !t.ok(is.type.function(5))
                && !t.ok(is.type.function(NaN))
                && !t.ok(is.type.function({}))
                && !t.ok(is.type.function([]))
                && !t.ok(is.type.function(new Number()))
                && !t.ok(is.type.function(new String()))
                && !t.ok(is.type.function(new Boolean()))
          },
        ],
        'undefined': [
          t => {
            return true
                &&  t.ok(is.type.undefined(undefined))
                && !t.ok(is.type.undefined(null))
                && !t.ok(is.type.undefined(None))
                && !t.ok(is.type.undefined(_ => {}))
                && !t.ok(is.type.undefined(true))
                && !t.ok(is.type.undefined(false))
                && !t.ok(is.type.undefined(900000000000000000n))
                && !t.ok(is.type.undefined(Symbol()))
                && !t.ok(is.type.undefined('hello'))
                && !t.ok(is.type.undefined(5))
                && !t.ok(is.type.undefined(NaN))
                && !t.ok(is.type.undefined({}))
                && !t.ok(is.type.undefined([]))
                && !t.ok(is.type.undefined(new Number()))
                && !t.ok(is.type.undefined(new String()))
                && !t.ok(is.type.undefined(new Boolean()))
          },
        ],
      }),
      t => t.suite('is.instance', {
        'Map': [
          t => {
            return true
                &&  t.ok(is.instance.Map(new Map()))
                && !t.ok(is.instance.Map(new Set()))
                && !t.ok(is.instance.Map(new Date()))
                && !t.ok(is.instance.Map(new Array()))
                && !t.ok(is.instance.Map(new Number()))
                && !t.ok(is.instance.Map(new Object()))
                && !t.ok(is.instance.Map(new RegExp()))
                && !t.ok(is.instance.Map(new Boolean()))
                && !t.ok(is.instance.Map(new Function()))
          },
        ],
        'Set': [
          t => {
            return true
                &&  t.ok(is.instance.Set(new Set()))
                && !t.ok(is.instance.Set(new Map()))
                && !t.ok(is.instance.Set(new Date()))
                && !t.ok(is.instance.Set(new Array()))
                && !t.ok(is.instance.Set(new Number()))
                && !t.ok(is.instance.Set(new Object()))
                && !t.ok(is.instance.Set(new RegExp()))
                && !t.ok(is.instance.Set(new Boolean()))
                && !t.ok(is.instance.Set(new Function()))
          },
        ],
        'Date': [
          t => {
            return true
                &&  t.ok(is.instance.Date(new Date()))
                && !t.ok(is.instance.Date(new Map()))
                && !t.ok(is.instance.Date(new Set()))
                && !t.ok(is.instance.Date(new Array()))
                && !t.ok(is.instance.Date(new Number()))
                && !t.ok(is.instance.Date(new Object()))
                && !t.ok(is.instance.Date(new RegExp()))
                && !t.ok(is.instance.Date(new Boolean()))
                && !t.ok(is.instance.Date(new Function()))
          },
        ],
        'Array': [
          t => {
            return true
                &&  t.ok(is.instance.Array(new Array()))
                && !t.ok(is.instance.Array(new Map()))
                && !t.ok(is.instance.Array(new Set()))
                && !t.ok(is.instance.Array(new Date()))
                && !t.ok(is.instance.Array(new Number()))
                && !t.ok(is.instance.Array(new Object()))
                && !t.ok(is.instance.Array(new RegExp()))
                && !t.ok(is.instance.Array(new Boolean()))
                && !t.ok(is.instance.Array(new Function()))
          },
        ],
        'Number': [
          t => {
            return true
                &&  t.ok(is.instance.Number(new Number()))
                && !t.ok(is.instance.Number(new Map()))
                && !t.ok(is.instance.Number(new Set()))
                && !t.ok(is.instance.Number(new Date()))
                && !t.ok(is.instance.Number(new Array()))
                && !t.ok(is.instance.Number(new Object()))
                && !t.ok(is.instance.Number(new RegExp()))
                && !t.ok(is.instance.Number(new Boolean()))
                && !t.ok(is.instance.Number(new Function()))
          },
        ],
        'Object': [
          t => {
            return true
                &&  t.ok(is.instance.Object(new Object()))
                &&  t.ok(is.instance.Object(new Map()))
                &&  t.ok(is.instance.Object(new Set()))
                &&  t.ok(is.instance.Object(new Date()))
                &&  t.ok(is.instance.Object(new Array()))
                &&  t.ok(is.instance.Object(new Number()))
                &&  t.ok(is.instance.Object(new RegExp()))
                &&  t.ok(is.instance.Object(new Boolean()))
                &&  t.ok(is.instance.Object(new Function()))
          },
        ],
        'RegExp': [
          t => {
            return true
                &&  t.ok(is.instance.RegExp(new RegExp()))
                && !t.ok(is.instance.RegExp(new Map()))
                && !t.ok(is.instance.RegExp(new Set()))
                && !t.ok(is.instance.RegExp(new Date()))
                && !t.ok(is.instance.RegExp(new Array()))
                && !t.ok(is.instance.RegExp(new Number()))
                && !t.ok(is.instance.RegExp(new Object()))
                && !t.ok(is.instance.RegExp(new Boolean()))
                && !t.ok(is.instance.RegExp(new Function()))
          },
        ],
        'Boolean': [
          t => {
            return true
                &&  t.ok(is.instance.Boolean(new Boolean()))
                && !t.ok(is.instance.Boolean(new Map()))
                && !t.ok(is.instance.Boolean(new Set()))
                && !t.ok(is.instance.Boolean(new Date()))
                && !t.ok(is.instance.Boolean(new Array()))
                && !t.ok(is.instance.Boolean(new Number()))
                && !t.ok(is.instance.Boolean(new Object()))
                && !t.ok(is.instance.Boolean(new RegExp()))
                && !t.ok(is.instance.Boolean(new Function()))
          },
        ],
        'Function': [
          t => {
            return true
                &&  t.ok(is.instance.Function(new Function()))
                && !t.ok(is.instance.Function(new Map()))
                && !t.ok(is.instance.Function(new Set()))
                && !t.ok(is.instance.Function(new Date()))
                && !t.ok(is.instance.Function(new Array()))
                && !t.ok(is.instance.Function(new Number()))
                && !t.ok(is.instance.Function(new Object()))
                && !t.ok(is.instance.Function(new RegExp()))
                && !t.ok(is.instance.Function(new Boolean()))
          },
        ],
      }),
    ]),
    t => t.suite('copiers (object/array)', {
      'array_copy: makes new copy of array': [
        t => {
          return true
              && t.eq(array_copy(to6))(to6)
              && !t.refeq(array_copy(to6))(to6)
        },
      ],
      'object_copy: (shallowly) clones an object': [
        t => {
          const mk_yhello = _ => js.create(null)({ y: d.nothing({ v: 'hello' }) })
          return true
              && t.eq(object_copy({ a: 5 }))({ a: 5 })
              && t.eq(object_copy(mk_yhello()))(mk_yhello())
              && t.refeq(object_copy({ f: to6 }).f)(to6)
              && !t.refeq(object_copy({ a: 5 }))({ a: 5 })
        },
      ],
      'copy: shallow (object|array) copy': [
        t => {
          return true
              // shallow
              &&  t.eq(copy(abc5))(abc5)
              && !t.refeq(copy(abc5))(abc5)
              &&  t.refeq(copy(abc5).a)(abc5.a)
              // but thorough
              && t.eq(copy(to6))(to6)
              && t.eq(copy(xyhello.x))
                     (js.create(null)({ y: d.nothing({ v: 'hello' }) }))
              && t.eq(copy([None]))([None])
              && t.eq(copy([null,undefined,NaN]))([null,undefined,NaN])
              && t.eq(copy([[1,2],[[3,4],null]]))([[1,2],[[3,4],null]])
        },
      ],
      'copy: fails on non-object, non-arrays': (
        map(v => t => t.ok(throws(_ => copy(v))))([
          undefined, null, 5, 'hello', true, false, Symbol(), None,
          -0, Infinity, -Infinity, NaN,
        ])
      ),
      'copy_and: copy and call function': [
        t => {
          const obj = { a: undefined }
          const set = key => value => obj => (obj[key] = value, obj)
          return true
              &&  t.refeq(set('a')('hello')(obj))(obj)
              &&  t.eq   (set('a')('hello')(obj))({ a: 'hello' })
              && !t.refeq(copy_and(set('a')(5))(obj))(obj)
              &&  t.eq   (copy_and(set('a')(5))(obj))({ a: 5 })
              &&  t.eq   (obj)({ a: 'hello' })
        },
      ],
      'copy_apply: copy and apply curried function with args to target': [
        t => {
          const set_ab_c = a => b => c => o => (o[a][b] = c, o)
          const target   = [ {}, { a: false } ]
          const applied  = copy_apply(set_ab_c)([ 1, 'a', true ])(target)
          return true
              && !t.refeq(applied)(target)
              &&  t.refeq(applied[0])(target[0])
              &&  t.refeq(applied[1])(target[1])
              &&  t.eq(applied)([ {}, { a: true } ])
        },
      ],
      'copy_apply0: copy and apply 0-arity function': [
        t => {
          const push5   = a => (a.push(5), a)
          const target  = [ {}, { a: false } ]
          const applied = copy_apply0(push5)(target)
          return true
              && !t.refeq(applied)(target)
              &&  t.refeq(applied[0])(target[0])
              &&  t.refeq(applied[1])(target[1])
              &&  t.eq   ( target)([ {}, { a: false } ])
              &&  t.eq(applied)([ {}, { a: false }, 5 ])
        },
      ],
      'copy_apply1: copy argument and apply 1-arity function': [
        t => {
          const push    = v => a => (a.push(v), a)
          const target  = [ {}, { a: false } ]
          const applied = copy_apply1(push)(123.45)(target)
          return true
              && !t.refeq(applied)(target)
              &&  t.refeq(applied[0])(target[0])
              &&  t.refeq(applied[1])(target[1])
              &&  t.eq   ( target)([ {}, { a: false } ])
              &&  t.eq   (applied)([ {}, { a: false }, 123.45 ])
        },
      ],
      'copy_apply2: copy arguments and apply 2-arity function': [
        t => {
          const method  = m => v => a => (a[m](v), a)
          const target  = [ {}, { a: false } ]
          const applied = copy_apply2(method)('push')(123.45)(target)
          return true
              && !t.refeq(applied)(target)
              &&  t.refeq(applied[0])(target[0])
              &&  t.refeq(applied[1])(target[1])
              &&  t.eq   ( target)([ {}, { a: false } ])
              &&  t.eq   (applied)([ {}, { a: false }, 123.45 ])
        },
      ],
      'copy_apply3: copy arguments and apply 3-arity function': [
        t => {
          const set_ab_c = a => b => c => o => (o[a][b] = c, o)
          const target   = [ {}, { a: false } ]
          const applied  = copy_apply3(set_ab_c)(1)('a')(true)(target)
          return true
              && !t.refeq(applied)(target)
              &&  t.refeq(applied[0])(target[0])
              &&  t.refeq(applied[1])(target[1])
              &&  t.eq(applied)([ {}, { a: true } ])
        },
      ],
    }),
    t => t.suite('short-circuitable looping primitives', {
      'breakloop: break-able loop constructor (not exported)': [
        t => {
          const marker = Symbol(`break`)
          let acc1 = 0
          breakloop({
            marker,
            body   : item => acc1 += item,
          })([ 1, 2, 3 ])
          let acc2 = 0
          breakloop({
            marker,
            body   : item => acc2 >= 10 ? marker : (acc2 += item)
          })([ 5, 5, 5, 5 ])
          return true
              && t.eq(acc1)(1 + 2 + 3)
              && t.eq(acc2)(10)
        },
      ],
      '{fold,over}: perform a fold over an array of values; can break': [
        t => {
          const sum = v => a => a + v
          const break_gt_4 = v => ᐅif(a => a > 4)(_ => ᐅ.break)(sum(v))
          return true
              && t.eq(fold(sum)(0)([ 1, 2, 3 ]))(6)
              && t.eq(over(sum)([ 1, 2, 3 ])(0))(6)
              && t.eq(fold(break_gt_4)(3)([ 1, 2, 3, 4, 5 ]))(6)
              && t.eq(over(break_gt_4)([ 1, 2, 'a', 'b' ])(7))(7)
        },
      ],
      'map: invoke a function on each of an array of values; can break': [
        t => {
          const double = v => v * 2
          const break_gt_2 = ᐅif(v => v > 2)(_ => map.break)(double)
          const break_gt_4 = ᐅif(v => v > 4)(_ => map.break)(double)
          return true
              && t.eq(map(double)([ 1, 2, 3 ]))([ 2, 4, 6 ])
              && t.eq(map(break_gt_4)([ 1, 2, 3 ]))([ 2, 4, 6 ])
              && t.eq(map(break_gt_2)([ 1, 2, 3 ]))([ 2, 4, 3 ])
        },
      ],
    }),
    t => t.suite('arrays', {
      'all: all to6 > 0': [
        t => t.ok(all(v => v > 0)(to6)),
      ],
      'all: not all to6 < 1': [
        t => !t.ok(all(v => v < 1)(to6)),
      ],
      'any: at least one of to6 is even': [
        t => t.ok(any(v => v % 2 == 0)(to6)),
      ],
      'any: none of to6 is divisible by 10': [
        t => !t.ok(any(v => v % 10 == 0)(to6)),
      ],
      'len: len of to6 is 5': [
        t => t.eq(len(to6))(5),
      ],
      'cons: cons [0] to to6 gives [0],1..5': [
        t => t.eq(cons([ 0 ])(to6))([ [ 0 ], 1, 2, 3, 4, 5 ]),
      ],
      'each: no effect': [
        t => t.eq(each(v => v * v)(to6))(to6),
      ],
      'fill: fills an array with a value': [
        t => {
          return true
              && t.eq(fill(5)(to6))([ 5, 5, 5, 5, 5 ])
              && t.eq(to6)([ 1, 2, 3, 4, 5 ])
        },
      ],
      'find: first even of to6 is 2': [
        t => {
          return true
              && t.eq(find(v => v % 2 == 0)(to6))(2)
              && t.eq(find(v => v === 0)([ 0, false ]))(0)
              && t.eq(find(v => v === false)([ 0, false ]))(false)
              && t.eq(find(v => !v)([ 0, false ]))(0)
              && t.eq(find(v => !v)([ 14, true ]))(None)
        },
      ],
      'push: to6 push [6] is 1..5,[6]': [
        t => t.eq(push([ 6 ])(to6))([ 1, 2, 3, 4, 5, [ 6 ] ]),
      ],
      'sort: sort() (default algorithm) of shuffled to6 is to6': [
        t => t.eq(sort()([3, 1, 5, 4, 2]))(to6),
      ],
      'join: joins an array into a string': [
        t => t.eq(join('+')(to6))('1+2+3+4+5'),
      ],
      'index: 3 is index 2 in to6': [
        t => t.eq(index(3)(to6))(2),
      ],
      'index: -1 when not found': [
        t => t.eq(index(123)(to6))(-1),
      ],
      'concat: to6 and 123': [
        t => t.eq(concat(to6)([ 1, 2, 3 ]))([ 1, 2, 3, 4, 5, 1, 2, 3 ]),
      ],
      'append: to6 and 123 (concat, flipped)': [
        t => t.eq(append(to6)([ 1, 2, 3 ]))([ 1, 2, 3, 1, 2, 3, 4, 5 ]),
      ],
      'filter: keeps between 1 and 4': [
        t => t.eq(filter(v => v < 4 && v > 1)(to6))([ 2, 3 ]),
      ],
      'findex: first even of to6 is at index 1': [
        t => t.eq(findex(v =>     v > 10)(to6))(-1),
        t => t.eq(findex(v => v % 2 == 0)(to6))( 1),
      ],
      'reverse: reverse of to6 is 5..1': [
        t => t.eq(reverse(to6))([ 5, 4, 3, 2, 1 ]),
      ],
      'includes: to6 includes 5': [
        t => t.ok(includes(5)(to6)),
      ],
      'includes: to6 does not include 0': [
        t => !t.ok(includes(0)(to6)),
      ],
      'split_at: split an array at an index': [
        t => t.eq(split_at( 2)(to6))([[1, 2],[3, 4, 5]]),
        t => t.eq(split_at(-1)(to6))([[1, 2, 3, 4],[5]]),
        t => t.eq(split_at(-3)(to6))([[1, 2],[3, 4, 5]]),
        t => t.eq(split_at( 0)(to6))([[],[1, 2, 3, 4, 5]]),
        t => t.eq(split_at( 5)(to6))([[1, 2, 3, 4, 5],[]]),
      ],
      'split_on: split an array on a value': [
        t => t.eq(split_on(3)(to6))([[1,2],[3,4,5]]),
        t => t.eq(split_on(5)(to6))([[1,2,3,4],[5]]),
        t => t.eq(split_on(9)(to6))([[1,2,3,4,5],[]]),
      ],
      'resize: resize an array': [
        t => t.eq(resize.mut(3)(to6))([ 1, 2, 3 ]),
        t => t.eq(resize.mut(0)(to6))([]),
        t => t.eq(resize.mut(5)(to6))(to6),
        t => t.ok(throws(_ => resize.mut(-1)(to6))),
        t => {
          const result = [ 1, 2, 3, 4, 5 ]
          result.length += 3
          return t.eq(resize.mut(8)(to6))(result)
        },
      ],
      // slice and slicers
      'slice(0)(0): nothing': [
        t => t.eq(slice(0)(0)(to6))([]),
      ],
      'slice(1)(5): of to6 is 2..5': [
        t => t.eq(slice(1)(5)(to6))([ 2, 3, 4, 5 ]),
      ],
      'slice(0)(3): of to6 is 1..3': [
        t => t.eq(slice(0)(3)(to6))([ 1, 2, 3 ]),
      ],
      'skip(1): of to6 is same as slice(1)(5)': [
        t => t.eq(skip(1)(to6))([ 2, 3, 4, 5 ]),
      ],
      'take: takes array items from front': [
        t => t.eq(take( 3)(to6))([ 1, 2, 3 ]),
        t => t.eq(take( 0)(to6))([]),
        t => t.eq(take(-0)(to6))([ 1, 2, 3, 4, 5 ]),
        t => t.eq(take(10)(to6))([ 1, 2, 3, 4, 5 ]),
      ],
      'rest: same as slice(1)': [
        t => t.eq(rest(to6))([ 2, 3, 4, 5 ]),
      ],
      'drop_end: drops n items from end of array': [
        t => t.eq(drop_end( 0)([ 1, 2, 3 ]))([ 1, 2, 3 ]),
        t => t.eq(drop_end( 2)([ 1, 2, 3 ]))([ 1 ]),
        t => t.eq(drop_end( 5)([ 1, 2, 3 ]))([]),
        t => t.eq(drop_end(-0)([ 1, 2, 3 ]))([ 1, 2, 3 ]),
      ],
      'last: returns the last element of an array': [
        t => t.eq(last([ 1, 2, 3 ]))(3),
        t => t.eq(last([ 1 ]))(1),
        t => t.eq(last([]))(None),
      ],
      'but_last: drop the last element of an array': [
        t => t.eq(but_last([ 1, 2, 3 ]))([ 1, 2 ]),
        t => t.eq(but_last([ 1 ]))([]),
        t => t.eq(but_last([]))([]),
      ],
      // map and mappers
      'offset: mapper: pushes elements in an array forward': [
        t => t.eq(offset(0)([ 1, 2, 3 ]))([ 1, 2, 3 ]),
        t => t.eq(offset(1)([ 1, 2, 3 ]))([ 2, 3, undefined ]),
        t => t.eq(offset(2)([ 1, 2, 3 ]))([ 3, undefined, undefined ]),
        t => t.eq(offset(3)([ 1, 2, 3 ]))([ undefined, undefined, undefined ]),
      ],
      // splice and splicers
      'splice: removes and inserts values from an array': [
        t => t.eq(splice( 0)(0)([ 1, 2, 3 ])([   ]))([ 1, 2, 3    ]),
        t => t.eq(splice( 0)(1)([ 1, 2, 3 ])([ 4 ]))([ 1, 2, 3    ]),
        t => t.eq(splice( 0)(0)([ 1, 2, 3 ])([ 4 ]))([ 1, 2, 3, 4 ]),
        t => t.eq(splice( 1)(0)([ 1, 2, 3 ])([ 4 ]))([ 4, 1, 2, 3 ]),
        t => t.eq(splice(-2)(1)([ 1, 2, 3 ])([ 4, 5, 6 ]))([ 4, 1, 2, 3, 6 ]),
      ],
      'remove: removing 2 from to6 drops index 1': [
        t => t.eq(remove(2)(to6))([ 1, 3, 4, 5 ]),
      ],
      'remdex: removing index 1 from to6 drops 2': [
        t => t.eq(remdex(1)(to6))([ 1, 3, 4, 5 ]),
      ],
      'insert: inserts a value at an index': [
        t => {
          return true
              && t.eq(insert(3)(1)(to6))([ 1, 2, 3, 1, 4, 5 ])
              // Here's a fun FAILING test: sparse arrays are only accidental!
              // && t.eq(insert(3)(0)([1, 2]))([ 1, 2, , 0 ])
        },
      ],
      'replace: replace the element at an index': [
        t => t.eq(replace( 1)(  12)(to6))([ 1, 12,   3, 4, 5    ]),
        t => t.eq(replace( 6)(   4)(to6))([ 1, 2,    3, 4, 5    ]),
        t => t.eq(replace(-1)(true)(to6))([ 1, 2,    3, 4, true ]),
        t => t.eq(replace(-3)('hi')(to6))([ 1, 2, 'hi', 4, 5    ]),
      ],
      'pop: split first/rest of an array': [
        t => t.eq(pop(to6))([ 1, [ 2, 3, 4, 5 ] ]),
      ],
      'array_update: update the value at an index in an array': [
        t => { /* TODO */ },
      ],
      // flatten/flatmap
      'flatten: flattening arbitrarily partitioned to6 is to6': [
        t => {
          return true
              && t.eq(flatten([[1], [2, 3], 4, [5]]))(to6)
              && t.eq(flatten([ 1, [ 2, 3 ], [], [], 4 ]))([ 1, 2, 3, 4 ])
              && t.eq(flatten([[[ 1, 2, 3 ]]]))([[ 1, 2, 3 ]])
        },
      ],
      'flatmap: maps then flattens': [
        t => t.eq(flatmap(v => [ v, v + 5 ])([ 1, 2 ]))([ 1, 6, 2, 7 ]),
      ],
      // interlace/disinterlace
      'interlace: make pairs out of same-length arrays': [
        t => t.eq(interlace([1,2])([`a`,`b`]))([[1,`a`],[2,`b`]]),
      ],
      'disinterlace: make same-length arrays out of pairs': [
        t => t.eq(disinterlace([[1,`a`],[2,`b`]]))([[1,2], [`a`,`b`,]]),
      ],
      // indexed array fns
      'all_indexed': [
        t => { /* TODO */ },
      ],
      'any_indexed': [
        t => { /* TODO */ },
      ],
      'map_indexed': [
        t => { /* TODO */ },
      ],
      'each_indexed': [
        t => { /* TODO */ },
      ],
      'fold_indexed': [
        t => { /* TODO */ },
      ],
      'filter_indexed': [
        t => { /* TODO */ },
      ],
    }),
    t => t.suite(`strings`, {
      'string: stringifies a thing': [
        t => {
          return true
              && t.eq(string({ toString() { return 'hello' } }))('hello')
              && t.eq(string(function f () {}))('function f () {}')
              && t.eq(string(5))('5')
              && t.eq(string([ `a`, `b`, `c`, ]))('a,b,c')
              && t.eq(string(true))('true')
              && t.eq(string(Symbol(`abc`)))('Symbol(abc)')
        },
      ],
      'lowercase: lower-cases a string': [
        t => t.eq(lowercase('aBCdEfChgaksldFS'))('abcdefchgaksldfs'),
      ],
      'uppercase: upper-cases a string': [
        t => t.eq(uppercase('aBCdEfChgaksldFS'))('ABCDEFCHGAKSLDFS'),
      ],
      'string_split: splits a string around a delimiter': [
        t => t.eq(string_split(',')('a,b,c'))(['a', 'b', 'c']),
      ],
    }),
  ])
}
