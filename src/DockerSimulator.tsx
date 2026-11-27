/**
 * Docker 运行路径交互模拟器：从 CLI 意图一直演示到 OCI 进程、网络接通与 HTTP 请求。
 * 图形和状态表共享同一条步骤索引，仅用于解释原生 Linux 的典型路径，不执行 Docker 或访问网络。
 */
import { useEffect, useState } from 'react'
import { termModules } from './knowledge'
import type { ModuleId } from './knowledgeTypes'
import { Icon } from './Icons'

/** 当前步骤附带的术语解释；只有能在知识索引中找到的名称才允许成为深潜链接。 */
type Term = { name: string; definition: string }

/** 单个运行阶段的展示契约；change 强调本步新增的事实，terms 只承载该步真正需要解释的术语。 */
type PathStep = {
  title: string
  eyebrow: string
  description: string
  change: string
  terms: Term[]
}

/**
 * 七个教学阶段的内容源；数组顺序同时驱动时间轴、图形高亮、状态表行和详情面板。
 * 固定阶段不变量：0 意图、1 镜像、2 快照、3 bundle、4 进程隔离、5 网络、6 服务运行。
 */
const steps: PathStep[] = [
  {
    title: 'CLI 把人的意图翻译成 API 请求',
    eyebrow: '01 · 意图进入系统',
    description: 'docker 命令先在客户端解析。-d 表示后台运行，-p 8080:80 表示把宿主机 8080 端口映射到容器 80 端口。CLI 自己不启动 nginx，它通过 Docker API 把请求交给宿主机上的服务。',
    change: '只产生请求；宿主机还没有容器进程。',
    terms: [
      { name: 'Docker CLI', definition: '命令行客户端，负责把命令转成 API 请求并展示结果；它不是容器运行时。' },
      { name: 'Docker API', definition: '客户端与 Docker 守护进程之间的接口。原生 Linux 默认常通过本地 Unix socket 访问，网络端口默认不对外暴露。' },
    ],
  },
  {
    title: 'dockerd 找到镜像，并准备内容',
    eyebrow: '02 · 守护进程受理',
    description: 'dockerd 校验请求并检查本地是否已有 nginx:1.27。没有时，它从镜像仓库按层拉取；有时，它复用本地内容。Docker Engine 会把容器生命周期工作交给 containerd。',
    change: '镜像层进入本地内容存储；运行实例仍未创建。',
    terms: [
      { name: 'dockerd', definition: 'Docker 守护进程，是镜像、网络、卷等能力的协调者。它通常以 root 权限运行，因此访问它的权限接近宿主机控制权。' },
      { name: 'containerd', definition: 'Docker Engine 使用的高级容器运行时，负责镜像快照、容器生命周期与底层运行时之间的协调。' },
    ],
  },
  {
    title: '只读镜像层上，叠出一块可写视图',
    eyebrow: '03 · 文件系统成形',
    description: '镜像是有序的只读层与元数据。containerd 的快照器用 overlayfs 把这些层合并成容器的根文件系统：下层保持只读，新建的可写层接收本次运行中的修改。',
    change: '形成 rootfs；nginx 的二进制和依赖可读，容器改动写入 upper。',
    terms: [
      { name: '镜像（Image）', definition: '用于分发和复制的只读模板，由文件层与描述如何启动的元数据组成。镜像不是正在运行的程序。' },
      { name: '只读镜像层', definition: '一层相对父层的文件变化，常以 tar 流表达；多按顺序叠加后形成根文件系统，不是每层都包含完整系统。' },
      { name: 'overlayfs', definition: 'Linux 的联合文件系统。它把多个 lower 只读目录与一个 upper 可写目录叠成统一视图，写入优先落在 upper。' },
      { name: '可写层', definition: '某个容器私有的修改记录。删除容器而不提交，不会自动把改动变回镜像的一部分。' },
    ],
  },
  {
    title: '把文件系统与启动规则装进 OCI bundle',
    eyebrow: '04 · 生成可执行规格',
    description: '运行时还需要知道“启动谁、怎样隔离、限制多少”。Docker 生成 OCI 运行时规格：process 描述命令、环境与工作目录；root 指向 rootfs；linux 描述命名空间、能力与资源控制。',
    change: '生成配置与 rootfs；此时仍然只是磁盘上的描述。',
    terms: [
      { name: 'OCI bundle', definition: '交给 OCI 兼容运行时的目录，至少包含根文件系统 rootfs 与运行时配置 config.json。' },
      { name: 'OCI runtime spec', definition: '描述一次容器启动的开放规范。它规定“怎么运行”，不规定镜像如何构建。' },
    ],
  },
  {
    title: 'runc 创建进程：命名空间改视图，cgroup 管资源',
    eyebrow: '05 · 隔离落地到内核',
    description: 'runc 读取 bundle，通过 Linux 系统调用创建一个新进程，并按规格建立 PID、mount、network 等命名空间；同时把它纳入 cgroup。这个进程仍运行在同一个宿主机内核上，只是看到和控制的世界被收窄了。',
    change: '容器进程已创建但等待启动；它有自己的资源视图与资源归属。',
    terms: [
      { name: 'namespace', definition: '内核提供的资源视图隔离。例如 PID namespace 让容器看到自己的进程编号空间；它没有复制一份内核。' },
      { name: 'cgroup', definition: '内核提供的资源分组、限制与统计机制，可约束 CPU、内存、进程数等；它不是文件系统或网络隔离。' },
      { name: 'runc', definition: '读取 OCI bundle 并调用内核机制创建容器的底层 OCI 运行时。' },
    ],
  },
  {
    title: '接入虚拟网络，再把宿主机端口转进去',
    eyebrow: '06 · 网络接通',
    description: '容器网络命名空间里还没有通向外部的网卡。Docker 创建一对 veth，一端留在容器，另一端接入 docker0 网桥，并给容器分配地址；再设置端口转发规则，让访问宿主机 8080 的流量改写为容器 80。',
    change: '容器获得网络接口与地址；宿主机 8080 到容器 80 的转发规则生效。',
    terms: [
      { name: 'veth', definition: '成对出现的 Linux 虚拟以太网设备，像一根网线：从一端进入的帧会从另一端出现。' },
      { name: '网桥与 NAT', definition: '网桥在二层连接虚拟网卡；NAT/转发规则改写目标地址或端口。实际实现可由 iptables、nftables 或用户态代理参与，路径因环境而异。' },
    ],
  },
  {
    title: 'nginx 启动，请求走完整条链路',
    eyebrow: '07 · 运行与请求',
    description: '收到启动信号后，nginx master 开始运行，worker 处理连接。外部请求先到宿主机 8080，经端口转发与 docker0/veth 进入容器，再抵达容器内的 80 端口。响应沿链路返回。',
    change: 'atlas-web 进入 running；一次 HTTP 请求完成往返。',
    terms: [
      { name: 'PID 1', definition: '容器 PID namespace 中的第一个进程。若未使用 init，nginx master 会成为 PID 1，需要承担信号处理与回收子进程等职责。' },
      { name: '容器端口', definition: '容器网络命名空间里的监听地址。-p 不会“开放”应用端口，应用仍必须自己监听；它只负责把外部流量送到那里。' },
    ],
  },
]

/** 状态表的七行与 steps 一一对应；列分别说明文件系统、进程、网络以及隔离/资源何时真正改变。 */
const stateRows = [
  ['CLI 解析', '无', '无', '无', '无'],
  ['准备镜像', '只读层在本地', '无', '无', '无'],
  ['建立快照', 'lower + upper', '无', '无', '无'],
  ['生成 bundle', 'rootfs + config', '无', '无', '配置待生效'],
  ['runc create', '挂载到容器视图', '已创建，待启动', 'netns 已建立', 'namespace + cgroup'],
  ['网络接入', '不变', '待启动', 'veth + IP + 转发', '不变'],
  ['启动服务', '读镜像层，改写写层', 'running', '请求可达 80', '持续生效'],
]

/** 时间轴短标签与 steps 等长且同序；完整解释保留在步骤详情中，避免导航按钮承载过长文本。 */
const timeline = [
  '命令', '镜像', '文件系统', 'OCI 规格', '进程隔离', '网络', '请求'
]

/**
 * 渲染可播放、可跳转的 Docker 运行路径。
 * @param replaySignal 每次变为更大的正整数时，父组件可请求直接跳到 HTTP 请求阶段并重启动画。
 * @param onOpenModule 接收术语卡片对应的模块 ID，用于跳转到完整课程。
 * @returns 包含机制画布、步骤详情、状态表与术语链接的交互区域。
 */
export function DockerSimulator({ replaySignal, onOpenModule }: { replaySignal: number; onOpenModule: (id: ModuleId) => void }) {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [requestKey, setRequestKey] = useState(0)
  const [tableOpen, setTableOpen] = useState(true)
  const current = steps[step]

  // 与 cgroup 实验相同，采用可清理的单步 timeout；暂停、跳转或场景重置都会取消尚未触发的推进。
  useEffect(() => {
    if (!playing) return
    if (step >= steps.length - 1) {
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(() => setStep((value) => value + 1), 2800)
    return () => window.clearTimeout(timer)
  }, [playing, step])

  // 外部重放信号是命令而非当前步骤；忽略初始 0，并递增 key 让 SVG 请求动画从头发起。
  useEffect(() => {
    if (replaySignal > 0) {
      setStep(6)
      setPlaying(false)
      setRequestKey((value) => value + 1)
    }
  }, [replaySignal])

  // 所有跳转入口统一先停播；进入请求阶段时更新 key，让用户重复观察同一条 HTTP 动画。
  const jumpTo = (next: number) => {
    setPlaying(false)
    setStep(next)
    if (next === 6) setRequestKey((value) => value + 1)
  }

  const reset = () => {
    setPlaying(false)
    setStep(0)
    setRequestKey(0)
  }

  return (
    <div className="simulator" aria-label="Docker 运行路径交互模拟器">
      <div className="simulator-toolbar">
        <div className="simulator-title">
          <span className="live-dot" />
          <span>运行路径实验台</span>
          <span className="simulator-env">原生 Linux · rootful / overlay2 / bridge</span>
        </div>
        <div className="transport">
          <button className="icon-button" onClick={reset} aria-label="重置模拟" title="重置">
            <Icon name="reset" size={17} />
          </button>
          <button className="icon-button" onClick={() => jumpTo(step - 1)} disabled={step === 0} aria-label="上一步">
            <Icon name="chevron" size={17} className="rotate-180" />
          </button>
          <button
            className="play-button"
            onClick={() => {
              if (step === 6) setStep(0)
              setPlaying((value) => !value)
            }}
          >
            <Icon name={playing ? 'pause' : 'play'} size={16} />
            {playing ? '暂停' : step === 6 ? '重新播放' : '播放路径'}
          </button>
          <button className="icon-button" onClick={() => jumpTo(step + 1)} disabled={step === 6} aria-label="下一步">
            <Icon name="skip" size={17} />
          </button>
        </div>
      </div>

      <div className="canvas-scroll">
        <div className={`mechanism-canvas stage-${step}`}>
          <div className="host-boundary">
            <div className="host-label"><span /> Linux 宿主机 · 同一个内核</div>
            <div className="lane-label lane-engine">Docker Engine</div>
            <div className="lane-label lane-runtime">OCI 运行时</div>
            <div className="lane-label lane-container">容器边界</div>
          </div>

          {/* 连线只是节点语义的视觉补充，整体对辅助技术隐藏；实际状态由下方时间轴和文字详情完整表达。 */}
          <svg className="mechanism-lines" viewBox="0 0 960 430" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <marker id="arrowhead" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                <path d="M0 0 6 3.5 0 7" fill="none" stroke="currentColor" strokeWidth="1.3" />
              </marker>
            </defs>
            <path className={`flow-line ${step >= 0 ? 'active' : ''}`} d="M144 211 H202" markerEnd="url(#arrowhead)" />
            <path className={`flow-line ${step >= 1 ? 'active' : ''}`} d="M288 126 V158" markerEnd="url(#arrowhead)" />
            <path className={`flow-line ${step >= 1 ? 'active' : ''}`} d="M374 198 H422" markerEnd="url(#arrowhead)" />
            <path className={`flow-line ${step >= 3 ? 'active' : ''}`} d="M576 198 H614" markerEnd="url(#arrowhead)" />
            <path className={`flow-line ${step >= 4 ? 'active' : ''}`} d="M730 198 H758" markerEnd="url(#arrowhead)" />
            <path className={`network-line ${step >= 5 ? 'active' : ''}`} d="M739 331 H758" markerEnd="url(#arrowhead)" />
            {/* 只有服务启动后才展示请求包；key 变化会重挂载 g，从而重新播放 SVG animateMotion。 */}
            {step === 6 && (
              <g key={requestKey} className="request-flow">
                <path className="request-path" d="M911 410 L840 372 L780 330 L854 252" markerEnd="url(#arrowhead)" />
                <circle r="5" className="request-packet packet-one">
                  <animateMotion dur="2.6s" repeatCount="indefinite" path="M911 410 L840 372 L780 330 L854 252" />
                </circle>
                <circle r="4" className="request-packet packet-two">
                  <animateMotion dur="2.6s" begin="1.3s" repeatCount="indefinite" path="M911 410 L840 372 L780 330 L854 252" />
                </circle>
              </g>
            )}
          </svg>

          <button className={`diagram-node client-node ${step === 0 ? 'is-current' : ''}`} onClick={() => jumpTo(0)}>
            <span className="node-icon"><Icon name="terminal" size={20} /></span>
            <strong>docker CLI</strong>
            <small>人的意图</small>
            <code>run -p 8080:80</code>
          </button>

          <button className={`diagram-node image-node ${step === 1 || step === 2 ? 'is-current' : ''}`} onClick={() => jumpTo(1)}>
            <span className="node-topline"><Icon name="layers" size={16} /> nginx:1.27</span>
            <div className="layer-stack"><i /><i /><i /><span>只读镜像层</span></div>
            <small>{step >= 1 ? '已在本地内容存储' : '仓库 / 本地缓存'}</small>
          </button>

          <button className={`diagram-node daemon-node ${step === 1 ? 'is-current' : ''}`} onClick={() => jumpTo(1)}>
            <span className="node-icon"><Icon name="box" size={21} /></span>
            <strong>dockerd</strong>
            <small>协调镜像 · 网络 · 生命周期</small>
            <span className="node-badge">宿主服务</span>
          </button>

          <button className={`diagram-node containerd-node ${step === 2 || step === 3 ? 'is-current' : ''}`} onClick={() => jumpTo(2)}>
            <span className="node-icon"><Icon name="layers" size={21} /></span>
            <strong>containerd</strong>
            <small>快照与生命周期</small>
          </button>

          <button className={`diagram-node runc-node ${step === 4 ? 'is-current' : ''}`} onClick={() => jumpTo(4)}>
            <Icon name="code" size={20} />
            <strong>runc</strong>
            <small>create</small>
          </button>

          <button className={`diagram-node bridge-node ${step === 5 || step === 6 ? 'is-current' : ''}`} onClick={() => jumpTo(5)}>
            <Icon name="network" size={18} />
            <div><strong>docker0</strong><small>172.17.0.1/16</small></div>
            <span className="bridge-port">veth</span>
          </button>

          <div className={`container-box ${step >= 4 ? 'is-created' : ''} ${step === 6 ? 'is-running' : ''}`}>
            <div className="container-head">
              <span className="container-status">{step >= 6 ? 'running' : step >= 4 ? 'created' : 'waiting'}</span>
              <strong>atlas-web</strong>
            </div>
            <button className="process-node" onClick={() => jumpTo(step >= 6 ? 6 : 4)}>
              <span className="process-glyph"><Icon name="terminal" size={22} /></span>
              <strong>nginx</strong>
              <small>master + workers</small>
              <span className="listen-port">0.0.0.0:80</span>
            </button>
            <div className={`namespace-tags ${step >= 4 ? 'is-active' : ''}`}>
              <span>PID ns</span><span>mount ns</span><span>net ns</span>
            </div>
            <button className={`overlay-mini ${step >= 2 ? 'is-active' : ''}`} onClick={() => jumpTo(2)}>
              <span className="upper-layer">upper · 可写</span>
              <span>nginx + 基础系统 · 只读</span>
            </button>
            <div className={`cgroup-mini ${step >= 4 ? 'is-active' : ''}`}>
              <span><Icon name="shield" size={13} /> cgroup</span>
              <i /><i /><i /><i /><i />
            </div>
          </div>

          <div className={`host-port ${step >= 5 ? 'is-active' : ''}`}>
            <span>宿主机</span><strong>0.0.0.0:8080</strong><small>DNAT → 容器 :80</small>
          </div>

          <div className="canvas-caption">
            <span><i className="caption-dot ink" /> 用户态组件</span>
            <span><i className="caption-dot green" /> 内核机制</span>
            <span><i className="caption-dot orange" /> 当前变化</span>
          </div>
        </div>
      </div>

      {/* aria-current=step 让辅助技术区分当前导航项；首尾按钮的 disabled 边界与阶段索引保持一致。 */}
      <div className="timeline" aria-label="路径步骤">
        {timeline.map((label, index) => (
          <button
            key={label}
            className={`${index === step ? 'is-current' : ''} ${index < step ? 'is-past' : ''}`}
            onClick={() => jumpTo(index)}
            aria-current={index === step ? 'step' : undefined}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{label}</strong>
          </button>
        ))}
      </div>

      <div className="step-detail" key={step}>
        <div className="step-number">{String(step + 1).padStart(2, '0')}</div>
        <div className="step-copy">
          <span className="eyebrow">{current.eyebrow}</span>
          <h3>{current.title}</h3>
          <p>{current.description}</p>
          <div className="change-line"><Icon name="arrow" size={15} /><span>{current.change}</span></div>
        </div>
        <div className="term-stack">
          {/* 术语映射缺失时退化为普通说明卡，而不是渲染空链接；模块跳转始终由宿主回调执行。 */}
          {current.terms.map((term) => {
            const target = termModules[term.name]
            return target ? (
              <button className="term-card term-link" key={term.name} onClick={() => onOpenModule(target)}>
                <strong>{term.name}</strong><p>{term.definition}</p><span>进入完整模块 <Icon name="arrow" size={12} /></span>
              </button>
            ) : (
              <div className="term-card" key={term.name}><strong>{term.name}</strong><p>{term.definition}</p></div>
            )
          })}
        </div>
      </div>

      {/* details 的展开状态由浏览器维护，onToggle 仅回写镜像；受控 open 让表格状态在组件模型中可见。 */}
      <details className="state-table-details" open={tableOpen} onToggle={(event) => setTableOpen(event.currentTarget.open)}>
        <summary>
          <span><Icon name="layers" size={17} /> 状态表 · 每一步到底改变了什么</span>
          <span className="summary-hint">展开对照 <Icon name="chevron" size={15} /></span>
        </summary>
        <div className="table-scroll">
          <table className="state-table">
            <thead><tr><th>阶段</th><th>文件系统</th><th>进程</th><th>网络</th><th>隔离 / 资源</th></tr></thead>
            <tbody>
              {stateRows.map((row, index) => (
                <tr key={row[0]} className={index === step ? 'is-current' : ''}>
                  {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
