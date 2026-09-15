# Agent Note: 子代理模型选择回退到部署默认值

Status: implemented

[English](2026-09-15-child-model-selection-falls-back-to-default.md) | 中文

## 问题

`ApiSessionAgentController.selectionFor().current` 对全新 Agent（无已记录请求头）仅依据部署默认值（`agentDefaultModel.currentSelection()`）决定路由。以非默认路由启动的子代理——显式 `honorRequested` provider/model、`dsh-route-policy` 分层、或由 `resolveChildAgentOptions` 在启动时复制到子代理 `AgentOptions` 中的父代理实时路由——在首次请求时丢失该路由。`installModelSelection` 随后用默认值覆盖请求，导致以 `longcat/LongCat-2.0` 启动的子代理以 `mimo/mimo-v2.5`（补丁机器上的实时默认值）发出。

损坏的优先级为：UI 已选 → 已记录请求头 → 默认值。显式子代理选项、route-policy 分层、父代理实时继承在全新子会话中全部输给默认值。

## 决策

在 `selectionFor().current` 中，当无已记录请求头时，优先采用已解析的子代理 `AgentOptions`（provider + model，可选 effort），而非部署默认值。完整的子路由胜出；部分路由（仅 provider）与无选项的顶级 Agent 仍回退到默认值。当子代理选项省略 reasoning effort 时，继承部署默认值的 effort，避免顶级 Agent 静默丢弃其已配置的 effort。

最终优先级：UI 已选 → 已记录请求头 → 子代理 `AgentOptions`（honorRequested / route-policy 分层 / 父代理实时）→ 部署默认值。

`packages/core/agent/src/model-selection.ts` 中的 `installModelSelection` 除了一条命名 `selectionFor().current` 为"此请求使用哪个模型"的唯一权威的文档注释外未作改动，以便后续修复针对 `current`，而不是添加第二个覆盖插件。

树外 `dsh-route-policy` 插件的 `resolveFor` 在 harness 内部不被消费；harness 依赖已解析的分层在 `selectionFor` 运行前写入子代理的 `AgentOptions`。代码更改独立于该写入位置。

## 备选方案

**在 `selectionFor` 内直接读取父代理实时选择。** `resolveChildAgentOptions`（`packages/subagent/subagent/src/child-agent.ts`）已通过 `parentAgentOptionsForDelegation` 在启动时将父代理实时路由复制到子代理 `AgentOptions` 中，后者读取父代理的最新请求头。读取 `agent.options` 复用该单一来源，而非在选择层重新推导父状态。

**在 `installModelSelection` 后添加第二个覆盖插件。** 已拒绝：简报与 `installModelSelection` 合约将 `selectionFor().current` 定为权威；第二个覆盖插件会重新引入本修复所消除的覆盖行为。

## 后果

省略模型的子代理现在能在首次请求时保持其已解析路由，而非回退到部署默认值。无 `AgentOptions` 的顶级 Agent 与部分子路由不变。该变更由 `packages/api/session-controller/tests/agent.host.spec.ts` 中的 7 个新用例覆盖（显式子路由、父代理实时继承、route-policy 分层、picked 胜出、已记录请求头胜出、基础回退、部分路由回退）。
