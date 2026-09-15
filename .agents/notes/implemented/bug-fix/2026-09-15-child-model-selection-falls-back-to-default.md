# Agent Note: Child model selection falls back to the deployment default

Status: implemented

English | [中文](2026-09-15-child-model-selection-falls-back-to-default.zh.md)

## Problem

`ApiSessionAgentController.selectionFor().current` decided the route for a fresh Agent (no logged request header) solely from the deployment default (`agentDefaultModel.currentSelection()`). A child Agent spawned under a non-default route — an explicit `honorRequested` provider/model, a `dsh-route-policy` tier, or the parent's live route copied into the child's `AgentOptions` at spawn by `resolveChildAgentOptions` — lost that route on its first request. `installModelSelection` then overwrote the request with the default, so a child started on `longcat/LongCat-2.0` left as `mimo/mimo-v2.5` (the live default on the patched box).

The broken precedence was: UI picked → logged header → default. Explicit child options, route-policy tiers, and parent-live inheritance all lost to the default on a fresh child session.

## Decision

In `selectionFor().current`, when there is no logged request header, prefer the resolved child `AgentOptions` (provider + model, optional effort) over the deployment default. A complete child route wins; a partial route (provider only) and a top-level Agent with no options still fall back to the default. When the child options omit a reasoning effort, the deployment default's effort is inherited so a top-level Agent does not silently drop its configured effort.

The resulting precedence is: UI picked → logged header → child `AgentOptions` (honorRequested / route-policy tier / parent live) → deployment default.

`installModelSelection` in `packages/core/agent/src/model-selection.ts` is unchanged except for a doc comment naming `selectionFor().current` as the single authority for "what model does this request use", so future fixes target `current` rather than adding a second overwrite plugin.

The out-of-tree `dsh-route-policy` plugin's `resolveFor` is not consumed inside the harness; the harness relies on the resolved tier being written into the child's `AgentOptions` before `selectionFor` runs. The code change is independent of that write site.

## Alternatives considered

**Read the parent's live selection directly inside `selectionFor`.** `resolveChildAgentOptions` (`packages/subagent/subagent/src/child-agent.ts`) already copies the parent's live route into the child's `AgentOptions` at spawn via `parentAgentOptionsForDelegation`, which reads the parent's latest request header. Reading `agent.options` reuses that single source instead of re-deriving parent state in the selection layer.

**Add a second overwrite plugin after `installModelSelection`.** Rejected: the brief and the `installModelSelection` contract make `selectionFor().current` the authority; a second overwrite would re-introduce the clobbering the fix removes.

## Consequences

A child Agent that omits a model now keeps its resolved route on the first request instead of falling back to the deployment default. Top-level Agents without `AgentOptions` and partial child routes are unchanged. The change is covered by seven new cases in `packages/api/session-controller/tests/agent.host.spec.ts` (explicit child route, parent-live inheritance, route-policy tier, picked-wins, logged-header-wins, base fallback, partial-route fallback).
