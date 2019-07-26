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

// mutative function factory
const mutative        = fn => create({ mut: { value: fn } })
const with_mutative   = fn => define_property(`mut`)({ value: fn })
const from_mutative   = mut => drv => with_mutative(mut)(drv(mut))
const derive_mutative = fn  => drv => with_mutative(drv(fn.mut))(drv(fn))

export {
  mutative,
  with_mutative,
  from_mutative,
  derive_mutative,
}
