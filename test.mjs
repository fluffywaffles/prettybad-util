import { test } from './index.mjs'
import sisyphus, { reporters } from '@sisyphus/sisyphus'
test(sisyphus({ reporter: reporters.simple }))
