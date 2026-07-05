<script setup lang="ts">
import { ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  getContainers,
  startContainer,
  stopContainer,
  restartContainer
} from "@/api/devops";
import type { Container } from "@/api/devops";

defineOptions({ name: "DevOpsContainer" });

const loading = ref(false);

const containers = ref<Container[]>([
  {
    id: "c1",
    name: "devops-gitea",
    image: "gitea/gitea:1.22",
    status: "running",
    state: "Up 2 hours",
    ports: "3000->3000, 2222->22",
    createdAt: "2026-07-05 08:00"
  },
  {
    id: "c2",
    name: "devops-jenkins",
    image: "jenkins/jenkins:lts",
    status: "running",
    state: "Up 2 hours",
    ports: "8080->8080",
    createdAt: "2026-07-05 08:01"
  },
  {
    id: "c3",
    name: "devops-dashboard",
    image: "devops-dashboard:latest",
    status: "exited",
    state: "Exited 5 minutes ago",
    ports: "-",
    createdAt: "2026-07-05 09:30"
  }
]);

const statusType: Record<Container["status"], "success" | "warning" | "info"> =
  {
    running: "success",
    exited: "info",
    paused: "warning",
    restarting: "warning"
  };

async function load() {
  loading.value = true;
  try {
    const list = await getContainers();
    if (Array.isArray(list) && list.length) containers.value = list;
  } catch {
    /* 保持占位 */
  } finally {
    loading.value = false;
  }
}

async function doAction(row: Container, action: "start" | "stop" | "restart") {
  await ElMessageBox.confirm(
    `确认对容器 [${row.name}] 执行 ${action} 操作？`,
    "提示",
    { type: "warning" }
  );
  const fn =
    action === "start"
      ? startContainer
      : action === "stop"
        ? stopContainer
        : restartContainer;
  try {
    await fn(row.id);
    ElMessage.success(`${action} 已执行`);
    load();
  } catch {
    ElMessage.error(`${action} 失败（Docker daemon 未连接）`);
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

      <el-table v-loading="loading" :data="containers" border stripe>
        <el-table-column prop="name" label="容器名" min-width="180" />
        <el-table-column prop="image" label="镜像" min-width="180" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType[row.status as Container['status']]">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="state" label="详情" min-width="150" />
        <el-table-column prop="ports" label="端口映射" min-width="180" />
        <el-table-column prop="createdAt" label="创建时间" width="160" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="success"
              :disabled="row.status === 'running'"
              @click="doAction(row, 'start')"
            >
              启动
            </el-button>
            <el-button
              link
              type="warning"
              :disabled="row.status !== 'running'"
              @click="doAction(row, 'stop')"
            >
              停止
            </el-button>
            <el-button link type="primary" @click="doAction(row, 'restart')">
              重启
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
