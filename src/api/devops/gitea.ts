import { http } from "@/utils/http";
import type { Pipeline } from "./types";

/**
 * Gitea API —— 代码仓库 + Gitea Actions 流水线
 * 官方文档: https://docs.gitea.com/api/
 * 本地代理: vite.config.ts 中 /gitea -> http://localhost:3000
 */
const BASE = "/gitea/api/v1";

/** 仓库列表 */
export const getRepos = (uid?: number) => {
  return http.request<{ data: any[]; ok: boolean }>(
    "get",
    `${BASE}/repos/search`,
    { params: { uid, limit: 50 } }
  );
};

/** 列出仓库的 Actions 运行记录（流水线列表） */
export const getPipelineRuns = (
  owner: string,
  repo: string,
  page = 1,
  limit = 20
) => {
  return http.request<{ workflow_runs: Pipeline[]; total_count: number }>(
    "get",
    `${BASE}/repos/${owner}/${repo}/actions/runs`,
    { params: { page, limit } }
  );
};

/** 触发 workflow（手动跑流水线） */
export const dispatchWorkflow = (
  owner: string,
  repo: string,
  workflowId: string,
  ref = "main"
) => {
  return http.request<void>(
    "post",
    `${BASE}/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
    { data: { ref } }
  );
};

/** 获取某次运行的日志 */
export const getRunLogs = (owner: string, repo: string, runId: number) => {
  return http.request<string>(
    "get",
    `${BASE}/repos/${owner}/${repo}/actions/runs/${runId}/logs`
  );
};

/** 获取某次运行详情（含 job/step 状态） */
export const getRunDetail = (owner: string, repo: string, runId: number) => {
  return http.request<any>(
    "get",
    `${BASE}/repos/${owner}/${repo}/actions/runs/${runId}`
  );
};
