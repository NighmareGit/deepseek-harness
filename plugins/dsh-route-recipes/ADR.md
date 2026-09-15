# ADR: route recipes as a sibling compiler

## Status

Accepted for the NighmareGit fork as an out-of-tree bundle under `plugins/dsh-route-recipes`.

## Context

`dsh-route-authority` already owns last-write enforcement. Skills such as `ace-state-machine-loop` tried to plug the missing *selection vocabulary* by embedding provider/model tables in markdown. That hits a wall: a skill cannot stamp a child route, four files drift, and a rate-limit on one model kills the whole protocol.

Two waterfalls were being collapsed:

- **Authority** — who may name the route (already in `dsh-route-authority`).
- **Binding** — which *faculty* a task needs, which *slot* of silicon is allowed, which concrete route is the current head of that slot.

## Decision

Ship a **sibling** plugin that compiles a recipe document into the matrix authority already reads.

- Authority stays last-write enforcement. It does not grow a recipe editor.
- Recipes stay a config compiler. They do not wrap `agent/request`.
- Skills do not bind models. They declare **faculties**.
- The ACE state-machine *loop as a router* is discarded. A thin conductor protocol remains for judgment only.

### Layers

| Layer | Name | Owner |
|---|---|---|
| 0 | Route (`provider/model/effort`) | slot candidate head; availability later |
| 1 | Slot (silicon class + candidate chain) | `route-recipes.slots` |
| 2 | Work kind (child label / depth) | workflow; already matched by authority |
| 3 | Faculty (competence the task needs) | `route-recipes.faculties` |
| — | Recipe (faculty → slot) | `route-recipes.recipes` + `activeRecipe` |
| — | Skill | conductor text only |
| — | Plugin | compiler (this) + authority (sibling) |

### Why sibling, not the same package

Deletion test: recipes can vanish and a hand-written `route-policy` still works. Authority can vanish and recipes become comments. Merging them would make the enforcement onion own UX schema, and mother-repo rebases would have to absorb both.

Load order: `route-recipes` **before** `route-authority`. Compiler publishes `ctx.routeRecipes.result.compiled`. Authority reads that, then `route-authority.matrix`, then legacy `route-policy`.

### ACE skill

Keep: dispatch-don't-execute, `[EXISTING]`/`[NEW]`, thin tickets, honest FAIL, compaction JSON, faculty-keyed system prompts.

Discard as harness concerns: tier-model tables, `AVAILABLE_AGENTS` as a model map, `subagent(provider, model)`, Triton port maps, Gitea push, four-file duplication of the same matrix.

Project safety (`:8080`/`:8082`, GPU guest, no `unwrap()`) stays a **project policy pack**, not a routing plugin.

## Consequences

- One resolver. Two documents.
- Settings card (see `UX.md`) edits slots / faculties / recipes. YAML is the store, not the UX.
- Candidate chains are stored now; only the head is stamped today. Pre-token failover is a later availability adapter, not a third resolver.
- Session picks a recipe once. State transitions change the *next child's faculty*, not the live parent's model.

## See also

- `SCHEMA.md` — document shape
- `UX.md` — settings card
- `SHIP.md` — order of work
- `protocols/ace-conductor.md` — thin replacement for the 8k skill
- `../dsh-route-authority/ADR.md` — enforcement
