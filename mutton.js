/* mutton
 *
 * wanton mutation
 * makes cooked sheep of them
 * their ribs flayed open
 * their muscles stewing
 *
 * — fin
 */
import {
  of_properties,
  define_property as defprop,
  define_properties as defprops,
} from './lynchpin'

// mutative function factory
const mutative        = fn => of_properties({ mut: { value: fn } })
const def_mutative    = fn => defprop(`mut`)({ value: fn })
const from_mutative   = mut => drv => def_mutative(mut)(drv(mut))
const derive_mutative = fn => drv => def_mutative(drv(fn.mut))(drv(fn))

export {
  mutative,
  def_mutative,
  from_mutative,
  derive_mutative,
}

// descriptor writers
const define_property   = mutative(defprop)
const define_properties = mutative(defprops)

export {
  define_property,
  define_properties,
}
