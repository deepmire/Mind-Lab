import { useEffect, useState } from 'react'
import { groupsByTrack, modulesByTrack } from './knowledge'
import type { ModuleId, TrackId } from './knowledgeTypes'
import { Icon } from './Icons'

/** 地图标题与底部说明；不同轨道使用独立文案，避免把尚未展开的状态误显示为可用。 */
const mapCopy: Record<TrackId, { title: string; legend: string }> = {
  docker: { title: 'Docker 知识地图', legend: '从单机容器运行时深入 Linux 内核机制' },
  agent: { title: 'Agent 学习地图', legend: '先认识模型与程序分工，再逐步理解行动、验证与运维' },
  kubernetes: { title: 'Kubernetes 知识地图', legend: '从声明式控制面到生产可靠性边界' },
  rag: { title: 'RAG 学习地图', legend: '从资料准备到可检索证据，再到可核对答案' },
  linux: { title: 'Linux 学习地图', legend: '从内核与进程到文件、服务、网络和排障' },
  network: { title: '计算机网络学习地图', legend: '从数据包与分层到地址、传输、应用和排障证据' },
}

/** 每条轨道首次打开时选择最能代表其整体机制的入口模块。 */
function defaultModule(track: TrackId): ModuleId {
  if (track === 'agent') return 'agent-loop'
  if (track === 'kubernetes') return 'kubernetes-architecture'
  if (track === 'rag') return 'rag-intent'
  if (track === 'linux') return 'linux-mental-model'
  if (track === 'network') return 'network-mental-model'
  return 'docker-engine'
}

/**
 * 可交互依赖知识地图。
 * 当前选中项只影响详情面板；点击模块节点不会离开地图，点击“进入完整模块”才触发路由跳转。
 */
export function KnowledgeMap({ track = 'docker', initial, onOpenModule, compact = false }: { track?: TrackId; initial?: ModuleId; onOpenModule: (id: ModuleId) => void; compact?: boolean }) {
  const [selected, setSelected] = useState<ModuleId>(initial ?? defaultModule(track))
  const trackModules = modulesByTrack[track]
  const selectedModule = trackModules.find((module) => module.id === selected) ?? trackModules[0]
  const groups = groupsByTrack[track]

  // 切换轨道或外部指定入口时重置选择，避免把上一条轨道的 ID 带入当前地图。
  useEffect(() => {
    setSelected(initial ?? defaultModule(track))
  }, [track, initial])

  if (!selectedModule) return null

  return (
    <div className={`knowledge-map ${compact ? 'is-compact' : ''}`}>
      <div className="map-topline"><div><Icon name="network" size={18} /><strong>{mapCopy[track].title}</strong><span>{trackModules.length} 个可深潜模块</span></div><small>先选一个模块，看看它用到了哪些知识</small></div>
      <div className="map-canvas-scroll">
        <div className="map-canvas">
          {groups.map((group, groupIndex) => (
            <div className="map-column" key={group}>
              <div className="map-column-head"><span>{String(groupIndex + 1).padStart(2, '0')}</span><strong>{group}</strong></div>
              <div className="map-nodes">
                {trackModules.filter((module) => module.group === group).map((module) => (
                  <button key={module.id} className={`map-node ${selected === module.id ? 'is-selected' : ''}`} onClick={() => setSelected(module.id)}>
                    <span className="map-node-icon"><Icon name={module.icon} size={17} /></span>
                    <span><strong>{module.title}</strong><small>用到 {module.dependencies.length} 个前置知识 · 后续用于 {module.dependents.length} 个模块</small></span>
                    <Icon name="chevron" size={13} />
                  </button>
                ))}
              </div>
              {groupIndex < groups.length - 1 && <span className="map-column-arrow"><Icon name="arrow" size={16} /></span>}
            </div>
          ))}
        </div>
      </div>
      <div className="map-detail" key={selectedModule.id}>
        <div className="map-detail-title"><span className="map-detail-icon"><Icon name={selectedModule.icon} size={22} /></span><div><span className="eyebrow">{track === 'agent' || track === 'rag' || track === 'linux' || track === 'network' ? selectedModule.group : selectedModule.english}</span><h3>{selectedModule.title}</h3></div></div>
        <p>{selectedModule.summary}</p>
        <div className="map-relations">
          <div><span>用到的知识</span>{selectedModule.dependencies.length ? selectedModule.dependencies.map((id) => <button key={id} onClick={() => setSelected(id)}>{modulesByTrack[track].find((module) => module.id === id)?.title ?? id}</button>) : <small>从零开始，不需要先学其他模块</small>}</div>
          <div><span>用在这些模块</span>{selectedModule.dependents.length ? selectedModule.dependents.map((id) => <button key={id} onClick={() => setSelected(id)}>{modulesByTrack[track].find((module) => module.id === id)?.title ?? id}</button>) : <small>当前没有后续模块</small>}</div>
        </div>
        <button className="map-enter" onClick={() => onOpenModule(selectedModule.id)}>进入完整模块 <Icon name="arrow" size={16} /></button>
      </div>
      <div className="map-legend"><span><i className="legend-node" /> 点击选择模块</span><span><i className="legend-line" /> 横向表示学习层次，不代表唯一依赖顺序</span><span>{mapCopy[track].legend}</span></div>
    </div>
  )
}
