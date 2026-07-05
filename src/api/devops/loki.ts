import { http } from "@/utils/http";
import type { LogEntry } from "./types";

/**
 * Loki API —— 日志聚合
 * 官方文档: https://grafana.com/docs/loki/latest/reference/api/
 * 本地代理: /loki -> http://localhost:3100
 */
const BASE = "/loki";

/** 标签列表（用于服务下拉框） */
export const getLabels = () => {
  return http.request<{
    status: string;
    data: string[];
  }>("get", `${BASE}/api/v1/labels`);
};

/** 某个标签的值（如 service 标签下有哪些服务） */
export const getLabelValues = (label: string) => {
  return http.request<{
    status: string;
    data: string[];
  }>("get", `${BASE}/api/v1/label/${label}/values`);
};

/**
 * 范围日志查询
 * @param query LogQL，如 {service="api-gateway"} |= "error"
 * @param start Unix 纳秒（Loki 用纳秒）
 * @param end   Unix 纳秒
 * @param limit 最大返回行数
 */
export const queryRange = (
  query: string,
  start: number,
  end: number,
  limit = 500
): Promise<LogEntry[]> => {
  return http
    .request<{
      status: string;
      data: {
        result: Array<{
          stream: Record<string, string>;
          values: [string, string][]; // [nsTimestamp, logLine]
        }>;
      };
    }>("get", `${BASE}/api/v1/query_range`, {
      params: { query, start, end, limit, direction: "forward" }
    })
    .then(res => {
      const entries: LogEntry[] = [];
      for (const stream of res?.data?.result ?? []) {
        for (const [ns, line] of stream.values) {
          entries.push({
            timestamp: new Date(Number(ns) / 1e6).toISOString(),
            level: detectLevel(line),
            service: stream.stream?.service ?? "unknown",
            message: line
          });
        }
      }
      return entries;
    });
};

/** 简单的日志级别识别（按关键字） */
function detectLevel(line: string): LogEntry["level"] {
  const lower = line.toLowerCase();
  if (lower.includes("error") || lower.includes("err")) return "error";
  if (lower.includes("warn")) return "warn";
  if (lower.includes("debug")) return "debug";
  return "info";
}
