import resolve from 'rollup-plugin-node-resolve'

function mkbuild ({ input }) {
  return {
    input,
    output: {
      file: `.test.js`,
      format: `cjs`,
      sourcemap: `inline`,
    },
    plugins: [ resolve() ],
  }
}

export default mkbuild({ input: process.argv[0] })
