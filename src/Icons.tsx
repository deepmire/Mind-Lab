/**
 * 全站共用的轻量 SVG 图标与装饰性图形。
 * 所有图标默认继承 currentColor，并由调用方决定尺寸；仅用于装饰的图形会对辅助技术隐藏。
 */
import type { CSSProperties } from 'react'

/** Icon 组件可选的语义名称；联合类型与 paths 的键集合保持一一对应，避免渲染空图标。 */
export type IconName =
  | 'agent'
  | 'arrow'
  | 'brain'
  | 'box'
  | 'chart'
  | 'check'
  | 'chevron'
  | 'close'
  | 'code'
  | 'database'
  | 'folder'
  | 'layers'
  | 'link'
  | 'lock'
  | 'network'
  | 'pause'
  | 'play'
  | 'reset'
  | 'shield'
  | 'skip'
  | 'spark'
  | 'target'
  | 'terminal'
  | 'workflow'

/** 图标路径注册表；Record 约束保证每个 IconName 都有图形，SVG 子节点可安全按名称查表。 */
const paths: Record<IconName, React.ReactNode> = {
  agent: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>,
  arrow: <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
  brain: <><path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5.8A3 3 0 0 0 7 18a3 3 0 0 0 2 2V4Z" /><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5.8A3 3 0 0 1 17 18a3 3 0 0 1-2 2V4Z" /><path d="M7 9a3 3 0 0 0 5 0M12 9a3 3 0 0 1 5 0M7 15a3 3 0 0 1 5 0" /></>,
  box: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9M8 5.2l8 4.5" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  close: <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>,
  code: <><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" /></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  link: <><path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-5.7-5.7l4-4A4 4 0 0 1 11 7M16 8l1-1a4 4 0 0 1 5.7 5.7l-4 4A4 4 0 0 1 13 17" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  network: <><rect x="9" y="3" width="6" height="5" rx="1" /><rect x="3" y="16" width="6" height="5" rx="1" /><rect x="15" y="16" width="6" height="5" rx="1" /><path d="M12 8v4M6 16v-4h12v4" /></>,
  pause: <><path d="M9 5v14M15 5v14" /></>,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  reset: <><path d="M3 11a9 9 0 1 1 2.6 6.4" /><path d="M3 4v7h7" /></>,
  shield: <><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" /><path d="m8 12 3 3 5-6" /></>,
  skip: <><path d="m5 5 10 7-10 7V5ZM19 5v14" /></>,
  spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  terminal: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3M13 15h4" /></>,
  workflow: <><rect x="3" y="3" width="7" height="6" rx="1" /><rect x="14" y="15" width="7" height="6" rx="1" /><path d="M6.5 9v5a3 3 0 0 0 3 3H14M10 6h7a4 4 0 0 1 4 4v5" /></>,
}

/**
 * 渲染一个可复用线性图标。
 * @param name 图标语义键；size 为像素宽高；className 仅追加调用方样式，不替换图标内部类。
 * @returns 继承文字颜色、默认 18px 的 SVG；作为装饰图标时不进入无障碍名称树。
 */
export function Icon({ name, size = 18, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

/**
 * 绘制 Docker 品牌识别图形，默认 30px。
 * @param size 同时控制宽高，保持图形比例；@returns 填充式 SVG 装饰，不包含可朗读文本。
 */
export function DockerMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="3" y="10" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="10" y="10" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="17" y="10" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="10" y="3" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="17" y="3" width="5" height="5" rx="1" fill="currentColor" />
      <path d="M3 17c2.5 5 8.5 7 15.5 5.5 4.5-1 7.5-3.5 9-7.5-5.5 1.5-10.5.5-14-2.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="9" r="1.4" fill="currentColor" />
    </svg>
  )
}

/**
 * 用圆周进度弧表示 0—1 的完成比例。
 * @param value 0 表示空环、1 表示满环；@returns 纯装饰 SVG，具体百分比应由邻近文本单独提供。
 * @remarks 周长用于把比例换算为 dashoffset；旋转 -90° 让进度从顶部开始。
 */
export function ProgressRing({ value }: { value: number }) {
  const radius = 17
  const circumference = 2 * Math.PI * radius
  return (
    <svg className="progress-ring" width="46" height="46" viewBox="0 0 46 46" aria-hidden="true">
      <circle cx="23" cy="23" r={radius} fill="none" stroke="var(--line)" strokeWidth="3" />
      <circle
        cx="23"
        cy="23"
        r={radius}
        fill="none"
        stroke="var(--green)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value)}
        transform="rotate(-90 23 23)"
        style={{ transition: 'stroke-dashoffset 400ms ease' }}
      />
    </svg>
  )
}

/**
 * 渲染一组等宽迷你柱状条，可表示正在运行或空闲的装饰性活动状态。
 * @param active 只切换动画状态类，不改变柱高集合；@returns 对辅助技术隐藏的动效容器。
 */
export function MiniBars({ active }: { active: boolean }) {
  return (
    <div className={`mini-bars ${active ? 'is-active' : ''}`} aria-hidden="true">
      {[38, 62, 47, 78, 56, 86, 68].map((height, index) => (
        <span key={index} style={{ '--bar-height': `${height}%`, '--delay': `${index * 70}ms` } as CSSProperties} />
      ))}
    </div>
  )
}
