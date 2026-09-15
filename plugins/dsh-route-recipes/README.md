# dsh-route-recipes

Sibling of `dsh-route-authority`. Compiles **faculty → slot → candidate head** into the matrix authority already stamps.

It does **not** wrap `agent/request`. It does **not** replace the workflow engine. Skills do not belong in this package except as a thin conductor protocol.

## Why

A skill can tell a model to dispatch. It cannot beat `installModelSelection`. Embedding `longcat/LongCat-2.0` in markdown is how the ACE loop grew four disagreeing model tables.

## Install

From the harness checkout, **after** `dsh-route-authority` is present, add this folder. Load order matters: recipes first.

```bash
cd ~/projects/deepseek-harness
git checkout feature/dsh-route-authority
dsh plugin --profile web add ./plugins/dsh-route-recipes
dsh plugin --profile web add ./plugins/dsh-route-authority
dsh web --dump-config | rg -n "route-recipes|route-authority"
```

`route-recipes` must sit above `route-authority`.

## Config

Defaults live in `lib/schema.js`. Override in `~/.dsh/settings.yaml`:

```yaml
route-recipes:
  activeRecipe: default-eng
```

See `SCHEMA.md` for the full document. See `UX.md` for the card that should edit it.

## Tests

```bash
cd plugins/dsh-route-recipes
node --test tests/*.test.mjs
```

## ACE loop

The 8k `ace-state-machine-loop` skill is retired as a router. What remains is `protocols/ace-conductor.md`: judgment, gates-as-checklist, faculty names. Models come from the active recipe.
