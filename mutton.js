/* mutton
 *
 * wanton mutation
 * makes cooked sheep of them
 * their ribs flayed open
 * their muscles stewing
 *
 * — fin
 */
import { of_properties, own_descs, get_desc, _defprop, _defprops } from './lynchpin'
import d from './d'

// mutative function factory
export const mutative      = fn => of_properties({ mut: { value: fn } })
export const with_mutative = mutative_fn => _defprop(`mut`)({ value: mutative_fn })
export const derive_from   = fn => derivation => with_mutative(derivation(fn.mut))(derivation(fn))

// descriptor writers
export const define_prop  = mutative(_defprop)
export const define_props = mutative(_defprops)
export const define       = mutative(object => define_props.mut(own_descs(object)))
