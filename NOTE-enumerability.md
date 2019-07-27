Why doesn't this library hide non-enumerable properties? When I call
`keys`, I see non-enumerable keys; when I call `entries`, I see
non-enumerable entries. Why?

Because the enumerability of a property is _not_ an API boundary. In
general, JavaScript is not designed so that you are unable to access or
copy non-enumerable properties. If enumerability was intended as an API
boundary, then it would actually hide non-enumerable things so that you
_couldn't_ enumerate them.  In fact, you often _want_ to access
non-enumerable things! The fact that, by default, they'll be omitted from
`Object.{keys,values,entries}` is counterintuitive and not at all
explicit. Programmers are confused when they can't find things that they
_know_ are a part of their object, until they learn: oh, I have to use
these much-more-cumbersome `Object.getOwnPropertyNames` and
`Object.getOwnPropertySymbols` APIs. Moreover, they'll learn that there
are no corresponding APIs for getting the `values` and `entries` for all
(enumerable or not) `Name`s and `Symbol`s: the language doesn't give you a
way to do that. You have to write your own.

In some sense, it's as if the entire behavior of enumerability in
JavaScript was designed for `Array`s. With an `Array`, you really _do_
want to only iterate over enumerable items! (Otherwise,
`[].forEach(console.log.bind(console))` would print `length`.) But that's
so silly: why would you even _use_ `Object.{keys,values,entries}` on an
`Array`? An `Array` _already has easy-to-use APIs for these things_! Want
the keys of an `Array`? Great, they're `[0, array.length)`. Extremely easy
to compute. Want the values? Great, use `for (let item of array) { ... }`.
Oh, you want not to use a `for` loop? Then use `forEach` or `map` or
`reduce` ‒ it's just an embarrassment of riches, over here! You've got
everything you could possibly need! There's literally _no reason_ why
these `Object` APIs should handle enumerability as if they're `Aray` APIs:
they're not even needed for `Array`s! They're for enumerating `Object`s!

So why in the heck is it _intentionally_ hard to get the complete set of
`keys`, `values`, and `entries` of an `Object`? There's no excuse! Given
the way the language is designed, programmers are likely to say to
themselves: "ugh, using enumerability just isn't worth it." The same for
`Symbol`s: they just aren't worth the effort required. Maybe a library
developer will jump through those extra hoops, but... Why make it so hard
in the first place?

Think about this for a second: the language provides features for
manipulating the enumerability of things, and avoiding name collisions
using `Symbol`s. Then, it goes _out of its way_ to make these features
hard to use correctly! It would be less awful, I guess, if JavasScript
defaulted to hiding non-enumerable things, but still provided easy ways of
accessing them. Instead, the _easy-to-use_ APIs in the language are
hard-wired to ignore non-enumerable properties. "Ugh," indeed.

We've already begun discussing another detail here: `Symbol`s. JavaScript
will usually omit them, regardless of their enumerability, when you use
built-in `Object` APIs. So, another divergence this library takes from the
language is to _always_ include `Symbol`s by default, unless they are
explicitly omitted using an API prefixed as `string_keyed_`.

"Okay," you're saying, "but as Linus Torvalds so eloquently put it: 'show
me the code.'" Here's an example of a piece of code that will not work
as-intended in JavaScript:

```
function applyUnsubscribeRequests (unsubscribed, memberCollection) {
  const newMemberCollection = {}
  Object.entries(memberCollection).forEach(([ name, info ]) => {
    if (!unsubscribed.includes(name)) {
      newMemberCollection[name] = info
    }
  })
  return newMemberCollection
}
```

That code seems like it should work! In fact, most of the time it will.
But suppose `memberCollection` uses a non-enumerable `Symbol` to store
metadata about members. `newMemberCollection` won't have it. If this
`newMemberCollection` object is passed into functions that would access
or alter that metadata, they'll fail, probably throwing `Error`s about
properties missing from `newMemberCollection` that the programmer never
knew about in the first place.

That's not ideal. Using a non-enumerable `Symbol` to hide metadata is a
great pattern! It's a motivating use-case for `Symbol` existing in the
first place. But the language, while purporting to support this use-case,
makes it hard to get it right.

"Okay," you're saying, "but in this example it would probably be fine to
just mutate the `memberCollection`, and the problem goes away. In fact,
even better: there's no possibility that the programmer will accidentally
omit the metadata!"

Yes, that's true. But do you _always_ want to mutate `memberCollection`?
Should it be _hard_ to copy it correctly? Should I, as the maintainer of
the `Subscribers` library, be forced to explain to users, every time they
try to _use the language as intended_ to copy a `memberCollection`, that:
"sorry, but you have to use my internal API that does the same thing but
copies the metadata"? Should I have been forced to write a special
internal API in `Subscribers` to do this in the first place?

Your answers to the above questions may differ, but my answer to every one
of the above is, resoundingly, "no." Just on the basis of that last
example alone: think of all the pointless `MyObject.clone(...)` methods
that library developers are forced to write and maintain! _Even then_,
users can _still_ get confused, because the library _can't fix the
language_ by itself! **Programmers will always want to write their own code
on top of yours.** If the language makes it easy for them to accidentally
break your data structures, then they will. You've lost all hope of
cleanly separating concerns. The abstraction will leak. Misguided bug
reports will come in. People might even get angry. What are you going to
say to yourself, now? "Ugh, it just isn't worth it."

We're actively encouraging library developers to keep using outdated
conventions, like storing metadata in an underscored key like `_metadata`
and telling users: "now it's your problem; you decide when and whether to
copy it." They shouldn't have to settle for that! _There exist features in
the language for doing this a better way!_

They're just too hard to use. @prettybad/util intentionally highlights
that difficulty and mitigates it. (Underscore, Lodash, and friends do not.
To be fair, they probably don't even think about it: they just accept the
status quo and move on.)

"Okay," you're saying, "but I question your whole premise. I think
enumerability _is_ an API boundary! The built-in `Object` APIs are
_correct_ to hide non-enumerable properties!"

Okay, suppose you want to use enumerability as an API boundary. Do you
want to rely on an API boundary that is enforced by how _annoying_ it is
to circumvent? Wouldn't you rather rely on an API boundary that _cannot
be_ circumvented?

If enumerability is supposedly an API boundary, it's shit for that. Same
goes for `Symbol`s.

"Okay," you're saying, "fine. If you're such a know-it-all, then what _is_
the point of enumerability and `Symbol`s? It sounds like your hypothetical
developer was right in the first place: 'Ugh!' Why bother?"

Great question. First of all, yes: enumerability and `Symbol`s aren't an
API boundary, but that's a _good_ thing. JavaScript is a highly
_introspectible_ language. If in JavaScript it was easy to _accidentally_
hide things and make them impossible to access ‒ in other words, if
developers were creating API boundaries by _accident_ ‒ then it would lose
a lot of its flexibility and utility as a language. Things would get
locked down. Library maintainers would have to add more and more options
and parameters and overloads to their methods to maintain
backwards-compatibility and still add new functionality.

In other words: it would turn into Java.

So, first: it's a good thing that JavaScript doesn't make API boundaries
so easy to construct that you'll do it by _accident_. (It might go a
little too far in the other direction, but I digress.)

Now, as for the remaining uses for enumerability and `Symbol`s:

The point of enumerability is to allow omitting unimportant implementation
details. Which is great! If I `console.log(someObject)`, I probably don't
need to see a bunch of internal implementation details. A developer can
hide those details in non-enumerable properties, and logs are cleaner and
easier to use. This is also indirectly beneficial to end-users: if an
object is being formatted for a user, you can use enumerability to filter
properties. Instead of deciding if a property should be displayed by
checking if the key is on a whitelist, you can just check whether that
property is enumerable. If not, don't display it: it's an implementation
detail that you can safely omit, and you can know that without looking any
further than "is it enumerable?" It also doesn't depend on knowing the
keys you want to display ahead of time.

That's pretty much the whole story for enumerability. It's _also_ still
useful for `Array`, where you _do_ want to hide non-enumerable things when
you're using APIs like `forEach`. In general, it's a sort of "visibility"
flag. What "visibility" means should depend on the type of the `Object`:
for `Array`s, it's used to hide items during iteration. For other
`Objects` it might be used to determine whether a property is "internal"
or whether it should be displayed to a user. And so on.

`Symbol`s are a lot more interesting.

The point of `Symbol`s is to allow safely extending objects without any
fear of name collisions. This is useful in a lot of cases: basically, any
time you want to store some internal state on an object, but you don't
want to know anything else about it. What are some examples of this?

- Mixin-style composition
- Intercepting/proxying
- Memoization
- Tracking object lifetimes

Mixin-style composition is the composition of _properties_. Usually, you
have some small piece of functionality; a counter, let's say:

```
const counter = {
  count: 0,
  increment () {
    this.count++
  }
}
```

You could just use `Object.assign(myObject, counter)` and call it a day.
Two problems, though:

1. `myObject` might already have a 'count' or an 'increment'
2. You might not want other code to modify your 'count' elsewhere

Using `Object.assign`, you'll override any existing 'count' or 'increment'
on `myObject`. Moreover, your 'count' state could have been anybody's: if
we add a bunch of mixins to `myObject`, how do we know whose state is
whose? It might not even be intentional, but somebody could trample on
_your_ state, even if you are careful not to trample on theirs!

`Symbol`s solve both of these problems.

```
const counterSymbol = Symbol('counter')
const counter = {
  [counterSymbol]: {
    count: 0,
    increment () {
      return this.count++
    },
  },
}

function increment(counter) {
  return counter[counterSymbol].increment()
}

function get(counter) {
  return counter[counterSymbol].count
}
```


Now, I can safely use `Object.assign(myObject, counter)`. No other mixin
can possibly overwrite my counter data, because `Symbol`s are uniqued.
The user can then use the counter with `increment` and `get`:

```
increment(myObject)
get(myObject)
// etc.
```

If we put all this together in a module, we've cleanly encapsulated our
mixin, and it's basically foolproof against accidental tampering.

```
// counter-mixin.js
// (see above)
export {
  get,
  increment,
  counter as mixin,
};
```

```
// app.js
import UserTracker from './user-tracker'
import * as counter from './counter-mixin'

// What's a UserTracker look like? Doesn't matter!
const userTracker = Object.assign(new UserTracker(), counter.mixin)

counter.increment(userTracker)
counter.get(userTracker) // absolutely, definitely will be: 1

// ... etc.
```

Bam! Amazing use-case! Need I go on?

"Okay," you're saying, "but yes. Yes, you need to go on."

You're really giving me a hard time, you know that?

Use-case 2: let's talk about intercepting/proxying. There's ES6 Proxy,
sure; but this is a very high-overhead option. It's not a realistic choice
for performance-critical code. So, there's still a use-case for writing
your own object proxies. How might you do that?

Well, one approach would be:

1. Move the object-to-be-proxied into a special key
2. Enumerate all the methods of the object and create stubs on the proxy
3. Make all of the stubs perform the proxying logic, then invoke the
   target object's implementation of the same method and return its result

So, for every method, create a method on the proxy that does, say:

```
...
  method() {
    console.time('method')
    const result = this[hiddenProxiedObjectKey].method()
    console.timeEnd('method')
    return result
  },
...
```

The trouble with this is: how do you chose your `hiddenProxiedObjectKey`?
Easy: use a `Symbol`.

Bam! Amazing use-case, number 2.

Use-case 3, memoization, is kind of a combination of mixins and proxies:

```
function memoize(targetMethodName, object) {
  const targetSymbol = Symbol('memoize:target')
  const cacheSymbol  = Symbol('memoize:cache')
  return Object.assign(object, {
    [targetSymbol]: object[targetMethodName],
    [cacheSymbol]: {},
    [targetMethodName] (... args) {
      const cacheKey = JSON.stringify(args)
      if (!this[cacheSymbol][cacheKey]) {
        this[cacheSymbol][cacheKey] = this[targetSymbol](...args)
      }
      return this[cacheSymbol][cacheKey]
    }
  })
}
```

Note that `JSON.stringify(...)` is probably not the best argument
serialization method, but it will suffice for many (if not most) things.

Bam! Amazing use-case, number 3. I'm on a roll now! Come on, give me a
hard one!

Use-case 4, tracking object lifetimes, is... A little harder to explain.

You might have learned about object lifetimes if you ever used `WeakMap`
or `WeakSet`, which are some new collections added in ES6. If not, we'll
recap the basics here anyway. Get ready:

Objects in a dynamic language like JavaScript are never explicitly
deallocated. Instead, the language will periodically perform "garbage
collection." Every time garbage is collected, the runtime rounds up every
object that nobody is using anymore and deallocates it. This is usually
done using "reference counting:" every time a variable refers to an
object, its reference count goes up by one. Every time that variable stops
existing, the reference count goes down. If the reference count is 0 when
the runtime performs garbage collection, the object will be deallocated.

A safe dynamic language (like JavaScript) will _never_ deallocate (garbage
collect) an object that might still get used.

The time from an object's creation, to its deallocation, is called that
object's "lifetime."

Now, why in the world would I want to track one?

Suppose we've written a very complicated game. Sixty times per second, we
recompute all the game state and re-render the screen. Sometimes, we'll do
some really tricky things: for example, if there's a tree on-screen, and
the camera pans away, we'll delete the tree until we need it again to save
memory. (And also to avoid rendering something that you can't see anyway!)
We'll recreate the tree and start to render it again if the camera pans
back.

Suppose we want to instrument our game. We want to know: "how often do I
end up reallocating that tree?" If you're reallocating it really often, it
might be more expensive to keep deleting it and recreating it than it
would have been to just leave it around in the first place!

We can figure this out by tracking the tree object's lifetime. Here's how:

```
const lifetimes = {}
const lifetimeTrackerSymbol = Symbol('lifetime:first-seen-timestamp')
function trackLifetimes(name, object) {
  if (!object) {
    // there's not an instance of this named object alive right now
    return
  }
  if (!lifetimes[name]) {
    // we've never seen one of these before, so create a counter for it
    lifetimes[name] = []
  }
  if (!object[lifetimeTrackerSymbol]) {
    // we've never seen this instance of the named object before
    // count this as a new lifetime
    const timestamp = Date.now()
    object[lifetimeTrackerSymbol] = timestamp
    lifetimes[name].push(timestamp)
  }
}

// now, in our game loop:
trackLifetimes(`tree`, game.scene.tree)
```

After running the game for a while, you can look at `lifetimes.tree` to
find out all the timestamps at which the tree was recreated.

In other words: you can _almost_ profile your game's memory throughput. :)

Bam! Mind-blowing use-case, number 4!

You see all the amazing things we're missing out on? There are so. many.
use-cases for enumerability and `Symbol`s, and we've just scratched the
surface here!

So, there you go: you justed needed a pretty bad utility library to come
along to show you: _your JavaScript could be so much more_.

@prettybad/util makes sure that your `Symbol`s and enumerable properties
always behave in the most obvious way. It makes it easy to use `Symbol`s
and descriptors, and hard to accidentally change or lose them by doing
otherwise ordinary and harmless things (like copying the object).

That's why the APIs in @prettybad/util default to acting on _all_ of your
properties: so that you can _actually use_ the features of JavaScipt like
`Symbol`s and descriptors that make it such a powerful object-oriented
language.
