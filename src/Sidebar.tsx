import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { categoryByTopic, groupsByTrack, knowledgeCategories, moduleMap, modulesByTrack, topicMap } from './knowledge'
import type { KnowledgeCategoryId, ModuleId, TrackId } from './knowledgeTypes'
import { DockerMark, Icon, ProgressRing } from './Icons'

export type SectionLink = { id: string; number: number; title: string }

type SidebarProps = {
  activeTrack: TrackId | null
  activeModule: ModuleId | null
  activeSection: number
  sections: SectionLink[]
  mobileOpen: boolean
  queue: string
  onGoHome: () => void
  onGoTrack: (track: TrackId) => void
  onOpenModule: (id: ModuleId) => void
  onScrollTo: (id: string) => void
  onBackToMap: () => void
  onCloseMobile: () => void
}

const defaultSidebarWidth = 272
const minSidebarWidth = 72
const maxSidebarWidth = 480
const compactSidebarWidth = 190
const sidebarWidthStorageKey = 'container-mind-lab:sidebar-width'
const sidebarHiddenStorageKey = 'container-mind-lab:sidebar-hidden'
const topicCount = knowledgeCategories.reduce((total, category) => total + category.topics.length, 0)

/** 读取上次保留的宽度；损坏或越界的 localStorage 值回退到默认宽度。 */
function readSidebarWidth() {
  const stored = Number(window.localStorage.getItem(sidebarWidthStorageKey))
  return Number.isFinite(stored) && stored >= minSidebarWidth && stored <= maxSidebarWidth ? stored : defaultSidebarWidth
}

/** 隐藏状态独立于移动端抽屉保存；桌面端隐藏后，移动端仍可通过菜单打开完整导航。 */
function readSidebarHidden() {
  return window.localStorage.getItem(sidebarHiddenStorageKey) === 'true'
}

function clampSidebarWidth(value: number) {
  return Math.min(maxSidebarWidth, Math.max(minSidebarWidth, value))
}

/**
 * 全站左侧导航。
 * 采用“知识分类 → 独立主题 → 知识组 → 模块”四级目录；每个主题的课程与依赖图彼此独立。
 * 侧栏可从图标窄栏一直展开，也可在桌面端完全隐藏；宽度与隐藏状态均跨刷新保留。
 */
export function Sidebar({ activeTrack, activeModule, activeSection, sections, mobileOpen, queue, onGoHome, onGoTrack, onOpenModule, onScrollTo, onBackToMap, onCloseMobile }: SidebarProps) {
  const [sidebarWidth, setSidebarWidth] = useState(readSidebarWidth)
  const [sidebarHidden, setSidebarHidden] = useState(readSidebarHidden)
  const [resizing, setResizing] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<KnowledgeCategoryId>>(() => new Set(knowledgeCategories.map((category) => category.id)))
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategoryId | null>(null)
  const [expandedTopics, setExpandedTopics] = useState<Set<TrackId>>(() => new Set(activeTrack ? [activeTrack] : []))
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set())
  const resizeCleanup = useRef<(() => void) | null>(null)
  const compact = sidebarWidth < compactSidebarWidth

  // 侧栏宽度和主内容区偏移使用两个变量，隐藏时保留用户宽度但让内容区收回全部空间。
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`)
    window.localStorage.setItem(sidebarWidthStorageKey, String(Math.round(sidebarWidth)))
  }, [sidebarWidth])

  // 隐藏状态写在根元素上，移动端媒体查询仍可用 is-open 覆盖它显示抽屉。
  useEffect(() => {
    document.documentElement.classList.toggle('sidebar-hidden', sidebarHidden)
    document.documentElement.style.setProperty('--sidebar-offset', sidebarHidden ? '0px' : `${sidebarWidth}px`)
    window.localStorage.setItem(sidebarHiddenStorageKey, String(sidebarHidden))
  }, [sidebarHidden, sidebarWidth])

  // 模块跳转后自动展开所属分类和主题，避免读者进入模块却找不到当前目录位置。
  useEffect(() => {
    if (!activeTrack) return
    const category = categoryByTopic[activeTrack]
    setExpandedCategories((previous) => previous.has(category.id) ? previous : new Set(previous).add(category.id))
    setExpandedTopics((previous) => previous.has(activeTrack) ? previous : new Set(previous).add(activeTrack))
  }, [activeTrack])

  useEffect(() => {
    document.body.classList.toggle('is-resizing-sidebar', resizing)
    return () => document.body.classList.remove('is-resizing-sidebar')
  }, [resizing])

  useEffect(() => () => resizeCleanup.current?.(), [])

  /** Ctrl+\ 是低打扰的桌面快捷键；输入框聚焦时仍然有效，因为该组合不用于普通文本输入。 */
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== '\\' || !(event.ctrlKey || event.metaKey)) return
      event.preventDefault()
      setSidebarHidden((value) => !value)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const toggleCategory = (id: KnowledgeCategoryId) => {
    setExpandedCategories((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleTopic = (id: TrackId) => {
    setExpandedTopics((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleGroup = (key: string) => {
    setCollapsedGroups((previous) => {
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  /** 拖拽期间使用 window 监听，指针离开狭窄把手后仍能继续调整宽度。 */
  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    const startX = event.clientX
    const startWidth = sidebarWidth
    const move = (pointer: PointerEvent) => setSidebarWidth(clampSidebarWidth(startWidth + pointer.clientX - startX))
    const stop = () => {
      setResizing(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
      resizeCleanup.current = null
    }
    resizeCleanup.current = stop
    setResizing(true)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
  }

  /** 键盘方向键提供与拖拽等价的调整能力，Shift 加速，双击恢复默认宽度。 */
  const resizeWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    setSidebarWidth((value) => clampSidebarWidth(value + direction * (event.shiftKey ? 32 : 12)))
  }

  const currentLocation = activeTrack ? topicMap[activeTrack].title : '网站导览'

  return (
    <>
      <aside className={`sidebar ${mobileOpen ? 'is-open' : ''} ${resizing ? 'is-resizing' : ''} ${compact ? 'is-compact' : ''}`} aria-label="全站学习导航">
        <div className="brand-row">
          <button className="brand" onClick={onGoHome} aria-label="返回心智实验室首页" title="心智实验室">
            <span className="brand-mark"><DockerMark size={33} /></span>
            <span className="brand-copy"><strong>心智实验室</strong><span>MECHANISM ATLAS</span></span>
          </button>
          <button className="sidebar-hide" onClick={() => setSidebarHidden(true)} aria-label="完全隐藏侧边栏" title="隐藏侧边栏（Ctrl+\）"><Icon name="close" size={15} /></button>
        </div>

        <button className={`sidebar-home ${activeTrack === null ? 'is-active' : ''}`} onClick={onGoHome} title="网站首页：理念、设计与意图"><Icon name="layers" size={17} /><span><strong>网站首页</strong><small>理念 · 设计 · 意图</small></span><Icon name="arrow" size={13} /></button>

        <div className="sidebar-label">知识目录 <span>{knowledgeCategories.length} 类 · {topicCount} 主题</span></div>
        <nav className="track-directory" aria-label="知识分类目录">
          {knowledgeCategories.map((category) => {
            const expandedCategory = expandedCategories.has(category.id)
            return (
              <div className={`knowledge-category ${expandedCategory ? 'is-open' : ''} ${selectedCategory === category.id ? 'is-active' : ''}`} key={category.id}>
                <div className="knowledge-category-head">
                  <button className="knowledge-category-main" onClick={() => { setSelectedCategory(category.id); toggleCategory(category.id) }} aria-expanded={expandedCategory} aria-pressed={selectedCategory === category.id} aria-controls={`sidebar-category-${category.id}`} title={category.subtitle}>
                    <Icon name="folder" size={14} />
                    <span><strong>{category.title}</strong><small>{category.topics.length} 个独立主题</small></span>
                  </button>
                  <Icon name="chevron" size={13} className="category-chevron" />
                </div>
                {expandedCategory && <div className="knowledge-category-items" id={`sidebar-category-${category.id}`}>
                  {category.topics.map((topic) => {
                    const expanded = expandedTopics.has(topic.id)
                    return (
                      <div className={`track-directory-group ${expanded ? 'is-open' : ''} ${activeTrack === topic.id ? 'is-active' : ''}`} key={topic.id}>
                        <div className="track-directory-head">
                          <button
                            className="track-directory-main"
                            onClick={() => activeTrack === topic.id ? toggleTopic(topic.id) : onGoTrack(topic.id)}
                            aria-current={activeTrack === topic.id ? 'page' : undefined}
                            aria-expanded={expanded}
                            title={activeTrack === topic.id ? `${topic.subtitle}；再次点击${expanded ? '收起' : '展开'}目录` : topic.subtitle}
                          >
                            <span className="track-index"><Icon name={topic.icon} size={15} /></span>
                            <span className="track-copy"><strong>{topic.title}</strong><small>{topic.subtitle} · {modulesByTrack[topic.id].length} 个模块</small></span>
                          </button>
                          <button className="directory-toggle" onClick={() => toggleTopic(topic.id)} aria-expanded={expanded} aria-controls={`sidebar-track-${topic.id}`} aria-label={`${expanded ? '收起' : '展开'} ${topic.title} 目录`}><Icon name="chevron" size={14} /></button>
                        </div>
                        {expanded && <div className="track-module-tree" id={`sidebar-track-${topic.id}`}>
                          {groupsByTrack[topic.id].map((group, groupIndex) => {
                            const groupKey = `${topic.id}:${group}`
                            const collapsed = collapsedGroups.has(groupKey)
                            const groupModules = modulesByTrack[topic.id].filter((module) => module.group === group)
                            return (
                              <div className={`module-group ${collapsed ? 'is-collapsed' : ''}`} key={group}>
                                <button className="module-group-toggle" onClick={() => toggleGroup(groupKey)} aria-expanded={!collapsed} aria-controls={`sidebar-group-${topic.id}-${groupIndex}`}><Icon name="chevron" size={12} /><span>{group}</span><small>{groupModules.length}</small></button>
                                {!collapsed && <div className="module-group-items" id={`sidebar-group-${topic.id}-${groupIndex}`}>
                                  {groupModules.map((module) => <button key={module.id} className={`sidebar-module ${activeModule === module.id ? 'is-active' : ''}`} onClick={() => onOpenModule(module.id)} aria-current={activeModule === module.id ? 'page' : undefined} title={module.title}><Icon name={module.icon} size={14} /><span>{module.title}</span></button>)}
                                </div>}
                              </div>
                            )
                          })}
                        </div>}
                      </div>
                    )
                  })}
                </div>}
              </div>
            )
          })}
        </nav>

        {activeModule && <button className="module-sidebar-card" onClick={onBackToMap} title={`返回 ${topicMap[moduleTrackForSidebar(activeModule)].title} 知识图谱`}><span><Icon name={moduleMap[activeModule].icon} size={18} /></span><div><small>正在深潜</small><strong>{moduleMap[activeModule].title}</strong></div><Icon name="arrow" size={14} className="rotate-180" /></button>}

        <div className="sidebar-divider" />
        <div className="sidebar-label">页面结构 <span>{sections.length} 节</span></div>
        <nav className="section-nav" aria-label="页面章节">
          {sections.map((section) => <button key={section.id} className={activeSection === section.number ? 'is-active' : ''} onClick={() => onScrollTo(activeModule ? `module-${activeModule}-${section.id}` : section.id)} title={section.title}><span>{String(section.number).padStart(2, '0')}</span><strong>{section.title}</strong>{activeSection === section.number && <i />}</button>)}
        </nav>

        <div className="sidebar-bottom">
          <div className="next-up"><span>{activeTrack === 'docker' ? '下一轮队列' : '当前位置'}</span><strong>{activeTrack === 'docker' ? queue : currentLocation}</strong></div>
          <div className="method-note"><Icon name="spark" size={17} /><p>意图 → 机制 → 权衡<br /><span>先看清设计，再记忆命令。</span></p></div>
          <div className="sidebar-progress"><ProgressRing value={activeSection / sections.length} /><div><strong>{activeSection} / {sections.length}</strong><span>当前阅读位置</span></div></div>
        </div>

        <div
          className="sidebar-resize-handle"
          role="separator"
          aria-label="调整侧边栏宽度"
          title="拖动调整宽度；方向键微调；双击恢复默认宽度；Ctrl+\ 完全隐藏"
          aria-orientation="vertical"
          aria-valuemin={minSidebarWidth}
          aria-valuemax={maxSidebarWidth}
          aria-valuenow={Math.round(sidebarWidth)}
          tabIndex={0}
          onPointerDown={startResize}
          onKeyDown={resizeWithKeyboard}
          onDoubleClick={() => setSidebarWidth(defaultSidebarWidth)}
        />
      </aside>
      <button className={`sidebar-restore ${sidebarHidden ? 'is-visible' : ''}`} onClick={() => setSidebarHidden(false)} aria-label="显示侧边栏" title="显示侧边栏（Ctrl+\）"><Icon name="layers" size={19} /></button>
      {mobileOpen && <button className="nav-backdrop" aria-label="关闭导航" onClick={onCloseMobile} />}
    </>
  )
}

/** 从模块反查主题只用于返回提示，与知识层的 moduleTrack 保持相同的默认归属规则。 */
function moduleTrackForSidebar(id: ModuleId): TrackId {
  return moduleMap[id].track ?? 'docker'
}
