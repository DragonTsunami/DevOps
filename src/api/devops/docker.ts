import { http } from "@/utils/http";
import type { Container } from "./types";

/**
 * Docker Engine API —— 容器管理
 * 官方文档: https://docs.docker.com/reference/api/engine/
 * 本地代理: /docker -> http://localhost:2375 （需在 Docker daemon.json 开启 :2375 或用 socat 转发）
 * 安全提示: 2375 无鉴权，仅本地用；生产请走 2376 + TLS 或经后端 BFF 代理
 */
const BASE = "/docker";

/** 容器列表（all=true 含已停止的） */
export const getContainers = (all = true) => {
  return http.request<Container[]>("get", `${BASE}/containers/json`, {
    params: { all }
  });
};

/** 启动容器 */
export const startContainer = (id: string) => {
  return http.request<void>("post", `${BASE}/containers/${id}/start`);
};

/** 停止容器 */
export const stopContainer = (id: string, timeout = 10) => {
  return http.request<void>("post", `${BASE}/containers/${id}/stop`, {
    params: { t: timeout }
  });
};

/** 重启容器 */
export const restartContainer = (id: string, timeout = 10) => {
  return http.request<void>("post", `${BASE}/containers/${id}/restart`, {
    params: { t: timeout }
  });
};

/** 容器资源占用（CPU/内存，单次快照） */
export const getContainerStats = (id: string) => {
  return http.request<any>("get", `${BASE}/containers/${id}/stats`, {
    params: { stream: false }
  });
};

/** 容器日志（非流式，取最近 N 行） */
export const getContainerLogs = (id: string, tail = 200) => {
  return http.request<string>("get", `${BASE}/containers/${id}/logs`, {
    params: { stdout: true, stderr: true, tail },
    responseType: "text"
  });
};

/** 镜像列表 */
export const getImages = () => {
  return http.request<any[]>("get", `${BASE}/images/json`);
};
