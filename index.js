/*
 * UTF-8 Mappings
 * μ  : U+03bc
 * ᐅᶠ : U+1405 U+1da0
 */

/*
 * Missing
 *
 *
 * other
 *  px/unpx
 *  wait
 *  attr
 *  relative_xy
 *  immutable
 *  Some
 *  defined
 *
 */

/*
 * Obvious TODOs
 *
 * mutative alternatives for more APIs
 *   - not everything has a logical mutable alternative
 *   - for example, id
 * tests for
 *   - d (descriptor factory)
 *   - internal APIs (mutative)
 *   - define_prop.mut, define_props.mut
 * μ.time.wait, μ.time.every, μ.time.asap
 *   - wait  ⇔ setTimeout
 *   - every ⇔ setInterval
 *   - asap  ⇔ requestAnimationFrame
 */

import d from './d'
import {
  mutative,
  with_mutative,
  derive_mutative,
  define_property,
  define_properties,
} from './mutton'
import * as js from './lynchpin'
import { source, code } from './fungible'

// Re-exports
export { default as d } from './d'
export {
  bind,
  keys,
  string_keys,
  symbol_keys,
  is_enumerable,
  of_properties,
} from './lynchpin'
export {
  define_property,
  define_properties,
} from './mutton'

// general
export const proxy = traps => target => new Proxy(target, traps)
export const None = proxy({
  get (target, prop, recv) {
    // TODO(jordan)?: exclude more well-known symbols?
    if (prop === Symbol.isConcatSpreadable) return target[prop]
    return get(prop)(target)
  }
})(define_properties.mut({
  name : { value: `None` },
  toString : { value () { return this.name }, },
  [Symbol.toPrimitive]: {
    value (hint) {
      if (hint === `string`)
        return this.toString()
      else if (hint === `number`)
        throw new Error(`None is not a number and cannot be used as one`)
      else
        throw new Error(`None cannot be used here`)
    },
  },
  [Symbol.toStringTag]: { value () { return this.toString() } }
})(function () { return None }))

// functions
export const id = v  => v
export const ret   = v  =>    _ => v
export const call  = f  =>    v => f(v)
export const pass  = v  =>    f => f(v)
export const apply = f  => args => fold(pass)(f)(args)
export const and   = fs =>    v => all(pass(v))(fs)
export const or    = fs =>    v => any(pass(v))(fs)
export const fmap  = fs =>    v => map(pass(v))(fs)
export const flip    = f => a => b => f(b)(a)
export const compose = f => g => v => g(f(v))
export const times   = n => f => v => fold(call)(v)(n_of(f)(n))

// utility for hiding some imperative code
export const loop = n => f => { let i = 0; while (i < n) { f(i); i++ } }

// binding and calling methods
export const method_of = obj => name => js.bind(obj)(get(name)(obj))
export const method  = m => args => obj => apply(method_of(obj)(m))(args)
export const method0 = m => method(m)([])
export const method1 = m => a => method(m)([a])
export const method2 = m => a => b => method(m)([a,b])
export const method3 = m => a => b => c => method(m)([a,b,c])

/* Copying Functions
 * =================
 *
 * there are 4 pieces of state to keep in mind when copying functions.
 *
 * 1. closure (lexical) state
 * 2. identity (own) state
 * 3. instance (prototypal) state
 * 4. context (this) state
 *
 * if a copy loses the lexical environment of its closure, undefined
 * errors are going to be introduced when the copy tries to access a
 * member of its (now empty) scope. pure functions are immune to this.
 *
 * ```
 * // example:
 * function monotonic_incrementer () {
 *   let value = 0
 *   return function increment () {
 *     return ++value
 *   }
 * }
 *
 * let next = monotonic_incrementer()
 * let copy_next = copy(next)
 * next()      // ⇒ 1
 * copy_next() // ⇒ ++value ⇒ ++undefined ⇒ NaN
 * ```
 *
 * if a copy loses identity state (that is, if `name`, `toString()`, other
 * implicit properties set by the runtime during function definition
 * change), introspection is crippled, and any form of copy-to-source
 * comparison (not just direct equality comparison) becomes nigh
 * impossible.
 *
 * ```
 * // example:
 * function debug_log_function (f) {
 *   console.log(`${f.name}: ${f.toString()}`)
 * }
 * function add (a, b) { return a + b }
 * debug_log_function(add)
 * // ⇒ logs: "add: function add (a, b) { return a + b }"
 * debug_log_function(copy(add))
 * // ⇒ unknown behavior (implementation and js engine specific)
 * ```
 *
 * if a copy loses instance state (the prototype changes), its inheritance
 * chain is broken, and instanceof checks that should succeed will fail.
 *
 * ```
 * // example:
 * class Rect {
 *   constructor (length, height) {
 *     this.length = length
 *     this.height = height
 *   }
 *   area () {
 *     return this.length * this.height
 *   }
 * }
 *
 * let size5_square = new Rect(5, 5)
 * size5_square.area()                // ⇒ 25
 * size5_square instanceof Rect       // ⇒ true
 * copy(size5_square) instanceof Rect // ⇒ false
 * copy(size5_square).area() // ⇒ TypeError: undefined is not a function
 * ```
 *
 * if a copy loses contextual state (that is, if it is bound to a context
 * using bind() and can no longer be implicitly rebound to a new context),
  * it is no longer usable as, for example, a mixin definition for an
  * object, because its `this` value will not change when its runtime
  * context changes.
 *
 * ```
 * // example:
 * function debug_mixin () {
 *   return {
 *     type  : typeof this,
 *     proto : Object.getPrototypeOf(this),
 *     value : this.valueOf(),
 *   }
 * }
 *
 * const debuggable_C = Object.create(class C { }, {
 *   debug: { value: debug_mixin }
 * })
 * debuggable_C.debug()
 * // ⇒ { type: "object", proto: C.prototype, valueOf: Function {...} }
 *
 * const not_so_debuggable_C = Object.create(class C { }, {
 *   debug: { value: copy(debug_mixin) }
 * })
 * not_so_debuggable_C.debug()
 * // ⇒ { type: "object", proto: Object.prototype, valueOf: {} }
 * ```
 *
 * There is no elegant method of copying functions that can avoid every
 * pitfall. Here are known methods for copying functions, and trade-offs
 * they introduce:
 *
 * 1. create a wrapper function  that calls the source function
 *    - preserves closure state
 *    - loses identity state (but this can be copied separately)
 *    - loses instance state (but can directly set prototype)
 *    - loses contextual state (but can bind context from the wrapper)
 *    - high overhead: every function call now becomes 2+ function calls
 *    - complex: all non-closure state must be manually copied
 *    - flexible: permits pre- and post-call code execution
 * 2. (new Function(`return ${source_function.toString()}`))()
 *    - loses closure state (no way to mitigate)
 *    - preserves identity state (cleanly; re-evaluates the original)
 *    - loses instance state (but can directly set prototype)
 *    - preserves contextual state (the function is not rebound)
 *    - simple: preserves most function state without manual copying
 *    - inefficient: evaluates source, triggering a parse/compile
 *    - problems: closure state cannot be save this way; eval is "evil"
 * 3. rebind the function to a new (empty) context
 *    - preserves closure state
 *    - loses identity state (but this can be mitigated at least partly)
 *    - preserves instance state (afaict)
 *    - loses contextual state (only an explicit rebind has any effect)
 *    - problem: there's no way to save normal contextual state behavior
 *
 * if lexical state and copy efficiency are unimportant, method 2 is
 * superior. if lexical state is important, only methods 1 and 3 are
 * applicable. of the two, method 1 is more hacky, more complex, and yet
 * generally superior, because it is able to preserve the most state.
 * method 3 clobbers contextual state, with no way to restore normal
 * runtime contextual state behavior. if it is known that runtime
 * contextual state behavior is unimportant, then method 3 is acceptable;
 * however, it is only a side effect of function rebinding that the source
 * function is 'copied,' not the intent of function rebinding. while it
 * can generally be relied upon that function rebinding will cause the
 * javascript engine to replicate the source function's behavior
 * (including lexical state), it is purposefully designed to *replace*
 * contextual state, and that's all it has to do.
 *
 * the best method for copying a function is to re-evaluate its
 * definition, then copy the lexical environment from its source.
 * unfortunately, we cannot access the lexical environment of a closure in
 * javascript. mimicking a function (method 1) is not quite the same, and
 * rebinding a function (method 3) is a different operation that happens
 * to copy a function as a byproduct. method 2, which does re-evaluate the
 * function definition, cannot be adapted to copy the source function's
 * lexical environment, making it suitable only for copying pure
 * functions.
 *
 * also worth considering: native runtime functions (whose source is not
 * introspectable, due to its likely not being expressible in javascript
 * in the first place) and/or node-gyp style foreign-functions cannot be
 * copied using function re-evaluation, because the source is not
 * available. but this begs the question: when and why are you copying
 * non-user functions that are not part of your codebase in the first
 * place? why would you copy, for example, Math.cos? or a function from an
 * external library? it should never be seen as acceptable practice to
 * mutate the standard library, or anyone's library for that matter, when
 * extending them.
 *
 * so we are at an impasse. if we were going to expose a single API for
 * copying functions, which trade-offs should it choose?
 */

// arrays
const _offset = o => ᐅeffect(arr => loop(len(arr))(i => arr[i] = arr[i + o]))
const _map    = f => ᐅeffect(arr => loop(len(arr))(i => arr[i] = f(arr[i])))
const _til    = n => ᐅeffect(arr => loop(n)(i => arr[i] = i))
const _push   = v => ᐅeffect(js.push(v))
const _cons   = v => ᐅeffect(js.unshift(v))
const _splice = i => n => vs => ᐅeffect(js.splice(i)(n)(vs))
const _resize = len => ᐅeffect(arr => arr.length = len)
const _slice  = start => end => arr => __slice(start)(end)(len(arr))(arr)
const __slice = s => e => l => apply(__slicepos)(map(__slicewrap(l))([ s, e ]))
const __slicepos  = s => e => ᐅᶠ([ _offset(s), _resize(e - s) ])
const __slicewrap = l => n => n < 0 ? n + l : n
export const each    = f => ᐅeffect(js.each(f)) // NOTE: could mutate...
export const map     = f => js.map(f)
export const find    = f => arr => js.find(f)(arr) || None
export const join    = v => js.join(v)
export const any     = f => js.some(f)
export const sort    = f => ᐅᶠ([ array_copy, js.sort(f) ])
export const all     = f => js.every(f)
export const concat  = a => b => js.concat(a)(b)
export const slice   = i => j => js.slice(i)(j)
export const filter  = f => js.filter(f)
export const index   = v => js.index(v)
export const incl    = v => js.includes(v)
export const findex  = f => js.findex(f)
export const fold    = f => js.fold(f)
export const len     = a => js.len(a)
export const n_of    = x => n => js.fill(x)(/*start*/)(/*end*/)(new Array(n))
export const cons    = v => ᐅᶠ([ array_copy, _cons(v) ])
export const push    = v => ᐅᶠ([ array_copy, _push(v) ])
export const flatten = a => fold(flip(concat))([])(a)
export const flatmap = f => ᐅᶠ([ map(f), flatten ])
export const reverse  = a => ᐅᶠ([ array_copy, js.reverse ])(a)
export const til      = n => ᐅᶠ([ n_of(0), _til(n) ])(n)
export const thru     = n => til(n + 1)
export const splice   = i => n => vs => ᐅᶠ([ array_copy, _splice(i)(n)(vs) ])
export const take     = j => slice(0)(j)
export const drop_end = n => take(-n)
export const skip     = i => arr => ᐅdo([ len, slice(i) ])(arr)
export const rest     = a => skip(1)(a)
export const last     = a => ᐅᶠ([ skip(-1), first ])(a)
export const split_at = n => fmap([ take(n), skip(n) ])
export const split_on = v => arr => ᐅdo([ index(v), split_at ])(arr)
export const first    = arr => get(0)(arr)
export const pop      = arr => fmap([ first, rest ])(arr)
export const array_copy = arr => define.mut(arr)([])

const _delacer = ([ k, v ]) => ([ ks, vs ]) => [ push(k)(ks), push(v)(vs) ]
export const interlace = a => b => map_indexed(i => k => [ k, get(i)(b) ])(a)
export const disinterlace = kvs => fold(_delacer)([[], []])(kvs)

const _indexed = f => g => f((it, ix) => g(ix)(it))
export const all_indexed = f => _indexed(js.every)(f)
export const any_indexed = f => _indexed(js.some)(f)
export const map_indexed = f => _indexed(js.map)(f)
export const each_indexed = f => _indexed(js.each)(f)
export const filter_indexed = f => _indexed(js.filter)(f)

const splicer = derive_mutative(splice)
export const insert = splicer(splice => i => v => splice(i)(0)([v]))
export const remdex = splicer(splice => i => splice(i)(1)())
export const replace = splicer(splice => i => v => splice(i)(1)([v]))

const remdexer = derive_mutative(remdex)
export const remove = remdexer(remdex => v => ᐅdo([ index(v), remdex ]))

// objects & arrays
// NOTE(jordan): `has(...)` is shallow; `in` or Reflect.has would be deep
export const has      = prop  => obj => js.has_own(prop)(obj)
export const get      = prop  => obj => has(prop)(obj) ? obj[prop] : None
export const get_all  = props => fmap(map(get)(props))
export const get_in   = obj => flip(get)(obj)
export const get_all_in = obj => flip(get_all)(obj)
export const get_path = path  => obj => fold(get)(obj)(path)
export const get_path_in = obj => flip(get_path)(obj)

// objects
const _on_str_keys = f => obj => ᐅdo([ js.string_keys, f ])(obj)
const _on_sym_keys = f => obj => ᐅdo([ js.symbol_keys, f ])(obj)
const _str_props   = obj => string_keyed_properties(obj)
const _sym_props   = obj => symbol_keyed_properties(obj)
const _str_entries = obj => string_keyed_entries(obj)
const _sym_entries = obj => symbol_keyed_entries(obj)
const _str_values  = obj => string_keyed_values(obj)
const _sym_values  = obj => symbol_keyed_values(obj)
const _def_prop_pair   = ([ key, desc ]) => define_property.mut(key)(desc)
const _def_entry_pair  = ([ k, v ]) => define_property.mut(k)(d.default({ v }))
const _def_prop_pairs  = pairs => flip(fold(define_property_pair.mut))(pairs)
const _def_entry_pairs = pairs => flip(fold(define_entry_pair.mut))(pairs)
const _from_pairs       = f => pairs => f(pairs)(empty_object())
const _from_prop_pairs  = pairs => _from_pairs(_def_prop_pairs)(pairs)
const _from_entry_pairs = pairs => _from_pairs(_def_entry_pairs)(pairs)
const _combiner = getter => maker => ᐅᶠ([ map(getter), apply(concat), maker ])
const _enumerable_on = o => flip(js.is_enumerable)(o)
const _filter_key_enum = o => filter(ᐅᶠ([ get(0), _enumerable_on(o) ]))
export const is_empty       = obj => len(js.keys(obj)) === 0
export const empty_object   = _   => js.of_properties({})
export const get_descriptor = key => obj => js.get_descriptor(key)(obj) || None
export const get_entry      = key => obj => [ key, get(key)(obj) ]
export const get_property   = key => obj => [ key, get_descriptor(key)(obj) ]
export const pairs_getter   = get =>  ks => obj => map(k => get(k)(obj))(ks)
export const get_entries    = keys => pairs_getter(get_entry)(keys)
export const get_properties = keys => pairs_getter(get_property)(keys)
export const string_keyed_values     = obj => _on_str_keys(get_all)(obj)
export const symbol_keyed_values     = obj => _on_sym_keys(get_all)(obj)
export const string_keyed_entries    = obj => _on_str_keys(get_entries)(obj)
export const symbol_keyed_entries    = obj => _on_sym_keys(get_entries)(obj)
export const string_keyed_properties = obj => _on_str_keys(get_properties)(obj)
export const symbol_keyed_properties = obj => _on_sym_keys(get_properties)(obj)
export const get_both   = g1 => g2 => ᐅᶠ([ fmap([ g1, g2 ]), apply(concat) ])
export const properties = obj => get_both(_str_props)(_sym_props)(obj)
export const entries    = obj => get_both(_str_entries)(_sym_entries)(obj)
export const values     = obj => get_both(_str_values)(_sym_values)(obj)
export const define_property_pair  = mutative(_def_prop_pair)
export const define_entry_pair     = mutative(_def_entry_pair)
export const define_property_pairs = mutative(_def_prop_pairs)
export const define_entry_pairs    = mutative(_def_entry_pairs)
export const from_properties = properties => _from_prop_pairs(properties)
export const from_entries    = entries    => _from_entry_pairs(entries)
export const object_copy    = obj => ᐅᶠ([ properties, from_properties ])(obj)
export const define = mutative(meta => _def_prop_pairs(properties(meta)))
export const merge_entries    = vs => _combiner(entries)(from_entries)(vs)
export const merge_properties = vs => _combiner(properties)(from_properties)(vs)
export const mixin = a => b => merge_properties([ a, b ])
export const extend = extension => flip(mixin)(extension)
export const of_entries = obj => object_copy(obj)
export const map_as = convert => undo => f => ᐅᶠ([ convert, f, undo ])
export const on_properties = f => map_as(properties)(from_properties)(f)
export const on_entries    = f => map_as(entries)(from_entries)(f)
export const map_properties = f => on_properties(map(f))
export const map_entries    = f => on_entries(map(f))
export const filter_properties = f => on_properties(filter(f))
export const filter_entries    = f => on_entries(filter(f))
export const swap = k => v => fmap([ get(k), extend({ [k]: v }) ])
export const update = k => f => ᐅdo([ get(k), v => extend({ [k]: f(v) }) ])
export const update_path = p => f => fold(k => u => update(k)(u))(f)(reverse(p))
export const enumerable_entries = o => ᐅᶠ([ entries, _filter_key_enum(o) ])(o)

// strings
// NOTE(jordan): most array functions also work on strings
export const Str = ''
export const string = obj => has('toString')(obj) ? obj.toString() : `${obj}`
export const lowercase = str => Str.toLowerCase.call(str)
export const uppercase = str => Str.toUpperCase.call(str)
export const string_split = delimiter => str => Str.split.call(str, delimiter)

// pipelining
const _do_folder = target => f => arg => (arg !== None ? f(arg) : f)(target)
export const ᐅᶠ    = fns => val => fold(call)(val)(fns)
export const ᐅdo   = fns => target => fold(_do_folder(target))(None)(fns)
export const ᐅif   = cond => t_fn => f_fn => v => cond(v) ? t_fn(v) : f_fn(v)
export const ᐅwhen = cond => t_fn => ᐅif(cond)(t_fn)(id)
export const ᐅeffect = f => target => (f(target), target)
export const ᐅlog    = v => ᐅeffect(call(console.log))(v)

// (Weak)Maps
// TODO(jordan): make this Map wrapper return immutable instances
export const Map = define.mut({
  // non-mutative native APIs that can be passed through
  has: js.map_has,
  keys: js.map_keys,
  values: js.map_values,
  entries: js.map_entries,
  unsafe_get: js.map_get,
  // mutative APIs that must be wrapped
  set: with_mutative(js.map_set)(k => v => map => js.map_set(k)(v)(new js.Map(map))),
  // extensions
  get: k => ᐅif(Map.has(k))(Map.unsafe_get(k))(ret(None)),
  update: k => fn => map => Map.set(k)(fn(Map.get(k)(map)))(map),
})(it => new js.Map(it))

// 3: depending on at most 3, 2 and 1
// functions
/* TODO(jordan):
 *  memoization
 */

// TODO(jordan): untested
const type        = t => v => typeof v === t
const instance    = C => v => v instanceof C
const object_case = ({ array, object }) => ᐅwhen(type(types.object))(ᐅif(instance(Array))(array)(object))
export const reflex = { type, instance, object_case }

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

// FIXME(jordan): what`s wrong with this polymorphic copy?
// export const copy = object_case({ array: array_copy, object: object_copy })

export function test (suite) {
  const to6 = [ 1, 2, 3, 4, 5 ]
  const just_hi = _ => "hi"
  const sym_a = Symbol(`a`)
  const default_descriptor = value => {
    return {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    }
  }

  return suite(`prettybad/μtil: worse than underscore`, [
    t => t.suite('functions', {
      'id: id(6) is 6':
        t => t.eq(id(6))(6),
      'id: works on objects':
        t => t.eq(id({ a: 5 }))({ a: 5 }),
      'flip: flips args':
        t => t.eq(flip(a => b => a - b)(1)(2))(1),
      'call: calls func':
        t => t.eq(call(id)(1))(1),
      'bind: binds ctx':
        t => t.eq(js.bind({ a: 7 })(function (v) { return this[v] })('a'))(7),
      'compose: composes':
        t => t.eq(compose(x => x + 5)(x => 2 * x)(1))(12),
      'ret: returns':
        t => t.eq(ret(5)())(5),
      'apply: applies function to array of args':
        t => t.eq(apply(function (a) { return b => a + b })([ 1, 2 ]))(3),
      'times: repeats a function a set number of times':
        t => t.eq(times(3)(x => x * 2)(2))(16),
      'and: true if all predicates are true':
        t => t.ok(and([ x => x % 2 === 0, x => x % 3 === 0, x => x < 10 ])(6)),
      'or: true if any predicate is true':
        t => t.ok(or([ x => x + 1 === 3, x => x + 1 === 2 ])(1)),
      'method{1}: calls a named method with argument(s)':
        t => {
          const obj = {
            multiply (value) {
              return mutiplicand => mutiplicand * value
            },
            double (value) {
              return this.multiply(value)(2)
            },
          }

          return t.eq(method(`multiply`)([ 3, 3 ])(obj))(9)
              && t.eq(method(`double`)([ 4 ])(obj))(8)
              && t.eq(method1(`double`)(5)(obj))(10)
        },
      'fmap: runs a series of functions on an object':
        t => t.eq(fmap([ v => v + 1, v => v / 2 ])(4))([ 5, 2 ]),
    }),
    t => t.suite('pipelining', {
      'ᐅᶠ: pipelines functions':
        t => t.eq(ᐅᶠ([ id, x => x + 1 ])(1))(2),
      'ᐅdo: chains together calls on a common target':
        t => t.eq(ᐅdo([ js.keys, get_all ])({ a: 0, b: `c`, d: true }))([ 0, `c`, true ]),
      'ᐅif: inline if':
        t => {
          const approach_10 = ᐅif(v => v < 10)(v => v + 1)(v => v - 1)
          return t.eq(approach_10(5))(6)
              && t.eq(approach_10(12))(11)
        },
      'ᐅwhen: one-armed inline if':
        t => {
          const inc_when_even = ᐅwhen(v => v % 2 === 0)(v => v + 1)
          return t.eq(inc_when_even(2))(3)
              && t.eq(inc_when_even(1))(1)
        },
    }),
    t => t.suite(`objects`, {
      'string_keys: lists string keys':
        t => t.eq(js.string_keys({ [sym_a]: just_hi, a: 4 }))(['a']),
      'symbol_keys: lists symbol keys':
        t => t.eq(js.symbol_keys({ [sym_a]: just_hi, a: 4 }))([sym_a]),
      'keys: lists both string and symbol keys':
        t => t.eq(js.keys({ [sym_a]: just_hi, a: 4 }))(['a', sym_a]),
      'string_keyed_values: lists string-keyed values':
        t => t.eq(string_keyed_values({ [sym_a]: just_hi, a: 4 }))([4]),
      'symbol_keyed_values: lists symbol-keyed values':
        t => t.eq(symbol_keyed_values({ [sym_a]: just_hi, a: 4 }))([ just_hi ]),
      'values: lists both symbol values and non-symbol values':
        t => t.eq(values({ [sym_a]: just_hi, a: 4 }))([ 4, just_hi ]),
      'get_descriptor: gets property descriptor':
        t => t.eq(get_descriptor('a')({ a: 4 }))(default_descriptor(4)),
      'define_properties.mut: mutably sets properties on an object': t => {
        const o = { a: 5 }
        define_properties.mut({ b: { value: 3 } })(o)
        define_properties.mut({ a: { value: o.a + 1, enumerable: false } })(o)
        return t.eq(o.b)(3) && t.eq(o.a)(6) && t.eq(Object.keys(o))([])
      },
      'define_property.mut: mutably sets a single property on an object': t => {
        const o = { a: 1 }
        define_property.mut('b')({ value: 5 })(o)
        define_property.mut('a')({ enumerable: false })(o)
        return t.eq(o.b)(5) && t.eq(o.a)(1) && t.eq(Object.keys(o))([])
      },
      'string_keyed_properties: gets descriptors for non-symbol properties':
        t => {
          return t.eq(string_keyed_properties({ a: 5 }))([
            ['a', default_descriptor(5) ],
          ])
        },
      'symbol_keyed_properties: gets descriptors for symbol properties':
        t => {
          return t.eq(symbol_keyed_properties({ [Symbol.split]: just_hi }))([
            [Symbol.split, default_descriptor(just_hi)],
          ])
        },
      'properties: gets all descriptors':
        t => {
          return t.eq(properties({ a: 5, [Symbol.split]: just_hi }))([
            [ 'a',          default_descriptor(5)       ],
            [ Symbol.split, default_descriptor(just_hi) ],
          ])
        },
      'from_properties: converts [prop, desc] pairs to an object':
        t => t.eq(from_properties([['a', default_descriptor(5)]]))({ a: 5 }),
      'object_copy: (shallowly) clones an object':
        t => t.eq(object_copy({ a: 5 }))({ a: 5 })
          && t.refeq(object_copy({ f: to6 }).f)(to6),
      'mixin: creates a new object combining properties of two source objects':
        t => t.eq(mixin({ a: 4 })({ a: 5 }))({ a: 5 }),
      'get: gets a key/index or None if not present':
        t => t.eq(get(0)([5]))(5) && t.eq(get('a')({}))(None),
      'get_path: gets a path of keys/indices or None if any part of path is not present':
        t => t.eq(get_path([ 'a', 'b', 'c' ])({ 'a': { 'b': { 'c': 5 } } }))(5)
          && t.eq(get_path([ 'a', 'b', 'd' ])({ 'a': { 'b': { 'c': 5 } } }))(None),
      'entries: gets {key,symbol}, value pairs':
        t => t.eq(entries({ a: 5, [Symbol.split]: just_hi }))([['a', 5], [Symbol.split, just_hi]]),
      'from_entries: turns {key,symbol}, value pairs into an object':
        t => t.eq(from_entries([['a', 5], ['b', just_hi]]))({ a: 5, b: just_hi }),
      'swap: swaps the current value of a key for another':
        t => t.eq(swap(`a`)(14)({ a: 5 }))([ 5, { a: 14 } ]),
      'update: replaces a key by a v -> v function':
        t => t.eq(update(`a`)(v => v + 1)({ a: 4 }))({ a: 5 }),
      'update_path: replace a nested key by a v -> v function':
        t => {
          const example = { a: { b: 2 } }
          const inc     = v => v + 1
          const ab      = [ `a`, `b` ]
          return t.eq(update_path(ab)(inc)(example))({ a: { b : 3 } })
        },
      'enumerable_entries: entries, filtered by js.is_enumerable':
        t => {
          const example = js.of_properties({
            a: default_descriptor(5),
            b: { value: 'hidden' },
          })
          return t.eq(enumerable_entries(example))([[ 'a', 5 ]])
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
      'incl: to6 includes 5':
        t => t.ok(incl(5)(to6)),
      'incl: to6 does not include 0':
        t => !t.ok(incl(0)(to6)),
      'index: 3 is index 2 in to6':
        t => t.eq(index(3)(to6))(2),
      'index: -1 when not found':
        t => t.eq(index(123)(to6))(-1),
      'find: first even of to6 is 2':
        t => t.eq(find(v => v % 2 == 0)(to6))(2),
      'findex: first even of to6 is at index 1':
        t => t.eq(findex(v => v % 2 == 0)(to6))(1),
      'join: joins an array into a string':
        t => t.eq(join('+')(to6))('1+2+3+4+5'),
      'slice(0)(0): nothing':
        t => t.eq(slice(0)(0)(to6))([]),
      'slice(1)(): of to6 is 2..5':
        t => t.eq(slice(1)()(to6))([ 2, 3, 4, 5 ]),
      'slice(0)(3): of to6 is 1..3':
        t => t.eq(slice(0)(3)(to6))([ 1, 2, 3 ]),
      'skip(1): of to6 is same as slice(1)()':
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
      'n_of: n_of 0 where n is 5 gives 5 zeroes':
        t => t.eq(n_of(0)(5))([ 0, 0, 0, 0, 0 ]),
      'push: to6 push [6] is 1..5,[6]':
        t => t.eq(push([ 6 ])(to6))([ 1, 2, 3, 4, 5, [ 6 ] ]),
      'flatten: flattening arbitrarily partitioned to6 is to6':
        t => t.eq(flatten([[1], [2, 3], 4, [5]]))(to6)
          && t.eq(flatten([ 1, [ 2, 3 ], [], [], 4 ]))([ 1, 2, 3, 4 ])
          && t.eq(flatten([[ 1, 2, 3 ]]))([ 1, 2, 3 ]),
      'flatmap: maps then flattens':
        t => t.eq(flatmap(v => [ v, v + 5 ])(to6))([ 1, 6, 2, 7, 3, 8, 4, 9, 5, 10 ]),
      'array_copy: s new copy of array':
        t => t.eq(array_copy(to6))(to6) && !t.refeq(array_copy(to6))(to6),
      'reverse: reverse of to6 is 5..1':
        t => t.eq(reverse(to6))([ 5, 4, 3, 2, 1 ]),
      'remove: removing 2 from to6 drops index 1':
        t => t.eq(remove(2)(to6))([ 1, 3, 4, 5 ]),
      'remdex: removing index 1 from to6 drops 2':
        t => t.eq(remdex(1)(to6))([ 1, 3, 4, 5 ]),
      'insert: inserts a value at an index':
        t => t.eq(insert(3)(1)(to6))([ 1, 2, 3, 1, 4, 5 ]),
      'interlace: make pairs out of same-length arrays':
        t => t.eq(interlace([1,2,3])([`a`,`b`,`c`]))([[1,`a`],[2,`b`],[3,`c`]]),
      'disinterlace: make same-length arrays out of pairs':
        t => t.eq(disinterlace([[1,`a`],[2,`b`],[3,`c`]]))([[1,2,3], [`a`,`b`,`c`]]),
      'drop_end: drops n items from end of array':
        t => t.eq(drop_end(2)([ 1, 2, 3 ]))([ 1 ]),
    }),
    t => t.suite(`strings`, {
      'string: stringifies a thing':
        t => t.eq(string({ toString() { return 'hello' } }))('hello')
          && t.eq(string(function f () {}))('function f () {}')
          && t.eq(string(5))('5')
          && t.eq(string([ `a`, `b`, `c`, ]))('a,b,c')
          && t.eq(string(true))('true'),
      'lowercase: lower-cases a string':
        t => t.eq(lowercase('aBCdEfChgaksldFS'))('abcdefchgaksldfs'),
      'uppercase: upper-cases a string':
        t => t.eq(uppercase('aBCdEfChgaksldFS'))('ABCDEFCHGAKSLDFS'),
      'string_split: splits a string around a delimiter':
        t => t.eq(string_split(',')('a,b,c'))(['a', 'b', 'c']),
    }),
    t => t.suite(`None`, {
      'None: perpetuates itself and is None':
      t => {
        return t.eq(None.toString())('None')
            && t.eq(`${None}`)('None')
            && t.eq(None.a.b.c.hi())(None)
            // NOTE(jordan): see definition of None for why these tests make sense.
            && t.eq(concat(None)(5))([ None, 5 ])
            && t.eq(flatten([ id, None, flatten ]))([ id, None, flatten ])
      },
    }),
  ])
}
