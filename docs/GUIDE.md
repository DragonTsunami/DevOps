# DevOps 看板 · 使用指南

基于 [pure-admin-thin](https://github.com/pure-admin/pure-admin-thin)（Vue3 + Vite + Element Plus + ECharts）的 DevOps 运维看板，对接 Gitea / Jenkins / Docker / Prometheus / Loki，本地一键可跑。

> 这是 1-2 个月「学习到实践」DevOps 项目的**前端部分**。后端工具链与一键部署（docker-compose）见文末「工具链对接」。

---

## 一、技术栈

| 类别      | 选型                              |
| --------- | --------------------------------- |
| 框架      | Vue 3.5 + TypeScript + Vite 7     |
| UI        | Element Plus 2.11 + TailwindCSS 4 |
| 状态/路由 | Pinia 3 + Vue Router 4            |
| 图表      | ECharts 6                         |
| HTTP      | axios（已封装 `@/utils/http`）    |
| 包管理    | pnpm（强制）                      |

---

## 二、目录结构

```
devops-dashboard/
├── src/
│   ├── api/devops/              # DevOps 工具 API 封装
│   │   ├── gitea.ts             #   Gitea 仓库 + Actions
│   │   ├── jenkins.ts           #   Jenkins CI/CD
│   │   ├── docker.ts            #   Docker Engine
│   │   ├── prometheus.ts        #   Prometheus 监控 + 告警
│   │   ├── loki.ts              #   Loki 日志
│   │   ├── types.ts             #   公共类型
│   │   └── index.ts             #   BFF 聚合接口 + 统一导出
│   ├── router/modules/
│   │   └── devops.ts            # 看板路由（放进去即自动注册）
│   └── views/devops/
│       ├── overview/index.vue   # 概览大屏
│       ├── pipeline/index.vue   # 流水线管理
│       ├── container/index.vue  # 容器服务
│       ├── monitor/index.vue    # 监控告警
│       ├── deploy/index.vue     # 部署历史
│       └── log/index.vue        # 日志查看
├── docs/
│   ├── API.md                   # API 对接清单（端点/字段映射）
│   └── GUIDE.md                 # 本文档
└── vite.config.ts               # 已配置各工具代理
```

---

## 三、环境要求

- Node.js `^20.19.0 || >=22.13.0`（本机 v24 可用）
- pnpm `>=9`（`npm i -g pnpm` 安装）
- Docker（可选，用于起 DevOps 工具链）

---

## 四、安装运行

```bash
cd devops-dashboard
pnpm install      # 安装依赖（preinstall 强制 pnpm）
pnpm dev          # 启动开发服务器 → http://localhost:8848
```

默认账号（pure-admin 内置 mock）：用户名 `admin`，密码 `admin123`。

登录后左侧菜单会出现 **「DevOps 看板」**，含 6 个子菜单。各页面在工具链未启动时显示**占位数据**，启动后自动切换为真实数据。

---

## 五、看板模块说明

| 模块       | 路径                | 数据源                  | 功能                                           |
| ---------- | ------------------- | ----------------------- | ---------------------------------------------- |
| 概览大屏   | `/devops/overview`  | BFF 聚合                | 服务/流水线/部署/告警统计卡片 + CPU/内存趋势图 |
| 流水线管理 | `/devops/pipeline`  | Gitea Actions / Jenkins | 流水线列表、重跑触发、构建日志                 |
| 容器服务   | `/devops/container` | Docker Engine           | 容器列表、启动/停止/重启                       |
| 监控告警   | `/devops/monitor`   | Prometheus              | CPU/内存/磁盘/QPS 指标 + 告警列表              |
| 部署历史   | `/devops/deploy`    | BFF                     | 版本记录、回滚                                 |
| 日志查看   | `/devops/log`       | Loki                    | 多服务日志检索、级别/关键字过滤                |

---

## 六、DevOps 工具链对接

各工具的本地默认端口已在 `vite.config.ts` 代理好。用 `docker-compose` 一键拉起：

```yaml
# docker-compose.devops.yml（建议放在项目根目录）
version: "3.8"
services:
  gitea:
    image: gitea/gitea:1.22
    ports: ["3000:3000", "2222:22"]
    volumes: ["gitea-data:/data"]
  jenkins:
    image: jenkins/jenkins:lts
    ports: ["8080:8080"]
    volumes: ["jenkins-home:/var/jenkins_home"]
    # 挂载 docker.sock 以便 Jenkins 能调度 Docker
    environment:
      - DOCKER_HOST=unix:///var/run/docker.sock
    volumes:
      - jenkins-home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
  prometheus:
    image: prom/prometheus
    ports: ["9090:9090"]
    volumes: ["./prometheus.yml:/etc/prometheus/prometheus.yml"]
  node-exporter:
    image: prom/node-exporter
    ports: ["9100:9100"]
  loki:
    image: grafana/loki:latest
    ports: ["3100:3100"]
  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./promtail.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml
volumes:
  gitea-data:
  jenkins-home:
```

启动：

```bash
docker compose -f docker-compose.devops.yml up -d
```

> Docker Engine API（:2375）需要在 Docker daemon 配置里单独开启，或让 BFF 通过 `docker.sock` 转发。详见 `docs/API.md` 第四节。

BFF 聚合层（Node/Go）需自行实现，接口见 `docs/API.md` 第七节。

---

## 七、开发指引

### 新增一个看板模块

1. **建页面**：在 `src/views/devops/<module>/index.vue` 新建，`defineOptions({ name: "DevOpsXxx" })`。
2. **加路由**：在 `src/router/modules/devops.ts` 的 `children` 数组里加一项：
   ```ts
   {
     path: "/devops/xxx",
     name: "DevOpsXxx",
     component: () => import("@/views/devops/xxx/index.vue"),
     meta: { icon: "ri/xxx-line", title: "新模块" }
   }
   ```
   路由会被 `import.meta.glob` 自动注册，无需手动 import。
3. **加 API**：在 `src/api/devops/` 下建文件，用 `http.request<T>(method, url, config)`，并在 `index.ts` re-export。
4. **加代理**：若对接新工具，在 `vite.config.ts` 的 `proxy` 里加一条。

### 图表开发

用 ECharts：`import * as echarts from "echarts"`，`onMounted` 里 `echarts.init(ref.value)` + `setOption`，`onBeforeUnmount` 里 `dispose()`。参考 `overview/index.vue`。

### 占位数据约定

每个页面在 `onMounted` 调 API，失败时保留 `ref` 里的占位数据，确保工具链未启动时看板也能展示。

---

## 八、后续路线（按周推进）

- 第 1-2 周：跑通 `pnpm dev` + `docker-compose` 起工具链，验证代理联通
- 第 3-4 周：概览 + 流水线 + 容器三个模块对接真实 API
- 第 5-6 周：监控 + 日志模块（Prometheus / Loki）
- 第 7-8 周：BFF 聚合层 + 部署历史 + 一键部署打包
