# ADR: last-write route authority as a plugin

## Status

Accepted for the NighmareGit fork as an out-of-tree bundle under `plugins/`.

## Context

`installModelSelection` is the wire owner by design. Patching `selectionFor` in core does not survive mother-repo releases. Community plugins already wrap `subagents.start` or `agent/request`.

## Decision

Ship a Cordis bundle that:

- stamps a route at child start (`subagents.start` / `startContinuable`)
- re-applies it on `agent/request` after `await next()`
- reads the existing `route-policy` settings key

Do not replace workflow runtime or `tool-subagent`.

## Consequences

- Survives DSH upgrades as long as `agent/created` and `agent/request` exist.
- Load order matters: bundle must be after `dsh-web-app` so the listener is outer.
- Resume still honors logged headers (intentional).
- Does not fix LongCat SSE / reasoning passback.
