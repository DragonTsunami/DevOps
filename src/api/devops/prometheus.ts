import { http } from "@/utils/http";
import type { Alert, MetricPoint } from "./types";

/**
 * Prometheus API —— 监控指标 + 告警
 * 官方文档: https://prometheus.io/docs/prometheus/latest/querying/api/
 * 本地代理: /prometheus -> http://localhost:9090
 */
const BASE = "/prometheus/api/v1";

/** 即时查询（当前值，如 node_memory_MemAvailable_bytes） */
export const instantQuery = (query: string) => {
  return http.request<{
    status: string;
    data: { resultType: string; result: any[] };
  }>("get", `${BASE}/query`, { params: { query } });
};

/**
 * 范围查询（时间序列，画曲线用）
 * @param query  PromQL，如 100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
 * @param start  Unix 秒
 * @param end    Unix 秒
 * @param step   采样步长秒
 */
export const rangeQuery = (
  query: string,
  start: number,
  end: number,
  step = 30
): Promise<MetricPoint[]> => {
  return http
    .request<{
      status: string;
      data: { resultType: string; result: Array<{ values: [number, string] }> };
    }>("get", `${BASE}/query_range`, {
      params: { query, start, end, step }
    })
    .then(res => {
      const series = (res?.data?.result?.[0]?.values ?? []) as [
        number,
        string
      ][];
      return series.map(([ts, val]) => ({
        timestamp: ts * 1000,
        value: Number(val)
      }));
    });
};

/** 当前告警列表 */
export const getAlerts = () => {
  return http
    .request<{
      status: string;
      data: { alerts: any[] };
    }>("get", `${BASE}/alerts`)
    .then(res => {
      return (res?.data?.alerts ?? []).map((a, i): Alert => ({
        id: a.fingerprint ?? String(i),
        name: a.labels?.alertname ?? "unknown",
        severity: a.labels?.severity ?? "info",
        state: a.state ?? "firing",
        summary: a.annotations?.summary ?? "",
        startsAt: a.startsAt ?? ""
      }));
    });
};

/** 常用 PromQL 速查（看板预设） */
export const PROMQL = {
  cpuUsage: '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
  memUsage:
    "(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100",
  diskUsage:
    '(1 - node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes{fstype!~"tmpfs|overlay"}) * 100',
  qps: "sum(rate(http_requests_total[1m]))"
} as const;
