function globToRegExp(pattern) {
  const escaped = String(pattern)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
  return new RegExp('^' + escaped + '$', 'i')
}

export function matchRule(rule, ctx) {
  const match = rule?.match ?? {}
  if (match.label) {
    const labels = [].concat(ctx.label ?? ctx.labels ?? [])
    const re = globToRegExp(match.label)
    if (!labels.some((label) => re.test(String(label)))) return false
  }
  if (match.persona && String(ctx.persona ?? '') !== String(match.persona)) return false
  if (typeof match.minDepth === 'number' && Number(ctx.depth ?? 0) < match.minDepth) return false
  if (typeof match.maxDepth === 'number' && Number(ctx.depth ?? 0) > match.maxDepth) return false
  return true
}

export function selectPolicyRoute(matrix, ctx) {
  if (!matrix || typeof matrix !== 'object') return undefined
  const tiers = matrix.tiers ?? {}
  const rules = Array.isArray(matrix.rules) ? matrix.rules : []
  for (const rule of rules) {
    if (!matchRule(rule, ctx)) continue
    const tierName = rule.select?.tier
    const tier = tierName ? tiers[tierName] : rule.select
    if (tier?.provider && tier?.model) {
      return {
        provider: tier.provider,
        model: tier.model,
        ...(tier.reasoningEffort ? { reasoningEffort: tier.reasoningEffort } : {}),
        source: `policy:${tierName ?? 'inline'}`,
      }
    }
  }
  const roleName = ctx.persona ?? ctx.role
  const role = roleName ? matrix.roles?.[roleName] : undefined
  if (role?.tier && tiers[role.tier]) {
    const tier = tiers[role.tier]
    return {
      provider: tier.provider,
      model: tier.model,
      ...(tier.reasoningEffort ? { reasoningEffort: tier.reasoningEffort } : {}),
      source: `role:${roleName}`,
    }
  }
  return undefined
}
