import test from 'node:test'
import assert from 'node:assert/strict'
import { compileRecipe, resolveFacultySlot } from '../lib/compile.js'
import { validateDocument } from '../lib/validate.js'
import { emptyDocument } from '../lib/schema.js'

test('default document compiles', () => {
  const result = compileRecipe(emptyDocument())
  assert.equal(result.ok, true)
  assert.equal(result.compiled.recipeId, 'default-eng')
  assert.equal(result.compiled.tiers['long-ctx'].model, 'LongCat-2.0')
  assert.equal(result.compiled.roles.implement.tier, 'long-ctx')
  assert.equal(result.compiled.roles.recon.tier, 'cheap-local')
  assert.equal(result.compiled.roles['verify.gates'].tier, 'test')
})

test('faculty rules target slots not concrete routes', () => {
  const { compiled } = compileRecipe(emptyDocument())
  const implement = compiled.rules.find((rule) => rule.match.faculty === 'implement')
  assert.equal(implement.select.tier, 'long-ctx')
  assert.equal(implement.select.provider, undefined)
})

test('label twin lets a child labelled recon hit the same slot', () => {
  const { compiled } = compileRecipe(emptyDocument())
  const label = compiled.rules.find((rule) => rule.match.label === 'recon')
  assert.equal(label.select.tier, 'cheap-local')
})

test('candidate chains survive compile but tiers expose only the head', () => {
  const { compiled } = compileRecipe(emptyDocument())
  assert.equal(compiled.tiers.test.provider, 'zai')
  assert.equal(compiled.chains.test.length, 2)
  assert.equal(compiled.chains.test[1].provider, 'novita')
})

test('local-only recipe binds every faculty to cheap-local', () => {
  const result = compileRecipe({ ...emptyDocument(), activeRecipe: 'local-only' })
  assert.equal(result.ok, true)
  assert.equal(result.compiled.roles.plan.tier, 'cheap-local')
  assert.equal(result.compiled.roles.implement.tier, 'cheap-local')
})

test('faculty that binds a provider is rejected', () => {
  const doc = emptyDocument()
  doc.faculties[0].provider = 'longcat'
  doc.faculties[0].model = 'LongCat-2.0'
  const checked = validateDocument(doc)
  assert.equal(checked.ok, false)
  assert.ok(checked.errors.some((error) => error.includes('binds a route')))
})

test('missing slot binding without fallback fails', () => {
  const doc = emptyDocument()
  delete doc.recipes['default-eng'].bindings.plan
  delete doc.recipes['default-eng'].fallbackSlot
  const checked = validateDocument(doc)
  assert.equal(checked.ok, false)
})

test('resolveFacultySlot returns head route and chain', () => {
  const { compiled } = compileRecipe(emptyDocument())
  const hit = resolveFacultySlot(compiled, 'verify.gates')
  assert.equal(hit.slotId, 'test')
  assert.equal(hit.route.model, 'GLM-4.7-Flash')
  assert.equal(hit.chain[1].model, 'Ling-3.0-Flash')
})

test('unknown recipe fails closed', () => {
  const result = compileRecipe({ ...emptyDocument(), activeRecipe: 'nope' })
  assert.equal(result.ok, false)
  assert.equal(result.compiled, undefined)
})
