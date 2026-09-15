import { applyRoute, fromAgentOptions, fromHeader, resolveRoute, routeKey } from './lib/resolve.js'
import { selectPolicyRoute } from './lib/policy.js'

export const name = 'dsh-route-authority'
export const inject = []

export const Config = {
  enabled: { default: true },
  honorRequested: { default: true },
  inheritParentLive: { default: true },
  enforceOnRequest: { default: true },
  wrapSubagentStart: { default: true },
  log: { default: true },
}

const stamps = new WeakMap()

function readSettings(ctx) {
  try {
    return ctx.get?.('settings')?.get?.() ?? ctx.settings?.get?.() ?? {}
  } catch {
    return {}
  }
}

function matrixOf(ctx, settings) {
  return settings['route-authority']?.matrix
    ?? ctx.routeRecipes?.result?.compiled
    ?? settings['route-recipes']?.compiled
    ?? settings['route-policy']
    ?? {}
}

function liveOf(agent) {
  if (!agent) return undefined
  return stamps.get(agent) ?? fromHeader(agent.session?.requestHeader?.())
}

function parentOf(ctx, agent) {
  const parentId = agent?.session?.header?.parentSession
  if (!parentId) return undefined
  return ctx.get?.('agents')?.get?.(parentId) ?? ctx.agents?.get?.(parentId)
}

function log(ctx, config, message, extra) {
  if (config.log === false) return
  const line = extra ? `[route-authority] ${message} ${JSON.stringify(extra)}` : `[route-authority] ${message}`
  try { ctx.emit?.('route-authority/event', { message, ...extra }) } catch { /* ignore */ }
  console.log(line)
}

function decide(ctx, config, agent, requested) {
  const settings = readSettings(ctx)
  const matrix = matrixOf(ctx, settings)
  const header = agent?.session?.header ?? {}
  const policy = selectPolicyRoute(matrix, {
    label: header.label ?? header.title,
    persona: header.persona,
    faculty: header.faculty ?? requested?.faculty,
    depth: header.depth ?? (header.origin === 'subagent' ? 1 : 0),
    role: header.role,
  })
  const parent = parentOf(ctx, agent)
  const fallback = settings['agent-default-model']
  const requestedRoute = fromAgentOptions(requested ?? agent?.options)
  if (requestedRoute && !requestedRoute.provider) {
    requestedRoute.provider = liveOf(parent)?.provider ?? fallback?.provider
  }
  return resolveRoute({
    logged: fromHeader(agent?.session?.requestHeader?.()),
    requested: requestedRoute,
    policy,
    parentLive: liveOf(parent),
    fallback: fromAgentOptions(fallback),
    flags: {
      honorRequested: config.honorRequested !== false,
      inheritParentLive: config.inheritParentLive !== false,
    },
  })
}

function installOnAgent(ctx, config, agent) {
  if (!agent?.ctx?.on) return
  if (agent.__routeAuthorityInstalled) return
  agent.__routeAuthorityInstalled = true
  const existing = stamps.get(agent)
  if (!existing) {
    const decision = decide(ctx, config, agent)
    if (decision) {
      stamps.set(agent, decision)
      log(ctx, config, 'stamp', { agent: agent.id, route: routeKey(decision), source: decision.source })
    }
  }
  agent.ctx.on('agent/request', async (_payload, next) => {
    const resolved = await next()
    if (config.enforceOnRequest === false) return resolved
    const route = stamps.get(agent) ?? decide(ctx, config, agent)
    if (!route) return resolved
    const nextConfig = applyRoute(resolved, route)
    if (routeKey(resolved) !== routeKey(nextConfig)) {
      log(ctx, config, 'enforce', {
        agent: agent.id,
        from: `${resolved?.provider}/${resolved?.model}`,
        to: routeKey(nextConfig),
        source: route.source,
      })
    }
    stamps.set(agent, route)
    return nextConfig
  })
}

function wrapSubagents(ctx, config) {
  const subagents = ctx.get?.('subagents') ?? ctx.subagents
  if (!subagents || typeof subagents.start !== 'function') return
  if (subagents.__routeAuthorityWrapped) return
  const wrap = (methodName) => {
    const original = subagents[methodName]
    if (typeof original !== 'function') return
    subagents[methodName] = async function wrapped(request) {
      const parent = request?.parent
      const requested = request?.agentOptions
      const faculty = request?.faculty ?? requested?.faculty ?? request?.persona
      const synthetic = {
        options: requested,
        session: {
          header: {
            origin: 'subagent',
            parentSession: parent?.id ?? parent?.session?.id,
            label: request?.label,
            persona: request?.persona,
            faculty,
            depth: (parent?.session?.header?.depth ?? 0) + 1,
          },
          requestHeader: () => undefined,
        },
      }
      const decision = decide(ctx, config, synthetic, requested)
      const nextRequest = decision
        ? {
            ...request,
            agentOptions: {
              ...requested,
              provider: decision.provider,
              model: decision.model,
              ...(decision.reasoningEffort ? { reasoningEffort: decision.reasoningEffort } : {}),
            },
          }
        : request
      const result = await original.call(this, nextRequest)
      const child = result?.agent ?? result
      if (child && decision) stamps.set(child, decision)
      return result
    }
  }
  wrap('start')
  wrap('startContinuable')
  subagents.__routeAuthorityWrapped = true
}

export function apply(ctx, config = {}) {
  if (config.enabled === false) return

  ctx.on('agent/created', (agent) => installOnAgent(ctx, config, agent))

  const existing = ctx.get?.('agents')
  if (existing?.values) {
    for (const agent of existing.values()) installOnAgent(ctx, config, agent)
  }

  if (config.wrapSubagentStart !== false) {
    wrapSubagents(ctx, config)
    ctx.on('ready', () => wrapSubagents(ctx, config))
  }
}
