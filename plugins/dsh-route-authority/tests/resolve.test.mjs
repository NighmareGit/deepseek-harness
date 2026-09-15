import test from 'node:test'
import assert from 'node:assert/strict'
import { applyRoute, resolveRoute } from '../lib/resolve.js'
import { selectPolicyRoute } from '../lib/policy.js'

const jupiter = { provider: 'jupiter-ai', model: 'Laguna-XS-2.1-APEX' }
const longcat = { provider: 'longcat', model: 'LongCat-2.0' }

function key(route) {
  return `${route.provider}/${route.model}`
}

test('explicit child beats default', () => {
  const route = resolveRoute({
    requested: longcat,
    fallback: jupiter,
    flags: { honorRequested: true },
  })
  assert.equal(route.provider, 'longcat')
  assert.equal(route.source, 'requested')
})

test('omitted child inherits parent live not default', () => {
  const route = resolveRoute({
    parentLive: longcat,
    fallback: jupiter,
    flags: { inheritParentLive: true },
  })
  assert.equal(key(route), 'longcat/LongCat-2.0')
})

test('logged header beats stale options', () => {
  const route = resolveRoute({
    logged: jupiter,
    requested: longcat,
    fallback: jupiter,
  })
  assert.equal(route.provider, 'jupiter-ai')
})

test('applyRoute overwrites core selection', () => {
  const out = applyRoute({ provider: 'jupiter-ai', model: 'Laguna-XS-2.1-APEX', maxTokens: 1 }, longcat)
  assert.equal(out.provider, 'longcat')
  assert.equal(out.model, 'LongCat-2.0')
  assert.equal(out.maxTokens, 1)
})

test('policy verify* selects longcat-300k', () => {
  const matrix = {
    tiers: { 'longcat-300k': longcat },
    rules: [{ match: { label: 'verify*', minDepth: 1, maxDepth: 1 }, select: { tier: 'longcat-300k' } }],
  }
  const route = selectPolicyRoute(matrix, { label: 'verify-fix', depth: 1 })
  assert.equal(route.model, 'LongCat-2.0')
})

test('policy faculty implement selects long-ctx', () => {
  const matrix = {
    tiers: { 'long-ctx': longcat },
    rules: [{ match: { faculty: 'implement' }, select: { tier: 'long-ctx' } }],
    roles: { implement: { tier: 'long-ctx' } },
  }
  const route = selectPolicyRoute(matrix, { faculty: 'implement', depth: 1 })
  assert.equal(key(route), 'longcat/LongCat-2.0')
  assert.equal(route.source, 'policy:long-ctx')
})

test('policy role fallback uses faculty when no rule hits', () => {
  const matrix = {
    tiers: { 'cheap-local': jupiter },
    rules: [],
    roles: { recon: { tier: 'cheap-local' } },
  }
  const route = selectPolicyRoute(matrix, { faculty: 'recon' })
  assert.equal(route.source, 'role:recon')
  assert.equal(route.provider, 'jupiter-ai')
})
