import { http } from "@/utils/http";
import type { Pipeline } from "./types";

/**
 * Jenkins API —— CI/CD 流水线（如果用 Jenkins 代替 Gitea Actions）
 * 官方文档: https://www.jenkins.io/doc/book/using/remote-access-api/
 * 本地代理: /jenkins -> http://localhost:8080
 * 注意: Jenkins API 返回不是标准 REST，字段较杂，下面做了裁剪
 */
const BASE = "/jenkins";

/** 递归树形查询参数，控制返回字段，减少传输 */
const tree = "jobs[name,color,url,lastBuild[number,result,timestamp,duration]]";

/** Job 列表（带最近一次构建信息） */
export const getJobs = () => {
  return http.request<{ jobs: any[] }>("get", `${BASE}/api/json`, {
    params: { tree }
  });
};

/** 某 Job 的构建历史 */
export const getBuilds = (jobName: string, limit = 20) => {
  return http.request<{ builds: Pipeline[] }>(
    "get",
    `${BASE}/job/${jobName}/api/json`,
    {
      params: {
        tree: `builds[number,result,timestamp,duration,building]{0,${limit}}`
      }
    }
  );
};

/** 触发构建（需带 CSRF token，Jenkins 默认开启） */
export const triggerBuild = (jobName: string) => {
  return http.request<void>("post", `${BASE}/job/${jobName}/build`);
};

/** 获取某次构建的控制台日志 */
export const getBuildLog = (jobName: string, buildNumber: number) => {
  return http.request<string>(
    "get",
    `${BASE}/job/${jobName}/${buildNumber}/consoleText`
  );
};

/** 实时日志流（Server-Sent Events，需后端中转，浏览器无法直接吃 Jenkins 的 crumb） */
export const streamBuildLog = (jobName: string, buildNumber: number) => {
  return `${BASE}/job/${jobName}/${buildNumber}/consoleText`;
};
