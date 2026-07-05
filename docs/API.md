# DevOps 看板 · API 对接清单

本看板通过 Vite 代理对接本地各开源 DevOps 工具。所有请求封装在 `src/api/devops/` 下，开发期经 `vite.config.ts` 的 `server.proxy` 转发，避免浏览器跨域。

> 生产环境不要直连这些工具，应由 BFF（`/api/devops`）统一中转：隐藏内部地址、集中鉴权、聚合数据。

---

## 一、工具与端口映射

| 工具          | 角色                      | 本地端口 | 代理前缀      | 鉴权方式                                                     | API 模块        |
| ------------- | ------------------------- | -------- | ------------- | ------------------------------------------------------------ | --------------- |
| Gitea         | 代码仓库 + Actions 流水线 | 3000     | `/gitea`      | Token（query `token=` 或 header `Authorization: token xxx`） | `gitea.ts`      |
| Jenkins       | CI/CD（可选）             | 8080     | `/jenkins`    | Basic Auth + POST 需带 CSRF crumb header `Jenkins-Crumb`     | `jenkins.ts`    |
| Docker Engine | 容器管理                  | 2375     | `/docker`     | 无（仅本地；生产走 2376+TLS 或 BFF）                         | `docker.ts`     |
| Prometheus    | 监控指标 + 告警           | 9090     | `/prometheus` | 无                                                           | `prometheus.ts` |
| Loki          | 日志聚合                  | 3100     | `/loki`       | 无（或 Basic Auth / OrgID header）                           | `loki.ts`       |
| BFF           | 聚合层（自建）            | 3001     | `/api`        | 自定义（建议 JWT）                                           | `index.ts`      |

---

## 二、Gitea API

文档：https://docs.gitea.com/api/ · 基础路径：`/gitea/api/v1`

| 方法 | 路径                                                               | 参数                      | 返回字段（裁剪后）                                                                                                  | 看板用途              |
| ---- | ------------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------- |
| GET  | `/repos/search`                                                    | `uid`, `limit`            | `data[].name`, `data[].owner.login`, `data[].full_name`                                                             | 仓库下拉框            |
| GET  | `/repos/{owner}/{repo}/actions/runs`                               | `page`, `limit`           | `workflow_runs[].id`, `.name`, `.head_branch`, `.status`, `.head_sha`, `.actor.login`, `.created_at`, `.updated_at` | 流水线列表            |
| GET  | `/repos/{owner}/{repo}/actions/runs/{run_id}`                      | —                         | `.status`, `.conclusion`, `.jobs_url`                                                                               | 流水线详情            |
| GET  | `/repos/{owner}/{repo}/actions/runs/{run_id}/logs`                 | —                         | `binary(zip)`                                                                                                       | 构建日志              |
| GET  | `/repos/{owner}/{repo}/actions/workflows`                          | —                         | `workflows[].id`, `.name`, `.path`, `.state`                                                                        | 触发构建时选 workflow |
| POST | `/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches` | body: `{ "ref": "main" }` | `204 No Content`                                                                                                    | 手动触发流水线        |

**字段映射 → `Pipeline`**

| Gitea 字段                | 看板字段    | 转换                                                                                                  |
| ------------------------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| `id`                      | `id`        | 直接                                                                                                  |
| `name` / workflow 名      | `name`      | —                                                                                                     |
| `head_branch`             | `branch`    | —                                                                                                     |
| `status` + `conclusion`   | `status`    | `running`→running；`completed`+`success`→success；`completed`+`failure`→failed；其余→pending/canceled |
| `head_sha`                | `commit`    | 取前 7 位                                                                                             |
| `actor.login`             | `trigger`   | —                                                                                                     |
| `created_at`              | `startedAt` | 格式化                                                                                                |
| `updated_at - created_at` | `duration`  | 秒                                                                                                    |

> 注：Gitea Actions API 在 1.20+ 提供，字段命名对标 GitHub Actions，但部分版本有差异，以实际 Gitea 版本返回为准。

---

## 三、Jenkins API

文档：https://www.jenkins.io/doc/book/using/remote-access-api/ · 基础路径：`/jenkins`

| 方法 | 路径                              | 参数                                                                    | 返回字段                            | 看板用途             |
| ---- | --------------------------------- | ----------------------------------------------------------------------- | ----------------------------------- | -------------------- |
| GET  | `/api/json`                       | `tree=jobs[name,color,url,lastBuild[number,result,timestamp,duration]]` | `jobs[]`                            | Job 列表             |
| GET  | `/job/{name}/api/json`            | `tree=builds[number,result,timestamp,duration,building]{0,N}`           | `builds[]`                          | 构建历史             |
| GET  | `/job/{name}/{build}/api/json`    | —                                                                       | `.result`, `.building`, `.duration` | 构建详情             |
| GET  | `/job/{name}/{build}/consoleText` | —                                                                       | `text/plain` 日志                   | 构建日志             |
| POST | `/job/{name}/build`               | —                                                                       | `201 Location`                      | 触发构建（需 crumb） |
| GET  | `/crumbIssuer/api/json`           | —                                                                       | `{crumb, crumbRequestField}`        | 获取 CSRF crumb      |

**鉴权**：Basic Auth（用户名 + API Token，在 Jenkins 用户设置里生成）。POST 请求必须带 `Jenkins-Crumb: <crumb>` header，否则 403。

**字段映射 → `Pipeline`**：`builds[].number`→`id`，job 名→`name`，`result`(SUCCESS/FAILURE/ABORTED)→`status`，`timestamp`→`startedAt`，`duration`(ms)→`duration`(s)。

---

## 四、Docker Engine API

文档：https://docs.docker.com/reference/api/engine/ · 基础路径：`/docker`（版本 `/v1.47` 可省，daemon 自动协商）

| 方法 | 路径                       | 参数                             | 返回字段                                                  | 看板用途 |
| ---- | -------------------------- | -------------------------------- | --------------------------------------------------------- | -------- |
| GET  | `/containers/json`         | `all=true`                       | `[{Id, Names[], Image, State, Status, Ports[], Created}]` | 容器列表 |
| POST | `/containers/{id}/start`   | —                                | `204`                                                     | 启动     |
| POST | `/containers/{id}/stop`    | `t`(超时秒)                      | `204`                                                     | 停止     |
| POST | `/containers/{id}/restart` | `t`                              | `204`                                                     | 重启     |
| GET  | `/containers/{id}/stats`   | `stream=false`                   | `.cpu_stats`, `.memory_stats`                             | 资源占用 |
| GET  | `/containers/{id}/logs`    | `stdout=true&stderr=true&tail=N` | `text/plain`（带 Docker 流头）                            | 容器日志 |
| GET  | `/images/json`             | —                                | `[{Id, RepoTags, Size}]`                                  | 镜像列表 |

**开启 :2375**：编辑 Docker `daemon.json` 加 `"hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"]`，重启 Docker。**仅本地用**，无鉴权。

**字段映射 → `Container`**：`Id`→`id`，`Names[0]`(去前导 `/`)→`name`，`Image`→`image`，`State`→`status`，`Status`→`state`，`Ports`→`ports`(拼字符串)，`Created`→`createdAt`。

---

## 五、Prometheus API

文档：https://prometheus.io/docs/prometheus/latest/querying/api/ · 基础路径：`/prometheus/api/v1`

| 方法 | 路径             | 参数                                     | 返回                                | 看板用途           |
| ---- | ---------------- | ---------------------------------------- | ----------------------------------- | ------------------ |
| GET  | `/query`         | `query`(PromQL)                          | `data.result[].value[ts, "val"]`    | 即时值（指标卡片） |
| GET  | `/query_range`   | `query`, `start`(s), `end`(s), `step`(s) | `data.result[].values[][ts, "val"]` | 时间序列（曲线）   |
| GET  | `/alerts`        | —                                        | `data.alerts[]`                     | 告警列表           |
| GET  | `/alertmanagers` | —                                        | —                                   | Alertmanager 状态  |

**预设 PromQL**（见 `prometheus.ts` 的 `PROMQL`）：

- CPU：`100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)`
- 内存：`(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100`
- 磁盘：`(1 - node_filesystem_avail_bytes{...} / node_filesystem_size_bytes{...}) * 100`
- QPS：`sum(rate(http_requests_total[1m]))`

**字段映射 → `MetricPoint`**：`values[][ts, val]` → `{ timestamp: ts*1000, value: Number(val) }`。
**字段映射 → `Alert`**：`labels.alertname`→`name`，`labels.severity`→`severity`，`state`→`state`，`annotations.summary`→`summary`，`startsAt`→`startsAt`。

> 需部署 `node_exporter` 才有 CPU/内存/磁盘指标。

---

## 六、Loki API

文档：https://grafana.com/docs/loki/latest/reference/api/ · 基础路径：`/loki`

| 方法 | 路径                           | 参数                                                         | 返回                                          | 看板用途           |
| ---- | ------------------------------ | ------------------------------------------------------------ | --------------------------------------------- | ------------------ |
| GET  | `/api/v1/labels`               | —                                                            | `data[]`                                      | 标签列表           |
| GET  | `/api/v1/label/{label}/values` | —                                                            | `data[]`                                      | 标签值（服务下拉） |
| GET  | `/api/v1/query_range`          | `query`(LogQL), `start`(ns), `end`(ns), `limit`, `direction` | `data.result[].stream`, `.values[][ns, line]` | 日志检索           |

**关键差异**：Loki 时间戳是**纳秒**（不是秒），`start`/`end` 需乘 1e9。

**LogQL 示例**：

- 单服务：`{service="api-gateway"}`
- 含关键字：`{service="api-gateway"} |= "error"`
- 多服务：`{service=~"api-gateway|user-service"}`

**字段映射 → `LogEntry`**：`values[][ns, line]` → `{ timestamp: ISO, level: detectLevel(line), service: stream.service, message: line }`。级别按关键字识别（error/warn/debug/info）。

> 需部署 `promtail`（或 Grafana Alloy）采集容器日志并打 `service` 标签。

---

## 七、BFF 聚合接口（自建）

基础路径：`/api/devops` · 建议用 Node.js(Nest/Fastify) 或 Go 实现。

| 方法 | 路径                     | 入参                       | 返回                              | 用途                                                                |
| ---- | ------------------------ | -------------------------- | --------------------------------- | ------------------------------------------------------------------- |
| GET  | `/overview/stats`        | —                          | `OverviewStats`                   | 概览大屏（聚合 Docker 服务数 + Gitea 流水线数 + Prometheus 告警数） |
| GET  | `/deploys`               | `page`, `limit`            | `{ list: DeployRecord[], total }` | 部署历史                                                            |
| POST | `/deploys`               | `{ version, environment }` | `void`                            | 触发部署                                                            |
| POST | `/deploys/{id}/rollback` | —                          | `void`                            | 回滚                                                                |

**BFF 职责**：

1. 聚合多工具数据（一次前端请求 → 后端并发调多个工具）
2. 记录部署历史（写自己的 DB，Gitea/Jenkins 不存这个）
3. 统一鉴权（前端只跟 BFF 通信，工具凭证留后端）
4. 转发 Docker/Jenkins 等需鉴权/CSRF 的操作

---

## 八、错误处理约定

- 所有 API 在 `src/utils/http` 的响应拦截器中统一处理 401（登出）、403（无权限）、5xx（提示）。
- 看板页面用 try/catch 包裹请求，失败时保留占位数据，不阻塞渲染。
- 各工具未启动时，对应页面显示占位数据 + 控制台报错，不影响其他模块。
