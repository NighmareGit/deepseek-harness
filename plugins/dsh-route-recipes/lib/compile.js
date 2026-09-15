import { emptyDocument, isCandidate } from './schema.js'
import { validateDocument } from './validate.js'

function mergeDocument(input) {
  const base = emptyDocument()
  if (!input || typeof input !== 'object') return base
  return {
    schemaVersion: input.schemaVersion ?? base.schemaVersion,
    activeRecipe: input.activeRecipe ?? base.activeRecipe,
    slots: input.slots ?? base.slots,
    faculties: input.faculties ?? base.faculties,
    recipes: input.recipes ?? base.recipes,
  }
}

function firstCandidate(slot) {
  const candidates = Array.isArray(slot?.candidates) ? slot.candidates : []
  return candidates.find(isCandidate)
}

/**
 * Compile a route-recipes document into the matrix route-authority already reads.
 * Availability chains stay on `compiled.chains`. Authority consumes tiers/rules/roles only.
 */
export function compileRecipe(input) {
  const doc = mergeDocument(input)
  const checked = validateDocument(doc)
  if (!checked.ok) return { ok: false, errors: checked.errors, compiled: undefined, doc }

  const recipe = doc.recipes[doc.activeRecipe]
  const tiers = {}
  const chains = {}
  const rules = []
  const roles = {}

  for (const [slotId, slot] of Object.entries(doc.slots)) {
    const head = firstCandidate(slot)
    if (!head) continue
    tiers[slotId] = {
      provider: head.provider,
      model: head.model,
      ...(head.reasoningEffort ? { reasoningEffort: head.reasoningEffort } : {}),
    }
    chains[slotId] = slot.candidates.filter(isCandidate)
  }

  const facultyIds = doc.faculties.map((faculty) => faculty.id)
  for (const facultyId of facultyIds) {
    const slotId = recipe.bindings?.[facultyId] ?? recipe.fallbackSlot
    if (!slotId || !tiers[slotId]) continue
    rules.push({ match: { faculty: facultyId }, select: { tier: slotId } })
    rules.push({ match: { label: facultyId }, select: { tier: slotId } })
    roles[facultyId] = { tier: slotId }
  }

  if (recipe.fallbackSlot && tiers[recipe.fallbackSlot]) {
    roles['*'] = { tier: recipe.fallbackSlot }
  }

  return {
    ok: true,
    errors: [],
    doc,
    compiled: {
      recipeId: doc.activeRecipe,
      source: `recipe:${doc.activeRecipe}`,
      tiers,
      rules,
      roles,
      chains,
    },
  }
}

export function resolveFacultySlot(compiled, facultyId) {
  if (!compiled) return undefined
  const role = compiled.roles?.[facultyId] ?? compiled.roles?.['*']
  const slotId = role?.tier
  if (!slotId) return undefined
  return {
    slotId,
    route: compiled.tiers[slotId],
    chain: compiled.chains?.[slotId] ?? [],
  }
}
