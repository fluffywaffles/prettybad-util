import { test } from './lib/index.mjs'
import * as sisyphus from '@sisyphus/sisyphus'
test(sisyphus.Harness({ reporter: sisyphus.reporters.simple }))
