<script setup lang="ts">
import { ref, reactive } from "vue";
import { ElMessage } from "element-plus";
import { getPipelineRuns, dispatchWorkflow, getRunLogs } from "@/api/devops";
import type { Pipeline } from "@/api/devops";

defineOptions({ name: "DevOpsPipeline" });

const owner = ref("your-org");
const repo = ref("your-repo");
const loading = ref(false);

// 占位数据（后端未就绪时展示）
const pipelines = ref<Pipeline[]>([
  {
    id: 1,
    name: "build-and-test",
    branch: "main",
    status: "success",
    commit: "a1b2c3d",
    trigger: "zhangsan",
    startedAt: "2026-07-05 10:24",
    duration: 186
  },
  {
    id: 2,
    name: "deploy-staging",
    branch: "feature/login",
    status: "running",
    commit: "e4f5g6h",
    trigger: "lisi",
    startedAt: "2026-07-05 11:02",
    duration: 45
  },
  {
    id: 3,
    name: "build-and-test",
    branch: "main",
    status: "failed",
    commit: "i7j8k9l",
    trigger: "CI",
    startedAt: "2026-07-05 09:18",
    duration: 92
  }
]);

const logVisible = ref(false);
const logContent = ref("");
const logLoading = ref(false);

const statusMap: Record<
  Pipeline["status"],
  { type: "success" | "warning" | "danger" | "info"; text: string }
> = {
  success: { type: "success", text: "成功" },
  running: { type: "warning", text: "运行中" },
  failed: { type: "danger", text: "失败" },
  pending: { type: "info", text: "排队" },
  canceled: { type: "info", text: "已取消" }
};

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

async function loadPipelines() {
  loading.value = true;
  try {
    // 真实调用 Gitea Actions（或 Jenkins getBuilds）
    const res = await getPipelineRuns(owner.value, repo.value);
    if (res?.workflow_runs?.length) pipelines.value = res.workflow_runs;
  } catch {
    /* 保持占位 */
  } finally {
    loading.value = false;
  }
}

async function triggerBuild(row: Pipeline) {
  try {
    await dispatchWorkflow(owner.value, repo.value, row.name, row.branch);
    ElMessage.success(`已触发流水线：${row.name}`);
    loadPipelines();
  } catch {
    ElMessage.error("触发失败，请检查 Gitea 是否可达");
  }
}

async function viewLog(row: Pipeline) {
  logVisible.value = true;
  logLoading.value = true;
  logContent.value = "";
  try {
    const log = await getRunLogs(owner.value, repo.value, row.id);
    logContent.value = log || `[流水线 ${row.name} #${row.id}] 暂无日志`;
  } catch {
    logContent.value = `[流水线 ${row.name} #${row.id}]\n日志加载失败（Gitea 未连接），这是骨架占位。`;
  } finally {
    logLoading.value = false;
  }
}

loadPipelines();
</script>

<template>
  <div class="p-3">
    <el-card shadow="never">
      <div class="toolbar">
        <el-input v-model="owner" class="w-40" placeholder="owner" />
        <el-input v-model="repo" class="w-40" placeholder="repo" />
        <el-button type="primary" :loading="loading" @click="loadPipelines">
          刷新
        </el-button>
      </div>

      <el-table v-loading="loading" :data="pipelines" border stripe>
        <el-table-column prop="name" label="流水线" min-width="160" />
        <el-table-column prop="branch" label="分支" width="140">
          <template #default="{ row }">
            <el-tag size="small">{{ row.branch }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status as Pipeline['status']].type">
              {{ statusMap[row.status as Pipeline["status"]].text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="commit" label="Commit" width="110" />
        <el-table-column prop="trigger" label="触发者" width="100" />
        <el-table-column prop="startedAt" label="开始时间" width="160" />
        <el-table-column label="耗时" width="100">
          <template #default="{ row }">
            {{ fmtDuration(row.duration) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :disabled="row.status === 'running'"
              @click="triggerBuild(row)"
            >
              重跑
            </el-button>
            <el-button link type="primary" @click="viewLog(row)"
              >日志</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="logVisible" title="构建日志" width="800">
      <pre v-loading="logLoading" class="log-box">{{ logContent }}</pre>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.w-40 {
  width: 160px;
}

.log-box {
  height: 420px;
  padding: 12px;
  margin: 0;
  overflow: auto;
  font-family: "Cascadia Code", Consolas, monospace;
  font-size: 13px;
  color: #d4d4d4;
  white-space: pre-wrap;
  background: #1e1e1e;
  border-radius: 4px;
}
</style>
