import { useState } from 'react'
import { Icon, type IconName } from './Icons'
import { KnowledgeMap } from './KnowledgeMap'
import { KubernetesReconcileLab } from './KubernetesReconcileLab'
import { LearningPath } from './LearningPath'
import { kubernetesModules } from './knowledge'
import type { ModuleId } from './knowledgeTypes'
import { MechanismDiagram } from './MechanismDiagram'
import { SectionHeading } from './SectionHeading'

/** 首页能力卡片把“能做什么”直接链接到对应深潜模块，避免只给名词。 */
const capabilities: { name: string; sentence: string; icon: IconName; module: ModuleId }[] = [
  { name: '声明式编排', sentence: '提交期望状态，由控制器持续比较并纠正实际状态。', icon: 'target', module: 'kubernetes-architecture' },
  { name: '工作负载管理', sentence: '用 Deployment、StatefulSet、DaemonSet 与 Job 表达不同运行形态。', icon: 'box', module: 'pod-controllers' },
  { name: '调度与资源', sentence: '按节点约束、亲和性与资源请求选择位置，并用 QoS 表达优先级。', icon: 'chart', module: 'scheduling' },
  { name: '服务发现', sentence: '用稳定的 Service 名称和 EndpointSlice 连接不断变化的 Pod。', icon: 'network', module: 'service-dns' },
  { name: '入口与隔离', sentence: '把集群外流量接入七层路由，并限制 Pod 之间的东西向访问。', icon: 'link', module: 'ingress-gateway' },
  { name: '配置与存储', sentence: '把环境配置、密钥和持久数据与镜像生命周期解耦。', icon: 'database', module: 'storage-csi' },
  { name: '发布与弹性', sentence: '通过滚动更新、探针和 HPA 在可用性与容量之间持续调整。', icon: 'reset', module: 'deployments-rollouts' },
  { name: '观测与运维', sentence: '从指标、日志、事件与对象状态取得证据，支持升级和恢复。', icon: 'terminal', module: 'kubernetes-observability' },
]

/** 三张观察视角共享一张架构图，帮助读者把控制面、数据面与网络连接起来。 */
const focusCopy = {
  control: {
    label: '控制面',
    title: 'Kubernetes 管理的不是命令序列，而是期望状态',
    text: '你向 API Server 提交 Deployment、Service 等对象，etcd 保存它们，控制器不断读取实际状态并推动系统逼近声明。你不需要记录“第几个 Pod 在哪台机器”。',
  },
  workload: {
    label: '工作负载',
    title: 'Pod 是调度与网络的基本单位，但不该被直接当作长期实例',
    text: 'Pod 可以被替换、迁移或重建。Controller 通过 ownerReference 管理副本，探针决定何时接收流量，因此应用必须把状态放到 Pod 之外或持久卷中。',
  },
  network: {
    label: '网络',
    title: '服务名是稳定入口，Pod IP 只是当前端点',
    text: 'Service 在前端提供稳定虚拟地址，EndpointSlice 记录当前 Ready 的 Pod。DNS 只负责解析名称，请求能否到达还取决于 kube-proxy、CNI、NetworkPolicy 和应用监听。',
  },
}

type Focus = keyof typeof focusCopy

/** 可切换观察重点的 Kubernetes 架构图。 */
function KubernetesArchitecture({ focus, onFocus }: { focus: Focus; onFocus: (value: Focus) => void }) {
  return (
    <div className="architecture-panel kubernetes-architecture">
      <div className="focus-tabs" role="tablist" aria-label="Kubernetes 设计观察层">
        {(Object.keys(focusCopy) as Focus[]).map((key) => (
          <button key={key} role="tab" aria-selected={focus === key} className={focus === key ? 'is-active' : ''} onClick={() => onFocus(key)}>{focusCopy[key].label}</button>
        ))}
      </div>
      <div className={`kubernetes-architecture-canvas focus-${focus}`}>
        <div className="k8s-arch-client"><Icon name="terminal" size={19} /><div><strong>kubectl / GitOps</strong><small>提交期望状态</small></div></div>
        <span className="arch-arrow"><Icon name="arrow" size={18} /></span>
        <div className="k8s-arch-api"><Icon name="database" size={20} /><div><strong>API Server</strong><small>校验、鉴权、版本与写入</small></div></div>
        <span className="arch-arrow"><Icon name="arrow" size={18} /></span>
        <div className="k8s-arch-etcd"><Icon name="layers" size={19} /><div><strong>etcd</strong><small>对象存储与 watch</small></div></div>
        <div className="k8s-controller-band">
          <div className="k8s-arch-controller"><Icon name="reset" size={18} /><div><strong>Controllers</strong><small>Deployment → ReplicaSet → Pod</small></div></div>
          <div className="k8s-arch-controller"><Icon name="target" size={18} /><div><strong>kube-scheduler</strong><small>Filter + Score + Bind</small></div></div>
          <div className="k8s-arch-controller"><Icon name="box" size={18} /><div><strong>kubelet</strong><small>CRI · 探针 · 状态回报</small></div></div>
        </div>
        <div className="k8s-dataplane-band">
          <div className="k8s-arch-pod"><strong>Pod / web-1</strong><small>10.244.1.8 · Ready</small></div>
          <div className="k8s-arch-pod"><strong>Pod / web-2</strong><small>10.244.2.6 · Ready</small></div>
          <div className="k8s-arch-pod"><strong>Pod / web-3</strong><small>10.244.1.9 · Ready</small></div>
        </div>
        <div className="k8s-network-band"><span>Service/web</span><Icon name="arrow" size={16} /><span>EndpointSlice</span><Icon name="arrow" size={16} /><span>CNI / kube-proxy</span><Icon name="arrow" size={16} /><strong>应用流量</strong></div>
      </div>
      <div className="focus-explanation" key={focus}><span className="eyebrow">观察重点 · {focusCopy[focus].label}</span><h3>{focusCopy[focus].title}</h3><p>{focusCopy[focus].text}</p></div>
    </div>
  )
}

/**
 * Kubernetes 独立首页。
 * 七个 data-section 与侧边栏、IntersectionObserver 和 ModuleView 保持完全一致。
 */
export function KubernetesOverview({ onOpenModule }: { onOpenModule: (id: ModuleId) => void }) {
  const [focus, setFocus] = useState<Focus>('control')

  return (
    <>
      <section className="hero kubernetes-hero" aria-labelledby="kubernetes-hero-title">
        <div className="hero-kicker"><span>ROUND 03</span><i />机制优先学习法</div>
        <h1 id="kubernetes-hero-title">Kubernetes：不是替你运行应用，<br /><em>而是持续把现实拉回声明。</em></h1>
        <p className="hero-lead">从一次 kubectl apply 开始，看清对象如何进入 API Server、控制器怎样发现偏差、Pod 怎样被调度和启动，以及 Service 如何跟随端点变化。</p>
        <div className="hero-meta"><span><Icon name="play" size={14} /> 可切换控制循环</span><span><Icon name="layers" size={14} /> 7 个状态切片</span><span><Icon name="terminal" size={14} /> 命令与证据对照</span><span><Icon name="network" size={14} /> {kubernetesModules.length} 个深潜模块</span></div>
        <div className="hero-actions"><button className="hero-cta" onClick={() => document.getElementById('philosophy')?.scrollIntoView({ behavior: 'smooth' })}>从理念开始 <Icon name="arrow" size={17} /></button><button className="hero-path-cta" onClick={() => document.getElementById('kubernetes-learning-path')?.scrollIntoView({ behavior: 'smooth' })}>查看最佳学习路径 <Icon name="network" size={16} /></button></div>
        <div className="hero-aside" aria-label="阅读顺序"><span className="aside-label">READING ORDER</span>{[['01', '声明', '你想要什么'], ['02', '观察', '现在是什么'], ['03', '纠偏', '谁把差距缩小']].map(([number, title, text]) => <div key={number}><span>{number}</span><p><strong>{title}</strong><small>{text}</small></p></div>)}</div>
        <div className="hero-watermark kubernetes-watermark" aria-hidden="true"><Icon name="network" size={230} /></div>
      </section>

      <section id="philosophy" data-section="1" className="learning-section">
        <SectionHeading number={1} title="理念" lead="先把“执行一次部署命令”和“维持一个声明式系统”分开。" />
        <div className="thesis-card"><span className="thesis-mark">“</span><p>Kubernetes 把“应用应该怎样存在”写成<strong>可存储、可比较、可持续纠偏的期望状态</strong>。</p></div>
        <div className="two-column philosophy-grid">
          <article className="idea-card positive"><span className="card-label"><Icon name="check" size={16} /> 它要解决</span><h3>让大量容器在故障、扩容和发布中仍有稳定的运行意图。</h3><p>Pod 会消失，节点会重启，镜像会更新。手工记录每台机器上的进程无法长期可靠；声明式对象让系统自己发现“现在与应该不同”，并重复执行修复动作。</p><div className="idea-result"><span>输入</span><strong>期望状态</strong><Icon name="arrow" size={15} /><span>输出</span><strong>持续逼近的系统</strong></div></article>
          <article className="idea-card negative"><span className="card-label"><Icon name="close" size={16} /> 它拒绝</span><h3>不承诺“提交 YAML 就等于应用已经健康”。</h3><p>对象创建、Pod 调度、容器启动、readiness 通过和服务可达是不同事实。Kubernetes 也不替你设计业务状态、数据库一致性、代码质量或安全边界。</p><div className="idea-result muted"><span>不是</span><strong>应用平台全部答案</strong><span>不是</span><strong>一次成功就结束</strong></div></article>
        </div>
        <div className="counterintuitive"><div className="counter-icon"><Icon name="spark" size={21} /></div><div><strong>先记住一个反直觉事实</strong><p>删除一个 Pod 通常不是事故终点，而是控制循环的输入。控制器会创建替代 Pod；但新 Pod 仍要经过调度、拉镜像、启动和就绪检查，不会瞬间恢复服务。</p></div><button onClick={() => document.getElementById('path')?.scrollIntoView({ behavior: 'smooth' })}>纠偏过程：第 4 节展开 <Icon name="arrow" size={15} /></button></div>
      </section>

      <section id="design" data-section="2" className="learning-section">
        <SectionHeading number={2} title="设计" lead="核心不是 YAML 语法，而是对象、控制器、调度器与节点代理之间的职责边界。" />
        <div className="abstraction-grid k8s-abstraction-grid">
          <article><span className="abstraction-number">A</span><Icon name="layers" size={23} /><h3>API 对象</h3><p>表达期望状态，并由 API Server 校验、存储和版本化。</p><small>回答“系统被要求做什么”</small></article>
          <article><span className="abstraction-number">B</span><Icon name="reset" size={23} /><h3>控制器</h3><p>观察实际状态，执行动作并再次观察，直到差距消失。</p><small>回答“谁负责持续纠偏”</small></article>
          <article><span className="abstraction-number">C</span><Icon name="target" size={23} /><h3>调度器</h3><p>在可放置节点中筛选并打分，为 Pod 选择位置。</p><small>回答“Pod 应该去哪”</small></article>
          <article><span className="abstraction-number">D</span><Icon name="box" size={23} /><h3>kubelet</h3><p>在节点上拉取镜像、启动容器、执行探针并回报状态。</p><small>回答“节点上实际发生什么”</small></article>
        </div>
        <div className="subsection-heading"><span>核心设计图</span><small>点击标签观察控制面、工作负载与网络三条机制线</small></div>
        <KubernetesArchitecture focus={focus} onFocus={setFocus} />
        <div className="subsection-heading knowledge-map-heading"><span>把涉及的知识全部展开</span><small>从 API 对象一直深潜到生产可靠性边界</small></div>
        <KnowledgeMap track="kubernetes" onOpenModule={onOpenModule} />
        <LearningPath track="kubernetes" onOpenModule={onOpenModule} />
        <div className="invariant-panel">
          <div className="invariant-title"><Icon name="shield" size={20} /><strong>不变量</strong><span>理解 Kubernetes 时不能丢掉的约束</span></div>
          <ol><li><span>01</span><p><strong>声明是目标，不是完成证据。</strong>对象存在、Pod Ready、端点更新和应用返回成功必须分别验证。</p></li><li><span>02</span><p><strong>Pod 是可替换实例，不是稳定身份。</strong>业务不能依赖某个 Pod 名称或 IP 长期不变。</p></li><li><span>03</span><p><strong>控制循环最终一致，不是瞬时事务。</strong>观察、决策、执行和回报之间存在时间差与失败分支。</p></li></ol>
        </div>
      </section>

      <section id="capabilities" data-section="3" className="learning-section">
        <SectionHeading number={3} title="能力地图" lead="先知道有哪些能力，每项都可进入对应深潜模块。" />
        <div className="capability-grid">{capabilities.map((capability) => <button key={capability.name} className="capability-card is-on-path" onClick={() => onOpenModule(capability.module)}><div className="capability-top"><span className="capability-icon"><Icon name={capability.icon} size={20} /></span><span className="capability-state path">可深潜</span></div><h3>{capability.name}</h3><p>{capability.sentence}</p><span className="capability-action">进入依赖模块<Icon name="arrow" size={14} /></span></button>)}</div>
        <p className="map-note"><Icon name="network" size={14} />能力不是功能清单的终点；每项能力都继续链接到 API、调度、网络、存储或运维机制。</p>
      </section>

      <section id="path" data-section="4" className="learning-section path-section">
        <SectionHeading number={4} title="一条代表路径" />
        <div className="path-intent"><span>意图</span><p>声明 <code>Deployment/web</code> 需要 3 个副本，并让它通过 <code>Service/web</code> 被集群内访问；随后删除一个 Pod，观察控制器怎样恢复副本与端点。</p></div>
        <p className="environment-note">以下为离线教学模拟，不连接真实集群。状态名称与 Kubernetes 对象模型一致，但事件顺序被简化为可播放的状态切片。</p>
        <div className="command-line"><span className="prompt">$</span><code>kubectl apply -f web.yaml && kubectl get deploy,pods,svc</code><span className="command-result-tag">声明 → 观察</span></div>
        <KubernetesReconcileLab onOpenModule={onOpenModule} />
        <div className="path-summary"><Icon name="arrow" size={17} /><p><strong>一句话机制：</strong>API Server 保存声明，控制器发现副本差距并创建 Pod，调度器选择节点，kubelet 启动容器，readiness 通过后 EndpointSlice 才把端点纳入服务。</p></div>
      </section>

      <section id="cost" data-section="5" className="learning-section">
        <SectionHeading number={5} title="代价" lead="持续纠偏换来韧性，也引入最终一致、插件依赖和更高的认知成本。" />
        <div className="cost-grid">
          <article><span className="cost-index">01</span><h3>最终一致</h3><p className="cost-because">换来对持续变化的适应能力。</p><p>控制器需要时间观察和执行，期间可能出现 Pending、Terminating 或部分可用。把一次 apply 当成瞬时事务，会在发布和排障时误判状态。</p></article>
          <article><span className="cost-index">02</span><h3>抽象与插件</h3><p className="cost-because">换来跨环境的一致性接口。</p><p>CNI、CSI、Ingress Controller、DNS 与云厂商实现各自不同。对象模型相同，不代表底层网络、存储或失败行为相同。</p></article>
          <article><span className="cost-index">03</span><h3>控制面复杂度</h3><p className="cost-because">换来自动调度、扩缩容与自愈。</p><p>etcd、API Server、调度器和控制器都需要容量、升级、备份与权限治理。集群本身成为需要运维的分布式系统。</p></article>
          <article><span className="cost-index">04</span><h3>资源与配置成本</h3><p className="cost-because">换来标准化交付与弹性。</p><p>每个 Pod 有资源开销，每层抽象都增加 YAML、镜像、指标和策略面。没有 requests、探针和发布约束，自动化可能更快地放大故障。</p></article>
        </div>
        <div className="misread-panel"><div className="misread-heading"><Icon name="spark" size={20} /><strong>常见看错</strong><span>容易被混为一谈的概念，在这里分清</span></div><div className="misread-list"><div><span>Pod Running</span><Icon name="chevron" size={14} /><span>服务可用</span><p>Running 只说明容器进程状态；Ready、EndpointSlice、网络策略与应用响应共同决定能否接流量。</p></div><div><span>Service</span><Icon name="chevron" size={14} /><span>Ingress</span><p>Service 提供集群内稳定端点；Ingress/Gateway 描述集群外 HTTP 流量如何进入并路由到 Service。</p></div><div><span>Secret</span><Icon name="chevron" size={14} /><span>保险箱</span><p>Secret 默认主要是 Base64 编码，不是自动加密。权限、静态加密、外部密钥管理和轮换仍是独立工作。</p></div><div><span>HPA</span><Icon name="chevron" size={14} /><span>质量保证</span><p>HPA 只按指标调整副本；它不能修复慢查询、错误代码或容量不足的数据库。</p></div></div></div>
      </section>

      <section id="example" data-section="6" className="learning-section">
        <SectionHeading number={6} title="示例" lead="只拆这条路径里最关键、也最容易看错的一步：副本恢复后端点何时变化。" />
        <MechanismDiagram diagram={{ kind: 'flow', title: '从 Pod 删除到服务恢复的五段证据', caption: '把对象状态、Pod 状态、EndpointSlice 和真实请求分开观察，才能判断恢复发生在哪一层。', items: [
          { title: '对象声明', detail: 'Deployment 的 spec.replicas=3 保持不变，删除 Pod 不会修改期望状态。', tag: 'desired', tone: 'blue' },
          { title: '控制器补位', detail: 'ReplicaSet 观察到 Pod 数量不足，创建带有 ownerReference 的替代 Pod。', tag: 'controller', tone: 'orange' },
          { title: '调度与启动', detail: 'Pod 先绑定节点，再由 kubelet 拉取镜像、启动容器并执行探针。', tag: 'kubelet', tone: 'muted' },
          { title: '就绪与端点', detail: 'PodReady=True 后，EndpointSlice Controller 把新地址加入服务端点。', tag: 'endpoint', tone: 'green' },
          { title: '请求恢复', detail: '数据面把请求送往当前就绪端点；可用副本数重新回到 3。', tag: 'traffic', tone: 'blue' },
        ], footnote: '仅看到“新 Pod 已创建”不能证明服务恢复；应继续检查 Ready、EndpointSlice 和实际请求。' }} />
        <div className="example-panel k8s-example-panel"><div className="example-terminal"><div className="terminal-top"><span /><span /><span /><small>cluster shell · namespace demo</small></div><div className="terminal-body"><p><span>$</span> kubectl get deploy,pods,svc -n demo</p><p className="terminal-output">NAME READY UP-TO-DATE AVAILABLE AGE</p><p className="terminal-output">deployment.apps/web 3/3 3 3 2m</p><p className="terminal-output">NAME READY STATUS RESTARTS AGE</p><p className="terminal-output">pod/web-6c4d7b9f55-2xk7 1/1 Running 0 12s</p><p className="terminal-output">pod/web-6c4d7b9f55-7mnp 1/1 Running 0 2m</p><p className="terminal-output">pod/web-6c4d7b9f55-q8tz 1/1 Running 0 2m</p><p className="terminal-output">NAME TYPE CLUSTER-IP EXTERNAL-IP PORT(S) AGE</p><p className="terminal-output">service/web ClusterIP 10.96.0.42 &lt;none&gt; 80/TCP 2m</p></div></div><div className="packet-trace"><div className="trace-head"><span>排障时按层检查</span><small>示例输出</small></div>{[['01', 'Deployment', 'AVAILABLE=3', '控制器认为副本已满足'], ['02', 'Pod', 'READY=1/1', '容器与 readiness 已通过'], ['03', 'EndpointSlice', '3 addresses', '新端点已进入服务'], ['04', 'Service / DNS', 'web.demo.svc', '稳定名称可解析'], ['05', '应用请求', 'HTTP 200', '端到端路径真正可用']].map(([number, title, code, text], index) => <div className="trace-step" key={number}><span className="trace-number">{number}</span><div><strong>{title}</strong><p>{text}</p></div><code>{code}</code>{index < 4 && <i className="trace-connector" />}</div>)}</div></div>
        <div className="example-note"><Icon name="target" size={18} /><p><strong>验收要沿着控制循环走完。</strong>Deployment READY、Pod Ready、EndpointSlice 地址和 HTTP 响应是四层证据，任何一层缺失都会改变排障方向。</p></div>
      </section>

      <section id="boundary" data-section="7" className="learning-section">
        <SectionHeading number={7} title="边界" lead="知道它挡住了什么，才知道什么时候必须换另一层设计。" />
        <div className="boundary-grid"><article className="boundary-yes"><span className="card-label"><Icon name="check" size={16} /> 这条设计挡住了</span><ul><li>Pod 消失后需要人工逐台补副本</li><li>发布时手工记录每台机器上的镜像版本</li><li>服务绑定某个会变化的 Pod IP</li><li>节点资源与调度约束完全散落在脚本里</li><li>缺少统一对象状态与事件证据</li></ul></article><article className="boundary-no"><span className="card-label"><Icon name="close" size={16} /> 这条设计没挡住</span><ul><li>业务代码错误、慢查询与有状态数据一致性</li><li>CNI、CSI 或云平台自身故障</li><li>Secret 泄露、镜像漏洞与错误 RBAC</li><li>etcd 丢失、控制面不可用和错误升级</li><li>没有 SLO、容量规划和备份演练的生产风险</li></ul></article></div>
        <div className="stop-card"><div className="stop-top"><span><Icon name="check" size={17} /> Kubernetes 全景已展开</span><small>{kubernetesModules.length} 个依赖模块 · 完整状态与示例</small></div><h3>不止学会“写一份 Deployment”，而是看懂声明怎样经过控制循环变成可验证的系统状态。</h3><p>每个模块都包含理念、设计、诞生动机、核心抽象、完整执行状态、可复现示例、代价与边界。</p><div className="stop-footer"><span>Kubernetes 依赖图</span><strong>{kubernetesModules.length} / {kubernetesModules.length} 模块可用</strong><span>从控制面到生产边界</span></div></div>
      </section>

      <footer className="page-footer"><div><Icon name="network" size={22} /><span>心智实验室</span></div><p>不是记住更多 YAML，而是看懂每一次状态变化。</p><span>ROUND 03 / KUBERNETES</span></footer>
    </>
  )
}
