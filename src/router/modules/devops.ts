const Layout = () => import("@/layout/index.vue");

export default {
  path: "/devops",
  name: "DevOps",
  component: Layout,
  redirect: "/devops/overview",
  meta: {
    icon: "ri/server-line",
    title: "DevOps 看板",
    rank: 1
  },
  children: [
    {
      path: "/devops/overview",
      name: "DevOpsOverview",
      component: () => import("@/views/devops/overview/index.vue"),
      meta: {
        icon: "ri/dashboard-line",
        title: "概览大屏"
      }
    },
    {
      path: "/devops/pipeline",
      name: "DevOpsPipeline",
      component: () => import("@/views/devops/pipeline/index.vue"),
      meta: {
        icon: "ri/git-branch-line",
        title: "流水线管理"
      }
    },
    {
      path: "/devops/container",
      name: "DevOpsContainer",
      component: () => import("@/views/devops/container/index.vue"),
      meta: {
        icon: "ri/stack-line",
        title: "容器服务"
      }
    },
    {
      path: "/devops/monitor",
      name: "DevOpsMonitor",
      component: () => import("@/views/devops/monitor/index.vue"),
      meta: {
        icon: "ri/pulse-line",
        title: "监控告警"
      }
    },
    {
      path: "/devops/deploy",
      name: "DevOpsDeploy",
      component: () => import("@/views/devops/deploy/index.vue"),
      meta: {
        icon: "ri/rocket-2-line",
        title: "部署历史"
      }
    },
    {
      path: "/devops/log",
      name: "DevOpsLog",
      component: () => import("@/views/devops/log/index.vue"),
      meta: {
        icon: "ri/file-text-line",
        title: "日志查看"
      }
    }
  ]
} satisfies RouteConfigsTable;
