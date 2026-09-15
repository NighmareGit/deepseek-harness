# @deepseek-ai/dsh-web-search-searxng

[English](README.md) | 中文

由 [SearXNG](https://docs.searxng.org/) 支持的 `WebSearchProvider`，用于 harness [web 能力 seam](../web/README.zh.md)（`ctx.web`）。它调用自托管 SearXNG 实例的 `GET /search?q=<query>&format=json` 端点，把扁平 `results[]` 映射为 seam 规范化的 `WebSearchResult`。

这是一个**实现**包：它向 `ctx.web` 注册提供方，不拥有 `ctx.web` 键，也不注册面向模型的工具（后者属于 `@deepseek-ai/dsh-tool-web`）。与 `@deepseek-ai/dsh-web-search-exa` 一样，它是函数／命名空间插件（`inject: ['web']`），负责注册后端，而非默认导出服务。

该提供方**构造上即无密钥**：任何请求都不涉及 API 密钥、凭据引用或机密 —— 仅凭 `baseURL` 即可完成配置。实例必须在 `settings.yml` 中启用 JSON 格式（`search.formats: [html, json]`），否则返回 403。

## 配置

| 配置键 | 默认值 | 含义 |
|---|---|---|
| `baseURL` | `http://127.0.0.1:8888` | 实例基址；请求 `/search` 并携带 `q`、`format=json` 及可选的 `language`。无法解析时提供方不可用。 |
| `language` | （未设置） | 转发给实例的可选 `language` 参数（如 `en`）。未设置时不发送该参数。 |

```yaml
- id: web-search-searxng
  name: '@deepseek-ai/dsh-web-search-searxng'
  config:
    baseURL: http://searxng.lan:8888
```

端点按次解析：组合条目优先，其次 `$SEARXNG_BASE_URL`，最后是默认值 —— 而已提交的 `web-search-searxng:` 设置小节无需重新注册即可覆盖全部，正如 `llm-deepseek:` 对其适配器的做法。

## 映射

SearXNG 返回扁平 `results[]`，不返回生成答案，因此省略 `content`（`answers[]` 即时答案列表刻意不做映射）。每项结果映射为 `WebSearchSource`：`url` ← `url`、`title` ← `title`、`snippet` ← `content`、`publishedAt` ← `publishedDate`。没有 URL 的结果缺少可引用的目标，会被丢弃。`maxResults` 不会发送给实例（其 JSON API 没有结果数控制）；最终上限由 seam 强制执行。提供方失败（HTTP 错误、网络失败、响应体无法解析或结构不符）以 `WebError` `WEB_PROVIDER_ERROR` 呈现；中止请求以 `WEB_ABORTED` 呈现。HTTP 重定向会在访问 `Location` 指向的目标之前被拒绝，并以 `WEB_PROVIDER_ERROR` 呈现。

## 模型体验

通过 [`dsh-tool-web`](../tool-web/README.zh.md) 间接影响；该工具保留此提供方经 `maxResults` 限制的 URL、标题、snippet 与发布日期，或将确切的错误消息 `SearXNG search aborted`、`SearXNG search request failed: <error>` 和 `SearXNG returned an unprocessable response body: <error>` 置于消费方的错误包装层内；即时答案与提供方私有字段不进入上下文。

#### KV Cache 影响

不会直接导致 KV Cache 失效；请求前缀变更由上述消费方负责。

## 已知限制与暂缓事项

- **没有 URL 的结果会被整个丢弃**：没有可映射的可引用目标，因此返回源可能少于请求数量。
- **`maxResults` 仅由 seam 强制执行**：SearXNG 的 JSON API 没有结果数控制，超量返回的实例在抓取之后才被截断。
- **仅暴露 `baseURL`／`language`**：SearXNG 的其他控制项（分类、引擎、安全搜索、时间范围）等待提供方中立的 Service Definition 字段（[seam Agent Note](../../../.agents/notes/implemented/architecture/2026-06-24-web-capability-seam.zh.md)）。
- **中止分类基于错误形态**：只有名为 `AbortError` 的 `DOMException` 映射为 `WEB_ABORTED`；携带自定义原因（如 `dsh-timeout` 的 `TimeoutReason`）的中止以 `WEB_PROVIDER_ERROR` 呈现。
