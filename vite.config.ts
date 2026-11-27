import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * 根目录即应用入口，不再把构建指向无关的 frontend 子项目。
 * 开发与预览都固定监听本机回环地址，避免把学习实验意外暴露到局域网。
 */
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 8080,
    // 放行小米球内网穿透分配的随机子域名（前缀带点 = 该域下所有子域）
    allowedHosts: ['.ngrok.xiaomiqiu123.top'],
  },
  preview: {
    host: '127.0.0.1',
    port: 4183,
  },
})
