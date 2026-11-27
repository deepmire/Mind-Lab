import { useState } from 'react'
import { KnowledgeMap } from './KnowledgeMap'
import { LearningPath } from './LearningPath'
import { linuxModules } from './knowledge'
import type { ModuleId } from './knowledgeTypes'
import { Icon, type IconName } from './Icons'
import { LinuxRuntimeLab } from './LinuxRuntimeLab'
import { MechanismDiagram } from './MechanismDiagram'
import { SectionHeading } from './SectionHeading'
import { LinuxPrimer } from './TopicPrimer'

/** Linux 总览能力地图；每项一句说明，点击后进入对应机制模块。 */
const capabilities: { name: string; sentence: string; icon: IconName; module: ModuleId }[] = [
  { name: '内核与程序', sentence: '看懂用户程序怎样通过系统调用请求内核服务。', icon: 'layers', module: 'linux-kernel-user-space' },
  { name: '进程管理', sentence: '理解进程编号、状态、父子关系和退出回收。', icon: 'workflow', module: 'linux-process-model' },
  { name: '文件与权限', sentence: '沿着路径解析、inode 和权限规则判断一次访问能否成功。', icon: 'folder', module: 'linux-filesystem-vfs' },
  { name: '命令行工作', sentence: '用 Shell、输入输出和文本工具组合出可重复的操作。', icon: 'terminal', module: 'linux-shell-essentials' },
  { name: '服务与信号', sentence: '管理系统服务、后台任务和优雅退出。', icon: 'play', module: 'linux-systemd-services' },
  { name: '网络连接', sentence: '分开检查网卡、地址、路由、端口和 DNS。', icon: 'network', module: 'linux-networking' },
  { name: '存储与启动', sentence: '理解磁盘、文件系统、挂载点和开机启动链。', icon: 'database', module: 'linux-storage-disks' },
  { name: '观测与隔离', sentence: '用日志和资源指标定位问题，并用隔离机制限制影响范围。', icon: 'shield', module: 'linux-observability-performance' },
]

/** 三种观察重点对应同一台 Linux 主机，避免把内核、Shell 和应用混成一个层。 */
const focusCopy = {
  kernel: { label: '内核', title: '应用程序提出请求，内核决定怎样安全地完成', text: '普通程序运行在用户空间，不能直接操作硬件。它通过系统调用请求内核创建进程、读写文件或连接网络，内核检查权限并管理系统资源。' },
  process: { label: '进程', title: '服务出问题时，最终要落到具体进程和状态', text: '程序是文件，进程是它的一次运行。进程有编号、父进程、内存、打开文件和状态；卡住、退出和僵尸都需要不同证据判断。' },
  file: { label: '文件', title: '路径存在只是第一步，权限和挂载也决定访问结果', text: '内核先解析路径，再检查挂载点、inode、所有者和权限。命令失败时，“文件不存在”“没有权限”和“目录不可进入”是不同原因。' },
}

type Focus = keyof typeof focusCopy

/** Linux 主机架构图；标签只改变高亮与解释，底层职责保持固定。 */
function LinuxArchitecture({ focus, onFocus }: { focus: Focus; onFocus: (value: Focus) => void }) {
  return (
    <div className="architecture-panel linux-architecture">
      <div className="focus-tabs" role="tablist" aria-label="Linux 设计观察层">{(Object.keys(focusCopy) as Focus[]).map((key) => <button key={key} role="tab" aria-selected={focus === key} className={focus === key ? 'is-active' : ''} onClick={() => onFocus(key)}>{focusCopy[key].label}</button>)}</div>
      <div className={`linux-architecture-canvas focus-${focus}`}>
        <div className="linux-arch-layer apps"><span>用户空间</span><div><Icon name="terminal" size={18} /><strong>Shell 与命令</strong></div><div><Icon name="workflow" size={18} /><strong>应用程序</strong></div><div><Icon name="play" size={18} /><strong>系统服务</strong></div></div>
        <div className="linux-arch-boundary"><span>系统调用 / 权限检查 / 资源管理</span></div>
        <div className="linux-arch-layer kernel"><span>内核空间</span><div><Icon name="layers" size={18} /><strong>进程调度</strong></div><div><Icon name="folder" size={18} /><strong>文件与权限</strong></div><div><Icon name="network" size={18} /><strong>网络与设备</strong></div></div>
        <div className="linux-arch-hardware"><Icon name="database" size={18} /><strong>处理器 · 内存 · 磁盘 · 网卡</strong></div>
      </div>
      <div className="focus-explanation" key={focus}><span className="eyebrow">观察重点 · {focusCopy[focus].label}</span><h3>{focusCopy[focus].title}</h3><p>{focusCopy[focus].text}</p></div>
    </div>
  )
}

/** Linux 七章节总览；从操作系统职责开始，不要求读者先学 Docker 或其他主题。 */
export function LinuxOverview({ onOpenModule }: { onOpenModule: (id: ModuleId) => void }) {
  const [focus, setFocus] = useState<Focus>('kernel')
  return (
    <>
      <section className="hero agent-hero linux-hero" aria-labelledby="linux-hero-title">
        <div className="hero-kicker"><span>ROUND 05</span><i />机制优先学习法</div>
        <h1 id="linux-hero-title">Linux：不是命令清单，<br /><em>而是一套管理程序、文件与资源的规则。</em></h1>
        <p className="hero-lead">从一次终端命令开始，逐步看清用户程序、Shell、内核、进程、文件权限、服务、网络和启动流程怎样协作。目标不是背命令，而是看到异常状态时知道该检查哪一层证据。</p>
        <div className="hero-meta"><span><Icon name="play" size={14} /> 可切换运行时状态</span><span><Icon name="layers" size={14} /> 进程与权限实验</span><span><Icon name="terminal" size={14} /> 命令与输出对照</span><span><Icon name="network" size={14} /> {linuxModules.length} 个深潜模块</span></div>
        <div className="hero-actions"><button className="hero-cta" onClick={() => document.getElementById('philosophy')?.scrollIntoView({ behavior: 'smooth' })}>从理念开始 <Icon name="arrow" size={17} /></button><button className="hero-path-cta" onClick={() => document.getElementById('linux-learning-path')?.scrollIntoView({ behavior: 'smooth' })}>查看最佳学习路径 <Icon name="network" size={16} /></button></div>
        <div className="hero-aside" aria-label="阅读顺序"><span className="aside-label">READING ORDER</span>{[['01', '请求', '程序怎样让事情发生'], ['02', '状态', '内核保存了什么'], ['03', '证据', '怎样验证与排障']].map(([number, title, text]) => <div key={number}><span>{number}</span><p><strong>{title}</strong><small>{text}</small></p></div>)}</div>
        <div className="hero-watermark agent-watermark" aria-hidden="true"><Icon name="terminal" size={230} /></div>
      </section>

      <div className="overview-primer"><LinuxPrimer /></div>

      <section id="philosophy" data-section="1" className="learning-section">
        <SectionHeading number={1} title="理念" lead="先理解操作系统为什么存在，再学习任何一条命令。" />
        <div className="thesis-card"><span className="thesis-mark">“</span><p>Linux 的核心价值是把<strong>硬件能力、程序运行和安全边界</strong>组织成可组合、可观察、可限制的系统。</p></div>
        <div className="two-column philosophy-grid">
          <article className="idea-card positive"><span className="card-label"><Icon name="check" size={16} /> 它要解决</span><h3>让多个程序安全地共享处理器、内存、文件和设备。</h3><p>如果每个程序直接操作硬件，就会互相覆盖内存、争抢设备并绕过权限。Linux 用内核统一管理资源，让程序通过明确的接口提出请求。</p><div className="idea-result"><span>输入</span><strong>程序请求</strong><Icon name="arrow" size={15} /><span>产出</span><strong>受控的系统状态</strong></div></article>
          <article className="idea-card negative"><span className="card-label"><Icon name="close" size={16} /> 它拒绝</span><h3>不承诺“记住命令，就能解决所有系统问题”。</h3><p>同一个报错可能来自权限、路径、服务状态、网络或资源耗尽。Linux 提供的是机制和证据，不是永远有效的命令口诀；排障必须沿状态逐层验证。</p><div className="idea-result muted"><span>不是</span><strong>命令背诵</strong><span>不是</span><strong>无需理解权限</strong></div></article>
        </div>
        <div className="counterintuitive"><div className="counter-icon"><Icon name="spark" size={21} /></div><div><strong>先记住一个反直觉事实</strong><p>终端里输入的文字不是内核直接执行的机器指令。Shell 先解释命令、展开路径和变量，再创建进程并等待结果；管道和重定向也常常由 Shell 负责连接。</p></div><button onClick={() => document.getElementById('path')?.scrollIntoView({ behavior: 'smooth' })}>第 4 节看执行路径 <Icon name="arrow" size={15} /></button></div>
      </section>

      <section id="design" data-section="2" className="learning-section">
        <SectionHeading number={2} title="设计" lead="先建立用户空间与内核空间的分工，再把进程、文件和服务放回同一张图。" />
        <div className="abstraction-grid agent-abstraction-grid">
          <article><span className="abstraction-number">A</span><Icon name="terminal" size={23} /><h3>Shell</h3><p>解释输入、展开参数并启动程序，是人与系统之间的命令层。</p><small>回答“这句话怎样变成程序”</small></article>
          <article><span className="abstraction-number">B</span><Icon name="workflow" size={23} /><h3>进程</h3><p>程序的一次运行实例，拥有编号、状态、内存和打开的文件。</p><small>回答“谁正在运行”</small></article>
          <article><span className="abstraction-number">C</span><Icon name="folder" size={23} /><h3>文件与权限</h3><p>用路径、inode、所有者和权限规则描述数据及访问边界。</p><small>回答“能否读写这个对象”</small></article>
          <article><span className="abstraction-number">D</span><Icon name="layers" size={23} /><h3>内核</h3><p>直接管理硬件，并检查请求、分配资源和维护系统状态。</p><small>回答“事情怎样真正发生”</small></article>
        </div>
        <div className="subsection-heading"><span>核心设计图</span><small>点击标签观察内核、进程和文件三条机制线</small></div>
        <LinuxArchitecture focus={focus} onFocus={setFocus} />
        <div className="subsection-heading knowledge-map-heading"><span>按需要选择要深入的知识</span><small>从内核与用户空间一直深入到启动、隔离与生产排障</small></div>
        <KnowledgeMap track="linux" onOpenModule={onOpenModule} />
        <LearningPath track="linux" onOpenModule={onOpenModule} />
        <div className="invariant-panel"><div className="invariant-title"><Icon name="shield" size={20} /><strong>不变量</strong><span>理解 Linux 时不能丢掉的约束</span></div><ol><li><span>01</span><p><strong>用户程序不直接控制硬件。</strong>关键操作必须经过内核接口和权限检查。</p></li><li><span>02</span><p><strong>状态与证据要分开。</strong>进程存在、服务正常、端口监听和请求成功是不同事实。</p></li><li><span>03</span><p><strong>最小权限与可恢复性同时重要。</strong>既要限制误操作，也要保留日志、退出状态和恢复路径。</p></li></ol></div>
      </section>

      <section id="capabilities" data-section="3" className="learning-section">
        <SectionHeading number={3} title="能力地图" lead="先知道 Linux 由哪些相互配合的能力组成，每项都可进入对应深潜模块。" />
        <div className="capability-grid">{capabilities.map((capability) => <button key={capability.name} className="capability-card is-on-path" onClick={() => onOpenModule(capability.module)}><div className="capability-top"><span className="capability-icon"><Icon name={capability.icon} size={20} /></span><span className="capability-state path">可深潜</span></div><h3>{capability.name}</h3><p>{capability.sentence}</p><span className="capability-action">进入这一节<Icon name="arrow" size={14} /></span></button>)}</div>
        <p className="map-note"><Icon name="network" size={14} />Linux 能力不是互不相关的命令；进程、文件、权限和服务共同决定一次操作能否成功。</p>
      </section>

      <section id="path" data-section="4" className="learning-section path-section">
        <SectionHeading number={4} title="一条代表路径" />
        <div className="path-intent"><span>意图</span><p>在终端启动一个后台任务，观察 Shell 如何创建进程、程序如何替换、终止信号如何触发退出，以及父进程为什么必须回收。再切换文件权限实验，预判三个用户对同一个文件的访问结果。</p></div>
        <p className="environment-note">以下为教学模拟的确定性轨迹，不创建或终止真实进程，也不修改真实文件权限；真实命令会在各模块的“示例”章节给出。</p>
        <LinuxRuntimeLab />
        <div className="path-summary"><Icon name="arrow" size={17} /><p><strong>一句话机制：</strong>Shell 把命令变成进程，内核负责调度与资源，程序通过系统调用请求服务，退出后由父进程回收；排障就是沿着这条链核对状态与证据。</p></div>
      </section>

      <section id="cost" data-section="5" className="learning-section">
        <SectionHeading number={5} title="代价" lead="Linux 用统一接口换来强大能力，也把复杂性暴露给使用者。" />
        <div className="cost-grid">
          <article><span className="cost-index">01</span><h3>同一目标常有多种工具</h3><p className="cost-because">换来可组合与可脚本化的灵活性。</p><p>查看进程、过滤文本和管理服务都有多种方式。选择过多会增加学习成本，也要求读者理解工具输入、输出和退出码，而不是只复制命令。</p></article>
          <article><span className="cost-index">02</span><h3>权限与路径规则很严格</h3><p className="cost-because">换来多用户环境下的安全隔离。</p><p>文件存在不代表能读，命令存在不代表能执行。目录进入权限、所有者和挂载点任何一处不满足，都可能导致访问失败。</p></article>
          <article><span className="cost-index">03</span><h3>后台状态不容易直接看见</h3><p className="cost-because">换来持续运行与开机自启能力。</p><p>服务没有窗口，也不会自动把错误显示在终端。必须主动查看服务状态、日志、进程和端口，才能判断它是否真的可用。</p></article>
          <article><span className="cost-index">04</span><h3>故障会跨层传播</h3><p className="cost-because">换来统一管理硬件与软件的简洁模型。</p><p>磁盘满、权限错误、端口冲突和资源耗尽可能表现相似。缺少分层证据时，很容易在最表面反复重试而找不到根因。</p></article>
        </div>
        <div className="misread-panel"><div className="misread-heading"><Icon name="spark" size={20} /><strong>常见看错</strong><span>容易混为一谈的概念，在这里分清</span></div><div className="misread-list"><div><span>程序</span><Icon name="chevron" size={14} /><span>进程</span><p>程序是保存的文件，进程是它的一次运行。同一个程序可以同时有多个进程，每个进程拥有独立编号和状态。</p></div><div><span>终止</span><Icon name="chevron" size={14} /><span>强制杀死</span><p>TERM 通常允许程序清理后退出，KILL 由内核强制终止。需要保存数据时应先尝试优雅停止，而不是直接强杀。</p></div><div><span>文件存在</span><Icon name="chevron" size={14} /><span>可以访问</span><p>访问还受目录进入权限、文件权限、所有者和挂载影响。排查时要分别验证路径解析和权限检查。</p></div></div></div>
      </section>

      <section id="example" data-section="6" className="learning-section">
        <SectionHeading number={6} title="示例" lead="只拆一次服务启动中最关键的证据：进程存在、服务正常和端口可访问为什么必须分别检查。" />
        <MechanismDiagram diagram={{ kind: 'flow', title: '一次服务启动的三层证据', caption: '把启动器状态、进程状态和网络状态分开记录，才能判断问题发生在哪一层。', items: [
          { title: '服务管理器', detail: 'systemd 记录单元是否启动、退出码和最近日志。active 只表示管理器认为服务在运行，不证明业务端口可用。', tag: 'service', tone: 'blue' },
          { title: '进程状态', detail: 'ps 显示进程编号、状态、CPU 和内存。进程存在但持续重启，通常需要继续查看退出码与日志。', tag: 'process', tone: 'orange' },
          { title: '网络监听', detail: 'ss 显示是否有进程监听目标地址和端口。没有监听时，外部请求不可能到达应用。', tag: 'network', tone: 'green' },
          { title: '请求结果', detail: '在允许的网络路径中发起请求，检查状态码和响应内容。它是业务可用的最终证据，但不能替代前三层定位。', tag: 'request', tone: 'muted' },
        ], footnote: '只看到“服务已启动”就结束排障，会漏掉进程崩溃、端口未监听和业务返回错误。' }} />
        <div className="example-panel agent-trace-example"><div className="agent-trace-plain"><div className="agent-trace-plain-head"><span><Icon name="target" size={17} /></span><div><strong>先看结论：进程存在，但业务端口没有监听</strong><small>以下为教学模拟输出，不对应真实主机</small></div></div><div className="agent-trace-facts"><div><span>服务状态</span><strong>单元显示运行中</strong><small>管理器未立即发现异常</small></div><div><span>进程状态</span><strong>worker 进程存在</strong><small>但正在反复重启</small></div><div><span>端口检查</span><strong>8080 没有监听</strong><small>请求无法到达应用</small></div><div><span>日志证据</span><strong>配置解析失败</strong><small>退出码 1，需先修配置</small></div></div></div><div className="packet-trace"><div className="trace-head"><span>可观察证据</span><small>教学模拟输出</small></div>{[['01', 'service.status', 'active', '服务管理器状态'], ['02', 'process.state', 'restarting', '进程正在重启'], ['03', 'socket.listen', 'false', '目标端口未监听'], ['04', 'log.error', 'config', '日志指出配置错误']].map(([number, title, code, text], index) => <div className="trace-step" key={number}><span className="trace-number">{number}</span><div><strong>{title}</strong><p>{text}</p></div><code>{code}</code>{index < 3 && <i className="trace-connector" />}</div>)}</div></div>
        <div className="example-note"><Icon name="shield" size={18} /><p><strong>状态是分层证据，不是一句“服务挂了”。</strong>从服务管理器、进程、端口到日志逐层缩小范围，才能决定该改配置、查权限还是处理资源不足。</p></div>
      </section>

      <section id="boundary" data-section="7" className="learning-section">
        <SectionHeading number={7} title="边界" lead="知道 Linux 提供了什么，才知道哪些问题仍需要应用设计、监控体系或人工流程。" />
        <div className="boundary-grid"><article className="boundary-yes"><span className="card-label"><Icon name="check" size={16} /> 这条设计挡住了</span><ul><li>多个程序无约束地直接争抢硬件</li><li>所有用户无差别读写全部文件</li><li>后台服务缺少统一启动、停止与日志入口</li><li>通过进程、文件、网络和资源状态定位大多数主机故障</li></ul></article><article className="boundary-no"><span className="card-label"><Icon name="close" size={16} /> 这条设计没挡住</span><ul><li>应用逻辑错误或数据本身不正确</li><li>缺少监控与告警导致问题长期不可见</li><li>错误配置把权限放得过大</li><li>单机资源上限和单点故障</li><li>只靠命令而不理解机制导致的误操作</li></ul></article></div>
        <div className="stop-card"><div className="stop-top"><span><Icon name="check" size={17} /> Linux 全景已展开</span><small>{linuxModules.length} 个依赖模块 · 完整状态与示例</small></div><h3>不止学会“敲命令”，而是看懂程序怎样运行、权限怎样生效、服务怎样持续，以及出错后该找哪层证据。</h3><p>每个模块都包含理念、设计、诞生动机、核心抽象、完整执行状态、可复现示例、代价与边界。</p><div className="stop-footer"><span>Linux 依赖图</span><strong>{linuxModules.length} / {linuxModules.length} 模块可用</strong><span>六条技术轨道均可独立深潜</span></div></div>
      </section>
      <footer className="page-footer"><div><Icon name="terminal" size={22} /><span>心智实验室</span></div><p>不是记住更多命令，而是看清每一次请求背后的系统状态。</p><span>ROUND 05 / LINUX</span></footer>
    </>
  )
}
