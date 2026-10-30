# W1 数据源实测验证记录 (FxTwitter API)

- **测试日期**：2026-10-30
- **测试环境**：Windows / PowerShell / curl 8.x
- **目标端点**：`https://api.fxtwitter.com/2/profile/{handle}` 及 `/statuses`

---

## 1. CORS 跨域测试（端点：`/2/profile/coldmountainlab`）

### 1.1 OPTIONS 预检请求
```http
OPTIONS /2/profile/coldmountainlab HTTP/1.1
Origin: https://xxx.github.io
Access-Control-Request-Method: GET
```

**响应头实测结果：**
```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
```

### 1.2 GET 实际请求
```http
GET /2/profile/coldmountainlab HTTP/1.1
Origin: https://xxx.github.io
User-Agent: xpersona
```

**响应头与状态：**
```http
HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: *
```

- **结论**：**CORS 验证 100% 通过**，前端浏览器可直连，无需中间代理即可拉取公开数据。

---

## 2. 推文列表（Timeline）深度与字段测试

### 2.1 翻页深度测试
连续执行 5 页（每页约 20 条）拉取：
- **Batch 1**: 21 条推文，返回游标 `DAAHCgABHV3AgQD...`
- **Batch 2**: 20 条推文，返回下一游标
- **Batch 3**: 20 条推文
- **Batch 4**: 20 条推文
- **Batch 5**: 21 条推文
- **累计拉取**：102 条推文，用时 < 2.5 秒，未触发限流。

### 2.2 字段齐全度
实测返回 JSON 中包含的核心字段：
- `id`: 推文唯一 ID (string)
- `text`: 文本内容
- `raw_text.facets`: 结构化标签（话题 `#hashtag`、媒体链接等）
- `created_at` / `created_timestamp`: 发推时间戳
- `views`: 真实阅读量（存在）
- `likes`, `reposts`, `replies`, `quotes`: 互动核心四维数据
- `lang`: 语言代码（如 `zh`, `en` 或 `null`）
- `replying_to`: 回复对象信息（用于判断是否为回复及对话对象集中度）
- `reposted_by`: 转推信息（用于分离原创与转推）
- `media`: 媒体元数据

- **结论**：字段完整度满足特征工程所需的所有 40 项指标。

---

## 3. 架构落地结论

- **L1（FxTwitter 官方公共实例）保持为默认数据源**。
- **本地缓存策略（IndexedDB）**：设定 TTL = 24 小时，避免重复消耗公共节点额度。
- **分批节奏**：建议连续拉取时每页间隔 150-200ms，拉取目标设定为 150 ~ 200 条即可覆盖绝大多数人格特征。
