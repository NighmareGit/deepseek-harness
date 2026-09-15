# dsh-route-authority

Drop-in DeepSeek Harness bundle that owns **child LLM routing** for in-process subagents and workflow children.

It does **not** fork `selectionFor` or replace the workflow engine. Core `installModelSelection` may still overwrite `provider`/`model` after `agent/request`; this plugin wraps that waterfall and writes the stamped route back.

## Why

DSH child create paths accept `AgentOptions.model`, then `selectionFor().current` ignores them and falls through to `agent-default-model`. On a machine whose default is `jupiter-ai/Laguna-XS-2.1-APEX` while `route-policy` says LongCat, children silently run Laguna.

## Precedence

1. UI picked (this agent only)
2. Durable `request/header` on resume
3. Explicit child `AgentOptions` (`honorRequested`)
4. `route-policy` / `route-authority.matrix` tiers
5. Parent live stamp or last parent header
6. `agent-default-model`

## Install

From this checkout:

```bash
cd ~/projects/deepseek-harness
git checkout feature/dsh-route-authority
dsh plugin --profile web add ./plugins/dsh-route-authority
```

Confirm the row loads **after** the web-app bundle:

```bash
dsh web --dump-config | rg -n "route-authority|tool-subagent"
```

Open a **new** session. Existing sessions stay on their last logged header.

## Config

Bundle defaults live in `cordis.patch.yml`. The resolver also reads `route-policy` from `~/.dsh/settings.yaml` so an existing matrix keeps working. Optional override:

```yaml
route-authority:
  matrix:
    tiers:
      longcat-300k: { provider: longcat, model: LongCat-2.0 }
    rules:
      - match: { label: "verify*", minDepth: 1, maxDepth: 1 }
        select: { tier: longcat-300k }
```

## Tests

```bash
cd plugins/dsh-route-authority
node --test tests/*.test.mjs
```

## Not in scope

LongCat thinking / `reasoning_content` passback after tool calls. That is an adapter problem (`llm-pi-ai` vs `dsh-llm-longcat`), not a router problem.
