/**
 * DevOps 看板公共类型定义
 * 对应各开源工具 API 返回的字段（已做裁剪，只保留看板需要的）
 */

/** 通用接口响应 */
export interface Result<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

/** 概览统计 */
export interface OverviewStats {
  serviceTotal: number;
  serviceRunning: number;
  pipelineTotal: number;
  pipelineSuccess: number;
  deployToday: number;
  alertActive: number;
}

/** 流水线 / CI 运行记录 */
export interface Pipeline {
  id: number;
  name: string;
  branch: string;
  status: "success" | "running" | "failed" | "pending" | "canceled";
  commit: string;
  trigger: string;
  startedAt: string;
  duration: number; // 秒
}

/** 容器 */
export interface Container {
  id: string;
  name: string;
  image: string;
  status: "running" | "exited" | "paused" | "restarting";
  state: string;
  ports: string;
  createdAt: string;
}

/** 部署记录 */
export interface DeployRecord {
  id: number;
  version: string;
  environment: "dev" | "staging" | "prod";
  status: "success" | "failed" | "rollback" | "in_progress";
  operator: string;
  deployedAt: string;
}

/** 监控指标点 */
export interface MetricPoint {
  timestamp: number;
  value: number;
}

/** 告警 */
export interface Alert {
  id: string;
  name: string;
  severity: "critical" | "warning" | "info";
  state: "firing" | "resolved";
  summary: string;
  startsAt: string;
}

/** 日志条目 */
export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  service: string;
  message: string;
}
