import { test } from './index.mjs'
import * as sisyphus from '@sisyphus/sisyphus'
test(sisyphus.Harness({ reporter: sisyphus.reporters.simple }))
