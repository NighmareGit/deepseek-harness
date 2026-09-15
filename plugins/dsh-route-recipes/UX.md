# Settings card — route recipes

Official DSH seam: host `settings.installSection('route-recipes')` + browser `settings.plugin.item` keyed `route-recipes`.
YAML remains the store. The card is the editor. Do not generate the card from nested schema; hand-write three panes.

## Panes

### 1. Slots

- Row per slot: id, description, candidate list.
- Each candidate: provider select (host catalog), model select, optional effort.
- Drag to reorder = availability order. Head is what authority stamps today.
- Badge: configured / missing from host catalog.
- Actions: add slot, delete slot (blocked if a recipe still binds it).

### 2. Faculties

- Frozen default ids from `lib/schema.js`. Custom ids allowed, lowercase + dots.
- One-line description. No provider/model controls on this pane.
- Bindings live on the recipe, so two recipes can disagree.

### 3. Recipes

- Named recipes. Radio for `activeRecipe` (session default).
- Matrix: faculty rows × slot dropdown + fallback slot.
- Presets shipped: `default-eng`, `local-only`.
- Save validates via `validateDocument`. Refuse the write on error; do not compile a partial matrix.

## Session

Composer / session header shows `recipe:<id>` as a read-only pill.
Changing the live parent's model mid-thread is not a card control.
Next child reads the active recipe + its own `faculty`.

## Out of card scope

- Editing `SKILL.md`.
- Intent classification / keyword routing.
- Pre-token failover health graphs (later availability adapter).
- ACE Gate 4 numbers, Triton ports, GPU guest protocol.
