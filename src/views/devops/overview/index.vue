<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from "vue";
import * as echarts from "echarts";
import { getOverviewStats } from "@/api/devops";

defineOptions({ name: "DevOpsOverview" });

const stats = reactive({
  serviceTotal: 12,
  serviceRunning: 10,
  pipelineTotal: 48,
  pipelineSuccess: 45,
  deployToday: 6,
  alertActive: 2
});

const cpuRef = ref<HTMLElement>();
const memRef = ref<HTMLElement>();
let cpuChart: echarts.ECharts | null = null;
let memChart: echarts.ECharts | null = null;

function genSeries(base: number, n = 30) {
  return Array.from({ length: n }, (_, i) =>
    Number((base + Math.sin(i / 3) * 8 + Math.random() * 4).toFixed(1))
  );
}

function buildLineOption(title: string, data: number[]) {
  return {
    title: { text: title, left: "left", textStyle: { fontSize: 14 } },
    tooltip: { trigger: "axis" },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: "category", data: data.map((_, i) => i), show: false },
    yAxis: { type: "value", max: 100 },
    series: [
      {
        data,
        type: "line",
        smooth: true,
        areaStyle: {},
        itemStyle: { color: "#409eff" }
      }
    ]
  };
}

async function loadStats() {
  try {
    // 真实环境调 BFF 聚合接口；后端没起时保留占位数据
    const data = await getOverviewStats();
    Object.assign(stats, data);
  } catch {
    /* 保持占位数据 */
  }
}

onMounted(() => {
  loadStats();
  if (cpuRef.value) {
    cpuChart = echarts.init(cpuRef.value);
    cpuChart.setOption(buildLineOption("CPU 使用率 (%)", genSeries(45)));
  }
  if (memRef.value) {
    memChart = echarts.init(memRef.value);
    memChart.setOption(buildLineOption("内存使用率 (%)", genSeries(62)));
  }
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
          <div class="stat-label">服务总数</div>
          <div class="stat-value">
            {{ stats.serviceRunning }} / {{ stats.serviceTotal }}
          </div>
          <div class="stat-sub">运行中 / 总数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-label">流水线（近 7 天）</div>
          <div class="stat-value success">
            {{ stats.pipelineSuccess }} / {{ stats.pipelineTotal }}
          </div>
          <div class="stat-sub">成功 / 总数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-label">今日部署</div>
          <div class="stat-value">{{ stats.deployToday }}</div>
          <div class="stat-sub">次</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-label">活跃告警</div>
          <div class="stat-value" :class="{ danger: stats.alertActive > 0 }">
            {{ stats.alertActive }}
          </div>
          <div class="stat-sub">条</div>
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
  </div>
</template>

<style scoped>
.stat-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.stat-value {
  margin: 8px 0 4px;
  font-size: 32px;
  font-weight: 600;
}

.stat-value.success {
  color: var(--el-color-success);
}

.stat-value.danger {
  color: var(--el-color-danger);
}

.stat-sub {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.chart {
  width: 100%;
  height: 260px;
}
</style>
