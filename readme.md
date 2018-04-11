# prettybad/μtil
## it's worse than underscore

in keeping with my life motto ("i bet a could make a pretty bad {x}"), this is a pretty bad utility
library. it is pretty bad, tbh. it has some pretty bad goals:

1. don't ignore symbols
2. preserve symbols during operations (e.g. `map`)
3. don't ignore property descriptors
4. also preserve property descriptors during operations (e.g. `map`)
5. everything is curry all of the time
6. "iteratee first, data last" as lodash/fp puts it
    - the functions come before the data, e.g. `map(inc)([ 1, 2, 3 ])`
    - i could have just said that, but i think the lodash-eff-pee-ers are funnier so i copied them
7. where it makes sense, be polymorphic
    - that is: check object type tags and dispatch the correct function
    - for example, `slice` dispatches: `slice_array` on arrays, and `slice_string` on strings
8. be immutable by default, but provide clearly-labeled mutative alternatives
    - e.g.: `splice` and `splice.mut`, `map` and `map.mut`, `filter` and `filter.mut`
    - mutation should be explicit and grep-able (so, like, search for `.*\.mut(.*)`)

why mutative apis? well, uh, what for performances in the where we do want to that. but seriously:
sometimes you want to mutate. for example, design-time mutation - to set the state of an object at
initialization - is perfectly okay. and in tight loops, mutation can make a huge performance
difference. besides, in practice, perfect immutability in javascript is a lie whenever you touch the
DOM. frameworks that espouse immutable web interfaces hide mutation - sometimes in a compiler
backend (hi, Elm) and sometimes in a runtime (hi, React) - but the fact is, the DOM mutates, and
browsers are optimized for this.

also, programmers are smart enough to be allowed to mutate when they want to. i call this the "give
a man a footgun" principle of API design. it has a saying that goes... uh... "give a man a footgun,
and he'll have 1 foot and learnt a lesson, or he'll reinvent wheels". or something like that. one of
those is supposed to be the good outcome. i can't remember which.

it also has at least 1 really pretty bad goal:

0. things are as bare as possible
    - javascript is pretty meh & i'd rather not have it so `Object.create(null)` all the way
    - things shouldn't be configurable/writable/enumerable in general
    - implication: no prototypes, so no `toString()` ⇒ `"[Object object]"` for you (sorry)
    - implication: you can't modify properties, so no `splice.mut = /* muahaha */` for you
    - implication: you can't enumerate utility properties, so `Object.keys(splice)` ⇒ `[]` even
        though you and i both know that there's a `splice.mut` method for mutative `splice`-ing

so there, i had reasons. never let it be said i was unreasonable. insane, maybe, but only within
reason. if only someone else had already written a pretty bad utility library, and then i wouldn't
be writing this one... er, wait.

# inFAQs
## inFrequently Asked Questions
### infrequent: as in, never

1. why would anyone use a library that calls itself "pretty bad, tbh"

...

2. ...

nevermind i'm tired of making up FAQs.

# does it do?

it has a few tests. almost all of them pass. but not string split. that sonofagun got borkt on April
4th, 2018, and has yet to be fixed.

oh. right. you can't run them without sisyphus, a test library i am writing. it's not available yet.
check back... later?
