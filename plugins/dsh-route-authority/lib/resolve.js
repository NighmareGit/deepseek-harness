/** @typedef {{ provider: string, model: string, reasoningEffort?: string, source: string }} Route */

export function isRoute(value) {
  return Boolean(
    value
    && typeof value.provider === 'string'
    && value.provider
    && typeof value.model === 'string'
    && value.model,
  )
}

export function routeKey(route) {
  if (!isRoute(route)) return ''
  const effort = route.reasoningEffort ? `@${route.reasoningEffort}` : ''
  return `${route.provider}/${route.model}${effort}`
}

/**
 * @param {object} input
 * @param {Route | undefined} input.picked
 * @param {Route | undefined} input.logged
 * @param {Route | undefined} input.requested
 * @param {Route | undefined} input.policy
 * @param {Route | undefined} input.parentLive
 * @param {Route | undefined} input.fallback
 * @param {{ honorRequested?: boolean, inheritParentLive?: boolean }} input.flags
 */
export function resolveRoute(input) {
  const flags = input.flags ?? {}
  if (isRoute(input.picked)) return { ...input.picked, source: input.picked.source ?? 'picked' }
  if (isRoute(input.logged)) return { ...input.logged, source: input.logged.source ?? 'logged' }
  if (flags.honorRequested !== false && isRoute(input.requested)) {
    return { ...input.requested, source: input.requested.source ?? 'requested' }
  }
  if (isRoute(input.policy)) return { ...input.policy, source: input.policy.source ?? 'policy' }
  if (flags.inheritParentLive !== false && isRoute(input.parentLive)) {
    return { ...input.parentLive, source: input.parentLive.source ?? 'parent-live' }
  }
  if (isRoute(input.fallback)) return { ...input.fallback, source: input.fallback.source ?? 'default' }
  return undefined
}

export function applyRoute(config, route) {
  if (!isRoute(route) || !config || typeof config !== 'object') return config
  const next = { ...config, provider: route.provider, model: route.model }
  if (route.reasoningEffort === undefined) {
    const { reasoningEffort: _drop, ...rest } = next
    return rest
  }
  next.reasoningEffort = route.reasoningEffort
  return next
}

export function fromAgentOptions(options) {
  if (!options || typeof options !== 'object') return undefined
  if (typeof options.model !== 'string' || !options.model) return undefined
  return {
    provider: typeof options.provider === 'string' && options.provider ? options.provider : undefined,
    model: options.model,
    ...(options.reasoningEffort ? { reasoningEffort: options.reasoningEffort } : {}),
    source: 'requested',
  }
}

export function fromHeader(header) {
  const config = header?.config ?? header
  if (!isRoute(config)) return undefined
  return {
    provider: config.provider,
    model: config.model,
    ...(config.reasoningEffort ? { reasoningEffort: config.reasoningEffort } : {}),
    source: 'logged',
  }
}
