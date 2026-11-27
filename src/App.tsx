/**
 * 应用外壳与本地 hash 路由。
 * 默认进入网站导览，六条技术轨道共享可伸缩分组侧边栏和七节阅读结构，但首页、地图、学习路径与模块数据彼此独立。
 */
import { useEffect, useState } from 'react'
import { AgentOverview } from './AgentOverview'
import { DockerSimulator } from './DockerSimulator'
import { DockerMark, Icon, type IconName } from './Icons'
import { KnowledgeMap } from './KnowledgeMap'
import { KubernetesOverview } from './KubernetesOverview'
import { LearningPath } from './LearningPath'
import { LinuxOverview } from './LinuxOverview'
import { dockerModules, moduleIds, moduleMap, moduleTrack, topicMap } from './knowledge'
import type { ModuleId, TrackId } from './knowledgeTypes'
import { ModuleView } from './ModuleView'
import { NetworkOverview } from './NetworkOverview'
import { RagOverview } from './RagOverview'
import { SectionHeading } from './SectionHeading'
import { Sidebar, type SectionLink } from './Sidebar'
import { SiteOverview } from './SiteOverview'

/**
 * 七个章节的全站固定顺序。
 * data-section 与这些 ID 必须保持一致，IntersectionObserver 才能正确更新阅读进度。
 */

const sections: SectionLink[] = [
  { id: 'philosophy', number: 1, title: '理念' },
  { id: 'design', number: 2, title: '设计' },
  { id: 'capabilities', number: 3, title: '能力地图' },
  { id: 'path', number: 4, title: '一条代表路径' },
  { id: 'cost', number: 5, title: '代价' },
  { id: 'example', number: 6, title: '示例' },
  { id: 'boundary', number: 7, title: '边界' },
]

/** 网站首页只呈现产品理念、知识组织方式和学习意图，不提前进入某个技术轨道。 */
const siteSections: SectionLink[] = [
  { id: 'site-philosophy', number: 1, title: '理念' },
  { id: 'site-design', number: 2, title: '设计' },
  { id: 'site-intent', number: 3, title: '意图' },
]

/** Docker 首页的能力卡片；state 决定点击后是看代表路径还是直接进入深潜模块。 */
const capabilities: { name: string; sentence: string; icon: IconName; state: 'path' | 'partial' | 'pending' }[] = [
  { name: '环境封装', sentence: '把应用、依赖与启动约定收敛成可传输、可复用的镜像。', icon: 'box', state: 'path' },
  { name: '进程隔离', sentence: '用命名空间收束进程视图，用 cgroup 约束资源使用。', icon: 'shield', state: 'path' },
  { name: '生命周期控制', sentence: '以容器实例为单位完成创建、启动、停止与删除。', icon: 'play', state: 'partial' },
  { name: '网络接入', sentence: '通过虚拟网卡、网桥与端口转发把流量送进容器。', icon: 'network', state: 'path' },
  { name: '存储挂载', sentence: '把宿主机目录或数据卷接入容器指定路径，承载需要留存的数据。', icon: 'layers', state: 'pending' },
  { name: '镜像仓库', sentence: '通过仓库拉取和推送镜像，让制品能跨机器流动。', icon: 'box', state: 'pending' },
  { name: '多容器协作', sentence: '把多个容器作为独立单元连接起来，共同组成一个应用。', icon: 'network', state: 'pending' },
  { name: '日志与诊断', sentence: '采集标准输出、容器状态和资源用量，为排障提供线索。', icon: 'terminal', state: 'pending' },
]

/** 能力名称到深潜模块的映射；未列出的能力仍可留在代表路径中讲解。 */
const capabilityModules: Record<string, ModuleId> = {
  存储挂载: 'storage',
  镜像仓库: 'registry',
  多容器协作: 'compose',
  日志与诊断: 'observability',
}

/** 三种观察重点用于强调同一运行时图中的不同机制线，不改变底层模拟。 */
const designFocus = {
  runtime: {
    label: '运行时',
    title: 'Docker 不直接模拟一颗 CPU',
    text: 'dockerd 负责协调，containerd 管生命周期，runc 把 OCI 规格翻译成内核调用。最终运行的是宿主机进程；隔离来自命名空间与 cgroup，不是虚拟硬件。',
  },
  filesystem: {
    label: '文件系统',
    title: '镜像是只读模板，不是运行中的硬盘',
    text: '镜像层提供稳定的起始内容；每个容器在自己的可写层里修改。删除容器不会把可写层自动合并回镜像，因此“跑通了”不等于“已经交付了环境”。',
  },
  network: {
    label: '网络',
    title: '容器有地址，端口发布是另一层映射',
    text: '容器先拥有自己的网络命名空间、veth 与地址；-p 再添加宿主机到容器的转发。应用是否监听，和外部是否可达，是两个需要分别验证的问题。',
  },
}

type DesignFocus = keyof typeof designFocus

/**
 * Docker 首页架构图。
 * focus 只控制视觉高亮与解释文案，节点本身保持固定，帮助读者比较同一机制在不同视角下的位置。
 */
function ArchitectureDiagram({ focus, onFocus }: { focus: DesignFocus; onFocus: (value: DesignFocus) => void }) {
  return (
    <div className="architecture-panel">
      <div className="focus-tabs" role="tablist" aria-label="设计图观察层">
        {(Object.keys(designFocus) as DesignFocus[]).map((key) => (
          <button key={key} role="tab" aria-selected={focus === key} className={focus === key ? 'is-active' : ''} onClick={() => onFocus(key)}>
            {designFocus[key].label}
          </button>
        ))}
      </div>
      <div className={`architecture-canvas focus-${focus}`}>
        <div className="arch-source">
          <div className="arch-node source-node"><Icon name="box" size={18} /><strong>镜像仓库</strong><small>分发只读层</small></div>
          <span className="arch-arrow"><Icon name="arrow" size={19} /></span>
          <div className="arch-node image-arch-node"><Icon name="layers" size={18} /><strong>镜像层 + 元数据</strong><small>稳定的起始内容</small></div>
        </div>
        <div className="arch-main-flow">
          <div className="arch-node"><Icon name="terminal" size={18} /><strong>docker CLI</strong><small>表达意图</small></div>
          <span className="arch-arrow"><Icon name="arrow" size={19} /></span>
          <div className="arch-node engine-node"><DockerMark size={21} /><strong>dockerd</strong><small>API 与协调</small></div>
          <span className="arch-arrow"><Icon name="arrow" size={19} /></span>
          <div className="arch-node"><Icon name="layers" size={18} /><strong>containerd</strong><small>快照与生命周期</small></div>
          <span className="arch-arrow"><Icon name="arrow" size={19} /></span>
          <div className="arch-node runtime-node"><Icon name="code" size={18} /><strong>runc</strong><small>OCI bundle</small></div>
        </div>
        <div className="arch-drop"><span /></div>
        <div className="kernel-band">
          <div className={focus === 'runtime' ? 'kernel-item is-focused' : 'kernel-item'}><strong>namespaces</strong><span>隔离资源视图</span></div>
          <div className={focus === 'runtime' ? 'kernel-item is-focused' : 'kernel-item'}><strong>cgroups</strong><span>限制与统计资源</span></div>
          <div className={focus === 'filesystem' ? 'kernel-item is-focused' : 'kernel-item'}><strong>overlayfs</strong><span>合并只读层与可写层</span></div>
          <div className={focus === 'network' ? 'kernel-item is-focused' : 'kernel-item'}><strong>veth · bridge · netfilter</strong><span>连接容器网络</span></div>
        </div>
        <div className="arch-drop"><span /></div>
        <div className="arch-result"><span className="result-dot" /><strong>一个受控的宿主机进程</strong><small>不是 VM，不是独立内核</small></div>
        <div className="arch-note">点击上方标签，观察同一张图里的三条机制线。</div>
      </div>
      <div className="focus-explanation" key={focus}>
        <span className="eyebrow">观察重点 · {designFocus[focus].label}</span>
        <h3>{designFocus[focus].title}</h3>
        <p>{designFocus[focus].text}</p>
      </div>
    </div>
  )
}

/** 从 hash 中读取模块路由；未知 ID 返回 null，由首页路由兜底。 */
function readModuleRoute(): ModuleId | null {
  const match = window.location.hash.match(/^#module\/([a-z0-9-]+)$/)
  return match && moduleIds.has(match[1]) ? match[1] as ModuleId : null
}

/** 模块路由优先按模块归属决定轨道；空 hash、#home 与未知首页地址统一进入网站导览。 */
function readTrackRoute(): TrackId | null {
  const moduleId = readModuleRoute()
  if (moduleId) return moduleTrack(moduleId)
  if (window.location.hash === '#agent') return 'agent'
  if (window.location.hash === '#kubernetes') return 'kubernetes'
  if (window.location.hash === '#docker') return 'docker'
  if (window.location.hash === '#rag') return 'rag'
  if (window.location.hash === '#linux') return 'linux'
  if (window.location.hash === '#network') return 'network'
  return null
}

/** 根据当前视图生成浏览器标题，网站导览与技术轨道使用不同名称。 */
function trackTitle(track: TrackId | null): string {
  return track ? `${topicMap[track].title} 学习主题` : '网站导览'
}

export default function App() {
  // 页面状态全部由 hash 派生；本地 state 只保存滚动位置、视觉焦点和临时提示。
  const [activeSection, setActiveSection] = useState(1)
  const [activeTrack, setActiveTrack] = useState<TrackId | null>(readTrackRoute)
  const [activeModule, setActiveModule] = useState<ModuleId | null>(readModuleRoute)
  const [designFocus, setDesignFocus] = useState<DesignFocus>('runtime')
  const [queue, setQueue] = useState('尚未选择')
  const [toast, setToast] = useState('')
  const [replaySignal, setReplaySignal] = useState(0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // hashchange 同时处理浏览器前进/后退与站内跳转，统一回到页面顶部并重置阅读位置。
  useEffect(() => {
    const onHashChange = () => {
      setActiveModule(readModuleRoute())
      setActiveTrack(readTrackRoute())
      setActiveSection(1)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // 只观察可见比例最高的章节，避免同一视口内多个 section 竞争导致进度跳变。
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) setActiveSection(Number((visible[0].target as HTMLElement).dataset.section))
      },
      { rootMargin: '-12% 0px -72% 0px', threshold: [0, 0.1, 0.5] },
    )
    document.querySelectorAll<HTMLElement>('.learning-section[data-section]').forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [activeModule, activeTrack])

  // 标题随轨道变化，模块页也使用所属轨道名称，便于浏览器标签页区分。
  useEffect(() => {
    document.title = `${trackTitle(activeTrack)} · 心智实验室`
  }, [activeTrack])

  // toast 是短暂提示，离开组件或内容变化时清理定时器，避免过期回调再次更新状态。
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 4200)
    return () => window.clearTimeout(timer)
  }, [toast])

  /** 保留旧版“只展开点名能力”的交互：记录主题并显示轻提示，不自动铺开整套课程。 */
  const requestTopic = (name: string) => {
    setQueue(name)
    setToast(`已记下「${name}」。下一轮只展开这一块，不提前铺开。`)
    setMobileNavOpen(false)
  }

  /** 平滑滚动到章节；移动端点击后关闭抽屉，避免遮挡内容。 */
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMobileNavOpen(false)
  }

  /** 返回网站导览；空 hash 与 #home 都表示同一个默认首页。 */
  const goHome = () => {
    setActiveTrack(null)
    setActiveModule(null)
    setActiveSection(1)
    window.location.hash = 'home'
    window.scrollTo({ top: 0, behavior: 'instant' })
    setMobileNavOpen(false)
  }

  /** 切换首页时清空模块状态，并通过 hash 保留可刷新、可分享的地址。 */
  const goToTrack = (track: TrackId) => {
    setActiveTrack(track)
    setActiveModule(null)
    setActiveSection(1)
    window.location.hash = track
    window.scrollTo({ top: 0, behavior: 'instant' })
    setMobileNavOpen(false)
  }

  /** 打开模块时同时切换轨道，保证返回按钮回到模块所属首页而不是上一个首页。 */
  const openModule = (id: ModuleId) => {
    setActiveTrack(moduleTrack(id))
    setActiveModule(id)
    setActiveSection(1)
    window.location.hash = `module/${id}`
    window.scrollTo({ top: 0, behavior: 'instant' })
    setMobileNavOpen(false)
  }

  /** 返回模块所属轨道的地图区；网站导览没有模块时直接回到首页。 */
  const backToMap = () => {
    if (!activeTrack) {
      goHome()
      return
    }
    setActiveModule(null)
    setActiveSection(2)
    window.location.hash = activeTrack
    window.setTimeout(() => document.getElementById('design')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    setMobileNavOpen(false)
  }

  /** 先滚动到代表路径，再等页面稳定后把模拟器居中，保证用户能看到重放起点。 */
  const replayRequest = () => {
    setReplaySignal((value) => value + 1)
    scrollTo('path')
    window.setTimeout(() => document.querySelector('.simulator')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 450)
  }

  const currentSections = activeTrack ? sections : siteSections

  return (
    <div className="app-shell" id="top">
      <header className="mobile-header">
        <button className="mobile-brand" onClick={goHome}><DockerMark size={26} /><span>心智实验室</span></button>
        <button className="menu-button" onClick={() => setMobileNavOpen((value) => !value)} aria-label="打开学习导航" aria-expanded={mobileNavOpen}>
          <Icon name={mobileNavOpen ? 'close' : 'layers'} size={21} />
        </button>
      </header>

      <Sidebar
        activeTrack={activeTrack}
        activeModule={activeModule}
        activeSection={activeSection}
        sections={currentSections}
        mobileOpen={mobileNavOpen}
        queue={queue}
        onGoHome={goHome}
        onGoTrack={goToTrack}
        onOpenModule={openModule}
        onScrollTo={scrollTo}
        onBackToMap={backToMap}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <main className="main-content">
        {activeModule ? (
          <ModuleView module={moduleMap[activeModule]} onOpenModule={openModule} onBack={backToMap} />
        ) : activeTrack === null ? (
          <SiteOverview onOpenTrack={goToTrack} onOpenModule={openModule} />
        ) : activeTrack === 'kubernetes' ? (
          <KubernetesOverview onOpenModule={openModule} />
        ) : activeTrack === 'agent' ? (
          <AgentOverview onOpenModule={openModule} />
        ) : activeTrack === 'rag' ? (
          <RagOverview onOpenModule={openModule} />
        ) : activeTrack === 'linux' ? (
          <LinuxOverview onOpenModule={openModule} />
        ) : activeTrack === 'network' ? (
          <NetworkOverview onOpenModule={openModule} />
        ) : (
          <>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-kicker"><span>ROUND 01</span><i />机制优先学习法</div>
          <h1 id="hero-title">Docker：不是小虚拟机，<br /><em>是被内核收束的进程。</em></h1>
          <p className="hero-lead">目标不是背命令，而是学完后能解释设计、预判状态与输出，只剩亲手实操。先问它要解决什么，再沿着一次真实运行，看文件、进程、网络与隔离如何一步步出现。</p>
          <div className="hero-meta">
            <span><Icon name="play" size={14} /> 可播放机制图</span>
            <span><Icon name="layers" size={14} /> 7 个状态切片</span>
            <span><Icon name="terminal" size={14} /> 命令与输出对照</span>
            <span><Icon name="network" size={14} /> 14 个深潜模块</span>
          </div>
          <div className="hero-actions"><button className="hero-cta" onClick={() => scrollTo('philosophy')}>从理念开始 <Icon name="arrow" size={17} /></button><button className="hero-path-cta" onClick={() => scrollTo('learning-path')}>查看最佳学习路径 <Icon name="network" size={16} /></button></div>
          <div className="hero-aside" aria-label="阅读顺序">
            <span className="aside-label">READING ORDER</span>
            {[['01', '意图', '为什么需要它'], ['02', '机制', '它怎样做到'], ['03', '权衡', '因此放弃了什么']].map(([number, title, text]) => (
              <div key={number}><span>{number}</span><p><strong>{title}</strong><small>{text}</small></p></div>
            ))}
          </div>
          <div className="hero-watermark" aria-hidden="true"><DockerMark size={230} /></div>
        </section>

        <section id="philosophy" data-section="1" className="learning-section">
          <SectionHeading number={1} title="理念" lead="先把问题摆正，再谈容器。" />
          <div className="thesis-card">
            <span className="thesis-mark">“</span>
            <p>Docker 把“环境应该怎样运行”从口头约定，变成<strong>可传输、可校验、可重复的制品与运行单元</strong>。</p>
          </div>
          <div className="two-column philosophy-grid">
            <article className="idea-card positive">
              <span className="card-label"><Icon name="check" size={16} /> 它要解决</span>
              <h3>让应用离开开发机后，仍有可信的起点。</h3>
              <p>开发、测试、生产之间的差异，往往不在业务代码，而在依赖版本、系统库、配置和启动方式。Docker 把这些内容收敛成一个可复制的起点，让“环境漂移”更容易被发现和重现。</p>
              <div className="idea-result"><span>交付物</span><strong>镜像</strong><Icon name="arrow" size={15} /><span>运行单元</span><strong>容器</strong></div>
            </article>
            <article className="idea-card negative">
              <span className="card-label"><Icon name="close" size={16} /> 它拒绝</span>
              <h3>不承诺“一份镜像运行在任何内核上”。</h3>
              <p>它不虚拟化硬件，不复制内核，也不自动解决多主机调度。它更不是“把服务塞进盒子就绝对安全”：共享内核意味着隔离有边界，守护进程本身也是高权限入口。</p>
              <div className="idea-result muted"><span>不是</span><strong>轻量 VM</strong><span>不是</span><strong>集群操作系统</strong></div>
            </article>
          </div>
          <div className="counterintuitive">
            <div className="counter-icon"><Icon name="spark" size={21} /></div>
            <div><strong>先记住一个反直觉事实</strong><p>“容器”不是一台内部跑着操作系统的机器。后面会看到，nginx 仍是宿主机上的普通进程，只是它的进程视图、文件系统视图与网络视图被重新划定。</p></div>
            <button onClick={() => scrollTo('path')}>镜像、容器进程：第 4 节展开 <Icon name="arrow" size={15} /></button>
          </div>
        </section>

        <section id="design" data-section="2" className="learning-section">
          <SectionHeading number={2} title="设计" lead="主体不是 Docker 命令，而是它如何把你的意图拆成可执行的系统状态。" />
          <div className="abstraction-grid">
            <article><span className="abstraction-number">A</span><Icon name="layers" size={23} /><h3>镜像</h3><p>按顺序叠加的只读层 + 启动元数据。</p><small>回答“用什么作为起点”</small></article>
            <article><span className="abstraction-number">B</span><Icon name="box" size={23} /><h3>容器</h3><p>镜像的一次可写运行实例。</p><small>回答“这一次怎样运行”</small></article>
            <article><span className="abstraction-number">C</span><Icon name="terminal" size={23} /><h3>Engine</h3><p>把声明翻译成系统状态。</p><small>回答“谁负责把它做出来”</small></article>
          </div>

          <div className="subsection-heading"><span>核心设计图</span><small>从制品，到内核机制，再到一个进程</small></div>
          <ArchitectureDiagram focus={designFocus} onFocus={setDesignFocus} />

          <div className="subsection-heading knowledge-map-heading"><span>把涉及的知识全部展开</span><small>从 Docker 控制面一直深潜到 Linux 内核机制</small></div>
          <KnowledgeMap onOpenModule={openModule} />
          <LearningPath onOpenModule={openModule} />

          <div className="invariant-panel">
            <div className="invariant-title"><Icon name="shield" size={20} /><strong>不变量</strong><span>理解 Docker 时不能丢掉的约束</span></div>
            <ol>
              <li><span>01</span><p><strong>镜像不变，容器可变。</strong>同镜像可以启动多个实例；每个实例的可写层彼此独立。</p></li>
              <li><span>02</span><p><strong>隔离不等于虚拟化。</strong>命名空间改变视图，cgroup 约束资源，内核始终共享。</p></li>
              <li><span>03</span><p><strong>运行时规格是边界。</strong>Docker 负责生成 OCI bundle，runc 负责按规格创建进程，职责因此可以替换与组合。</p></li>
            </ol>
          </div>
        </section>

        <section id="capabilities" data-section="3" className="learning-section">
          <SectionHeading number={3} title="能力地图" lead="先知道有哪些能力，不在这里展开参数与配置。" />
          <div className="capability-grid">
            {capabilities.map((capability) => (
              <button
                key={capability.name}
                className={`capability-card ${capability.state !== 'pending' ? 'is-on-path' : ''}`}
                onClick={() => capability.state !== 'pending' ? scrollTo('path') : capabilityModules[capability.name] ? openModule(capabilityModules[capability.name]) : requestTopic(capability.name)}
              >
                <div className="capability-top"><span className="capability-icon"><Icon name={capability.icon} size={20} /></span><span className={`capability-state ${capability.state}`}>{capability.state === 'path' ? '路径涉及' : capability.state === 'partial' ? '部分涉及' : '可深潜'}</span></div>
                <h3>{capability.name}</h3>
                <p>{capability.sentence}</p>
                <span className="capability-action">{capability.state !== 'pending' ? '查看已走通部分' : '进入依赖模块'}<Icon name={capability.state !== 'pending' ? 'arrow' : 'chevron'} size={14} /></span>
              </button>
            ))}
          </div>
          <p className="map-note"><Icon name="network" size={14} /> 地图中的每项能力都可进入对应模块；模块继续链接到它依赖的 Linux 与运行时知识。</p>
        </section>

        <section id="path" data-section="4" className="learning-section path-section">
          <SectionHeading number={4} title="一条代表路径" />
          <div className="path-intent"><span>意图</span><p>在 Linux 宿主机启动一个 nginx 容器，并让外部通过宿主机的 <code>8080</code> 端口访问它。</p></div>
          <p className="environment-note">路径以原生 Linux 的默认 rootful 环境、overlay2 存储驱动与 bridge 网络为例；其他环境会替换其中部分实现。</p>
          <div className="command-line"><span className="prompt">$</span><code>docker run -d --name atlas-web -p 8080:80 nginx:1.27</code><button onClick={() => { setReplaySignal((value) => value + 1); }} aria-label="从头播放这条命令"><Icon name="play" size={15} /></button></div>
          <div className="run-output-preview"><div><span>STDOUT · 容器 ID</span><code>7f3a9c2e8b1d4a6f0c5e2d7a9b3c1e6f4d8a0b5c2e7f9a1d3b6c4e8f0a2d5c</code></div><p><Icon name="arrow" size={13} /><code>{'docker ps --filter name=atlas-web --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"'}</code><span><code>{'atlas-web  Up 2 seconds  0.0.0.0:8080->80/tcp'}</code></span></p></div>
          <DockerSimulator replaySignal={replaySignal} onOpenModule={openModule} />
          <div className="path-summary"><Icon name="arrow" size={17} /><p><strong>一句话机制：</strong>镜像提供只读起点，运行时按 OCI 规格建立文件系统视图与隔离进程，网络机制再把宿主机端口接到容器监听端口。</p></div>
        </section>

        <section id="cost" data-section="5" className="learning-section">
          <SectionHeading number={5} title="代价" lead="每一种看似便利的设计，都在别处收取代价。" />
          <div className="cost-grid">
            <article><span className="cost-index">01</span><h3>共享内核</h3><p className="cost-because">换来低开销与快速启动。</p><p>代价是容器依赖宿主机内核能力，隔离强度通常弱于虚拟机。容器逃逸或内核漏洞的影响范围，不会自动被“容器”三个字截住。</p></article>
            <article><span className="cost-index">02</span><h3>分层文件系统</h3><p className="cost-because">换来缓存、去重与复用。</p><p>代价是写入落到可写层，删除容器可能丢失改动；大量随机写入还会带来额外的层写放大。镜像“可复现”也不等于运行状态永远一致。</p></article>
            <article><span className="cost-index">03</span><h3>Client / Daemon</h3><p className="cost-because">换来统一控制面与丰富能力。</p><p>代价是守护进程成为高权限信任根。能控制 Docker socket，通常就能控制宿主机上的容器乃至宿主资源；不要把 socket 当成普通用户接口。</p></article>
            <article><span className="cost-index">04</span><h3>标准化 OCI 边界</h3><p className="cost-because">换来运行时替换与生态组合。</p><p>代价是排障要跨越镜像、快照、运行时规格、网络与内核多层。一个“起不来”的现象，可能来自其中任何一层。</p></article>
          </div>
          <div className="misread-panel">
            <div className="misread-heading"><Icon name="spark" size={20} /><strong>常见看错</strong><span>容易被混为一谈的概念，在这里分清</span></div>
            <div className="misread-list">
              <div><span>Docker</span><Icon name="chevron" size={14} /><span>虚拟机</span><p>容器共享宿主机内核；虚拟机通过 Hypervisor 虚拟化硬件，并运行自己的 Guest OS。</p></div>
              <div><span>镜像</span><Icon name="chevron" size={14} /><span>容器</span><p>镜像是只读模板；容器是在它之上创建的可写运行实例。删容器，镜像仍在。</p></div>
              <div><span>Dockerfile</span><Icon name="chevron" size={14} /><span>镜像</span><p>Dockerfile 是构建配方；镜像是配方产出的分发制品。运行时消费镜像，不消费 Dockerfile。</p></div>
              <div><span>Docker</span><Icon name="chevron" size={14} /><span>Kubernetes</span><p>Docker 管理单机上的镜像与容器；Kubernetes 的核心是跨主机的声明式协调与持续纠偏。</p></div>
            </div>
          </div>
        </section>

        <section id="example" data-section="6" className="learning-section">
          <SectionHeading number={6} title="示例" lead="只拆这条路径里最关键、也最容易看错的一步：端口发布。" />
          <div className="example-panel">
            <div className="example-terminal">
              <div className="terminal-top"><span /><span /><span /><small>atlas-web · host shell</small></div>
              <div className="terminal-body">
                <p><span>$</span> docker port atlas-web</p>
                <p className="terminal-output">80/tcp -&gt; 0.0.0.0:8080</p>
                <p><span>$</span> curl 127.0.0.1:8080</p>
                <p className="terminal-muted">请求进入宿主机 8080，随后被转交到容器 80。</p>
              </div>
              <button onClick={replayRequest}><Icon name="play" size={15} /> 在机制图中重放请求</button>
            </div>
            <div className="packet-trace">
              <div className="trace-head"><span>一次请求的地址变化</span><small>示例地址会随 Docker 网络环境变化</small></div>
              {[
                ['01', '客户端', '127.0.0.1:8080', '访问宿主机发布端口'],
                ['02', '转发规则', '容器 IP:80', '目标地址 / 端口被改写'],
                ['03', 'docker0 + veth', '容器 netns', '帧进入容器网络视图'],
                ['04', 'nginx', '0.0.0.0:80', 'worker 接收并返回响应'],
              ].map(([number, title, address, text], index) => (
                <div className="trace-step" key={number}><span className="trace-number">{number}</span><div><strong>{title}</strong><p>{text}</p></div><code>{address}</code>{index < 3 && <i className="trace-connector" />}</div>
              ))}
            </div>
          </div>
          <div className="example-note"><Icon name="network" size={18} /><p><strong>-p 不是魔法开关。</strong>它添加的是流量路径；nginx 是否在监听、容器是否分到预期地址、规则是否生效，仍要分别验证。</p></div>
        </section>

        <section id="boundary" data-section="7" className="learning-section">
          <SectionHeading number={7} title="边界" lead="知道它挡住了什么，才知道什么时候不能继续用它回答。" />
          <div className="boundary-grid">
            <article className="boundary-yes"><span className="card-label"><Icon name="check" size={16} /> 这条设计挡住了</span><ul><li>应用依赖与宿主机环境之间的意外耦合</li><li>同一镜像在不同实例上起始文件系统的无意义漂移</li><li>多个进程视图、挂载视图与网络视图互相干扰</li><li>把环境搭建过程藏在个人电脑与口头说明里</li></ul></article>
            <article className="boundary-no"><span className="card-label"><Icon name="close" size={16} /> 这条设计没挡住</span><ul><li>共享内核漏洞与高权限守护进程带来的风险</li><li>无资源限制时的 CPU、内存或磁盘耗尽</li><li>容器删除后需要保留的数据</li><li>跨主机调度、故障转移与声明式状态协调</li><li>镜像仓库中的恶意层或脆弱依赖</li></ul></article>
          </div>
          <div className="stop-card">
            <div className="stop-top"><span><Icon name="check" size={17} /> Docker 全景已展开</span><small>{dockerModules.length} 个依赖模块 · 完整状态与示例</small></div>
            <h3>不再停在命令层。沿任意概念进入它的完整机制。</h3>
            <p>每个模块都包含理念、设计、诞生动机、核心抽象、完整执行状态、可复现示例、代价与边界。你可以从最关心的节点开始。</p>
            <div className="stop-footer"><span>Docker 依赖图</span><strong>{dockerModules.length} / {dockerModules.length} 模块可用</strong><span>六个独立主题均可深潜</span></div>
          </div>
        </section>

        <footer className="page-footer"><div><DockerMark size={22} /><span>心智实验室</span></div><p>不是记住更多命令，而是看懂每一次状态变化。</p><span>ROUND 01 / DOCKER</span></footer>
          </>
        )}
      </main>

      {toast && <div className="toast" role="status"><span className="toast-icon"><Icon name="check" size={16} /></span><p>{toast}</p><button onClick={() => setToast('')} aria-label="关闭提示"><Icon name="close" size={16} /></button></div>}
    </div>
  )
}
