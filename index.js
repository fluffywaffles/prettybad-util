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

// functions pt. 1
export const flip    = f => a => b => f(b)(a)
export const id      = v => v
export const call    = v => f => f(v)
export const bind    = ctx => f => f.bind(ctx)
export const compose = f => g => v => g(f(v))
export const noop    = _ => { return }
export const ret     = v => _ => v

// numbers
export const inc = x => x + 1
export const dec = x => x - 1

// arrays pt. 1
// QUESTION(jordan): each could mutate. Copy before run?
export const each    = f => arr => ([].forEach.call(arr, f), arr)
export const map     = f => arr => [].map.call(arr, f)
export const filter  = f => arr => [].filter.call(arr, f)
export const concat  = a => b   => [].concat.call([], a, b)
export const all     = f => arr => [].every.call(arr, f)
export const any     = f => arr => [].some.call(arr, f)
export const sort    = f => arr => [].sort.call(arr, f)
export const incl    = v => arr => [].includes.call(arr, v)
export const index   = v => arr => [].indexOf.call(arr, v)
export const find    = f => arr => [].find.call(arr, f)
export const findex  = f => arr => [].findIndex.call(arr, f)
export const join    = v => arr => [].join.call(arr, v)
export const slice   = i => j => arr => [].slice.call(arr, i, j)
export const skip    = i => slice(i)()
export const take    = j => slice()(j)
export const rest    = skip(1)
export const fold    = f => init => arr => [].reduce.call(arr, (acc, v) => f(acc)(v), init)
export const cons    = v => concat([ v ])
export const len     = arr => arr.length
export const n_of    = x => n => (new Array(n)).fill(x)
export const push    = v => flip(concat)([ v ])
export const flatten = fold(concat)([])
export const flatmap = f => arr => flatten(map(f)(arr))
export const array_copy = slice()()

// pipelining
export const ᐅᶠ    = flip(fold(call))
export const ᐅif   = cond => t_fn => f_fn => val => cond(val) ? t_fn(val) : f_fn(val)
export const ᐅwhen = cond => t_fn => ᐅif(cond)(t_fn)(id)
export const ᐅlog  = v => (console.log(v), v)

// arrays pt. 2
export const reverse  = ᐅᶠ([ array_copy, a => [].reverse.call(a) ])

// functions pt. 2
export const apply = (f, ctx=f) => args => fold(f => v => f(v))(bind(ctx)(f))(args)
export const times = n => f => flip(fold(call))(n_of(f)(n))
export const and   = fs => v => all(f => f(v))(fs)
export const or    = fs => v => any(f => f(v))(fs)

// pipelining: accumulators pt. 1
// TODO(jordan): today: poor man's lenses; tomorrow: lens library?
export const ᐅlift  = f => init => [ init, f(init) ]
export const ᐅpile  = f => ([ init, ...vs ]) => [ init, f(init), ...vs ]
export const ᐅdrop  = f => ᐅᶠ([ reverse, apply(f) ])
export const ᐅdropn = n => f => ᐅᶠ([ reverse, slice(0)(n), apply(f) ])
export const ᐅdrop2 = ᐅdropn(2)

// objects pt. 1
const _get_descs = Object.getOwnPropertyDescriptors
const _defprops  = Object.defineProperties
const _defprop   = Object.defineProperty
export const symbols       = Object.getOwnPropertySymbols
export const keys          = ᐅᶠ([ _get_descs, Object.keys ])
export const props         = ᐅᶠ([ ᐅlift(keys), ᐅpile(symbols), ᐅdrop2(concat) ])
export const key_values    = Object.values
export const symbol_values = ᐅᶠ([ ᐅlift(symbols), ᐅdrop(ss => obj => map(s => obj[s])(ss)) ])
export const freeze        = Object.freeze
export const get_desc      = prop => obj => Object.getOwnPropertyDescriptor(obj, prop)
export const create        = props => Object.create(null, _get_descs(props || {}))
export const def_props     = { mut: props => obj => _defprops(obj, props) }
export const def_prop      = { mut: prop => desc => obj => (_defprop(obj, prop, desc), obj) }
// NOTE(jordan): super curious. If we drop the kvs params here, things get... wrong. Why?
export const prop_descs    = ᐅᶠ([ _get_descs, Object.entries ])
export const symbol_descs  = ᐅᶠ([ ᐅlift(symbols), ᐅdrop(syms => obj => map(s => [ s, get_desc(s)(obj) ])(syms)) ])
export const descs         = ᐅᶠ([ ᐅlift(prop_descs), ᐅpile(symbol_descs), ᐅdrop2(concat) ])
export const from_descs    = descs => fold(o => ([p, d]) => def_prop.mut(p)(d)(o))(create())(descs)
export const object_clone  = ᐅᶠ([ descs, from_descs ])
export const mixin         = a => b => ᐅᶠ([ map(descs), apply(concat), from_descs ])([ a, b ])
export const build         = fold(mixin)(create())

// functions pt. 3
const _mimic = f => def_props.mut({
  name: { configurable: false, enumerable: false, get () { return f.name } },
  toString: { value () { return f.toString() } },
})
export const copy_fn  = bind({})
export const mimic_fn = srcfn => destfn => ᐅᶠ([ copy_fn, _mimic(srcfn) ])(destfn)
export const meta_fn  = meta  => ᐅᶠ([ copy_fn, def_props.mut(_get_descs(meta)) ])
export const named    = name  => meta_fn({ name })
/* TODO(jordan):
 *  memoization
 */

// strings
export const split = delim => str => str.split(delim)
export const quote = str => `"${str}"`

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
})(function () { return None }))

// objects pt. 2
export const get = prop => obj => prop in obj ? obj[prop] : None

// arrays pt. 3
const split_pair = arr => map()([ get(0), get(1) ])
const _delacer   = arr => ([ a, b ]) => [ cons(a)(get(0)(arr)), cons(b)(get(1)(arr)) ]
export const first    = get(0)
export const til      = ᐅᶠ([ n_of(0), each((_, i, arr) => arr[i] = i) ])
export const upto     = ᐅᶠ([ inc, til ])
export const lace     = a => b => ᐅᶠ([ len, til, map(i => [ get(i)(a), get(i)(b) ]) ])(a)
export const delace   = fold(_delacer)([[], []])
export const splice   = i => n => vs => arr => ([].splice.apply(arr, concat([ i, n ])(vs)), arr)
export const insert   = v => i => ᐅᶠ([ array_copy, splice(i)(0)(v) ])
export const remdex   = i => ᐅᶠ([ array_copy, splice(i)(1)() ])
export const remove   = v => arr => ᐅᶠ([ arr_copy, ᐅlift(index(v)), ᐅdrop(remdex) ])
export const meta_arr = defs => ᐅᶠ([ array_copy, def_props.mut(_get_descs(defs)) ])

// ...? special for sisyphus
export const simple = v => v === null || incl(typeof v)([ 'function', 'number', 'string', 'boolean', 'undefined' ])

export function test (suite) {
  const to6 = [ 1, 2, 3, 4, 5 ]
  const just_hi = _ => "hi"

  return suite('μtil: micro utility library', [
    t => t.suite('functions', {
      'flip: flips args':
        t => t.eq(flip(a => b => a - b)(1)(2))(1),
      'id: id(6) is 6':
        t => t.eq(id(6))(6),
      'id: works on objects':
        t => t.eq(id({ a: 5 }))({ a: 5 }),
      'call: calls func':
        t => t.eq(call(1)(id))(1),
      'bind: binds ctx':
        t => t.eq(bind({ a: 7 })(function (v) { return this[v] })('a'))(7),
      'compose: composes':
        t => t.eq(compose(x => x + 5)(x => 2 * x)(1))(12),
      'noop: is a no-op':
        t => t.eq(noop())(undefined),
      'ret: returns':
        t => t.eq(ret(5)())(5),
    }),
    t => t.suite('numbers', {
      'inc: adds 1':
        t => t.eq(inc(1))(2),
      'dec: subtracts 1':
        t => t.eq(dec(5))(4),
    }),
    t => t.suite('arrays pt. 1', {
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
      'slice()(): copy (same as array_copy)':
        t => t.eq(slice()()(to6))([ 1, 2, 3, 4, 5 ]),
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
        t => t.eq(fold(acc => v => acc + v)(0)(to6))(15),
      'cons: cons [0] to to6 gives [0],1..5':
        t => t.eq(cons([ 0 ])(to6))([ [ 0 ], 1, 2, 3, 4, 5 ]),
      'len: len of to6 is 5':
        t => t.eq(len(to6))(5),
      'n_of: n_of 0 where n is 5 gives 5 zeroes':
        t => t.eq(n_of(0)(5))([ 0, 0, 0, 0, 0 ]),
      'push: to6 push [6] is 1..5,[6]':
        t => t.eq(push([ 6 ])(to6))([ 1, 2, 3, 4, 5, [ 6 ] ]),
      'flatten: flattening arbitrarily partitioned to6 is to6':
        t => t.eq(flatten([[1], [2, 3], 4, [5]]))(to6),
      'flatmap: maps then flattens':
        t => t.eq(flatmap(v => [ v, v + 5 ])(to6))([ 1, 6, 2, 7, 3, 8, 4, 9, 5, 10 ]),
      'array_copy: creates new copy of array':
        t => t.eq(array_copy(to6))(to6) && !t.refeq(array_copy(to6))(to6),
    }),
    t => t.suite('arrays pt. 2', {
      'reverse: reverse of to6 is 5..1':
        t => t.eq(reverse(to6))([ 5, 4, 3, 2, 1 ]),
      // 'cont: appends values to carried':
      //   t => t.todo(),
      // 'remove: removing 2 from to6 drops index 1':
      //   t => t.eq(remove(2)(to6))([ 1, 3, 4, 5 ]),
      // 'remdex: removing index 1 from to6 drops 2':
      //   t => t.eq(remdex(1)(to6))([ 1, 3, 4, 5 ]),
      // 'split: splits on delimeter':
      //   t => t.eq(split(',')('1,2,3,4,5'))(map(v => '' + v)(to6)),
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
    t => t.suite('functions pt. 2', {
      'apply: binds context and takes args':
        t => t.eq(apply(function (a) { return b => this.a + a + b }, { a: 7 })([ 1, 2 ]))(10),
      'times: repeats a function a set number of times':
        t => t.eq(times(3)(x => x * 2)(2))(16),
      'and: true if all predicates are true':
        t => t.ok(and([ x => x % 2 === 0, x => x % 3 === 0, x => x < 10 ])(6)),
      'or: true if any predicate is true':
        t => t.ok(or([ x => x + 1 === 3, x => x + 1 === 2 ])(1)),
    }),
    t => t.suite('pipelining: accumulators pt. 1', {
      'ᐅlift: carries along original value':
        t => t.eq(ᐅlift(a => a[0])(to6))([ to6, 1 ]),
      'ᐅdrop: applies a function to all the carried values':
        t => t.eq(ᐅᶠ([ ᐅlift(a => a[1]), ᐅdrop(push) ])(to6))([ 1, 2, 3, 4, 5, 2 ]),
      'ᐅlift & ᐅdrop: cancel out':
        t => t.eq(ᐅᶠ([ ᐅlift(a => a[0]), ᐅdrop(v => arr => arr) ])(to6))(to6),
    }),
    t => t.suite(`objects pt. 1`, {
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
      'freeze: freezes object': t => {
        const o = { a: 5, b: "hi" }
        freeze(o)
        try {
          o.c = 3
          return false
        } catch (e) {
          return e instanceof TypeError && e.message.startsWith('Cannot add property')
        }
      },
      'get_desc: gets property descriptor':
        t => t.eq(get_desc('a')({ a: 4 }))({ value: 4, writable: true, enumerable: true, configurable: true }),
      'create: creates null-prototype empty object':
        t => t.eq(create())(Object.create(null)),
      'def_props.mut: mutably sets properties on an object': t => {
        const o = { a: 5 }
        def_props.mut({ b: { value: 3 } })(o)
        def_props.mut({ a: { value: o.a + 1, enumerable: false } })(o)
        return t.eq(o.b)(3) && t.eq(o.a)(6) && t.eq(Object.keys(o))([])
      },
      'def_prop.mut: mutably sets a single property on an object': t => {
        const o = { a: 1 }
        def_prop.mut('b')({ value: 5 })(o)
        def_prop.mut('a')({ enumerable: false })(o)
        return t.eq(o.b)(5) && t.eq(o.a)(1) && t.eq(Object.keys(o))([])
      },
      'prop_descs: gets descriptors for non-symbol properties':
        t => t.eq(prop_descs({ a: 5 }))([['a', { value: 5, writable: true, enumerable: true, configurable: true }]]),
      'symbol_descs: gets descriptors for symbol properties':
        t => t.eq(symbol_descs({ [Symbol.split]: just_hi }))([[Symbol.split, { value: just_hi, writable: true, enumerable: true, configurable: true }]]),
      'descs: gets all descriptors':
        t => t.eq(descs({ a: 5, [Symbol.split]: just_hi }))([['a', { value: 5, writable: true, enumerable: true, configurable: true }], [Symbol.split, { value: just_hi, writable: true, enumerable: true, configurable: true }]]),
      'from_descs: converts [prop, desc] pairs to an object':
        t => t.eq(from_descs([['a', { configurable: true, writable: true, enumerable: true, value: 5 }]]))({ a: 5 }),
      'object_clone: (shallowly) clones an object':
        t => t.eq(object_clone({ a: 5 }))({ a: 5 }) && t.refeq(object_clone({ f: to6 }).f)(to6),
      'mixin: creates a new object combining properties of two source objects':
        t => t.eq(mixin({ a: 4 })({ a: 5 }))({ a: 5 }),
      'build: combines an array of objects':
        t => t.eq(build([{ a: 5 }, { a: 4 }, { a: 3, b: 2 }]))({ a: 3, b: 2 }),
    }),
    t => t.suite('functions pt. 3', {
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
    t => t.suite(`strings`, {
      'split: splits a string around a delimiter':
        t => t.eq(split(',')('a,b,c'))(['a', 'b', 'c']),
      'quote: surrounds a string in quotes':
        t => t.eq(quote('s'))('"s"'),
    }),
    t => t.suite(`None`, {
      'None: perpetuates itself and is None':
      t => {
        return t.eq(None.toString())('None')
            && t.eq(`${None}`)('None')
            && t.eq(None.a.b.c.hi())(None)
      },
    }),
  ])
}

import sisyphus, { stateful } from '@sisyphus/sisyphus'
test(sisyphus(stateful))
