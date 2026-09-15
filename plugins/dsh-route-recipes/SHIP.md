# Ship order

Do not skip ahead. Each step has to work with authority unchanged except the tiny read/match hooks in step 2.

## 1. Compiler (this commit)

- Schema, validate, compile.
- Default faculties / slots / recipes.
- Node tests.
- Plugin publishes `ctx.routeRecipes`.
- Thin ACE conductor protocol. No settings card yet.

## 2. Authority read hook (this commit)

- `decide()` reads `ctx.routeRecipes.result.compiled` before `route-policy`.
- `matchRule` accepts `faculty`.
- Child wrap copies `request.faculty` onto the synthetic header.
- Tests for faculty match.

## 3. Settings card

- Host `installSection('route-recipes')`.
- Client card, three panes as `UX.md`.
- Validate on save, compile on change.
- Manual install: recipes bundle **before** authority in dump-config.

## 4. Session recipe stamp

- Write `recipe:<id>` on session header at start only.
- Resume honors logged route (authority rule unchanged).
- Orchestrator tool: `list_faculties` (read-only). No `set_model`.

## 5. Retire the ACE routing skill

- Point `/ace-state-machine-loop` at `protocols/ace-conductor.md`.
- Delete tier tables from README / USAGE / execution_guide / SKILL.
- Keep faculty-keyed prompts next to the conductor.
- Project policy pack (`:8080`, GPU guest, pytest paths) stays in the ACE repo, not here.

## 6. Availability adapter (later, third plugin)

- Consume `compiled.chains`.
- Pre-token failover + cooldown.
- Do not fold into authority or recipes.

## Done when

- A child started with `faculty: implement` lands on LongCat from `default-eng` even if the orchestrator omitted `provider/model`.
- Switching `activeRecipe` to `local-only` moves that child to Laguna without editing a skill.
- `dsh web --dump-config` shows `route-recipes` then `route-authority` then nothing else claiming the same onion.
