Copying Functions
=================

There are 4 pieces of state to keep in mind when copying functions.

1. Closure (lexical) state
2. Identity (own) state
3. Instance (prototypal) state
4. Context (this) state

If a copy loses the lexical environment of its closure, undefined
errors are going to be introduced when the copy tries to access a
member of its (now empty) scope. Pure functions are immune to this.

```
// example:
function monotonic_incrementer () {
  let value = 0
  return function increment () {
    return ++value
  }
}

let next = monotonic_incrementer()
let copy_next = copy(next)
next()      // ⇒ 1
copy_next() // ⇒ ++value ⇒ ++undefined ⇒ NaN
```

If a copy loses identity state (that is, if `name`, `toString()`, other
implicit properties set by the runtime during function definition
change), introspection is crippled, and any form of copy-to-source
comparison (not just direct equality comparison) becomes nigh
impossible.

```
// example:
function debug_log_function (f) {
  console.log(`${f.name}: ${f.toString()}`)
}
function add (a, b) { return a + b }
debug_log_function(add)
// ⇒ logs: "add: function add (a, b) { return a + b }"
debug_log_function(copy(add))
// ⇒ unknown behavior (implementation and js engine specific)
```

If a copy loses instance state (the prototype changes), its inheritance
chain is broken, and instanceof checks that should succeed will fail.

```
// example:
class Rect {
  constructor (length, height) {
    this.length = length
    this.height = height
  }
  area () {
    return this.length * this.height
  }
}

let size5_square = new Rect(5, 5)
size5_square.area()                // ⇒ 25
size5_square instanceof Rect       // ⇒ true
copy(size5_square) instanceof Rect // ⇒ false
copy(size5_square).area() // ⇒ TypeError: undefined is not a function
```

If a copy loses contextual state (that is, if it is bound to a context
using bind() and can no longer be implicitly rebound to a new context),
it is no longer usable as, for example, a mixin definition for an
object, because its `this` value will not change when its runtime
context changes.

```
// example:
function debug_mixin () {
  return {
    type  : typeof this,
    proto : Object.getPrototypeOf(this),
    value : this.valueOf(),
  }
}

const debuggable_C = Object.create(class C { }, {
  debug: { value: debug_mixin }
})
debuggable_C.debug()
// ⇒ { type: "object", proto: C.prototype, valueOf: Function {...} }

const not_so_debuggable_C = Object.create(class C { }, {
  debug: { value: copy(debug_mixin) }
})
not_so_debuggable_C.debug()
// ⇒ { type: "object", proto: Object.prototype, valueOf: {} }
```

There is no elegant method of copying functions that can avoid every
pitfall. Here are known methods for copying functions, and trade-offs
they introduce:

1. Create a wrapper function that calls the source function
   - preserves closure state
   - loses identity state (but this can be copied separately)
   - loses instance state (but can directly set prototype)
   - loses contextual state (but can bind context from the wrapper)
   - high overhead: every function call now becomes 2+ function calls
   - complex: all non-closure state must be manually copied
   - flexible: permits pre- and post-call code execution
2. Re-evaluate the source function
    ```
    (new Function(`return ${source_function.toString()}`))()
    ```
   - loses closure state (no way to mitigate)
   - preserves identity state (cleanly; re-evaluates the original)
   - loses instance state (but can directly set prototype)
   - preserves contextual state (the function is not rebound)
   - simple: preserves most function state without manual copying
   - inefficient: evaluates source, triggering a parse/compile
   - problems: closure state cannot be save this way; eval is "evil"
3. Rebind the function to a new (empty) context
   - preserves closure state
   - loses identity state (but this can be mitigated at least partly)
   - preserves instance state (afaict)
   - loses contextual state (only an explicit rebind has any effect)
   - problem: there's no way to save normal contextual state behavior

If lexical state and copy efficiency are unimportant, method 2 is
superior. If lexical state is important, only methods 1 and 3 are
applicable. Of the two, method 1 is more hacky, more complex, and yet
generally superior, because it is able to preserve the most state.
Method 3 clobbers contextual state, with no way to restore normal
runtime contextual state behavior. If it is known that runtime
contextual state behavior is unimportant, then method 3 is acceptable;
however, it is only a side effect of function rebinding that the source
function is 'copied,' not the intent of function rebinding. While it
can generally be relied upon that function rebinding will cause the
javascript engine to replicate the source function's behavior
(including lexical state), it is purposefully designed to *replace*
contextual state, and that's all it has to do.

The best method for copying a function is to re-evaluate its
definition, then copy the lexical environment from its source.
Unfortunately, we cannot access the lexical environment of a closure in
javascript. Mimicking a function (method 1) is not quite the same, and
rebinding a function (method 3) is a different operation that happens
to copy a function as a byproduct. Method 2, which does re-evaluate the
function definition, cannot be adapted to copy the source function's
lexical environment, making it suitable only for copying pure
functions.

Also worth considering: native runtime functions (whose source is not
introspectable, due to its likely not being expressible in javascript
in the first place) and/or node-gyp style foreign-functions cannot be
copied using function re-evaluation, because the source is not
available. But this begs the question: when and why are you copying
non-user functions that are not part of your codebase in the first
place? Why would you copy, for example, Math.cos? Or a function from an
external library? It should never be seen as acceptable practice to
mutate the standard library, or anyone's library for that matter, when
extending them. You should wrap them, not copy them!

So we are at an impasse. If we were going to expose a single API for
copying functions, which trade-offs should it choose?
