<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from "vue";
import * as echarts from "echarts";
import { rangeQuery, getAlerts, PROMQL } from "@/api/devops";
import type { Alert } from "@/api/devops";

defineOptions({ name: "DevOpsMonitor" });

const metrics = reactive({
  cpu: 45.2,
  mem: 62.8,
  disk: 38.5,
  qps: 128
});

const cpuRef = ref<HTMLElement>();
const memRef = ref<HTMLElement>();
let cpuChart: echarts.ECharts | null = null;
let memChart: echarts.ECharts | null = null;

const alerts = ref<Alert[]>([]);
const alertLoading = ref(false);

const severityType: Record<Alert["severity"], "danger" | "warning" | "info"> = {
  critical: "danger",
  warning: "warning",
  info: "info"
};

function genSeries(base: number, n = 30) {
  return Array.from({ length: n }, (_, i) =>
    Number((base + Math.sin(i / 3) * 10 + Math.random() * 5).toFixed(1))
  );
}

function buildOption(title: string, data: number[]) {
  return {
    title: { text: title, textStyle: { fontSize: 14 } },
    tooltip: { trigger: "axis" },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: "category", data: data.map((_, i) => `${i}m`) },
    yAxis: { type: "value", max: 100 },
    series: [
      {
        data,
        type: "line",
        smooth: true,
        areaStyle: {},
        itemStyle: { color: "#67c23a" }
      }
    ]
  };
}

async function loadMetrics() {
  const now = Math.floor(Date.now() / 1000);
  const start = now - 30 * 60;
  try {
    const [cpu, mem] = await Promise.all([
      rangeQuery(PROMQL.cpuUsage, start, now, 60),
      rangeQuery(PROMQL.memUsage, start, now, 60)
    ]);
    if (cpu.length) {
      cpuChart?.setOption(
        buildOption(
          "CPU 使用率 (%)",
          cpu.map(p => p.value)
        )
      );
    }
    if (mem.length) {
      memChart?.setOption(
        buildOption(
          "内存使用率 (%)",
          mem.map(p => p.value)
        )
      );
    }
  } catch {
    /* Prometheus 未连接，保持占位曲线 */
  }
}

async function loadAlerts() {
  alertLoading.value = true;
  try {
    const list = await getAlerts();
    if (list.length) alerts.value = list;
  } catch {
    /* 保持占位 */
  } finally {
    alertLoading.value = false;
  }
}

onMounted(() => {
  if (cpuRef.value) {
    cpuChart = echarts.init(cpuRef.value);
    cpuChart.setOption(buildOption("CPU 使用率 (%)", genSeries(45)));
  }
  if (memRef.value) {
    memChart = echarts.init(memRef.value);
    memChart.setOption(buildOption("内存使用率 (%)", genSeries(62)));
  }
  loadMetrics();
  loadAlerts();
});

onBeforeUnmount(() => {
  cpuChart?.dispose();
  memChart?.dispose();
});
</script>

<template>
  <div class="p-3">
    <el-row :gutter="16">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="metric-label">CPU</div>
          <div class="metric-value">{{ metrics.cpu }}%</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="metric-label">内存</div>
          <div class="metric-value">{{ metrics.mem }}%</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="metric-label">磁盘</div>
          <div class="metric-value">{{ metrics.disk }}%</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="metric-label">QPS</div>
          <div class="metric-value">{{ metrics.qps }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt-4">
      <el-col :span="12">
        <el-card shadow="hover">
          <div ref="cpuRef" class="chart" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div ref="memRef" class="chart" />
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="mt-4">
      <template #header>告警列表</template>
      <el-table v-loading="alertLoading" :data="alerts" border stripe>
        <el-table-column prop="name" label="告警名" min-width="160" />
        <el-table-column label="级别" width="100">
          <template #default="{ row }">
            <el-tag :type="severityType[row.severity as Alert['severity']]">
              {{ row.severity }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.state === 'firing' ? 'danger' : 'info'">
              {{ row.state }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="summary" label="摘要" min-width="220" />
        <el-table-column prop="startsAt" label="触发时间" width="180" />
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.metric-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.metric-value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 600;
}

.chart {
  width: 100%;
  height: 240px;
}
</style>
