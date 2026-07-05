<script setup lang="ts">
import { ref, reactive } from "vue";
import { getLabelValues, queryRange, type LogEntry } from "@/api/devops";
import type { LogEntry as LogEntryType } from "@/api/devops";

defineOptions({ name: "DevOpsLog" });

const services = ref<string[]>([
  "api-gateway",
  "user-service",
  "order-service"
]);
const query = reactive({
  service: "api-gateway",
  level: "" as "" | LogEntryType["level"],
  keyword: "",
  range: ["", ""] as [string, string] | ["", ""]
});

const logs = ref<LogEntryType[]>([
  {
    timestamp: "2026-07-05 14:20:01",
    level: "info",
    service: "api-gateway",
    message: "GET /api/health 200 12ms"
  },
  {
    timestamp: "2026-07-05 14:20:03",
    level: "warn",
    service: "api-gateway",
    message: "upstream user-service response slow: 850ms"
  },
  {
    timestamp: "2026-07-05 14:20:05",
    level: "error",
    service: "order-service",
    message: "NullPointerException at OrderService.create:42"
  }
]);

const loading = ref(false);

const levelType: Record<LogEntryType["level"], string> = {
  info: "#67c23a",
  warn: "#e6a23c",
  error: "#f56c6c",
  debug: "#909399"
};

function toNs(dateStr: string) {
  if (!dateStr) return undefined;
  return new Date(dateStr).getTime() * 1e6;
}

async function loadServices() {
  try {
    const res = await getLabelValues("service");
    if (res?.data?.length) services.value = res.data;
  } catch {
    /* 保持占位 */
  }
}

async function search() {
  loading.value = true;
  try {
    const end = query.range[1] ? toNs(query.range[1])! : Date.now() * 1e6;
    const start = query.range[0] ? toNs(query.range[0])! : end - 30 * 60 * 1e9;
    let logql = `{service="${query.service}"}`;
    if (query.keyword) logql += ` |= "${query.keyword}"`;

    const list = await queryRange(logql, start, end, 500);
    if (list.length) {
      logs.value = query.level
        ? list.filter(l => l.level === query.level)
        : list;
    }
  } catch {
    /* Loki 未连接，保持占位 */
  } finally {
    loading.value = false;
  }
}

loadServices();
</script>

<template>
  <div class="p-3">
    <el-card shadow="never">
      <div class="toolbar">
        <el-select v-model="query.service" class="w-44" placeholder="服务">
          <el-option v-for="s in services" :key="s" :label="s" :value="s" />
        </el-select>
        <el-select
          v-model="query.level"
          class="w-32"
          placeholder="级别"
          clearable
        >
          <el-option label="info" value="info" />
          <el-option label="warn" value="warn" />
          <el-option label="error" value="error" />
          <el-option label="debug" value="debug" />
        </el-select>
        <el-input
          v-model="query.keyword"
          class="w-52"
          placeholder="关键字"
          clearable
        />
        <el-date-picker
          v-model="query.range"
          type="datetimerange"
          range-separator="-"
          start-placeholder="开始"
          end-placeholder="结束"
          value-format="YYYY-MM-DDTHH:mm:ss"
        />
        <el-button type="primary" :loading="loading" @click="search">
          查询
        </el-button>
      </div>

      <div v-loading="loading" class="log-box">
        <div v-for="(log, i) in logs" :key="i" class="log-line">
          <span class="log-ts">{{ log.timestamp }}</span>
          <span
            class="log-level"
            :style="{ color: levelType[log.level as LogEntryType['level']] }"
          >
            {{ log.level.toUpperCase().padEnd(5) }}
          </span>
          <span class="log-svc">{{ log.service }}</span>
          <span class="log-msg">{{ log.message }}</span>
        </div>
        <div v-if="!logs.length" class="empty">无日志</div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.w-44 {
  width: 176px;
}

.w-32 {
  width: 128px;
}

.w-52 {
  width: 208px;
}

.log-box {
  height: 460px;
  padding: 12px;
  overflow: auto;
  font-family: "Cascadia Code", Consolas, monospace;
  font-size: 13px;
  background: #1e1e1e;
  border-radius: 4px;
}

.log-line {
  display: flex;
  gap: 12px;
  padding: 2px 0;
  color: #d4d4d4;
}

.log-line:hover {
  background: #2a2a2a;
}

.log-ts {
  flex-shrink: 0;
  color: #888;
}

.log-level {
  flex-shrink: 0;
  font-weight: 600;
}

.log-svc {
  flex-shrink: 0;
  color: #569cd6;
}

.log-msg {
  word-break: break-all;
  white-space: pre-wrap;
}

.empty {
  padding: 40px 0;
  color: #666;
  text-align: center;
}
</style>
