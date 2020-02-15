# @prettybad/util
## it's worse than underscore

In keeping with my life motto ("I bet a could make a pretty bad {x}"),
this is a pretty bad utility library. It is pretty bad, tbh. It has some
pretty bad goals:

1. Don't ignore symbols or nonenumerable properties by default
    - `keys` means "strings" _and_ "symbols", enumerable and not
    - `symbol_keyed_*` means symbol keys, enumerable and not
    - `string_keyed_*` means string keys, enumerable and not
    - Seriously why isn't the built-in library clear in the first place
2. Don't ignore property descriptors
    - Merging objects merges descriptors
    - Copying an object doesn't omit non-enumerable properties
    - Updating a non-enumerable property doesn't make it enumerable
    - Updating a non-writable property doesn't make it writable
    - In general, updating an object doesn't change things you don't
      explicitly change
    - `*_propert{y,ies}` and `*_descriptor{s}` APIs exist for explicitness
3. Everything is curried all of the time
    - Composition over rice with a cup of chai tea
    - I get tired of writing out names for arguments I'm passing along
    - Point-free... erm... et cetera
4. As lodash/fp puts it, "Iteratee first, data last"
    - The data is always the last argument: `map(v => v + 1)([ 1, 2, 3 ])`
    - I could've just said that, but the lodash-eff-pee-ers are funnier so
      I copied them
5. Where it makes sense, just be polymorphic
    - Check object type tags and dispatch the correct function
    - For example, `copy` dispatches: `object_copy`, but `array_copy` on
      arrays
6. In general, don't ever do anything with prototypes
    - They're complex and inefficient to work with. Leave them alone
7. As a generalization of the prototypes rule: nothing is ever 'deep'
    - 'Deep' recurrences into objects are inefficient and often unneeded
    - Even worse: a 'deep' action on an object is ambiguous.
        - Does 'deep' include non-enumerable properties?
        - Does 'deep' include the protype chain?
        - Does 'deep' copy functions? (If so, how?)
        - Does 'deep' copy array elements?
        - We could go deeper into this sinkhole, but I'd rather just not.
    - Instead, the library should provide clean APIs for walking trees
8. Be immutable by default, but with clearly-labeled mutative alternates
    - `splice` and `splice.mut`; `map`, `map.mut`; `filter`, `filter.mut`
    - Mutation is explicit and grep-able (like, search for `.*\.mut(.*)`)

Why mutative APIs? Well, uh, what for... when you performant, need the...
where we do want to, uh, do that.

But seriously: yes, there are lots of advantages to immutability, but
sometimes you _want_ to mutate. For example, design-time mutation - to set
the state of an object at initialization - is perfectly okay. In tight
loops, mutation can make a huge performance difference. Besides, in
practice, perfect immutability in JavaScript is a lie whenever you touch
the DOM. Frameworks that espouse "immutable" web UIs hide mutation -
sometimes in a compiler backend (hi, Elm) and sometimes in a runtime (hi,
React) - but the fact is, the DOM mutates, and browsers are optimized for
this. If you replaced entire DOM trees every time a node changed, in fact,
the browser would grind to a complete halt running even moderately
interactive pages. The Garbage Collection! Oh, The Garbage Collection!

Also, programmers are smart enough to be allowed to mutate when they want
to. I call this the "give a man a footgun" principle of API design. It has
a saying that goes... uh... "give a man a footgun, and he'll have 1 foot
and learnt a lesson, or he'll reinvent wheels." Or something like that.
One of those is supposed to be the good outcome. I can't remember which.

So there, I had reasons. Never let it be said I was unreasonable. Insane,
maybe, but only within reason.

If only someone else had already written a pretty bad utility library,
then I wouldn't be writing this one... er, wait.

# inFAQs
## inFrequently Asked Questions
### infrequent: as in, never

1. Why would anyone use a library that calls itself "pretty bad, tbh?"

...

2. ...

Nevermind, I'm tired of making up FAQs.

# Does it work?

Yes. If you have a version of node later than v13, you can run the
test-suite with `$ node test.mjs`. If you have an earlier version, then
run `npm t` and it will bundle the code with `rollup` first before
attempting to run the test suite.
