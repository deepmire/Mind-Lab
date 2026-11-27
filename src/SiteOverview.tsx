import { categoryByTopic, groupsByTrack, modules, modulesByTrack } from './knowledge'
import type { ModuleId, TrackId } from './knowledgeTypes'
import { Icon, type IconName } from './Icons'
import { MechanismDiagram } from './MechanismDiagram'
import { SectionHeading } from './SectionHeading'

/** 六个独立主题共用的入口信息；模块数量直接从内容聚合结果读取，避免文案与数据漂移。 */
const trackCards: { id: TrackId; title: string; english: string; summary: string; icon: IconName; firstModule: ModuleId }[] = [
  {
    id: 'docker',
    title: 'Docker',
    english: '单机容器运行时',
    summary: '从镜像与进程出发，拆开 namespace、cgroup、文件系统和网络，理解容器为什么不是轻量虚拟机。',
    icon: 'box',
    firstModule: 'docker-engine',
  },
  {
    id: 'kubernetes',
    title: 'Kubernetes',
    english: '声明式集群控制面',
    summary: '从期望状态与控制循环出发，理解 Pod 调度、服务发现、滚动发布、存储和集群运维如何协作。',
    icon: 'network',
    firstModule: 'kubernetes-architecture',
  },
  {
    id: 'agent',
    title: 'Agent',
    english: '受约束的行动循环',
    summary: '先认识会生成文字的模型，再看它怎样查资料、调用工具，并在其他程序的监督下完成任务；同时学会判断它是否可靠。',
    icon: 'workflow',
    firstModule: 'agent-loop',
  },
  {
    id: 'rag',
    title: 'RAG',
    english: '检索增强生成',
    summary: '从资料准备、语义检索到证据生成，理解系统怎样找到正确内容、带上引用，并在资料不足时拒绝猜测。',
    icon: 'database',
    firstModule: 'rag-intent',
  },
  {
    id: 'linux',
    title: 'Linux',
    english: '操作系统与内核机制',
    summary: '从内核、进程、文件和权限开始，逐步理解命令行、服务、网络、启动链，以及故障该从哪一层取证。',
    icon: 'terminal',
    firstModule: 'linux-mental-model',
  },
  {
    id: 'network',
    title: '计算机网络',
    english: '网络协议与数据通信',
    summary: '从数据包、分层与地址出发，逐步理解路由、TCP/UDP、DNS、HTTP、TLS，并用抓包和性能证据排障。',
    icon: 'network',
    firstModule: 'network-mental-model',
  },
]

/**
 * 网站默认首页。
 * 这里不直接进入某项技术，而是先说明产品为什么存在、怎样组织知识，以及读者应该带着什么意图学习。
 */
export function SiteOverview({ onOpenTrack, onOpenModule }: { onOpenTrack: (track: TrackId) => void; onOpenModule: (id: ModuleId) => void }) {
  return (
    <>
      <section className="hero site-hero" aria-labelledby="site-hero-title">
        <div className="hero-kicker"><span>START HERE</span><i />机制优先学习法</div>
        <h1 id="site-hero-title">不是背更多命令，<br /><em>而是看懂系统为什么这样运行。</em></h1>
        <p className="hero-lead">心智实验室把 Docker、Kubernetes、Agent、RAG、Linux 与计算机网络拆成可观察的机制、完整的状态变化和可复现的证据。默认你不懂任何前置知识，目标是学完一个模块后，只剩亲手实操。</p>
        <div className="hero-meta"><span><Icon name="layers" size={14} /> 2 类知识领域</span><span><Icon name="network" size={14} /> 6 个独立主题</span><span><Icon name="target" size={14} /> {modules.length} 个深潜模块</span><span><Icon name="terminal" size={14} /> 7 节统一结构</span></div>
        <div className="hero-actions"><button className="hero-cta" onClick={() => document.getElementById('site-philosophy')?.scrollIntoView({ behavior: 'smooth' })}>先看学习理念 <Icon name="arrow" size={17} /></button><button className="hero-path-cta" onClick={() => document.getElementById('site-intent')?.scrollIntoView({ behavior: 'smooth' })}>选择独立主题 <Icon name="network" size={16} /></button></div>
        <div className="hero-aside" aria-label="学习闭环"><span className="aside-label">LEARNING LOOP</span>{[['01', '意图', '它为什么存在'], ['02', '机制', '内部怎样变化'], ['03', '证据', '如何验证与排障']].map(([number, title, text]) => <div key={number}><span>{number}</span><p><strong>{title}</strong><small>{text}</small></p></div>)}</div>
        <div className="hero-watermark site-watermark" aria-hidden="true"><Icon name="layers" size={230} /></div>
      </section>

      <section id="site-philosophy" data-section="1" className="learning-section">
        <SectionHeading number={1} title="理念" lead="先把“记住一个名词”和“真正理解一个系统”分开。" />
        <div className="thesis-card"><span className="thesis-mark">“</span><p>让一个零基础读者，在读完一个模块后能够<strong>解释设计、预判状态、识别证据，并独立排障</strong>。</p></div>
        <div className="two-column philosophy-grid">
          <article className="idea-card positive"><span className="card-label"><Icon name="check" size={16} /> 它要解决</span><h3>把散落在命令、源码和运维经验里的机制，组织成可以逐步推演的学习路径。</h3><p>很多知识看似已经“听过”，但一到故障现场就分不清对象状态、进程状态、网络路径和真实响应。这里用意图、机制、状态和证据把认知缺口补完整。</p><div className="idea-result"><span>输入</span><strong>零基础问题</strong><Icon name="arrow" size={15} /><span>输出</span><strong>可验证的理解</strong></div></article>
          <article className="idea-card negative"><span className="card-label"><Icon name="close" size={16} /> 它拒绝</span><h3>不用术语堆砌制造“已经学会”的错觉，也不把命令成功当成系统健康。</h3><p>功能清单不能替代机制；一次 apply、一条 curl 或一个 Running 状态都可能只是中间证据。课程会显式讲清失败分支、设计代价和不能解决的问题。</p><div className="idea-result muted"><span>不是</span><strong>命令速查表</strong><span>不是</span><strong>概念词典</strong></div></article>
        </div>
        <div className="counterintuitive"><div className="counter-icon"><Icon name="spark" size={21} /></div><div><strong>先记住一个反直觉事实</strong><p>“知道一个词”不等于“理解它”。术语只在第一次真正影响机制时展开；如果某个词背后是一套独立机制，就进入完整深潜模块，而不是塞进一句脚注。</p></div><button onClick={() => document.getElementById('site-design')?.scrollIntoView({ behavior: 'smooth' })}>看网站怎样组织知识 <Icon name="arrow" size={15} /></button></div>
      </section>

      <section id="site-design" data-section="2" className="learning-section">
        <SectionHeading number={2} title="设计" lead="所有轨道共用同一个学习闭环，但保留各自技术的核心抽象与依赖关系。" />
        <MechanismDiagram diagram={{ kind: 'flow', title: '从问题到独立实操的五段闭环', caption: '每一段都必须有可观察的产物，避免学习停在“听起来懂了”。', items: [
          { title: '意图', detail: '先说明这项技术要解决什么、明确拒绝什么，建立学习理由。', tag: 'why', tone: 'blue' },
          { title: '机制', detail: '拆开核心抽象、职责边界、历史动机与设计不变量。', tag: 'how', tone: 'orange' },
          { title: '状态', detail: '沿一条代表路径播放内部变化，并用状态表对照每个分支。', tag: 'state', tone: 'muted' },
          { title: '证据', detail: '把命令、预期输出、机制图和验收点放在一起，训练独立验证。', tag: 'proof', tone: 'green' },
          { title: '权衡', detail: '讲清代价、常见看错和设计边界，知道什么时候该换另一层方案。', tag: 'tradeoff', tone: 'blue' },
        ], footnote: '依赖不是术语表：需要单独理解的知识会变成模块，并通过左侧目录和依赖地图继续深入。' }} />
        <div className="subsection-heading"><span>七个固定章节</span><small>标题与顺序在六条轨道中保持一致，降低切换学习主题的成本</small></div>
        <div className="site-section-grid">{[
          ['01', '理念', '问题与拒绝'], ['02', '设计', '抽象与不变量'], ['03', '能力地图', '能做什么'], ['04', '一条代表路径', '状态怎样变化'], ['05', '代价', '为什么这样取舍'], ['06', '示例', '如何复现与验收'], ['07', '边界', '挡住了什么'],
        ].map(([number, title, detail]) => <article key={number}><span>{number}</span><strong>{title}</strong><small>{detail}</small></article>)}</div>
        <div className="invariant-panel">
          <div className="invariant-title"><Icon name="shield" size={20} /><strong>全站不变量</strong><span>换技术主题也不能丢掉的约束</span></div>
          <ol><li><span>01</span><p><strong>意图先于命令。</strong>不知道要解决什么，就无法判断状态和输出意味着什么。</p></li><li><span>02</span><p><strong>状态先于结论。</strong>对象存在、进程运行、端点更新与请求成功必须分别验证。</p></li><li><span>03</span><p><strong>依赖独立成模块。</strong>关键机制不能用一个名词掩盖，目录与地图都要能继续下潜。</p></li></ol>
        </div>
      </section>

      <section id="site-intent" data-section="3" className="learning-section">
        <SectionHeading number={3} title="意图" lead="从任意一个独立主题开始；它们没有默认先后顺序，也不需要先学完另一个主题。" />
        <div className="site-track-grid">{trackCards.map((track) => <article className="site-track-card" key={track.id}><div className="site-track-top"><span className="capability-icon"><Icon name={track.icon} size={22} /></span><span>{categoryByTopic[track.id].title}</span></div><h3>{track.title}</h3><p>{track.summary}</p><div className="site-track-meta"><span>{modulesByTrack[track.id].length} 个深潜模块</span><span>{groupsByTrack[track.id].length} 个知识组</span></div><div className="site-track-actions"><button onClick={() => onOpenTrack(track.id)}>进入主题<Icon name="arrow" size={14} /></button><button onClick={() => onOpenModule(track.firstModule)}>从第一站开始<Icon name="play" size={13} /></button></div></article>)}</div>
        <div className="path-summary site-route-note"><Icon name="target" size={17} /><p><strong>按问题选择，而不是按固定顺序：</strong>想理解进程与镜像隔离，从 Docker 开始；想理解声明、调度与持续纠偏，从 Kubernetes 开始；想理解上下文、工具与行动循环，从 Agent 开始；想理解资料怎样变成有依据的答案，从 RAG 开始；想理解操作系统怎样运行程序和管理资源，从 Linux 开始；想理解数据怎样跨网络寻址、传输和到达应用，从计算机网络开始。每个主题内部都有独立的最佳学习路径。</p></div>
      </section>

      <footer className="page-footer"><div><Icon name="layers" size={22} /><span>心智实验室</span></div><p>从零基础概念，到只剩亲手实操。</p><span>START HERE / MECHANISM ATLAS</span></footer>
    </>
  )
}
