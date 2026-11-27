import { useState } from 'react'
import { KnowledgeMap } from './KnowledgeMap'
import { LearningPath } from './LearningPath'
import { networkModules } from './knowledge'
import type { ModuleId } from './knowledgeTypes'
import { Icon, type IconName } from './Icons'
import { MechanismDiagram } from './MechanismDiagram'
import { NetworkPacketLab } from './NetworkPacketLab'
import { SectionHeading } from './SectionHeading'
import { NetworkPrimer } from './TopicPrimer'

const capabilities: { name: string; sentence: string; icon: IconName; module: ModuleId }[] = [
  { name: '通信模型', sentence: '看懂主机、链路、数据包和协议怎样共同完成一次通信。', icon: 'network', module: 'network-mental-model' },
  { name: '分层与封装', sentence: '理解应用数据怎样加上各层头部，再在接收端逐层解开。', icon: 'layers', module: 'network-layering' },
  { name: '链路与寻址', sentence: '分清 MAC、交换机、IP 地址、子网与 ARP 的职责边界。', icon: 'workflow', module: 'network-ethernet-switching' },
  { name: '路由', sentence: '跟随最长前缀匹配和默认网关，解释数据包的下一跳。', icon: 'target', module: 'network-routing' },
  { name: '可靠与实时传输', sentence: '比较 TCP 的可靠字节流与 UDP 的无连接数据报。', icon: 'chart', module: 'network-tcp' },
  { name: '名称与网页', sentence: '把 DNS、HTTP 和 TLS 连成一次可核对的网页访问。', icon: 'database', module: 'network-dns' },
  { name: '边界与自动配置', sentence: '理解 NAT、防火墙和 DHCP 怎样管理跨网络访问与地址分配。', icon: 'shield', module: 'network-nat-firewall' },
  { name: '抓包与排障', sentence: '从延迟、丢包、握手和应用响应中取得分层证据。', icon: 'terminal', module: 'network-troubleshooting' },
]

const focusCopy = {
  address: { label: '寻址', title: '先回答“数据要去哪里”，再回答“怎样到达”', text: 'MAC 地址帮助同一链路找到网卡，IP 地址标识主机和网络，端口标识主机内的服务。路由根据目的 IP 选择下一跳，DNS 则把名称转换成 IP。' },
  transport: { label: '传输', title: '网络只提供尽力转发，可靠性由上层按需建立', text: 'IP 数据包可能丢失、重复或乱序。TCP 用序号、确认、重传和窗口建立可靠字节流；UDP 保留数据报边界，把可靠性与实时性取舍交给应用。' },
  application: { label: '应用', title: '连接成功不等于业务成功，每层都要给出自己的证据', text: 'DNS 解析、TCP 握手、TLS 认证、HTTP 状态码和响应正文是不同事实。排障时先确定请求停在哪一层，再检查该层的规则与状态。' },
}

type Focus = keyof typeof focusCopy

function NetworkArchitecture({ focus, onFocus }: { focus: Focus; onFocus: (value: Focus) => void }) {
  return (
    <div className="architecture-panel network-architecture">
      <div className="focus-tabs" role="tablist" aria-label="网络设计观察层">{(Object.keys(focusCopy) as Focus[]).map((key) => <button key={key} role="tab" aria-selected={focus === key} className={focus === key ? 'is-active' : ''} onClick={() => onFocus(key)}>{focusCopy[key].label}</button>)}</div>
      <div className={`network-architecture-canvas focus-${focus}`}>
        <div className="network-arch-layer application"><span>应用层</span><div><Icon name="database" size={18} /><strong>DNS · HTTP · TLS</strong></div><small>名称、请求、响应与业务含义</small></div>
        <div className="network-arch-layer transport"><span>传输层</span><div><Icon name="workflow" size={18} /><strong>TCP · UDP · 端口</strong></div><small>端到端传输、顺序、可靠性与数据报边界</small></div>
        <div className="network-arch-layer internet"><span>网络层</span><div><Icon name="network" size={18} /><strong>IP · 路由 · ICMP</strong></div><small>跨网络寻址与逐跳转发</small></div>
        <div className="network-arch-layer link"><span>链路层</span><div><Icon name="link" size={18} /><strong>Ethernet · MAC · ARP</strong></div><small>同一链路内交付帧</small></div>
        <div className="network-arch-hardware"><Icon name="terminal" size={18} /><strong>网卡 · 交换机 · 路由器 · 光纤与无线链路</strong></div>
      </div>
      <div className="focus-explanation" key={focus}><span className="eyebrow">观察重点 · {focusCopy[focus].label}</span><h3>{focusCopy[focus].title}</h3><p>{focusCopy[focus].text}</p></div>
    </div>
  )
}

/** 计算机网络七章节总览；从数据怎样跨越机器开始，不要求读者先学 Linux、Docker 或其他主题。 */
export function NetworkOverview({ onOpenModule }: { onOpenModule: (id: ModuleId) => void }) {
  const [focus, setFocus] = useState<Focus>('address')
  return (
    <>
      <section className="hero agent-hero network-hero" aria-labelledby="network-hero-title">
        <div className="hero-kicker"><span>ROUND 06</span><i />机制优先学习法</div>
        <h1 id="network-hero-title">计算机网络：不是记住协议名字，<br /><em>而是看懂数据怎样找到路、可靠到达并被应用正确使用。</em></h1>
        <p className="hero-lead">从一次网页访问出发，逐步拆开名称解析、链路寻址、逐跳路由、TCP/UDP 传输、TLS 加密和 HTTP 响应。目标不是背分层表，而是请求失败时知道该检查哪一层、用什么证据证明。</p>
        <div className="hero-meta"><span><Icon name="play" size={14} /> 可切换数据包轨迹</span><span><Icon name="layers" size={14} /> 寻址与传输实验</span><span><Icon name="terminal" size={14} /> 命令与抓包证据</span><span><Icon name="network" size={14} /> {networkModules.length} 个深潜模块</span></div>
        <div className="hero-actions"><button className="hero-cta" onClick={() => document.getElementById('philosophy')?.scrollIntoView({ behavior: 'smooth' })}>从理念开始 <Icon name="arrow" size={17} /></button><button className="hero-path-cta" onClick={() => document.getElementById('network-learning-path')?.scrollIntoView({ behavior: 'smooth' })}>查看最佳学习路径 <Icon name="network" size={16} /></button></div>
        <div className="hero-aside" aria-label="阅读顺序"><span className="aside-label">READING ORDER</span>{[['01', '寻址', '数据要去哪里'], ['02', '传输', '怎样可靠或及时到达'], ['03', '证据', '怎样验证与排障']].map(([number, title, text]) => <div key={number}><span>{number}</span><p><strong>{title}</strong><small>{text}</small></p></div>)}</div>
        <div className="hero-watermark agent-watermark" aria-hidden="true"><Icon name="network" size={230} /></div>
      </section>

      <div className="overview-primer"><NetworkPrimer /></div>

      <section id="philosophy" data-section="1" className="learning-section">
        <SectionHeading number={1} title="理念" lead="先理解不同设备为什么需要共同规则，再学习任何地址、协议或命令。" />
        <div className="thesis-card"><span className="thesis-mark">“</span><p>计算机网络把<strong>不同硬件、不同链路和不同程序</strong>连接成可寻址、可转发、可验证的通信系统。</p></div>
        <div className="two-column philosophy-grid">
          <article className="idea-card positive"><span className="card-label"><Icon name="check" size={16} /> 它要解决</span><h3>让分布在不同设备、网络和厂商环境中的程序交换数据。</h3><p>设备可能使用不同链路，数据可能跨越多个运营商，程序也可能中途退出或丢失响应。网络通过统一地址、分层协议和逐跳转发，把复杂物理世界隐藏在稳定接口之后。</p><div className="idea-result"><span>输入</span><strong>应用数据</strong><Icon name="arrow" size={15} /><span>产出</span><strong>可寻址的通信</strong></div></article>
          <article className="idea-card negative"><span className="card-label"><Icon name="close" size={16} /> 它拒绝</span><h3>不承诺“网络连通，应用就一定正确”。</h3><p>IP 网络可能丢包、延迟和乱序；DNS 可能解析错误，TLS 可能验证失败，服务器也可能返回业务错误。每一层只解决自己的问题，任何一层都不能冒充最终成功。</p><div className="idea-result muted"><span>不是</span><strong>一根虚拟网线</strong><span>不是</span><strong>ping 通就万事大吉</strong></div></article>
        </div>
        <div className="counterintuitive"><div className="counter-icon"><Icon name="spark" size={21} /></div><div><strong>先记住一个反直觉事实</strong><p>一次网页访问不是“把请求直接发给服务器”。浏览器先解析名称，主机选择路由，路由器逐跳转发，TCP 建立可靠连接，TLS 协商加密，最后 HTTP 才交换请求和响应。</p></div><button onClick={() => document.getElementById('path')?.scrollIntoView({ behavior: 'smooth' })}>第 4 节看完整路径 <Icon name="arrow" size={15} /></button></div>
      </section>

      <section id="design" data-section="2" className="learning-section">
        <SectionHeading number={2} title="设计" lead="先建立分层与封装模型，再把寻址、传输、应用和排障证据放回同一张图。" />
        <div className="abstraction-grid agent-abstraction-grid">
          <article><span className="abstraction-number">A</span><Icon name="network" size={23} /><h3>数据包</h3><p>带有控制信息的一段数据，是网络转发和传输的基本单位。</p><small>回答“数据以什么形式流动”</small></article>
          <article><span className="abstraction-number">B</span><Icon name="target" size={23} /><h3>地址与路由</h3><p>地址标识目标，路由根据目的地址选择下一跳。</p><small>回答“数据要去哪里”</small></article>
          <article><span className="abstraction-number">C</span><Icon name="workflow" size={23} /><h3>传输协议</h3><p>TCP 与 UDP 在主机程序之间提供不同的传输服务。</p><small>回答“怎样在程序之间传”</small></article>
          <article><span className="abstraction-number">D</span><Icon name="layers" size={23} /><h3>分层协议</h3><p>每层只处理自己的问题，并通过封装与服务接口协作。</p><small>回答“为什么能跨设备工作”</small></article>
        </div>
        <div className="subsection-heading"><span>核心设计图</span><small>点击标签观察寻址、传输和应用三条机制线</small></div>
        <NetworkArchitecture focus={focus} onFocus={setFocus} />
        <div className="subsection-heading knowledge-map-heading"><span>按需要选择要深入的知识</span><small>从数据包与分层一直深入到应用、边界和生产排障</small></div>
        <KnowledgeMap track="network" onOpenModule={onOpenModule} />
        <LearningPath track="network" onOpenModule={onOpenModule} />
        <div className="invariant-panel"><div className="invariant-title"><Icon name="shield" size={20} /><strong>不变量</strong><span>理解网络时不能丢掉的约束</span></div><ol><li><span>01</span><p><strong>不同层解决不同问题。</strong>MAC 找本地网卡，IP 找跨网络主机，端口找程序，应用协议定义业务含义。</p></li><li><span>02</span><p><strong>连通与成功必须分开。</strong>收到 ICMP 回复、TCP 握手完成、TLS 验证通过和 HTTP 返回预期状态是不同证据。</p></li><li><span>03</span><p><strong>可靠性不是免费的。</strong>确认、重传、排序和窗口会带来延迟、带宽与内存成本，应用必须按需选择。</p></li></ol></div>
      </section>

      <section id="capabilities" data-section="3" className="learning-section">
        <SectionHeading number={3} title="能力地图" lead="先知道计算机网络由哪些相互配合的能力组成，每项都可进入对应深潜模块。" />
        <div className="capability-grid">{capabilities.map((capability) => <button key={capability.name} className="capability-card is-on-path" onClick={() => onOpenModule(capability.module)}><div className="capability-top"><span className="capability-icon"><Icon name={capability.icon} size={20} /></span><span className="capability-state path">可深潜</span></div><h3>{capability.name}</h3><p>{capability.sentence}</p><span className="capability-action">进入这一节<Icon name="arrow" size={14} /></span></button>)}</div>
        <p className="map-note"><Icon name="network" size={14} />网络能力不是互不相关的协议名词；地址、路由、传输和应用共同决定一次请求能否成功。</p>
      </section>

      <section id="path" data-section="4" className="learning-section path-section">
        <SectionHeading number={4} title="一条代表路径" />
        <div className="path-intent"><span>意图</span><p>从浏览器输入网址开始，观察 DNS 怎样得到 IP、主机怎样选择网关、路由器怎样逐跳转发、TCP 怎样建立连接、TLS 怎样加密，以及 HTTP 响应怎样回到应用。再切换同一局域网和 DNS 失败场景，对比状态在哪里分叉。</p></div>
        <p className="environment-note">以下为教学模拟的确定性轨迹，不发送真实网络请求，也不读取或修改本机网络配置；真实命令会在各模块的“示例”章节给出。</p>
        <NetworkPacketLab />
        <div className="path-summary"><Icon name="arrow" size={17} /><p><strong>一句话机制：</strong>应用数据被逐层封装，经名称解析、本地寻址和逐跳路由送到目标主机，再由传输协议和应用协议恢复语义；排障就是确认请求停在哪一层。</p></div>
      </section>

      <section id="cost" data-section="5" className="learning-section">
        <SectionHeading number={5} title="代价" lead="网络用分层和尽力转发换来了大规模互联，也把可靠性、安全与排障责任留给上层。" />
        <div className="cost-grid">
          <article><span className="cost-index">01</span><h3>分层带来清晰，也带来额外开销</h3><p className="cost-because">换来模块替换与跨厂商协作。</p><p>每层添加头部、校验和状态，接收端还要逐层解封装。分层让问题容易定位，但不是免费抽象，协议头、处理延迟和实现复杂度都是成本。</p></article>
          <article><span className="cost-index">02</span><h3>可靠传输需要确认与窗口</h3><p className="cost-because">换来丢包后的重传、排序和流量控制。</p><p>TCP 要维护连接状态、序号、确认和缓冲区。长距离、高延迟或丢包环境下，窗口和重传策略会显著影响吞吐量。</p></article>
          <article><span className="cost-index">03</span><h3>分布式系统没有单一真相</h3><p className="cost-because">换来全球规模与局部自治。</p><p>DNS 缓存、路由策略、NAT 和防火墙分布在不同设备上。同一请求在不同位置可能看到不同状态，必须记录捕获点和时间。</p></article>
          <article><span className="cost-index">04</span><h3>故障会跨层表现</h3><p className="cost-because">换来统一的分层排障模型。</p><p>名称解析失败、路由不通、端口被拒绝、证书过期和服务器 500 都可能表现为“网页打不开”。只看现象而不取分层证据，很容易改错层。</p></article>
        </div>
        <div className="misread-panel"><div className="misread-heading"><Icon name="spark" size={20} /><strong>常见看错</strong><span>容易混为一谈的概念，在这里分清</span></div><div className="misread-list"><div><span>ping 通</span><Icon name="chevron" size={14} /><span>网页可用</span><p>ping 通常只证明 ICMP 路径中的一段可达，不能证明 DNS、TCP 端口、TLS 证书或 HTTP 应用正常。</p></div><div><span>IP 地址</span><Icon name="chevron" size={14} /><span>端口</span><p>IP 地址帮助数据找到主机，端口帮助主机把数据交给正确程序。两者属于不同层，不能互相替代。</p></div><div><span>网络连通</span><Icon name="chevron" size={14} /><span>数据安全</span><p>可达性只说明数据能够到达，不说明内容没有被窃听或篡改。机密性和完整性需要 TLS 等协议提供。</p></div></div></div>
      </section>

      <section id="example" data-section="6" className="learning-section">
        <SectionHeading number={6} title="示例" lead="只拆一次网页访问中最关键的证据：DNS、TCP、TLS 和 HTTP 为什么必须分别确认。" />
        <MechanismDiagram diagram={{ kind: 'flow', title: '一次 HTTPS 请求的四层证据', caption: '把名称解析、传输连接、加密认证和应用响应分开记录，才能判断问题发生在哪一层。', items: [
          { title: 'DNS 应答', detail: '确认名称已经解析为预期 IP，并注意缓存时间与解析器来源。没有地址时，后续连接不会开始。', tag: 'dns', tone: 'blue' },
          { title: 'TCP 握手', detail: '确认客户端与目标端口完成三次握手。连接建立只证明传输路径可用，不代表服务器返回正确内容。', tag: 'tcp', tone: 'orange' },
          { title: 'TLS 握手', detail: '确认证书名称、信任链和加密协商通过。加密保护传输，但不证明网站内容真实或善意。', tag: 'tls', tone: 'green' },
          { title: 'HTTP 响应', detail: '检查状态码、头部和正文。业务错误可能发生在已经成功建立的安全连接中。', tag: 'http', tone: 'muted' },
        ], footnote: '“ping 通”“端口开放”“证书有效”和“页面正确”是四个不同结论，不能相互替代。' }} />
        <div className="example-panel agent-trace-example"><div className="agent-trace-plain"><div className="agent-trace-plain-head"><span><Icon name="target" size={17} /></span><div><strong>先看结论：DNS 解析失败，因此没有 TCP 握手</strong><small>以下为教学模拟输出，不对应真实网络</small></div></div><div className="agent-trace-facts"><div><span>名称解析</span><strong>超时</strong><small>未获得目标 IP</small></div><div><span>TCP 连接</span><strong>未开始</strong><small>没有 SYN 包</small></div><div><span>TLS 握手</span><strong>未开始</strong><small>目标地址未知</small></div><div><span>HTTP 响应</span><strong>不存在</strong><small>请求没有到达服务器</small></div></div></div><div className="packet-trace"><div className="trace-head"><span>可观察证据</span><small>教学模拟输出</small></div>{[['01', 'dns.query', 'timeout', '解析器未在期限内应答'], ['02', 'tcp.syn', 'none', '没有目标 IP，未发送 SYN'], ['03', 'tls.handshake', 'none', '未进入加密握手'], ['04', 'http.response', 'none', '服务器未收到请求']].map(([number, title, code, text], index) => <div className="trace-step" key={number}><span className="trace-number">{number}</span><div><strong>{title}</strong><p>{text}</p></div><code>{code}</code>{index < 3 && <i className="trace-connector" />}</div>)}</div></div>
        <div className="example-note"><Icon name="shield" size={18} /><p><strong>先确定失败层，再选择工具。</strong>名称解析失败时检查 DNS 配置和应答；TCP 失败时检查路由、端口和过滤；TLS 失败时检查证书与时间；HTTP 失败时检查服务器状态与应用日志。</p></div>
      </section>

      <section id="boundary" data-section="7" className="learning-section">
        <SectionHeading number={7} title="边界" lead="知道网络协议解决了什么，才知道哪些问题仍需要应用设计、监控体系或人工流程。" />
        <div className="boundary-grid"><article className="boundary-yes"><span className="card-label"><Icon name="check" size={16} /> 这条设计挡住了</span><ul><li>不同设备和链路无法交换数据</li><li>缺少统一地址与逐跳转发规则</li><li>应用必须自行处理所有丢包与顺序问题</li><li>跨网络访问缺少可定位的分层证据</li><li>名称、连接和应用状态被混为一个“通或不通”</li></ul></article><article className="boundary-no"><span className="card-label"><Icon name="close" size={16} /> 这条设计没挡住</span><ul><li>服务器返回错误或虚假的业务数据</li><li>加密网站上传播的恶意内容</li><li>错误配置的路由、DNS、NAT 或防火墙</li><li>应用层拒绝服务和资源耗尽</li><li>缺少监控、日志和限流导致的长期故障</li></ul></article></div>
        <div className="stop-card"><div className="stop-top"><span><Icon name="check" size={17} /> 计算机网络全景已展开</span><small>{networkModules.length} 个依赖模块 · 完整状态与示例</small></div><h3>不止记住“分层、TCP、DNS”，而是看懂数据怎样找到路、可靠到达、被加密和使用，以及出错后该找哪层证据。</h3><p>每个模块都包含理念、设计、诞生动机、核心抽象、完整执行状态、可复现示例、代价与边界。</p><div className="stop-footer"><span>计算机网络依赖图</span><strong>{networkModules.length} / {networkModules.length} 模块可用</strong><span>六条技术轨道均可独立深潜</span></div></div>
      </section>
      <footer className="page-footer"><div><Icon name="network" size={22} /><span>心智实验室</span></div><p>不是记住更多协议名，而是看清每一次请求背后的路径、状态与证据。</p><span>ROUND 06 / NETWORK</span></footer>
    </>
  )
}
