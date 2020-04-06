import { time, test } from './lib/index.mjs'
import * as sisyphus from '@sisyphus/sisyphus'

const harness = sisyphus.Harness({ reporter: sisyphus.reporters.simple })

time(() => test(harness))
  .then(profile => console.log(profile.summarize({})))
