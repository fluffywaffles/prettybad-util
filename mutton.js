/* mutton
 *
 * wanton mutation
 * makes cooked sheep of them
 * their ribs flayed open
 * their muscles stewing
 *
 * — fin
 */
import { of_properties, define_property as defprop, define_properties as defprops } from './lynchpin'

// mutative function factory
export const mutative        = fn => of_properties({ mut: { value: fn } })
export const with_mutative   = mutative_fn => defprop(`mut`)({ value: mutative_fn })
export const derive_mutative = fn => derivation => with_mutative(derivation(fn.mut))(derivation(fn))

// descriptor writers
export const define_property   = mutative(defprop)
export const define_properties = mutative(defprops)
