/* fungible
 *
 * is code data?
 * is data code?
 * if it is inert,
 * is it still alive?
 * if it is alive,
 * must it show a sign?
 *
 * — fin
 */
const make_let_string  = name => value => `let ${name} = ${value}; return ${name}`
export const source = {
  let: make_let_string,
}

const iife_from_string = source => (new Function(source))()
export const code = {
  iife: iife_from_string,
}
