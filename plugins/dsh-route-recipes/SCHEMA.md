# route-recipes schema

Settings key: `route-recipes` in `~/.dsh/settings.yaml`.
Compiled output: `ctx.routeRecipes.result.compiled` (tiers / rules / roles).

See `lib/schema.js` for the default document. Invariants:

- Faculties never carry `provider` / `model`.
- Recipes never carry `provider` / `model`.
- Every faculty in the active recipe points at a slot, or the recipe has `fallbackSlot`.
- Every slot has at least one candidate with both `provider` and `model`.
- Compiled `tiers[slot]` is candidate `[0]`. Full list is `compiled.chains[slot]`.
- Compiled `rules` match `faculty` and the same id as `label`.
- Compiled `roles[faculty] = { tier }` is the authority persona fallback.

Child start carries faculty, not a route:

```js
subagents.start({ label: 'recon', faculty: 'recon', prompt })
```
