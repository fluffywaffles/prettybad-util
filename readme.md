# prettybad/μtil
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
    - Copying an object doesn't omit nonenumerable properties
    - Updating an object doesn't make its descriptor enumerable or
      writable if it wasn't before
    - In general, updating an object doesn't change things you don't
      explicitly intend to change
    - `*_propert{y,ies}` and `*_descriptor{s}` APIs exist for
      explicitness, and you can opt-in to
3. Everything is curried all of the time
    - Composition over rice with a cup of chai tea
    - I get tired of writing out names for arguments I'm passing along
    - Point-free... erm... et cetera
4. As lodash/fp puts it, "Iteratee first, data last"
    - The data is always the last argument, e.g. `map(inc)([ 1, 2, 3 ])`
    - I could have just said that, but I think the lodash-eff-pee-ers are funnier so I copied them
5. Where it makes sense, just be polymorphic
    - Check object type tags and dispatch the correct function
    - For example, `copy` dispatches: `array_copy` on arrays, and `object_copy` on normal objects
6. In general, don't ever do anything with prototypes
    - They're complex and inefficient to work with. Leave them alone
7. As a generalization of the prototypes rule: nothing is ever 'deep'
    - 'Deep' recurrences into objects are generally inefficient and unnecessary
    - Even worse: 'deep' is ambiguous.
        - Does 'deep' include the protype chain?
        - Does 'deep' copy functions? (If so, how?)
        - Does 'deep' also copy array elements?
    - Instead, the library should provide clean APIs for walking trees
8. Be immutable by default, but provide clearly-labeled mutative alternatives
    - e.g.: `splice` and `splice.mut`, `map` and `map.mut`, `filter` and `filter.mut`
    - Mutation should be explicit and grep-able (so, like, search for `.*\.mut(.*)`)

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
this. If you replaced entire DOM nodes every time they updated, in fact,
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

Yes. But unfortunately you'll have to take my word for it right now that
the tests pass. I wrote the tests using my own testing library, Sisyphus,
which I'm still in the process of... uh... fixing, before I release it.
