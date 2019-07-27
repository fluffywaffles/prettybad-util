This note was originally a multi-line comment in linchpin. It's too long
to leave in the code, however, so it was been extracted here.

Consistency is important in API design. This is why, in JavaScript, the
functions:

- `Object.getOwnPropertyNames`
    - returns an array of all string property keys
- `Object.getOwnPropertySymbols`
    - returns an array of all Symbol property keys

follow a clear naming convention suggesting similar function
signatures, with small variation in name (-Names vs. -Symbols)
distinguishing them into cases by their return type.

ECMAScript is not always so consistent, however. for example:

- `Object.keys`
    - returns an array of string keys of enumerable own (not inherited)
      properties
- `Object.values`
    - returns an array of the values of enumerable own string-keyed
      properties

Where the names 'keys' and 'values' are ambiguous as to what qualifies
as 'keys' or 'values', and there does not exist any comparable set of
functions for Symbol-keyed properties or non-enumerable properties.

Fortunately, we're here writing a linchpin for a pretty bad utility
library that no one will use, so we have the freedom to write a
consistent API layer on top of these weird building blocks.

To wit:

- functions on string-keyed properties clearly state string-keyed-ness
- functions on symbol-keyed properties clearly state symbol-keyed-ness
- functions on both string- and symbol-keyed properties state neither
- functions are never restricted to enumerable properties by default

and all functions will adhere to the following naming conventions:

Keyed-ness specifiers
  - `string_(keyed_)*` : string-keyed
  - `symbol_(keyed_)*` : symbol-keyed
Return type specifiers
  - `*value(s)`        : codomain of keys
  - `*entr(y|ies)`     : key, value pair(s)
  - `*propert(y|ies)`  : key, descriptor pair(s)

and the return type is always an array.

So if you see:

```
fmap([
  string_keys,
  string_keyed_values,
  string_keyed_entries,
  string_keyed_properties,
  symbol_keys,
  symbol_keyed_values,
  symbol_keyed_entries,
  symbol_keyed_properties,
  keys,
  values,
  entries,
  properties,
])({ a: 5, [Symbol('hello')]: 6 })
```

you should know exactly what to expect for the output of each function.

If you wish to filter out non-enumerable results, there is a pinning
for `Object.protoype.propertyIsEnumerable` that can be combined with
filter: `is_enumerable`.

