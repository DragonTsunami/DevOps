<script setup lang="ts">
import { ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { getDeployRecords, rollbackDeploy } from "@/api/devops";
import type { DeployRecord } from "@/api/devops";

defineOptions({ name: "DevOpsDeploy" });

const loading = ref(false);

const records = ref<DeployRecord[]>([
  {
    id: 1,
    version: "v1.4.2",
    environment: "prod",
    status: "success",
    operator: "zhangsan",
    deployedAt: "2026-07-05 14:20"
  },
  {
    id: 2,
    version: "v1.4.1",
    environment: "staging",
    status: "success",
    operator: "lisi",
    deployedAt: "2026-07-05 11:05"
  },
  {
    id: 3,
    version: "v1.4.0",
    environment: "prod",
    status: "rollback",
    operator: "CI",
    deployedAt: "2026-07-04 18:42"
  }
]);

const envType: Record<
  DeployRecord["environment"],
  "success" | "warning" | "danger"
> = {
  dev: "success",
  staging: "warning",
  prod: "danger"
};

const statusType: Record<
  DeployRecord["status"],
  "success" | "danger" | "warning" | "info"
> = {
  success: "success",
  failed: "danger",
  rollback: "warning",
  in_progress: "info"
};

async function load() {
  loading.value = true;
  try {
    const res = await getDeployRecords();
    if (res?.list?.length) records.value = res.list;
  } catch {
    /* 保持占位 */
  } finally {
    loading.value = false;
  }
}

async function rollback(row: DeployRecord) {
  await ElMessageBox.confirm(
    `确认将 ${row.environment} 环境回滚到 ${row.version}？`,
    "回滚确认",
    { type: "warning" }
  );
  try {
    await rollbackDeploy(row.id);
    ElMessage.success("回滚指令已下发");
    load();
  } catch {
    ElMessage.error("回滚失败（BFF 未连接）");
  }
}

load();
</script>

<template>
  <div class="p-3">
    <el-card shadow="never">
      <div class="toolbar">
        <el-button type="primary" :loading="loading" @click="load">
          刷新
        </el-button>
      </div>

      <el-table v-loading="loading" :data="records" border stripe>
        <el-table-column prop="version" label="版本" width="120">
          <template #default="{ row }">
            <el-tag>{{ row.version }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="环境" width="100">
          <template #default="{ row }">
            <el-tag
              :type="envType[row.environment as DeployRecord['environment']]"
            >
              {{ row.environment }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusType[row.status as DeployRecord['status']]">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="120" />
        <el-table-column prop="deployedAt" label="部署时间" width="180" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="warning"
              :disabled="row.status === 'in_progress'"
              @click="rollback(row)"
            >
              回滚
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
</style>
