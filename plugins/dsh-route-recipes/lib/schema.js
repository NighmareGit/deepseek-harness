/** Route-recipes document. Source of truth. Authority never reads this shape raw. */

export const SCHEMA_VERSION = 1

export const DEFAULT_FACULTIES = [
  { id: 'orchestrate', description: 'Conductor. Plans, decomposes, dispatches, evaluates. Does not code.' },
  { id: 'recon', description: 'Exhaustive on-disk mapping. No hallucination. Cheap and literal.' },
  { id: 'prd', description: 'PRD / ticket / acceptance-driver writing.' },
  { id: 'plan', description: 'Architecture, state machines, bounded contexts.' },
  { id: 'review.pragmatic', description: 'Staff review for over-engineering and missing [EXISTING] tags.' },
  { id: 'review.chaos', description: 'Invalid transitions, SPOFs, production-port and GPU protocol violations.' },
  { id: 'review.adversarial', description: 'Red-team: false evidence, safety bypasses, escalation holes.' },
  { id: 'review.implementability', description: 'Cold-agent audit: can a fresh implementer build from the artifacts alone.' },
  { id: 'innovate.blueprint', description: 'QoL and contract extraction after a verified iteration.' },
  { id: 'implement', description: 'Write the files the blueprint named. No design drift.' },
  { id: 'verify.gates', description: 'Run tests and report ACTUAL numbers, never targets.' },
]

export const DEFAULT_SLOTS = {
  'cheap-local': {
    description: 'Short context, local or free, high volume.',
    candidates: [
      { provider: 'jupiter-ai', model: 'jupiter-3.5', reasoningEffort: 'off' },
      { provider: 'laguna-xs', model: 'laguna-xs-2.1:free', reasoningEffort: 'off' },
    ],
  },
  mid: {
    description: 'Default workhorse. Config, coordination, mid-size edits.',
    candidates: [
      { provider: 'mimo', model: 'mimo-v2.5', reasoningEffort: 'off' },
    ],
  },
  'long-ctx': {
    description: 'Long context / heavy implementation.',
    candidates: [
      { provider: 'longcat', model: 'LongCat-2.0', reasoningEffort: 'high' },
    ],
  },
  test: {
    description: 'Verification and pre-epic review.',
    candidates: [
      { provider: 'zai', model: 'GLM-4.7-Flash', reasoningEffort: 'off' },
      { provider: 'novita', model: 'Ling-3.0-Flash', reasoningEffort: 'off' },
    ],
  },
}

export const DEFAULT_RECIPES = {
  'default-eng': {
    description: 'ACE / scout-explore default. Faculty to slot only — never provider/model.',
    fallbackSlot: 'mid',
    bindings: {
      orchestrate: 'mid',
      recon: 'cheap-local',
      prd: 'mid',
      plan: 'long-ctx',
      'review.pragmatic': 'mid',
      'review.chaos': 'mid',
      'review.adversarial': 'mid',
      'review.implementability': 'cheap-local',
      'innovate.blueprint': 'mid',
      implement: 'long-ctx',
      'verify.gates': 'test',
    },
  },
  'local-only': {
    description: 'Everything on cheap-local. Quality drop accepted.',
    fallbackSlot: 'cheap-local',
    bindings: {
      orchestrate: 'cheap-local',
      recon: 'cheap-local',
      prd: 'cheap-local',
      plan: 'cheap-local',
      'review.pragmatic': 'cheap-local',
      'review.chaos': 'cheap-local',
      'review.adversarial': 'cheap-local',
      'review.implementability': 'cheap-local',
      'innovate.blueprint': 'cheap-local',
      implement: 'cheap-local',
      'verify.gates': 'cheap-local',
    },
  },
}

export function emptyDocument() {
  return {
    schemaVersion: SCHEMA_VERSION,
    activeRecipe: 'default-eng',
    slots: structuredClone(DEFAULT_SLOTS),
    faculties: structuredClone(DEFAULT_FACULTIES),
    recipes: structuredClone(DEFAULT_RECIPES),
  }
}

export function isCandidate(value) {
  return Boolean(
    value
    && typeof value.provider === 'string'
    && value.provider
    && typeof value.model === 'string'
    && value.model,
  )
}
