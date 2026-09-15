import test from 'node:test'
import assert from 'node:assert/strict'
import { compileRecipe } from '../lib/compile.js'
import { emptyDocument } from '../lib/schema.js'
import { selectPolicyRoute } from '../../dsh-route-authority/lib/policy.js'

test('compiled default-eng + faculty implement stamps LongCat through authority policy', () => {
  const { compiled } = compileRecipe(emptyDocument())
  const route = selectPolicyRoute(compiled, { faculty: 'implement', depth: 1 })
  assert.equal(route.provider, 'longcat')
  assert.equal(route.model, 'LongCat-2.0')
})

test('compiled label recon stamps cheap-local head', () => {
  const { compiled } = compileRecipe(emptyDocument())
  const route = selectPolicyRoute(compiled, { label: 'recon', depth: 1 })
  assert.equal(route.provider, 'jupiter-ai')
  assert.equal(route.model, 'jupiter-3.5')
})
