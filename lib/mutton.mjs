/* mutton
 *
 * wanton mutation
 * leads sheep to slaughtering
 * their ribs flayed open
 * their muscles stewing
 *
 * — fin
 */
import * as js from './linchpin.mjs'

// mutative function factories
const create = fn => js.create(null)({ mut: { value: fn } })
const set    = mut => js.define_property(`mut`)({ value: mut })
const from   = mut => def => set(mut)(def(mut))
const derive = fn  => def => set(def(fn.mut))(def(fn))

const mutative = js.assign({ set, derive })(fn => create(fn))

export {
  mutative,
  from as from_mutative,
}
