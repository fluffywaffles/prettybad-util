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
 *  proxy
 *  Some/None
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
export const ᐅcarry   = f => init => [ init, f(init) ]
export const ᐅcont    = f => ([ init, ...vs ]) => [ init, f(init), ...vs ]
export const ᐅuncarry = f => ᐅᶠ([ reverse, apply(f) ])

// objects pt. 1
const _get_descs = Object.getOwnPropertyDescriptors
const _defprops  = Object.defineProperties
const _defprop   = Object.defineProperty
export const symbols      = Object.getOwnPropertySymbols
export const keys         = Object.keys
export const values       = Object.values
export const to_kvs       = Object.entries
export const freeze       = Object.freeze
export const get_desc     = prop => obj => Object.getOwnPropertyDescriptor(obj, prop)
export const create       = props => Object.create(null, props)
export const def_props    = { mut: props => obj => _defprops(objs, props) }
export const def_prop     = { mut: prop => desc => obj => (_defprop(obj, prop, desc), obj) }
export const from_kvs     = fold(o => ([k, v]) => def_prop.mut(k)(v)(o))(create())
export const prop_descs   = ᐅᶠ([ _get_descs, to_kvs ])
export const symbol_descs = ᐅᶠ([ ᐅcarry(symbols), ᐅuncarry(syms => obj => map(flip(get_desc)(obj))(syms)) ])
export const descs        = ᐅᶠ([ ᐅcarry(prop_descs), ᐅuncarry(concat) ])
export const object_clone = ᐅᶠ([ descs, from_kvs ])
export const mixin        = a => b => ᐅᶠ([ map(descs), apply(concat), from_kvs ])([ a, b ])
export const build        = fold(mixin)(create())

// functions pt. 3
const _mimic = f => flip(mixin)({
  get name () { return f.name },
  toString () { return f.toString() },
})
export const copy_fn  = bind({})
export const mimic_fn = srcfn => ᐅᶠ([ copy_fn, _mimic(srcfn) ])
export const meta_fn  = meta  => ᐅᶠ([ copy_fn, def_props.mut(meta) ])
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
    const has_prop = or([ prop_in(keys), prop_in(symbols) ])
    return ᐅif(has_prop)(get(prop))(ret(None))(target)
  }
}, create({
  toString () { return 'None' },
  [Symbol.toPrimitive] (hint) {
    if (hint === 'string') return this.toString()
    if (hint === 'number') throw new Error('None is not a number and cannot be used as one')
    throw new Error('None is not a value and cannot be used here')
  }
}))

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
export const remove   = v => arr => ᐅᶠ([ arr_copy, carry(index(v)), uncarry(remdex) ])
export const meta_arr = defs => ᐅᶠ([ array_copy, def_props.mut(defs) ])

// ...? special for sisyphus
export const simple = v => v === null || incl(typeof v)([ 'function', 'number', 'string', 'boolean', 'undefined' ])

export function test (suite) {
  const to6 = [ 1, 2, 3, 4, 5 ]

  return suite('unformulaic utilities', [
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
      'ᐅcarry: carries along origin array':
        t => t.eq(ᐅcarry(a => a[0])(to6))([ to6, 1 ]),
      'ᐅuncarry: stops carrying':
        t => t.eq(ᐅᶠ([ ᐅcarry(a => a[1]), ᐅuncarry(push) ])(to6))([ 1, 2, 3, 4, 5, 2 ]),
      'ᐅcarry & ᐅuncarry: cancel out':
        t => t.eq(ᐅᶠ([ ᐅcarry(a => a[0]), ᐅuncarry(v => arr => arr) ])(to6))(to6),
    }),
    t => t.suite('functions pt. 3', {
      'copy_fn: copies a function':
        t => t.eq(copy_fn(id)(id)) && !t.refeq(copy_fn(id))(id),
      'mimic_fn: copies a function, keeping its name and toString':
        t => {
          const fn = x => x + 1
          const id = x => x
          const mimic = mimic_fn(id)(fn)
          return t.eq(mimic.name)(id.name)
              && t.eq(mimic.toString())(id.toString())
              && t.eq(mimic('hi'))(id('hi'))
              && !t.refeq(mimic)(id)
              && !t.refeq(mimic)(fn)
        },
      'meta_fn: defines hidden properties on a copy of a function':
        t => {
          const fn = _ => 5
          const mf = meta_fn({ value: fn() })(fn)
          return t.eq(mf())(fn())
              && t.eq(mf.value)(fn())
              && !t.refeq(mf)(fn)
        },
      'named: names a function':
        t => t.eq(named('hello')(v => `hello, ${v}`).name)('hello'),
    })
    // t => t.suite(`'named' names functions`, [
    //   t => t.eq(named(`fn`)(_ => 42).name)(`fn`),
    //   t => t.eq(named(`fn`)(_ => 42)())(42),
    // ]),
  ])
}

import sisyphus, { stateful } from '@sisyphus/sisyphus'
test(sisyphus(stateful))
