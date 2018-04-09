/* mutton
 *
 * wanton mutation
 * makes cooked sheep of them
 * their ribs flayed open
 * their muscles stewing
 *
 * — fin
 */
import { of_descs, own_descs, get_desc, _defprop, _defprops } from './lynchpin'
import d from './d'

// mutative function factory
export const mutative      = fn => of_descs({ mut: { value: fn } })
export const with_mutative = mutative_fn => _defprops({ mut: { value: mutative_fn } })
export const derive_from   = fn => derivation => with_mutative(derivation(fn.mut))(derivation(fn))

// descriptor writers
// define_prop/mut        : string -> descriptor -> void
export const define_prop  = mutative(_defprop)
// define_props/mut       : map(string, descriptor) -> target:object -> void
export const define_props = mutative(_defprops)
// define/mut             : source:object -> target:object -> void
export const define       = mutative(object => define_props.mut(own_descs(object)))
