import { useEffect, useRef, useState } from 'react'
import { agentLearningPath, agentLearningStages, kubernetesLearningPath, kubernetesLearningStages, learningPath, learningStages, linuxLearningPath, linuxLearningStages, moduleMap, networkLearningPath, networkLearningStages, ragLearningPath, ragLearningStages } from './knowledge'
import type { ModuleId, TrackId } from './knowledgeTypes'
import { Icon } from './Icons'

/** 学习路径配置集中在一次查找中；新增主题时补齐这里即可复用阶段导航和完整路径组件。 */
export const pathConfig = {
  docker: {
    name: 'Docker',
    id: 'learning-path',
    stages: learningStages,
    path: learningPath,
    description: '先建立全局模型，再理解制品与文件，然后拆开进程与隔离，最后把机制串成运行时与多容器协作。',
  },
  agent: {
    name: 'Agent',
    id: 'agent-learning-path',
    stages: agentLearningStages,
    path: agentLearningPath,
    description: '不用先懂代码。先认识模型与程序怎样分工，再让 Agent 获得资料和行动能力，最后学习怎样控制、验证和恢复它。',
  },
  kubernetes: {
    name: 'Kubernetes',
    id: 'kubernetes-learning-path',
    stages: kubernetesLearningStages,
    path: kubernetesLearningPath,
    description: '先掌握声明式控制面，再理解工作负载、网络、存储和发布，最后进入弹性、观测与生产边界。',
  },
  rag: {
    name: 'RAG',
    id: 'rag-learning-path',
    stages: ragLearningStages,
    path: ragLearningPath,
    description: '不用先懂模型训练。先准备资料，再学会检索与排序，最后生成有依据的答案，并证明它安全、可靠。',
  },
  linux: {
    name: 'Linux',
    id: 'linux-learning-path',
    stages: linuxLearningStages,
    path: linuxLearningPath,
    description: '不用先懂代码。先认识内核、进程和文件，再学习命令行、服务与网络，最后掌握启动和排障证据。',
  },
  network: {
    name: '计算机网络',
    id: 'network-learning-path',
    stages: networkLearningStages,
    path: networkLearningPath,
    description: '不用先懂代码。先认识数据包、协议和分层，再理解地址、路由、传输与日常应用，最后用抓包和性能证据排障。',
  },
} satisfies Record<TrackId, { name: string; id: string; stages: typeof learningStages; path: ModuleId[]; description: string }>

/**
 * 右侧悬浮的完整学习路径。
 * 模块页从 currentModule 推导位置；主题首页使用 activeStage 记录正在浏览的阶段。
 * 小步骤始终挂在所属阶段下，避免把完整路径压缩成几个无法定位的大按钮。
 */
export function LearningPathNavigator({ track, currentModule, activeStage = 0, onOpenModule, onStageChange }: {
  track: TrackId
  currentModule?: ModuleId
  activeStage?: number
  onOpenModule: (id: ModuleId) => void
  onStageChange?: (index: number) => void
}) {
  const config = pathConfig[track]
  const moduleIndex = currentModule ? config.path.indexOf(currentModule) : -1
  const locatedStageIndex = moduleIndex >= 0
    ? config.stages.findIndex((item) => item.modules.includes(config.path[moduleIndex]))
    : Math.min(Math.max(activeStage, 0), config.stages.length - 1)
  const stageIndex = locatedStageIndex < 0 ? 0 : locatedStageIndex
  const stage = config.stages[stageIndex]
  const stageModuleIndex = currentModule ? stage.modules.indexOf(currentModule) : -1
  const previousModule = moduleIndex > 0 ? config.path[moduleIndex - 1] : undefined
  const nextModule = moduleIndex >= 0 && moduleIndex < config.path.length - 1 ? config.path[moduleIndex + 1] : undefined
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [expandedStage, setExpandedStage] = useState<number | null>(stageIndex)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const open = pinned || hovered

  useEffect(() => {
    setExpandedStage(stageIndex)
  }, [track, currentModule, stageIndex])

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }

  const scheduleClose = () => {
    cancelClose()
    if (!pinned) closeTimer.current = setTimeout(() => setHovered(false), 280)
  }

  const close = () => {
    cancelClose()
    setPinned(false)
    setHovered(false)
  }

  const openModule = (id: ModuleId) => {
    onOpenModule(id)
  }

  const goToStage = (index: number) => {
    if (!currentModule) {
      onStageChange?.(index)
      setExpandedStage(index)
      return
    }
    openModule(config.stages[index].modules[0])
  }

  const toggleStage = (index: number) => {
    setExpandedStage((value) => value === index ? null : index)
    if (!currentModule) onStageChange?.(index)
  }

  return (
    <div
      className={`path-navigator${open ? ' is-open' : ''}${pinned ? ' is-pinned' : ''}`}
      onMouseEnter={() => { cancelClose(); setHovered(true) }}
      onMouseLeave={scheduleClose}
    >
      {open && (
        <aside className="path-navigator-panel" aria-label={`${config.name} 完整学习路径`}>
          <div className="path-navigator-head">
            <div><span className="eyebrow">学习路线</span><h3>{config.name} 学习路径</h3></div>
            <button className="path-navigator-close" onClick={close} aria-label="收起学习路径"><Icon name="close" size={17} /></button>
          </div>

          <div className="path-navigator-current">
            <span className="path-navigator-current-icon"><Icon name="target" size={20} /></span>
            <div>
              <small>{currentModule ? `全程 ${moduleIndex + 1}/${config.path.length} · 本阶段 ${stageModuleIndex + 1}/${stage.modules.length}` : `阶段 ${stageIndex + 1}/${config.stages.length}`}</small>
              <strong>{currentModule ? moduleMap[currentModule].title : stage.title}</strong>
              <p>{currentModule ? stage.title : stage.goal}</p>
            </div>
          </div>

          <div className="path-navigator-stages">
            {config.stages.map((item, index) => {
              const expanded = expandedStage === index
              const current = index === stageIndex
              return (
                <section key={item.id} className={`path-navigator-stage${current ? ' is-current' : ''}${index < stageIndex ? ' is-past' : ''}${expanded ? ' is-expanded' : ''}`}>
                  <button className="path-navigator-stage-head" onClick={() => toggleStage(index)} aria-expanded={expanded}>
                    <span className="path-navigator-stage-number">{String(index + 1).padStart(2, '0')}</span>
                    <span><strong>{item.title}</strong><small>{item.modules.length} 个小步骤</small></span>
                    <Icon name="chevron" size={15} />
                  </button>
                  {expanded && (
                    <div className="path-navigator-modules">
                      {item.modules.map((id, moduleOrder) => {
                        const module = moduleMap[id]
                        const active = id === currentModule
                        const past = moduleIndex >= 0 && config.path.indexOf(id) < moduleIndex
                        return (
                          <button key={id} className={`path-navigator-module${active ? ' is-active' : ''}${past ? ' is-past' : ''}`} aria-current={active ? 'step' : undefined} onClick={() => openModule(id)}>
                            <span>{active ? <Icon name="target" size={13} /> : String(moduleOrder + 1).padStart(2, '0')}</span>
                            <span><strong>{module.title}</strong><small>{module.summary}</small></span>
                            {active ? <small className="path-navigator-here">当前</small> : <Icon name="arrow" size={13} />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </section>
              )
            })}
          </div>

          <div className="path-navigator-footer">
            {currentModule ? (
              <div className="path-navigator-neighbors">
                <button disabled={!previousModule} onClick={() => previousModule && openModule(previousModule)}><Icon name="arrow" size={14} className="rotate-180" /><span><small>上一站</small>{previousModule ? moduleMap[previousModule].title : '已是第一站'}</span></button>
                <button disabled={!nextModule} onClick={() => nextModule && openModule(nextModule)}><span><small>下一站</small>{nextModule ? moduleMap[nextModule].title : '已是最后一站'}</span><Icon name="arrow" size={14} /></button>
              </div>
            ) : (
              <p><Icon name="spark" size={14} />选择阶段查看小步骤，点击任意模块进入深潜。</p>
            )}
            <div className="path-navigator-stage-actions">
              <button disabled={stageIndex === 0} onClick={() => goToStage(stageIndex - 1)}><Icon name="arrow" size={13} className="rotate-180" />上一阶段</button>
              <span>{stageIndex + 1} / {config.stages.length}</span>
              <button disabled={stageIndex === config.stages.length - 1} onClick={() => goToStage(stageIndex + 1)}>下一阶段<Icon name="arrow" size={13} /></button>
            </div>
          </div>
        </aside>
      )}

      <button
        className="path-navigator-launcher"
        aria-label={open ? '收起学习路径' : '展开完整学习路径'}
        aria-expanded={open}
        onClick={() => {
          cancelClose()
          if (pinned) {
            setPinned(false)
            setHovered(false)
          } else {
            setPinned(true)
          }
        }}
      >
        <span className="path-navigator-launcher-icon"><Icon name={open ? 'close' : 'target'} size={19} /></span>
        <span><strong>{open ? '收起路径' : '学习路径'}</strong><small>{currentModule ? `阶段 ${stageIndex + 1}/${config.stages.length} · ${moduleIndex + 1}/${config.path.length}` : `${config.stages.length} 个阶段`}</small></span>
        <Icon name="chevron" size={15} className="rotate-90" />
      </button>
    </div>
  )
}

/**
 * 分阶段最佳学习路径。
 * 阶段用于降低认知负担，模块按钮直接进入深潜页；path 只负责显示全轨道中的顺序编号。
 */
export function LearningPath({ track = 'docker', onOpenModule }: { track?: TrackId; onOpenModule: (id: ModuleId) => void }) {
  const [stageIndex, setStageIndex] = useState(0)
  const config = pathConfig[track]
  const { stages, path } = config
  const finalModule = path[path.length - 1]
  const stage = stages[stageIndex]

  // 同一组件在不同首页复用时，需要丢弃上一条轨道的阶段位置。
  useEffect(() => {
    setStageIndex(0)
  }, [track])

  return (
    <section className="learning-path" id={config.id} aria-labelledby={`${config.id}-title`}>
      <div className="learning-path-head">
        <div>
          <span className="eyebrow">推荐学习顺序</span>
          <h3 id={`${config.id}-title`}>{config.name} 最佳学习路径</h3>
          <p>{config.description}</p>
        </div>
        <button className="path-start" onClick={() => onOpenModule(path[0])}>从第一站开始 <Icon name="arrow" size={15} /></button>
      </div>

      <LearningPathNavigator track={track} activeStage={stageIndex} onOpenModule={onOpenModule} onStageChange={setStageIndex} />

      <div className="path-stage-panel" key={stage.id} role="region" aria-label={`${stage.title}模块列表`}>
        <div className="path-stage-intro">
          <span>第 {String(stageIndex + 1).padStart(2, '0')} 阶段</span>
          <h4>{stage.title}</h4>
          <p>{stage.goal}</p>
        </div>
        <div className="path-module-list">
          {stage.modules.map((moduleId) => {
            const module = moduleMap[moduleId]
            const order = path.indexOf(moduleId) + 1
            return (
              <button key={moduleId} className="path-module-card" onClick={() => onOpenModule(moduleId)}>
                <span className="path-module-order">{String(order).padStart(2, '0')}</span>
                <span className="path-module-icon"><Icon name={module.icon} size={19} /></span>
                <span className="path-module-copy"><strong>{module.title}</strong><small>{module.summary}</small></span>
                <Icon name="arrow" size={15} />
              </button>
            )
          })}
        </div>
      </div>

      <div className="path-stage-footer">
        <p><Icon name="spark" size={14} /><strong>排序原则：</strong>前一步为后一步准备可调用的知识；这里不是要求一次读完的清单。</p>
        <div>
          <button disabled={stageIndex === 0} onClick={() => setStageIndex((value) => value - 1)}><Icon name="arrow" size={13} className="rotate-180" />上一阶段</button>
          {stageIndex < stages.length - 1 ? (
            <button onClick={() => setStageIndex((value) => value + 1)}>下一阶段<Icon name="arrow" size={13} /></button>
          ) : (
            <button onClick={() => onOpenModule(finalModule)}>进入最后一站<Icon name="arrow" size={13} /></button>
          )}
        </div>
      </div>
    </section>
  )
}
