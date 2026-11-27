/**
 * React 应用入口：加载全局样式，并把根组件挂载到 index.html 的 #root 节点。
 * 该文件只负责启动，不包含业务状态；StrictMode 用于在开发环境暴露不安全的生命周期用法。
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// HTML 模板保证 #root 存在，因此非空断言只表达静态入口契约；渲染必须且只能建立一棵根树。
createRoot(document.getElementById('root')!).render(
  // StrictMode 的开发期额外检查不改变生产构建的输出语义，组件需保持副作用可清理、可重入。
  <StrictMode>
    <App />
  </StrictMode>,
)
