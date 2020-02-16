import { time, test } from './lib/index.mjs'
import * as sisyphus from '@sisyphus/sisyphus'

const harness = sisyphus.Harness({ reporter: sisyphus.reporters.simple })
const profile = time(() => test(harness))

console.log(profile.summarize({}))
