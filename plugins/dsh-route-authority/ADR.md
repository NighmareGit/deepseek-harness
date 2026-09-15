# ADR: last-write route authority as a plugin

## Status

Accepted for the NighmareGit fork as an out-of-tree bundle under `plugins/`.

## Context

`installModelSelection` is the wire owner by design. Patching `selectionFor` in core does not survive mother-repo releases. Community plugins already wrap `subagents.start` or `agent/request`.

## Decision

Ship a Cordis bundle that:

- stamps a route at child start (`subagents.start` / `startContinuable`)
- re-applies it on `agent/request` after `await next()`
- reads the existing `route-policy` settings key, then a compiled recipe matrix if present

Do not replace workflow runtime or `tool-subagent`.
Do not own faculty/slot/recipe editing. That is `plugins/dsh-route-recipes`.

## Matrix source order

1. `settings['route-authority'].matrix` — explicit override
2. `ctx.routeRecipes.result.compiled` — sibling compiler
3. `settings['route-recipes'].compiled` — persisted compile
4. `settings['route-policy']` — legacy

## Match dimensions

`label` glob, `persona`, `minDepth` / `maxDepth`, and `faculty` (exact). Faculty also feeds `roles[faculty]` when no rule hits.

## Consequences

- Survives DSH upgrades as long as `agent/created` and `agent/request` exist.
- Load order matters: `route-recipes` before this bundle, and this bundle after `dsh-web-app` so the listener is outer.
- Resume still honors logged headers (intentional).
- Does not fix LongCat SSE / reasoning passback.
- Does not fail over candidate chains. Chains live on the compiled recipe; only the head is stamped.

See `../dsh-route-recipes/ADR.md`.
