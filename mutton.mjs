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
  create,
  define_property,
} from './linchpin'

// mutative function factories
const mut        = fn => create(null)({ mut: { value: fn } })
const with_mut   = fn => define_property(`mut`)({ value: fn })
const from_mut   = mut => derive => with_mut(mut)(derive(mut))
const derive_mut = fn  => derive => with_mut(derive(fn.mut))(derive(fn))

export {
  mut as wrap,
  with_mut as with,
  from_mut as from,
  derive_mut as derive,
}
