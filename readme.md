# prettybad/μtil
## it's worse than underscore

in keeping with my life motto ("i bet a could make a pretty bad {x}"), this is a pretty bad utility
library. it is pretty bad, tbh. it has some pretty bad goals:

1. don't ignore symbols
2. preserve symbols during operations (e.g. `map`)
3. don't ignore property descriptors
4. also preserve property descriptors during operations (e.g. `map`)
5. everything is curry all of the time
    - kind of like "it's all kosher," except not at all that
6. "iteratee first, data last" as lodash/fp puts it
    - the functions come before the data, e.g. `map(inc)([ 1, 2, 3 ])`
    - i could have just said that, but i think the lodash-eff-pee-ers are funnier so i copied them
7. be type agnostic
    - it hurts, but it hurts good
    - that is: check object type tags and do polymorphism
    - for example, `copy` dispatches: `copy_array` on arrays, `copy_object` on objects, and `id` on
      primitives (primitives are already immutable so there's no real need to copy them)
8. be immutable by default, but provide mutative alternatives
    - e.g., splice and splice.mut
    - mutation should be explicit and grep-able (so, like, search for `.*\.mut(.*)`)
    - why? immutable is good, but what for performances in the where we do want to that, so there
    - instead of hiding mutation in a compiler (hi, Elm) or a runtime (hi, React), it's included
    - i call this the "give a man a footgun" principle of API design
    - "give a man a footgun, and he'll have 1 foot and learnt a lesson, or he'll reinvent wheels"
    - or something. one of those is supposed to be the good outcome. i can't remember which.
    - mutative APIs should still return the new value, so they can be composed

so there, i had reasons. never let it be said i was unreasonable. insane, maybe, but only within
reason. if only someone else had already written a pretty bad utility library, and then i wouldn't
be writing this one... er, wait.

# inFAQs
## inFrequently Asked Questions
### infrequent: as in, never

1. why would anyone use a library that calls itself "pretty bad, tbh"

...

2. why the functions all one file are in?

because i put them there. think about all the `import` statements i could write if i split them
up... ooh. the very thought of it makes me giddy. maybe i'll do that some weekend when i'm bored. i
bet i could add 100 lines to my codebase that way.

3. ?

nevermind i'm tired of making up FAQs.

# does it do?

it has a few tests. almost all of them pass. but not string split. that sonofagun got borkt on April
4th, 2018, and has yet to be fixed.

oh. right. you can't run them without sisyphus, a test library i am writing. it's not available yet.
check back... later?
