import { http } from "@/utils/http";
import type { OverviewStats, DeployRecord } from "./types";

export * from "./types";
export * from "./gitea";
export * from "./jenkins";
export * from "./docker";
export * from "./prometheus";
export * from "./loki";

/**
 * BFF 聚合接口 —— 后端中转层（Node/Go），聚合各开源工具的数据
 * 避免前端跨域 + 隐藏内部工具地址 + 统一鉴权
 */
const BFF = "/api/devops";

/** 概览统计（服务数←Docker，流水线←Gitea/Jenkins，告警←Prometheus） */
export const getOverviewStats = () =>
  http.request<OverviewStats>("get", `${BFF}/overview/stats`);

/** 部署历史（后端记录，或从 Gitea releases 推导） */
export const getDeployRecords = (page = 1, limit = 20) =>
  http.request<{ list: DeployRecord[]; total: number }>(
    "get",
    `${BFF}/deploys`,
    { params: { page, limit } }
  );

/** 触发部署 */
export const triggerDeploy = (data: {
  version: string;
  environment: DeployRecord["environment"];
}) => http.request<void>("post", `${BFF}/deploys`, { data });

/** 回滚到指定版本 */
export const rollbackDeploy = (id: number) =>
  http.request<void>("post", `${BFF}/deploys/${id}/rollback`);
