import { useEffect, useState } from 'react'
import { Icon } from './Icons'

type NetworkNodeId = 'client' | 'switch' | 'router' | 'dns' | 'server'

type PacketStep = {
  id: string
  label: string
  title: string
  text: string
  node: NetworkNodeId
  protocol: string
  source: string
  destination: string
  state: string
  evidence: string
}

type NetworkScenario = {
  id: string
  label: string
  title: string
  goal: string
  address: string
  outcome: string
  steps: PacketStep[]
}

const nodeCopy: { id: NetworkNodeId; label: string; detail: string; icon: 'terminal' | 'workflow' | 'network' | 'database' | 'box' }[] = [
  { id: 'client', label: '客户端', detail: '浏览器所在主机', icon: 'terminal' },
  { id: 'switch', label: '交换机', detail: '连接本地设备', icon: 'workflow' },
  { id: 'router', label: '路由器', detail: '连接不同网络', icon: 'network' },
  { id: 'dns', label: 'DNS', detail: '名称解析服务', icon: 'database' },
  { id: 'server', label: '服务器', detail: '提供网页服务', icon: 'box' },
]

const scenarios: NetworkScenario[] = [
  {
    id: 'web',
    label: '跨网访问网页',
    title: '一次 HTTPS 访问要经过哪些状态',
    goal: '客户端 192.168.1.20 访问 example.test；example.test 是文档保留名称，服务器地址使用 203.0.113.10。',
    address: 'https://example.test/',
    outcome: '名称解析、路由、可靠传输、加密握手和应用响应都成功，浏览器才显示页面。',
    steps: [
      { id: 'url', label: '解析名称', title: '先把人类名称换成 IP 地址', text: '浏览器提取主机名 example.test，向配置的 DNS 解析器查询。没有地址之前，不能直接建立 TCP 连接。', node: 'dns', protocol: 'DNS / UDP 53', source: '192.168.1.20:53000', destination: '192.168.1.1:53', state: '查询 example.test', evidence: 'DNS 应答包含 203.0.113.10 与缓存时间。' },
      { id: 'gateway', label: '找到网关', title: '目的地址不在本地网络，先找默认网关', text: '客户端根据子网判断目标在远端，查找路由表，把帧发给默认路由器。ARP 用于在同一链路找到网关的 MAC 地址。', node: 'router', protocol: 'ARP → Ethernet', source: '192.168.1.20', destination: '192.168.1.1', state: '下一跳 = 默认网关', evidence: '路由表命中默认路由，ARP 缓存提供网关 MAC。' },
      { id: 'route', label: '逐跳转发', title: '路由器只决定下一跳，不负责最终应用', text: '路由器根据目的 IP 查找最长前缀匹配，把包转发到下一跳。每经过一个 IPv4 路由器，TTL 通常减 1，防止永久循环。', node: 'router', protocol: 'IPv4 / ICMP', source: '192.168.1.20', destination: '203.0.113.10', state: 'TTL 63 → 62', evidence: '路由表显示下一跳，TTL 与接口计数可观察。' },
      { id: 'tcp', label: '建立连接', title: 'TCP 用三次握手确认双向收发能力', text: '客户端发送 SYN，服务器回复 SYN+ACK，客户端再发送 ACK。握手建立的是传输状态，不代表网页已经成功返回。', node: 'server', protocol: 'TCP / 443', source: '192.168.1.20:53000', destination: '203.0.113.10:443', state: 'SYN → SYN/ACK → ACK', evidence: '两端进入 ESTABLISHED，序号与确认号可追踪。' },
      { id: 'tls', label: '加密握手', title: '验证服务器身份并协商会话密钥', text: 'TLS 握手校验证书链与名称，交换密钥材料。此后应用数据被加密；抓包通常只能看到连接元数据，不能直接读到正文。', node: 'server', protocol: 'TLS 1.3 / TCP 443', source: '192.168.1.20:53000', destination: '203.0.113.10:443', state: '证书验证 → 密钥就绪', evidence: '证书名称匹配、链可信、握手完成。' },
      { id: 'http', label: '请求与响应', title: 'HTTP 在加密连接中交换请求和响应', text: '浏览器发送 HTTP 请求，服务器返回状态码、头部和正文。TCP 保证字节可靠有序，HTTP 才定义请求与响应的含义。', node: 'client', protocol: 'HTTP over TLS', source: '203.0.113.10:443', destination: '192.168.1.20:53000', state: '200 OK → 页面渲染', evidence: '状态码、响应头部、正文和浏览器渲染结果。' },
    ],
  },
  {
    id: 'lan',
    label: '同一局域网传输',
    title: '两台主机直接通信时，网关不需要参与',
    goal: '客户端 192.168.1.20 向同一子网的 192.168.1.30 发送文件。',
    address: '192.168.1.20 → 192.168.1.30',
    outcome: '目的主机在本网段，客户端通过 ARP 找到对方 MAC，再由交换机在本地链路转发。',
    steps: [
      { id: 'subnet', label: '判断范围', title: '先比较网络地址，而不是只看 IP 数字', text: '双方都是 192.168.1.0/24，属于同一网络。客户端可以直接向目标主机发送帧，不需要默认网关。', node: 'client', protocol: 'IPv4 /24', source: '192.168.1.20', destination: '192.168.1.30', state: '同一子网', evidence: '按 /24 计算，两者网络地址都是 192.168.1.0。' },
      { id: 'arp', label: '解析 MAC', title: 'ARP 在本地链路询问目标 MAC', text: '客户端广播“谁拥有 192.168.1.30”，目标主机 unicast 回复自己的 MAC。ARP 缓存只保存本链路邻居，不能替代路由。', node: 'switch', protocol: 'ARP', source: '192.168.1.20', destination: '192.168.1.30', state: 'request → reply', evidence: 'ARP 缓存出现 192.168.1.30 → 02:00:00:00:00:30。' },
      { id: 'switch', label: '交换机转发', title: '交换机按 MAC 地址表选择出口', text: '交换机已经学习过两个端口的 MAC，就把帧从目标端口转发。未知单播才会泛洪，但不会把包转发到另一个 IP 网络。', node: 'switch', protocol: 'Ethernet', source: '02:00:00:00:00:20', destination: '02:00:00:00:00:30', state: '入口 → 目标端口', evidence: 'MAC 地址表、接口计数器和抓包位置。' },
      { id: 'tcp', label: '可靠传输', title: 'TCP 确认收到的数据，丢失时重传', text: '文件被切成有序字节流。接收方确认已收到的数据，发送方维护窗口并根据确认继续发送，避免无限堆积。', node: 'server', protocol: 'TCP / 9000', source: '192.168.1.20:53000', destination: '192.168.1.30:9000', state: '传输 → 确认', evidence: '序号、确认号、重传计数与接收窗口。' },
      { id: 'done', label: '完成校验', title: '连接关闭后仍要验证文件内容', text: 'TCP 关闭表示本次传输结束，不自动证明文件内容正确。应用还要比较大小、校验和或哈希，确认收到的文件与发送方一致。', node: 'client', protocol: 'TCP / 应用校验', source: '192.168.1.30:9000', destination: '192.168.1.20:53000', state: '关闭 → 校验通过', evidence: '文件大小、校验和和接收端日志。' },
    ],
  },
  {
    id: 'dns-fail',
    label: 'DNS 解析失败',
    title: '网址打不开，不一定是网络不通',
    goal: '客户端能访问数字 IP，但访问 example.test 在名称解析阶段失败。',
    address: 'https://example.test/',
    outcome: 'DNS 查询超时，浏览器没有得到 IP 地址，因此不会进入 TCP 或 TLS 握手。',
    steps: [
      { id: 'request', label: '输入网址', title: '浏览器先提取主机名', text: '浏览器把 example.test 交给系统配置的 DNS 解析器。此时还没有建立到网页服务器的连接。', node: 'client', protocol: '应用请求', source: '浏览器', destination: '系统 DNS 配置', state: '需要解析名称', evidence: '系统配置的 DNS 服务器地址。' },
      { id: 'query', label: 'DNS 超时', title: '解析器没有在期限内返回答案', text: '查询可能因为 DNS 服务器不可达、UDP 丢包、过滤或配置错误而超时。超时只说明这次解析失败，不能直接推断整个互联网断开。', node: 'dns', protocol: 'DNS / UDP 53', source: '192.168.1.20:53000', destination: '192.168.1.1:53', state: 'timeout', evidence: 'DNS 查询耗时、超时次数与解析器日志。' },
      { id: 'stop', label: '停止连接', title: '没有 IP 地址，就不会进入 TCP 握手', text: '浏览器不能把流量发给未知目标，因此没有 SYN 包，也没有 TLS 握手。此时检查网页服务器端口通常是在错误层级排障。', node: 'client', protocol: '无 TCP 连接', source: '192.168.1.20', destination: '未知', state: '解析失败 → 停止', evidence: '抓包只有 DNS 查询，没有到目标 IP 的 TCP SYN。' },
      { id: 'compare', label: '对照数字 IP', title: '用数字地址区分 DNS 故障与路由故障', text: '如果直接访问已确认可用的数字 IP 成功，而名称解析失败，证据更指向 DNS 或名称配置；如果数字 IP 也失败，再检查路由、防火墙和传输。', node: 'router', protocol: '对照实验', source: '192.168.1.20', destination: '203.0.113.10', state: '数字 IP 可达', evidence: '两次请求的 DNS、TCP、TLS、HTTP 阶段对照。' },
      { id: 'fix', label: '修复并验证', title: '修正解析配置后重新走完整路径', text: '修复 DNS 服务器、过滤规则或记录后，先确认名称能解析，再检查 TCP、TLS 和 HTTP。每一步都要用对应证据确认，而不是只看浏览器是否刷新。', node: 'dns', protocol: 'DNS → TCP → TLS → HTTP', source: '192.168.1.20', destination: 'example.test', state: '解析恢复', evidence: '新的 DNS 应答、连接握手与 HTTP 响应。' },
    ],
  },
]

/** 数据包路径实验室：固定场景展示名称解析、逐跳转发、传输与应用状态，不发送真实网络请求。 */
export function NetworkPacketLab() {
  const [scenarioId, setScenarioId] = useState(scenarios[0].id)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0]
  const current = scenario.steps[step]

  useEffect(() => {
    setStep(0)
    setPlaying(false)
  }, [scenarioId])

  useEffect(() => {
    if (!playing) return
    if (step >= scenario.steps.length - 1) {
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(() => setStep((value) => value + 1), 1800)
    return () => window.clearTimeout(timer)
  }, [playing, scenario.steps.length, step])

  return (
    <div className="network-lab">
      <div className="network-lab-toolbar">
        <div><span className="eyebrow">教学模拟 · 确定性数据包轨迹</span><strong>观察一次网络请求怎样穿过每一层</strong></div>
        <div className="network-scenario-tabs" role="tablist" aria-label="网络示例场景">
          {scenarios.map((item) => <button key={item.id} role="tab" aria-selected={scenarioId === item.id} className={scenarioId === item.id ? 'is-active' : ''} onClick={() => setScenarioId(item.id)}>{item.label}</button>)}
        </div>
      </div>

      <div className="network-goal-card"><span><Icon name="target" size={18} /></span><div><small>本次目标</small><strong>{scenario.address}</strong><p>{scenario.goal}</p></div></div>

      <div className="network-path" aria-label="数据包经过的设备">
        {nodeCopy.map((node, index) => {
          const active = current.node === node.id
          const passed = scenario.steps.slice(0, step).some((item) => item.node === node.id)
          return (
            <div className="network-path-segment" key={node.id}>
              <div className={`network-path-node${active ? ' is-active' : ''}${passed ? ' is-past' : ''}`}><span><Icon name={node.icon} size={19} /></span><strong>{node.label}</strong><small>{node.detail}</small></div>
              {index < nodeCopy.length - 1 && <i className={passed || active ? 'is-active' : ''}><Icon name="arrow" size={15} /></i>}
            </div>
          )
        })}
      </div>

      <div className="network-stepper" aria-label="网络处理步骤">
        {scenario.steps.map((item, index) => <button key={item.id} className={`${index === step ? 'is-active' : ''}${index < step ? ' is-past' : ''}`} onClick={() => { setStep(index); setPlaying(false) }} aria-current={index === step ? 'step' : undefined}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.label}</strong></button>)}
      </div>

      <div className="network-stage" key={`${scenarioId}-${current.id}`} aria-live="polite">
        <div className="network-stage-copy"><span className="eyebrow">第 {step + 1} 步 · {current.label}</span><h3>{current.title}</h3><p>{current.text}</p></div>
        <div className="network-packet-card">
          <div className="network-packet-head"><span><Icon name="network" size={17} />当前数据包</span><code>{current.protocol}</code></div>
          <div className="network-packet-facts">
            <div><span>源地址</span><strong>{current.source}</strong></div>
            <div><span>目的地址</span><strong>{current.destination}</strong></div>
            <div><span>当前状态</span><strong>{current.state}</strong></div>
            <div><span>可观察证据</span><strong>{current.evidence}</strong></div>
          </div>
        </div>
      </div>

      <div className={`network-outcome${scenario.id === 'dns-fail' ? ' is-warning' : ''}`}><Icon name={scenario.id === 'dns-fail' ? 'shield' : 'check'} size={19} /><div><strong>{scenario.id === 'dns-fail' ? '失败分支也是正常结果' : '本条路径的最终状态'}</strong><p>{scenario.outcome}</p></div></div>

      <div className="network-lab-footer">
        <button className="network-play" onClick={() => { if (step === scenario.steps.length - 1) setStep(0); setPlaying((value) => !value) }}><Icon name={playing ? 'close' : 'play'} size={15} />{playing ? '暂停播放' : step === scenario.steps.length - 1 ? '重新播放' : '自动播放'}</button>
        <p><Icon name="spark" size={14} />地址与名称均为教学示例；模拟不发送真实流量，也不读取本机网络配置。</p>
        <div><button disabled={step === 0} onClick={() => { setStep((value) => value - 1); setPlaying(false) }}><Icon name="arrow" size={13} className="rotate-180" />上一步</button><button disabled={step === scenario.steps.length - 1} onClick={() => { setStep((value) => value + 1); setPlaying(false) }}>下一步<Icon name="arrow" size={13} /></button></div>
      </div>
    </div>
  )
}
