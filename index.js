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
 *   - d
 *   - internal APIs (with_mut_alt)
 *   - def.mut, defs.mut
 * less awful lenses
 *   - lens, today, is largely useless
 *   - involves a ton of boilerplate
 *   - doesn't interoperate as neatly as i'd hoped with insert/update APIs
 */

// 0a: descriptor mutation primitives
const _defprops = prop_descs => obj => (Object.defineProperties(obj, prop_descs), obj)
const _defprop  = prop => desc => obj => (Object.defineProperty(obj, prop, desc), obj)
export const def  = _defprop('mut')({ value: _defprop })(Object.create(null))
export const defs = def.mut('mut')({ value: _defprops })(Object.create(null))

// 0b: descriptor mutation affordances
export const own_descs = Object.getOwnPropertyDescriptors
// borrowing shamelessly from d.js: https://www.npmjs.com/package/d
export const d = defs.mut(own_descs({
  /**
   * Internal configuration
   */
  _: {
    unknown_parse: c => d.all_config({}),
    s: {
      c: 'configurable',
      e:   'enumerable',
      w:     'writable',
    },
  },
  /**
   * Parse a string of cew into its descriptor properties
   */
  parse_cew_string: (cew='') => {
    const [ c1, c2, c3 ] = cew.split('')
    return  c1 && c2 && c3 ? { [d._.s[c1]]: true, [d._.s[c2]]: true, [d._.s[c3]]: true }
          : c1 && c2       ? { [d._.s[c1]]: true, [d._.s[c2]]: true }
          : c1             ? { [d._.s[c1]]: true }
          : {}
  },
}))(make_descriptor)
/**
 * Descriptor configuration option shorthands
 */
defs.mut(own_descs({
  all_config : d('cew'),
  no_conf    : d( 'ew'),
  no_write   : d( 'ce'),
  no_iter    : d( 'cw'),
  write_only : d(  'w'),
  iter_only  : d(  'e'),
  conf_only  : d(  'c'),
  no_config  : d(   ''),
}))(d)
/**
 * Straightforward descriptor creation api
 *
 * Usage:
 *   d.all_config({ v: 5 })     ⇒ { configurable: true, enumerable: true, writable: true, value: 5 }
 *   d.no_config({ g: ret(4) }) ⇒ { get: ret(4) }
 *   d('ew')({ v: 3 })          ⇒ { enumerable: true, writable: true, value: 3 }
 *   d('ew')(d.v(3))            ⇒ { enumerable: true, writable: true, value: 3 } (same as above)
 */
function make_descriptor (cew) {
  const parse = typeof cew === 'string' ? d.parse_cew_string : d._.unknown_parse
  if (parse === null) {
    console.error(`descriptor configuration ${cew} is unrecognized!`)
    console.debug(`
      what happens next? μ.d will fall back to 'all_config', the same as a JS object,
      or you can configure it using μ.d._.unknown_parse: unknown_conf_in ⇒ good_conf_out.
    `)
  }
  return ({ v, g, s }) => {
    const conf = parse(cew)
    if (v !== undefined) conf.value = v
    if (g !== undefined) conf.get   = g
    if (s !== undefined) conf.set   = s
    return conf
  }
}

// Utils utils
const with_mut_alt = v => def.mut('mut')(d.no_config({ v }))

// functions
export const id       = v => v
export const partial  = v => f => f(v)
export const call     = f => v => f(v)
export const block    = f => call(f)()
export const flip     = f => a => b => f(b)(a)
export const compose  = f => g => v => g(f(v))
export const ret      = v => _ => v
export const bind     = ctx => f => Function.bind.call(f, ctx)
export const loop     = n => f => { let i = n; while (i--) { f(i) } }
export const apply    = f => args => fold(partial)(f)(args)
export const times    = n => f => v => fold(call)(v)(n_of(f)(n))
export const and      = fs => v => all(f => f(v))(fs)
export const or       = fs => v => any(f => f(v))(fs)
export const on       = v => fold(f => prev => (prev !== None ? f(prev) : f)(v))(None)
export const fmap     = fs => v => map(partial(v))(fs)
export const copy_fn  = fn => bind({})(fn)
const _mimic_fn = fn => defs.mut({
  name     : d.iter_only({ g: _ => fn.name }),
  toString : d.no_config({ v: _ => fn.toString() }),
})
export const mimic_fn = srcfn => destfn => ᐅᶠ([ copy_fn, _mimic_fn(srcfn) ])(destfn)
export const meta_fn  = meta => ᐅᶠ([ copy_fn, defs.mut(own_descs(meta)) ])
// constructing functions from strings (for rotten profit)
const make_let_string  = variable => value => `let ${variable} = ${value}; return ${variable}`
const iife_from_string = source   => (new Function(source))()
export const named     = name     => def => iife_from_string(make_let_string(name)(def.toString()))

// numbers
export const inc = x => x + 1
export const dec = x => x - 1
// NOTE(jordan): without defaulting v to 0: num() ⇒ +undefined ⇒ NaN, which we don't want
export const num = (v=0) => +v

// arrays
export const map     = f => arr => []      .map.call(arr, f)
export const find    = f => arr => []     .find.call(arr, f) || None
export const join    = v => arr => []     .join.call(arr, v)
export const any     = f => arr => []     .some.call(arr, f)
export const sort    = f => arr => []     .sort.call(arr, f)
export const all     = f => arr => []    .every.call(arr, f)
export const concat  = a =>   b => []   .concat.call([], a, b)
export const filter  = f => arr => []   .filter.call(arr, f)
export const each    = f => arr => ([] .forEach.call(arr, f), arr) // NOTE: could mutate...
export const index   = v => arr => []  .indexOf.call(arr, v)
export const incl    = v => arr => [] .includes.call(arr, v)
export const findex  = f => arr => [].findIndex.call(arr, f)
export const slice   = i => j => arr => (instance(Array)(arr) ? [] : "").slice.call(arr, i, j)
export const fold    = f => init => arr => [].reduce.call(arr, (acc, v) => f(v)(acc), init)
export const len     = a => a.length
export const n_of    = x => n => (new Array(n)).fill(x)
export const cons    = v => concat([ v ])
export const push    = v => flip(concat)([ v ])
export const flatten = a => fold(flip(concat))([])(a)
export const flatmap = f => arr => flatten(map(f)(arr))
export const mapix   = f => map((it, ix) => f(ix)(it))
const _fold_def = ([ name, desc ]) => obj => def.mut(name)(desc)(obj)
export const array_copy = arr => fold(_fold_def)([])(descs(arr))
const _reverse = a => [].reverse.call(a)
const _splice  = i => n => vs => arr => ([].splice.apply(arr, concat([ i, n ])(vs||[])), arr)
const _til     = n => a => (loop(n)(i => a[i] = i), a)
export const reverse  = a => ᐅᶠ([ array_copy, _reverse ])(a)
export const til      = n => ᐅᶠ([ n_of(0), _til(n) ])(n)
export const thru     = n => til(inc(n))
export const splice   = with_mut_alt(_splice)(i => n => vs => ᐅᶠ([ array_copy, _splice(i)(n)(vs) ]))
const derivative = of_fn => def => with_mut_alt(def(of_fn.mut))(def(of_fn))
const splicer = def => derivative(splice)(def)
export const insert   = splicer(splice => v => i => splice(i)(0)(v))
export const remdex   = splicer(splice => i => splice(i)(1)())
export const take     = j => slice(0)(j)
export const skip     = i => arr => on(arr)([ len, slice(i) ])
export const rest     = a => skip(1)(a)
export const last     = a => ᐅᶠ([ skip(-1), ᐅif(a => len(a) === 0)(ret(None))(first) ])(a)
export const split_at = n => fmap([ take(n), skip(n) ])
export const split_on = v => arr => on(arr)([ index(v), split_at ])

// objects & arrays
// NOTE(jordan): `has(...)` is shallow; `in` or Reflect.has would be deep (proto traversing)
export const has      = prop  => obj => Object.hasOwnProperty.call(obj, prop)
export const get      = prop  => obj => has(prop)(obj) ? obj[prop] : None
export const get_all  = props => fmap(map(get)(props))

// objects
export const keys          = Object.keys
export const key_values    = Object.values
export const symbols       = Object.getOwnPropertySymbols
export const props         = Reflect.ownKeys
export const symbol_values = obj => on(obj)([ symbols, get_all ])
export const create        = descs => Object.create(null, (descs || {}))
export const get_desc      = prop  => obj => Object.getOwnPropertyDescriptor(obj, prop)
export const key_descs     = obj => ᐅᶠ([ own_descs, Object.entries ])(obj)
export const symbol_descs  = obj => ᐅᶠ([ fmap([ o => s => [ s, get_desc(s)(o) ], symbols ]), apply(map) ])(obj)
export const descs         = obj => ᐅᶠ([ fmap([ key_descs, symbol_descs ]), apply(concat) ])(obj)
export const from_descs    = descs => fold(([p, d]) => def.mut(p)(d))(create())(descs)
export const object        = obj => ᐅᶠ([ descs, from_descs ])(obj)
export const extend        = a => b => def_meta(a)(b)//ᐅᶠ([ map(descs), apply(concat), from_descs ])([ a, b ])
export const mixin         = obj => flip(extend)(obj)
export const to_kvs        = obj => ᐅᶠ([ descs, map(([ prop, desc ]) => [ prop, desc.value ]) ])(obj)
export const from_kvs      = kvs => ᐅᶠ([ map(([ prop, value ]) => [ prop, d.all_config({ v: value }) ]), from_descs ])(kvs)

// strings
// NOTE(jordan): most array functions also work on strings
export const quote  = str => `"${str}"`
export const string = obj => has('toString')(obj) ? obj.toString() : `${obj}`

// pipelining
export const ᐅᶠ    =  ops =>  val => fold(call)(val)(ops)
export const ᐅif   = cond => t_fn => f_fn => val => cond(val) ? t_fn(val) : f_fn(val)
export const ᐅwhen = cond => t_fn => ᐅif(cond)(t_fn)(id)

// general
export const proxy = traps => target => new Proxy(target, traps)
export const None  = proxy({
  get (target, prop, recv) {
    const prop_in  = f => v => incl(prop)(f(v))
    const has_prop = prop_in(props)
    /* EXPLANATION(jordan): Yeah... wtf wrt this next line. Lets None be push/concat/etc.-ed without
     * disappearing in the result array. This is an issue because of the way Symbols were designed
     * for backwards compatability -- basically, returning undefined is "good" and counts as the
     * same as if the Symbol (which is a required behavior and so has to be, in some sense, defined)
     * were set, and set to "false". This is because undefined is falsy. Fucking falsyness. Falsy
     * fucking falsy. Ugh. May be worth investigating how and why [].concat refers to
     * isConcatSpreadable in the first place; is this situation a single special case, or one of
     * many?
     */
    // TODO(jordan)?: exclude more well-known symbols?
    if (prop === Symbol.isConcatSpreadable) return target[prop]
    /* NOTE(jordan): ironically, valueOf works because its result is None anyway, but in general
     * prototype dispatch on properties is borked by this. We may want to consider if this causes
     * problems, and if so when/how...
     */
    return ᐅif(has_prop)(get(prop))(ret(None))(target)
  }
})(meta_fn({
  toString () { return 'None' },
  [Symbol.toPrimitive] (hint) {
    if (hint === 'string') return 'None'
    if (hint === 'number') throw new Error('None is not a number and cannot be used as one')
    throw new Error('None is not a value and cannot be used here')
  }
})(_ => None))

// 3: depending on at most 3, 2 and 1
// functions
/* TODO(jordan):
 *  memoization
 */


export const not = t => v => !t(v)
export const prop_exclude = a => b => ᐅᶠ([ filter(not(flip(has)(b))) ])(props(a))
// const copy_prop_as_meta_from = a => prop => obj => def_meta({ [prop]: get(prop)(a) })(obj)
// export const mixin = a => b => fold(copy_prop_as_meta_from(a))(copy(b))(prop_exclude(a)(b))

// TODO(jordan): untested
export const first    = arr => get(0)(arr)
export const pop      = arr => fmap([ first, rest ])(arr)
export const get_path = path => obj => fold(get)(obj)(path)

// GOAL(jordan): update functions:
// update_path :: path   -> updater -> obj -> obj; updater is a ᐅdropn of the update arity / number of items you want
// update_walk :: walker -> updater -> obj -> obj; similar to path, but more choice: walker outlines many paths
// Examples: update_path([ 0, 0 ])(inc)([ [ 1 ] ]) => [ [ 2 ] ]
//           update_path([ 'items', 3, 'size' ])(sz => 2*sz)({ items: [ {}, {}, { name: 'thing', size: 1 } ] })... you
//            get the idea.
//          update_path(path)(updater) === update_walk(drill(path))(surface(updater))
//          in order to do more interesting things, we need a form of ᐅdrop that doesn't necessarily consume all the
//          results; ᐅdrop should be renamed ᐅconsume, and ᐅdrop should mean "end up with a lens". You can end the lens
//          by just taking the first value; I guess that's ᐅextract or something.
const type        = t => v => typeof v === t
const instance    = C => v => v instanceof C
const object_case = ({ array: a, object: o }) => ᐅwhen(type('object'))(ᐅif(instance(Array))(a)(o))
export const reflex = { type, instance, object_case }

export const object_copy = object
export const copy = object_case({ array: array_copy, object: object_copy })

// FIXME(jordan): these should take v => v functions...
const update_array  = i => v => splice(i)(1)([ v ])
const update_object = k => v => extend({ [k]: v })
export const update = k => v => object_case({ array: update_array(k)(v), object: update_object(k)(v) })

export const trace = adder => tracker => ᐅᶠ([ fmap([ adder, tracker ]), apply(cons) ])

const update_tracker = k => ([ o, fill_hole ]) => (v => fill_hole(update(k)(v)(o)))
export const trace_update = k => trace(ᐅᶠ([ first, get(k) ]))(update_tracker(k))
export const lens = path => object => fold(trace_update)([ object, id ])(path)

// arrays
const split_pair = fmap([ get(0), get(1) ])
const _delacer   = ([ a, b ]) => fmap([ ᐅᶠ([ get(0), cons(a) ]), ᐅᶠ([ get(1), cons(b) ]) ])
export const lace     = a => b => ᐅᶠ([ len, til, fmap([ flip(get)(a), flip(get)(b) ]) ])(a)
export const delace   = fold(_delacer)([[], []])
export const remove   = v => arr => on(arr)([ index(v), remdex ])
export const def_meta = meta => ᐅᶠ([ copy, defs.mut(own_descs(meta)) ])

// ...? special for sisyphus
export const simple = v => v === null || incl(typeof v)([ 'function', 'number', 'string', 'boolean', 'undefined' ])

export function test (suite) {
  const to6 = [ 1, 2, 3, 4, 5 ]
  const just_hi = _ => "hi"

  return suite(`prettybad/μtil: worse than underscore`, [
    t => t.suite('functions', {
      'flip: flips args':
        t => t.eq(flip(a => b => a - b)(1)(2))(1),
      'id: id(6) is 6':
        t => t.eq(id(6))(6),
      'id: works on objects':
        t => t.eq(id({ a: 5 }))({ a: 5 }),
      'call: calls func':
        t => t.eq(call(id)(1))(1),
      'bind: binds ctx':
        t => t.eq(bind({ a: 7 })(function (v) { return this[v] })('a'))(7),
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
      'copy_fn: copies a function':
        t => t.eq(copy_fn(id)(id)) && !t.refeq(copy_fn(id))(id) && t.eq(copy_fn(id)(5))(id(5)),
      'mimic_fn: copies a function, keeping its name and toString':
        t => {
          const fn = x => x + 1
          const id = x => x
          const mimic = mimic_fn(id)(fn)
          return t.eq(mimic.name)(id.name)
              && t.eq(mimic.toString())(id.toString())
              && t.eq(mimic('hi'))(id('hi') + 1)
              && !t.refeq(mimic)(id)
              && !t.refeq(mimic)(fn)
        },
      'meta_fn: defines hidden properties on a copy of a function':
        t => {
          const fn = _ => 5
          const mf = meta_fn({ a: fn() })(fn)
          return t.eq(mf())(fn())
              && t.eq(mf.a)(fn())
              && !t.refeq(mf)(fn)
        },
      'named: names a function':
        t => t.eq(named('hello')(v => `hello, ${v}`).name)('hello'),
    }),
    t => t.suite('pipelining', {
      'ᐅᶠ: pipelines functions':
        t => t.eq(ᐅᶠ([ id, inc ])(1))(2),
      'ᐅif: inline if':
        t => t.eq(ᐅif(id)(_ => 5)(_ => 6)(true))(5) && t.eq(ᐅif(id)(_ => 5)(_ => 6)(false))(6),
      'ᐅwhen: one-armed inline if':
        t => t.eq(ᐅwhen(v => v % 2 === 0)(_ => 'even')(2))('even')
          && t.eq(ᐅwhen(v => v % 2 === 0)(_ => 'even')(1))(1),
    }),
    t => t.suite('numbers', {
      'inc: adds 1':
        t => t.eq(inc(1))(2),
      'dec: subtracts 1':
        t => t.eq(dec(5))(4),
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
          && t.eq(flatten([ 1, [ 2, 3 ], [], [], 4 ]))([ 1, 2, 3, 4 ]),
      'flatmap: maps then flattens':
        t => t.eq(flatmap(v => [ v, v + 5 ])(to6))([ 1, 6, 2, 7, 3, 8, 4, 9, 5, 10 ]),
      'array_copy: creates new copy of array':
        t => t.eq(array_copy(to6))(to6) && !t.refeq(array_copy(to6))(to6),
      'reverse: reverse of to6 is 5..1':
        t => t.eq(reverse(to6))([ 5, 4, 3, 2, 1 ]),
      'remove: removing 2 from to6 drops index 1':
        t => t.eq(remove(2)(to6))([ 1, 3, 4, 5 ]),
      'remdex: removing index 1 from to6 drops 2':
        t => t.eq(remdex(1)(to6))([ 1, 3, 4, 5 ]),
      // 'split: splits on delimeter':
      //   t => t.eq(split(',')('1,2,3,4,5'))(map(v => '' + v)(to6)),
    }),
    t => t.suite(`objects`, {
      'symbols: lists symbols':
        t => t.eq(symbols({ [Symbol.split]: just_hi, a: 4 }))([Symbol.split]),
      'keys: lists non-symbol keys':
        t => t.eq(keys({ [Symbol.split]: just_hi, a: 4 }))(['a']),
      'props: lists both symbols and non-symbol keys':
        t => t.eq(props({ [Symbol.split]: just_hi, a: 4 }))(['a', Symbol.split]),
      'key_values: lists non-symbol values':
        t => t.eq(key_values({ [Symbol.split]: just_hi, a: 4 }))([4]),
      'symbol_values: lists symbol values':
        t => t.eq(symbol_values({ [Symbol.split]: just_hi, a: 4 }))([ just_hi ]),
      // TODO
      // 'values: lists both symbol values and non-symbol values':
      //   t => t.eq(values({ [Symbol.split]: just_hi, a: 4 }))([ just_hi, 4 ]),
      'get_desc: gets property descriptor':
        t => t.eq(get_desc('a')({ a: 4 }))({ value: 4, writable: true, enumerable: true, configurable: true }),
      'create: creates null-prototype empty object':
        t => t.eq(create())(Object.create(null)),
      'defs.mut: mutably sets properties on an object': t => {
        const o = { a: 5 }
        defs.mut({ b: { value: 3 } })(o)
        defs.mut({ a: { value: o.a + 1, enumerable: false } })(o)
        return t.eq(o.b)(3) && t.eq(o.a)(6) && t.eq(Object.keys(o))([])
      },
      'def.mut: mutably sets a single property on an object': t => {
        const o = { a: 1 }
        def.mut('b')({ value: 5 })(o)
        def.mut('a')({ enumerable: false })(o)
        return t.eq(o.b)(5) && t.eq(o.a)(1) && t.eq(Object.keys(o))([])
      },
      'key_descs: gets descriptors for non-symbol properties':
        t => t.eq(key_descs({ a: 5 }))([['a', { value: 5, writable: true, enumerable: true, configurable: true }]]),
      'symbol_descs: gets descriptors for symbol properties':
        t => t.eq(symbol_descs({ [Symbol.split]: just_hi }))([[Symbol.split, { value: just_hi, writable: true, enumerable: true, configurable: true }]]),
      'descs: gets all descriptors':
        t => t.eq(descs({ a: 5, [Symbol.split]: just_hi }))([['a', { value: 5, writable: true, enumerable: true, configurable: true }], [Symbol.split, { value: just_hi, writable: true, enumerable: true, configurable: true }]]),
      'from_descs: converts [prop, desc] pairs to an object':
        t => t.eq(from_descs([['a', { configurable: true, writable: true, enumerable: true, value: 5 }]]))({ a: 5 }),
      'object: (shallowly) clones an object':
        t => t.eq(object({ a: 5 }))({ a: 5 }) && t.refeq(object({ f: to6 }).f)(to6),
      'mixin: creates a new object combining properties of two source objects':
        t => t.eq(mixin({ a: 4 })({ a: 5 }))({ a: 5 }),
      'get: gets a key/index or None if not present':
        t => t.eq(get(0)([5]))(5) && t.eq(get('a')({}))(None),
      'get_path: gets a path of keys/indices or None if any part of path is not present':
        t => t.eq(get_path([ 'a', 'b', 'c' ])({ 'a': { 'b': { 'c': 5 } } }))(5)
          && t.eq(get_path([ 'a', 'b', 'd' ])({ 'a': { 'b': { 'c': 5 } } }))(None),
      'to_kvs: gets {key,symbol}, value pairs':
        t => t.eq(to_kvs({ a: 5, [Symbol.split]: just_hi }))([['a', 5], [Symbol.split, just_hi]]),
      'from_kvs: turns {key,symbol}, value pairs into an object':
        t => t.eq(from_kvs([['a', 5], ['b', just_hi]]))({ a: 5, b: just_hi }),
    }),
    t => t.suite(`strings`, {
      'split: splits a string around a delimiter':
        t => t.eq(split_on(',')('a,b,c'))(['a', 'b', 'c']),
      'quote: surrounds a string in quotes':
        t => t.eq(quote('s'))('"s"'),
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
