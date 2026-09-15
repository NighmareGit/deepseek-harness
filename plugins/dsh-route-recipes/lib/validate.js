import { isCandidate, SCHEMA_VERSION } from './schema.js'

export function validateDocument(doc) {
  const errors = []
  if (!doc || typeof doc !== 'object') {
    return { ok: false, errors: ['document is missing'] }
  }
  if (doc.schemaVersion != null && Number(doc.schemaVersion) !== SCHEMA_VERSION) {
    errors.push(`schemaVersion ${doc.schemaVersion} != ${SCHEMA_VERSION}`)
  }

  const slots = doc.slots ?? {}
  const faculties = Array.isArray(doc.faculties) ? doc.faculties : []
  const recipes = doc.recipes ?? {}

  if (!faculties.length) errors.push('faculties[] is empty')
  const facultyIds = new Set()
  for (const faculty of faculties) {
    if (!faculty?.id || typeof faculty.id !== 'string') {
      errors.push('faculty missing id')
      continue
    }
    if (facultyIds.has(faculty.id)) errors.push(`duplicate faculty ${faculty.id}`)
    facultyIds.add(faculty.id)
    if (faculty.provider || faculty.model) {
      errors.push(`faculty ${faculty.id} binds a route; faculties bind slots only`)
    }
  }

  for (const [slotId, slot] of Object.entries(slots)) {
    const candidates = Array.isArray(slot?.candidates) ? slot.candidates : []
    if (!candidates.length) errors.push(`slot ${slotId} has no candidates`)
    candidates.forEach((candidate, index) => {
      if (!isCandidate(candidate)) errors.push(`slot ${slotId} candidate[${index}] needs provider and model`)
    })
  }

  const recipeIds = Object.keys(recipes)
  if (!recipeIds.length) errors.push('recipes is empty')
  const active = doc.activeRecipe
  if (active && !recipes[active]) errors.push(`activeRecipe ${active} is not a recipe`)

  for (const [recipeId, recipe] of Object.entries(recipes)) {
    if (recipe?.provider || recipe?.model) {
      errors.push(`recipe ${recipeId} binds a route; recipes bind faculties to slots`)
    }
    const fallback = recipe?.fallbackSlot
    if (fallback && !slots[fallback]) errors.push(`recipe ${recipeId} fallbackSlot ${fallback} is missing`)
    const bindings = recipe?.bindings ?? {}
    for (const [facultyId, slotId] of Object.entries(bindings)) {
      if (!facultyIds.has(facultyId)) errors.push(`recipe ${recipeId} unknown faculty ${facultyId}`)
      if (!slots[slotId]) errors.push(`recipe ${recipeId} faculty ${facultyId} points at missing slot ${slotId}`)
    }
    for (const facultyId of facultyIds) {
      if (!bindings[facultyId] && !fallback) {
        errors.push(`recipe ${recipeId} does not bind faculty ${facultyId} and has no fallbackSlot`)
      }
    }
  }

  return { ok: errors.length === 0, errors }
}
