import { getPluginsList } from "./build/plugins";
import { include, exclude } from "./build/optimize";
import { type UserConfigExport, type ConfigEnv, loadEnv } from "vite";
import {
  root,
  alias,
  wrapperEnv,
  pathResolve,
  __APP_INFO__
} from "./build/utils";

export default ({ mode }: ConfigEnv): UserConfigExport => {
  const { VITE_CDN, VITE_PORT, VITE_COMPRESSION, VITE_PUBLIC_PATH } =
    wrapperEnv(loadEnv(mode, root));
  return {
    base: VITE_PUBLIC_PATH,
    root,
    resolve: {
      alias
    },
    // 服务端渲染
    server: {
      // 端口号
      port: VITE_PORT,
      host: "0.0.0.0",
      // 本地跨域代理 https://cn.vitejs.dev/config/server-options.html#server-proxy
      // 各 DevOps 工具的代理前缀，对应 src/api/devops/ 下的请求路径
      proxy: {
        // Gitea：代码仓库 + Gitea Actions 流水线
        "/gitea": {
          target: "http://localhost:3000",
          changeOrigin: true,
          rewrite: path => path.replace(/^\/gitea/, "")
        },
        // Jenkins：CI/CD（若用 Jenkins 代替 Gitea Actions）
        "/jenkins": {
          target: "http://localhost:8080",
          changeOrigin: true,
          rewrite: path => path.replace(/^\/jenkins/, "")
        },
        // Docker Engine API：容器管理（需在 daemon.json 开启 :2375，或经 BFF 转发）
        "/docker": {
          target: "http://localhost:2375",
          changeOrigin: true,
          rewrite: path => path.replace(/^\/docker/, "")
        },
        // Prometheus：监控指标 + 告警
        "/prometheus": {
          target: "http://localhost:9090",
          changeOrigin: true,
          rewrite: path => path.replace(/^\/prometheus/, "")
        },
        // Loki：日志聚合
        "/loki": {
          target: "http://localhost:3100",
          changeOrigin: true,
          rewrite: path => path.replace(/^\/loki/, "")
        },
        // BFF 聚合层（自建 Node/Go 服务：聚合各工具数据 + 记录部署历史）
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true
        }
      },
      // 预热文件以提前转换和缓存结果，降低启动期间的初始页面加载时长并防止转换瀑布
      warmup: {
        clientFiles: ["./index.html", "./src/{views,components}/*"]
      }
    },
    plugins: getPluginsList(VITE_CDN, VITE_COMPRESSION),
    // https://cn.vitejs.dev/config/dep-optimization-options.html#dep-optimization-options
    optimizeDeps: {
      include,
      exclude
    },
    build: {
      // https://cn.vitejs.dev/guide/build.html#browser-compatibility
      target: "es2015",
      sourcemap: false,
      // 消除打包大小超过500kb警告
      chunkSizeWarningLimit: 4000,
      rollupOptions: {
        input: {
          index: pathResolve("./index.html", import.meta.url)
        },
        // 静态资源分类打包
        output: {
          chunkFileNames: "static/js/[name]-[hash].js",
          entryFileNames: "static/js/[name]-[hash].js",
          assetFileNames: "static/[ext]/[name]-[hash].[ext]"
        }
      }
    },
    define: {
      __INTLIFY_PROD_DEVTOOLS__: false,
      __APP_INFO__: JSON.stringify(__APP_INFO__)
    }
  };
};
