import { compileRecipe } from './lib/compile.js'
import { emptyDocument } from './lib/schema.js'

export const name = 'dsh-route-recipes'
export const inject = []

export const Config = {
  enabled: { default: true },
  activeRecipe: { default: 'default-eng' },
  log: { default: true },
}

function readSettings(ctx) {
  try {
    return ctx.get?.('settings')?.get?.() ?? ctx.settings?.get?.() ?? {}
  } catch {
    return {}
  }
}

function log(ctx, config, message, extra) {
  if (config.log === false) return
  const line = extra ? `[route-recipes] ${message} ${JSON.stringify(extra)}` : `[route-recipes] ${message}`
  try { ctx.emit?.('route-recipes/event', { message, ...extra }) } catch { /* ignore */ }
  console.log(line)
}

export function publish(ctx, config = {}) {
  const settings = readSettings(ctx)
  const stored = settings['route-recipes'] ?? {}
  const input = {
    ...emptyDocument(),
    ...stored,
    activeRecipe: stored.activeRecipe ?? config.activeRecipe ?? 'default-eng',
  }
  const result = compileRecipe(input)
  ctx.routeRecipes = { doc: result.doc, result }
  if (result.ok) {
    log(ctx, config, 'compiled', {
      recipe: result.compiled.recipeId,
      tiers: Object.keys(result.compiled.tiers),
      rules: result.compiled.rules.length,
    })
  } else {
    log(ctx, config, 'compile-failed', { errors: result.errors })
  }
  return result
}

export function apply(ctx, config = {}) {
  if (config.enabled === false) return
  publish(ctx, config)
  ctx.on?.('settings/changed', () => publish(ctx, config))
  ctx.on?.('ready', () => publish(ctx, config))
}

export { compileRecipe } from './lib/compile.js'
export { validateDocument } from './lib/validate.js'
export { emptyDocument } from './lib/schema.js'
