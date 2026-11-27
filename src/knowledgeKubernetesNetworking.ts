import type { KnowledgeModule } from './knowledgeTypes'

/**
 * Kubernetes 网络、入口、配置与存储的五个深潜模块。
 * 所有示例都把真实集群操作改写为纯内存状态机：不调用 kubectl、不访问网络，
 * 也不读写用户文件。命令只使用 Python 标准库，并以固定输入展示确定性的状态迁移。
 * 阅读顺序遵循“意图 → 机制 → 权衡”：先说明要解决的问题，再拆解控制面与数据面，
 * 最后解释这种抽象带来的成本、误区和不能覆盖的边界。
 */

export const kubernetesNetworkModules: KnowledgeModule[] = [
  /**
   * 模块一先把“稳定服务地址”和“会变化的 Pod 地址”分开。
   * 重点不是背诵 Service 类型，而是理解 EndpointSlice、DNS、探针与数据面规则
   * 如何共同工作，以及为什么解析到 ClusterIP 不能证明后端应用健康。
   */
  {
    id: 'service-dns',
    title: 'Service、EndpointSlice 与集群 DNS',
    english: 'SERVICE / ENDPOINTSLICE / DNS',
    summary: 'Service 用稳定的虚拟 IP 和名称隐藏 Pod 的生灭；控制器把匹配的就绪端点写入 EndpointSlice，集群 DNS 负责把名称解析为虚拟 IP，最终由 kube-proxy 或等价的数据面规则把连接送到某个后端。DNS 成功只说明名称解析成功，不证明应用可用。',
    icon: 'network',
    track: 'kubernetes',
    group: '网络与入口',
    dependencies: ['pod-controllers'],
    dependents: [],
    philosophy: {
      problem: 'Pod 会随扩缩容、滚动发布和节点故障不断创建与销毁，Pod IP 也随之变化。如果客户端直接保存某个 Pod IP，重启后连接就会失效；如果每个客户端都自己维护健康后端列表，又会重复实现发现、重试和一致性逻辑。',
      rejects: 'ClusterIP 不是一台运行在客户端里的负载均衡器，也不承诺“每个请求轮询一个 Pod”。把 Service 画成负载均衡器只画出了逻辑结果，遗漏了 iptables、IPVS、nftables 或 eBPF 等数据面实现。DNS 解析成功更不等于 TCP 建连、TLS 握手或 HTTP 响应成功。',
      counter: '稳定入口与不稳定后端是两层状态：Service 描述选择条件和虚拟地址，EndpointSlice 描述当前可路由的后端，DNS 只把名字映射到入口，数据面再按本地规则处理具体连接。理解这四层，才能定位“有地址但没有响应”究竟断在哪一段。',
    },
    design: {
      abstractions: [
        { name: 'Pod IP', role: '分配给具体 Pod 的网络地址，通常随 Pod 生命周期变化；它不是长期可依赖的服务身份。' },
        { name: 'Service', role: '由名称、selector、端口和类型组成的逻辑入口；默认 ClusterIP 在集群内提供相对稳定的虚拟地址。' },
        { name: 'EndpointSlice', role: '按分片保存 Service 对应的后端地址、端口、就绪状态与拓扑信息，替代早期大体积的 Endpoints 对象。' },
        { name: '集群 DNS', role: '把 service、service.namespace 或完全限定域名解析为 Service ClusterIP；解析结果和健康检查是不同事件。' },
        { name: 'kube-proxy / 数据面', role: '把 Service 虚拟地址转换为后端规则；具体实现可以是 iptables、IPVS、nftables 或由 CNI 提供的替代方案。' },
        { name: 'readinessProbe', role: '由 kubelet 在每个 Pod 上执行的就绪判断；未就绪端点通常不会进入可接收流量的 EndpointSlice。' },
      ],
      principles: [
        '身份分层：Service 提供稳定逻辑身份，Pod IP 只标识当前实例；应用不应把 Pod IP 当作永久配置。',
        '控制面与数据面分离：控制器维护 EndpointSlice，数据面消费它；两者更新不是同一个原子动作，存在短暂不一致窗口。',
        '负载均衡发生在数据面：客户端通常仍把包发给 ClusterIP，规则按实现选择后端；iptables 的逐连接选择也不等同于逐 HTTP 请求均匀轮询。',
        '就绪决定是否接流量：Pod Running 只说明容器进程存在，readinessProbe 未通过时仍应被排除，避免把请求送进尚未准备好的实例。',
        'DNS 是地址解析，不是健康证明：拿到 A/AAAA 记录后仍可能没有端点、规则未更新、端口错误、应用返回 5xx 或网络策略拒绝连接。',
        '连接黏性由协议状态决定：HTTP 客户端连接复用、重试和长连接会影响实际后端分布，跨实例会话必须显式外置或设计为可复制。',
      ],
      history: [
        { when: 'Kubernetes 早期', what: 'Service 与 Endpoints 建立服务发现模型', why: '让工作负载通过稳定名称通信，而不是绑定会变化的 Pod IP。' },
        { when: '2017—2018', what: 'EndpointSlice 作为可扩展端点 API 引入并逐步成熟', why: '把大量端点拆成独立分片，降低单个对象更新规模并支持更丰富的拓扑元数据。' },
        { when: '持续演进', what: '数据面从 iptables 扩展到 IPVS、nftables、eBPF 与可替换 CNI 方案', why: '大规模服务需要更低的规则更新开销、更好的可观测性和不同的性能取舍。' },
      ],
    },
    capabilities: [
      { name: '稳定服务发现', sentence: '用集群内 DNS 名称和虚拟 IP 找到服务，而不必跟随 Pod IP 变化。' },
      { name: '就绪后端集合', sentence: '通过 selector 和 EndpointSlice 把流量目标收敛到当前匹配且就绪的实例。' },
      { name: '端口映射', sentence: '把 Service 端口映射到容器的 targetPort，使服务契约与容器内部监听端口解耦。' },
      { name: '分层排障', sentence: '分别检查 DNS 记录、EndpointSlice、数据面规则、连通性和应用响应，避免把整条链路当成一个黑盒。' },
      { name: '滚动发布衔接', sentence: '在新端点就绪、旧端点退出之间维持服务入口，但需要应用本身支持并存和优雅退出。' },
    ],
    path: {
      intent: '从集群内的客户端访问 demo.default.svc.cluster.local:80，观察稳定名称如何经过 DNS、EndpointSlice 与数据面最终到达一个就绪 Pod。',
      environment: '教学模拟：Service、Pod、DNS 缓存和规则都存放在 Python 内存中；端点状态由固定布尔值表示，不执行真实网络请求。',
      steps: [
        { title: '建立稳定 Service 身份', description: '创建 Service 时分配 ClusterIP 10.96.0.10，并声明 app=demo 的 selector 和 80→8080 的端口映射。ClusterIP 是虚拟地址，不需要先找到某一个固定 Pod。', terms: [{ name: 'ClusterIP', definition: 'Service 在集群网络中的虚拟地址；客户端通常访问它，而不是直接访问 Pod IP。' }, { name: 'selector', definition: 'Service 用来选择 Pod 的标签条件，只有匹配对象才可能成为候选端点。' }], state: 'Service=demo；ClusterIP=10.96.0.10；port=80；targetPort=8080。' },
        { title: '控制器生成候选端点', description: '端点控制器观察匹配 selector 的 Pod，把其 IP、targetPort 和就绪状态写入 EndpointSlice。没有匹配 Pod 时，Service 对象仍可存在，但后端集合为空。', terms: [{ name: 'EndpointSlice', definition: '保存后端地址、端口和条件的分片对象，是数据面的后端信息来源。' }, { name: '空端点', definition: 'Service 已存在但没有可用后端；此时有 DNS 记录也可能无法建立连接。' }], state: 'EndpointSlice generation=1；ready=1；notReady=1。' },
        { title: 'DNS 解析稳定名称', description: '客户端查询 demo.default.svc.cluster.local，DNS 返回 ClusterIP。查询结果可以被缓存，因此 DNS 这一层只回答“这个名称当前对应哪个虚拟地址”，不回答“哪个 Pod 现在健康”。', terms: [{ name: 'FQDN', definition: '完整限定域名，例如 demo.default.svc.cluster.local，可减少不同集群搜索域造成的歧义。' }, { name: 'DNS 缓存', definition: '解析器临时保存的答案；即使后端集合变化，Service 地址通常也不需要改变。' }], state: 'DNS=10.96.0.10；TTL=30；解析成功；未执行健康检查。' },
        { title: '数据面把虚拟地址转为后端', description: '客户端仍向 10.96.0.10:80 发包。kube-proxy 或替代数据面依据规则做目标地址转换，并选择一个就绪端点。本模拟用固定 iptables 风格规则展示结果，不宣称所有实现都逐包均匀分配。', terms: [{ name: 'DNAT', definition: '把连接目标从 Service 虚拟地址改写为后端 Pod 地址和 targetPort。' }, { name: '数据面规则', definition: '节点上由代理或 CNI 安装的转发规则，决定实际连接落到哪个后端。' }], state: 'client→10.96.0.10:80；规则命中 endpoint-1；DNAT→10.244.1.7:8080。' },
        { title: '就绪探针收紧后端集合', description: '当 endpoint-1 的 readinessProbe 失败，EndpointSlice 更新并移除或标记该端点，数据面随后刷新规则。窗口期内可能仍有旧规则，因此调用方需要超时和有界重试。', terms: [{ name: 'readinessProbe', definition: 'kubelet 用来判断容器是否能接收流量的周期性检查；失败通常使端点退出服务。' }, { name: '传播窗口', definition: '对象状态已变化，但 DNS 之外的缓存、规则或连接尚未完全跟上的短暂时间。' }], state: 'endpoint-1 notReady；EndpointSlice generation=2；ready=1。' },
        { title: 'Pod 替换保持入口不变', description: '滚动发布创建新 Pod，新 IP 在就绪后加入端点；旧 Pod 终止并移除。Service 名称与 ClusterIP 不变，客户端无需重新配置，但已建立的长连接可能仍落在旧实例。', terms: [{ name: '滚动发布', definition: '逐步用新实例替换旧实例，同时让两者短暂并存以维持服务。' }, { name: '长连接', definition: '建立后多次复用的连接；端点移除不会强制已经建立的连接立即迁移。' }], state: 'Service 不变；endpoint-2 ready；endpoint-1 terminating；旧连接可继续存在。' },
        { title: '按层验证而不是只看 DNS', description: '先确认 DNS 返回预期 ClusterIP，再查看 EndpointSlice 是否有就绪地址，接着检查规则、端口和策略，最后检查应用日志与响应。任何一层失败都会呈现为“服务不通”，但修复动作不同。', terms: [{ name: '分层排障', definition: '把一次失败拆成解析、端点、转发、传输和应用阶段，逐层收集证据。' }, { name: '应用健康', definition: '应用真正能够按协议完成请求；它比 DNS 解析和容器存活包含更多条件。' }], state: 'DNS 成功不等于 HTTP 200；只有端到端证据能确认应用可用。' },
      ],
      stateTable: {
        columns: ['观察阶段', 'Service / DNS', 'EndpointSlice', '数据面', '结论 / 异常分支'],
        rows: [
          ['稳定服务', 'demo→10.96.0.10', '1 个 ready', '规则指向就绪端点', '可继续检查 TCP 与应用响应'],
          ['Pod 尚未就绪', 'DNS 仍可解析', '仅 notReady 或无端点', '新请求可能无目标', 'Running 不等于 Ready'],
          ['端点更新中', 'ClusterIP 不变', 'generation 已变化', '旧规则可能短暂残留', '调用方需要超时与有界重试'],
          ['Pod 被替换', 'Service 不变', '旧端点移除、新端点加入', '新连接走新规则', '旧长连接不一定立即断开'],
          ['解析成功但无响应', 'A/AAAA 记录存在', '可能为空或端口错误', '可能无规则或被策略拒绝', '继续检查端点、规则、策略和应用'],
        ],
      },
      summary: 'Service 提供稳定身份，EndpointSlice 描述当前后端，DNS 只完成名称到虚拟地址的映射，数据面才真正选择连接目标；四者任一环节都可能成为“解析成功但访问失败”的原因。',
    },
    costs: [
      { choice: 'ClusterIP 稳定入口', cost: '客户端无需感知 Pod 变化，但多了一层虚拟地址转换和规则维护。', misread: 'ClusterIP 自己运行在客户端里做轮询负载均衡。' },
      { choice: 'EndpointSlice 分片', cost: '提升大规模端点更新能力，却增加对象数量、版本与控制器排障复杂度。', misread: 'EndpointSlice 有地址就说明应用一定健康。' },
      { choice: 'DNS 缓存', cost: '减少重复查询，但会延长变化被观察的时间，也可能保留陈旧答案。', misread: 'nslookup 成功就是端到端连通。' },
      { choice: '连接复用与长连接', cost: '降低握手开销，却让流量分布更依赖连接生命周期，并增加优雅退出难度。', misread: 'Service 会强制每个 HTTP 请求平均落到所有 Pod。' },
    ],
    example: {
      title: '用内存规则观察 Service 转发与 Pod 生命周期',
      intent: '固定两个 Pod、一个 Service 和两条数据面规则。先让 DNS 返回 ClusterIP，再改变端点就绪状态，观察“解析结果不变、后端集合变化”的分离。',
      diagram: {
        kind: 'flow',
        title: '从稳定名称到就绪后端',
        caption: 'DNS 与 EndpointSlice 是两条并行链路：前者给出虚拟地址，后者供给后端集合，数据面在连接建立时消费二者。',
        items: [
          { title: '客户端查询 DNS', detail: 'demo.default.svc.cluster.local 返回 10.96.0.10，不返回 Pod IP。', tag: '解析', tone: 'blue' },
          { title: 'Service 固定入口', detail: 'ClusterIP 与 80→8080 映射在 Pod 替换时保持不变。', tag: '稳定身份', tone: 'green' },
          { title: 'EndpointSlice 变化', detail: '只包含匹配且就绪的后端；未就绪端点会被移除或标记。', tag: '控制面', tone: 'orange' },
          { title: '数据面选择目标', detail: '客户端仍访问 ClusterIP，规则把连接 DNAT 到某个 Pod。', tag: '逐连接', tone: 'blue' },
          { title: '应用响应', detail: '只有 TCP、TLS 或 HTTP 真正完成，才能证明端到端可用。', tag: '健康证据', tone: 'green' },
        ],
        footnote: '模拟中的规则选择是确定性的；真实数据面的算法、连接跟踪和节点差异需要结合具体实现观察。',
      },
      commands: [
        {
          title: '模拟 DNS 解析与 ClusterIP 数据面规则',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8")

# 全部数据固定，模拟控制面生成的对象，不进行任何真实 DNS 或网络查询。
service = {
    "name": "demo.default.svc.cluster.local",
    "cluster_ip": "10.96.0.10",
    "port": 80,
    "target_port": 8080,
}
endpoints = [
    {"name": "endpoint-1", "ip": "10.244.1.7", "ready": True},
    {"name": "endpoint-2", "ip": "10.244.1.8", "ready": False},
]

def resolve(name):
    # DNS 只维护名称到 Service 虚拟地址的映射，不检查端点是否就绪。
    if name == service["name"]:
        return service["cluster_ip"]
    return None

def choose_backend(ready_endpoints):
    # 用固定规则近似数据面选择，不模拟随机、时间或真实 iptables。
    if not ready_endpoints:
        return None
    return ready_endpoints[0]

address = resolve(service["name"])
print(f"DNS解析 name={service['name']} address={address}")
print(f"客户端目标={address}:{service['port']} 客户端负载均衡=否")
for endpoint in endpoints:
    print(f"端点={endpoint['name']} ip={endpoint['ip']} ready={endpoint['ready']}")

ready = [item for item in endpoints if item["ready"]]
selected = choose_backend(ready)
print(f"规则生成 就绪端点={len(ready)} 模式=iptables风格固定选择")
if selected:
    print(f"连接转发 {address}:{service['port']} -> {selected['ip']}:{service['target_port']}")
else:
    print("连接转发 无可用后端")

# 即使所有端点都不就绪，Service 与 DNS 记录仍存在，体现两层生命周期。
endpoints[0]["ready"] = False
print(f"端点全失败后 DNS仍解析={resolve(service['name'])} 就绪端点={sum(x['ready'] for x in endpoints)}")
PY`,
          output: `DNS解析 name=demo.default.svc.cluster.local address=10.96.0.10
客户端目标=10.96.0.10:80 客户端负载均衡=否
端点=endpoint-1 ip=10.244.1.7 ready=True
端点=endpoint-2 ip=10.244.1.8 ready=False
规则生成 就绪端点=1 模式=iptables风格固定选择
连接转发 10.96.0.10:80 -> 10.244.1.7:8080
端点全失败后 DNS仍解析=10.96.0.10 就绪端点=0
`,
          note: '客户端没有遍历 Pod 列表；选择动作发生在数据面。端点全部失效后 DNS 仍可能返回 ClusterIP，因此“能解析”不是“能访问”。',
        },
        {
          title: '模拟就绪变化与 Pod IP 替换',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8")

# 控制面状态由固定事件推进；generation 用来表示 EndpointSlice 的更新版本。
dns_answer = "10.96.0.10"
pods = {
    "pod-old": {"ip": "10.244.1.7", "ready": True, "phase": "Running"},
    "pod-new": {"ip": "10.244.2.9", "ready": False, "phase": "Running"},
}

def endpoint_slice(items):
    # 模拟端点控制器：只输出 ready=True 的 Pod 地址。
    return [item["ip"] for item in items.values() if item["ready"]]

print(f"初始 Service=demo ClusterIP={dns_answer} DNS健康=仅解析")
print(f"初始 Pod旧IP={pods['pod-old']['ip']} 新PodIP={pods['pod-new']['ip']}")
print(f"generation=1 ready={endpoint_slice(pods)}")

# 新 Pod 的进程已运行，但尚未通过 readinessProbe，因此不进入就绪集合。
pods["pod-new"]["ready"] = True
print(f"新Pod就绪 generation=2 ready={endpoint_slice(pods)}")

# 滚动发布终止旧 Pod；Service 地址不变，旧 Pod IP 退出端点集合。
pods["pod-old"]["phase"] = "Terminating"
pods["pod-old"]["ready"] = False
print(f"旧Pod终止 generation=3 ready={endpoint_slice(pods)} ClusterIP={dns_answer}")
print(f"旧IP={pods['pod-old']['ip']} 生命周期=随Pod结束 新IP={pods['pod-new']['ip']} 生命周期=由新Pod持有")
print("结论=Service稳定 PodIP短暂 DNS解析不验证HTTP健康")
PY`,
          output: `初始 Service=demo ClusterIP=10.96.0.10 DNS健康=仅解析
初始 Pod旧IP=10.244.1.7 新PodIP=10.244.2.9
generation=1 ready=['10.244.1.7']
新Pod就绪 generation=2 ready=['10.244.1.7', '10.244.2.9']
旧Pod终止 generation=3 ready=['10.244.2.9'] ClusterIP=10.96.0.10
旧IP=10.244.1.7 生命周期=随Pod结束 新IP=10.244.2.9 生命周期=由新Pod持有
结论=Service稳定 PodIP短暂 DNS解析不验证HTTP健康
`,
          note: '真实滚动发布还有宽限期、优雅终止和连接耗尽等细节；本模拟只突出地址生命周期与就绪集合的分离。',
        },
      ],
      checkpoints: [
        '能解释 ClusterIP 为什么不等于客户端内置负载均衡器',
        '能区分 Pod IP、Service ClusterIP 与 DNS 记录的生命周期',
        '知道 EndpointSlice 来自 selector 与端点就绪状态',
        '看到 DNS 成功后仍会继续检查端点、规则、端口和应用响应',
        '理解 readinessProbe 失败会收缩可接收流量的后端集合',
        '知道长连接和连接复用会影响实际后端分布',
      ],
      safety: '生产环境排障时只读取必要对象与日志，避免在共享集群随意删除 Service、修改 kube-proxy 规则或进行无边界流量压测；教学命令不会连接真实集群。',
    },
    boundaries: {
      blocks: ['客户端硬编码单个 Pod IP', '应用自行维护大规模后端健康列表', '滚动发布时后端地址频繁变化', '把名称解析误当作端到端健康检查'],
      notBlocks: ['应用返回错误业务结果', '跨实例会话状态一致性', '外部 DNS 故障', '节点或 CNI 数据面自身不可用', '所有协议的一致性负载均衡保证', '网络策略绕过或证书配置错误'],
    },
  },
  /**
   * 模块二把七层入口从 Service 的四层转发中拆出来。
   * Ingress 是声明，Gateway API 是角色化资源模型；二者都需要控制器把意图变成数据面。
   */
  {
    id: 'ingress-gateway',
    title: 'Ingress、Gateway 与七层入口',
    english: 'INGRESS / GATEWAY / HTTP ROUTING',
    summary: 'Ingress 与 Gateway API 都描述 HTTP/HTTPS 入口，但本身不转发流量：控制器先读取主机、路径、TLS 和后端引用，再把它们转换为边缘代理或数据面规则。Ingress 把规则集中在一个资源中，Gateway API 则把基础设施监听器与路由所有权分离。',
    icon: 'link',
    track: 'kubernetes',
    group: '网络与入口',
    dependencies: ['service-dns'],
    dependents: [],
    philosophy: {
      problem: 'Service 解决“集群内如何找到一组 Pod”，却通常不解析域名、路径、请求头和 TLS。要对外提供多个站点或把 /api 与静态资源分发到不同后端，就需要一层七层路由器，同时还要处理证书、入口地址和跨团队权限。',
      rejects: 'Ingress 对象不是代理进程，IngressClass 也不是负载均衡器；Gateway API 不是给 Ingress 换个名字。它们都是给控制器阅读的声明。外部 DNS 指向某个 IP 只说明名称和入口地址关联，不说明控制器已加载规则、证书有效或后端可用。',
      counter: '入口控制面把声明转成数据面配置，数据面再执行 TLS 终止、请求匹配和反向代理。Ingress 适合集中管理简单 HTTP 路由；Gateway API 通过 Gateway、HTTPRoute 和策略资源，把“谁提供入口”与“谁声明业务路由”分开，但也引入更多资源和协调边界。',
    },
    design: {
      abstractions: [
        { name: 'Ingress', role: '描述主机、路径、TLS 和后端 Service 的七层路由声明，需要 Ingress 控制器实现。' },
        { name: 'IngressClass / 控制器', role: '选择由哪个入口控制器处理声明，并负责把 Ingress 转换成真实代理配置。' },
        { name: 'Gateway API', role: '以角色化资源描述入口基础设施、路由和策略的 API 家族，不是单一代理资源。' },
        { name: 'Gateway 与 HTTPRoute', role: 'Gateway 声明监听地址、端口和协议；HTTPRoute 声明主机、路径匹配及后端引用，并通过父子关系附着。' },
        { name: 'TLS 终止', role: '在入口层解密 HTTPS，再按配置用 HTTP 或重新加密的连接访问后端；证书与密钥需要独立管理。' },
        { name: '外部入口地址', role: '云负载均衡器、NodePort 或代理暴露的可达地址，外部 DNS 通常指向它，而不是直接指向某个 Pod。' },
      ],
      principles: [
        '声明与执行分离：创建 Ingress 或 HTTPRoute 不会凭空启动代理，必须有控制器完成编程并暴露入口。',
        '先匹配再转发：数据面按主机、路径、方法、请求头等条件选择路由，再引用 Service；没有匹配时通常返回 404，后端无端点则可能是 503。',
        'TLS 有独立状态：证书引用、SAN、有效期、SNI 和密钥权限都可能失败，DNS 解析成功不能证明 HTTPS 健康。',
        'Ingress 与 Gateway API 的边界不同：Ingress 更集中，Gateway API 把基础设施所有权和业务路由所有权拆开；不能假设同一控制器同时完整支持两者。',
        '入口规则仍依赖 Service：HTTPRoute 或 Ingress 的后端通常解析到 Service，最终由 Service 数据面选择 Pod。',
        '重写与注解是实现相关能力：路径重写、超时、限流等行为取决于控制器，不能把某个实现的默认值当成 API 的普遍保证。',
      ],
      history: [
        { when: '2015 前后', what: 'Kubernetes 出现基于主机与路径的 HTTP 路由需求', why: '早期 Service 只能做四层转发，多个站点和微服务需要共享外部入口。' },
        { when: '2017—2018', what: 'Ingress 与 IngressClass 模型逐步推广', why: '把入口声明标准化，但不同控制器对注解和高级能力支持不一致。' },
        { when: '2020 起', what: 'Gateway API 以角色化资源演进', why: '让平台团队管理 Gateway，让业务团队管理 HTTPRoute，降低单一大资源配置的耦合。' },
      ],
    },
    capabilities: [
      { name: '虚拟主机路由', sentence: '依据 Host 或 TLS SNI 把不同域名导向不同后端服务。' },
      { name: '路径分发', sentence: '把 /api、/static 等前缀或精确路径映射到不同 Service。' },
      { name: 'HTTPS 入口', sentence: '在边缘终止 TLS、选择证书，并按策略决定是否重新加密到后端。' },
      { name: '控制器化配置', sentence: '由入口控制器把声明转换为代理监听器、路由和证书配置。' },
      { name: '多租户路由', sentence: 'Gateway API 可用资源引用和策略边界划分平台与业务团队的职责。' },
    ],
    path: {
      intent: '让外部客户端通过 https://api.example.com/orders 访问集群中的 order Service，并观察一条请求从 DNS、TLS、路由到 Service 的完整路径。',
      environment: '教学模拟：固定域名、两条 Ingress 规则和三个后端 Service；匹配器只处理内存字符串，不解析真实证书或发送 HTTP。',
      steps: [
        { title: '准备外部入口与 DNS', description: '云负载均衡器、NodePort 或独立代理提供入口地址 203.0.113.20，外部 DNS 把 api.example.com 指向它。这个地址属于入口层，不是 Service ClusterIP。', terms: [{ name: '外部 DNS', definition: '把公网或组织内域名解析为外部可达入口地址的记录系统。' }, { name: '入口地址', definition: '客户端实际连接的负载均衡器、节点端口或代理地址。' }], state: 'api.example.com→203.0.113.20；入口监听 443；DNS 已完成。' },
        { title: '选择控制器与声明入口', description: 'Ingress 通过 ingressClassName 选择控制器。控制器持续观察声明，配置监听器、证书和上游；若没有可用控制器，对象可以存在但不会产生可访问入口。', terms: [{ name: 'IngressClass', definition: '声明哪个控制器负责处理 Ingress 的资源；它不是实际转发流量的进程。' }, { name: '编程状态', definition: '控制器是否已把声明转换为数据面配置并报告成功。' }], state: 'IngressClass=nginx-example；controller=ready；监听器尚未验证。' },
        { title: '终止 TLS 并读取 Host', description: '数据面在 443 端口接受 TLS，校验证书与 SNI，解密后读取 Host: api.example.com。证书错误或主机不匹配会在进入路由匹配前失败。', terms: [{ name: 'TLS 终止', definition: '在入口代理处解密客户端 HTTPS 流量，之后可按 HTTP 或新 TLS 连接转发。' }, { name: 'SNI', definition: 'TLS 握手中客户端指示目标主机名的扩展，可用于选择证书或虚拟主机。' }], state: 'TLS=success；Host=api.example.com；进入七层路由。' },
        { title: '匹配主机与路径规则', description: '控制器生成的规则按声明匹配 Host 和路径。本示例 /orders 命中 api.example.com 规则并指向 order Service；没有匹配时数据面通常返回 404。', terms: [{ name: '路由匹配', definition: '数据面依据 Host、路径、方法或请求头等条件选择一条声明规则。' }, { name: '默认拒绝匹配', definition: '没有任何规则接受请求时返回的错误语义，具体状态码由实现和配置决定。' }], state: 'host 匹配；path=/orders；backend=order:80。' },
        { title: '把后端引用交给 Service', description: '入口代理把请求发送到 order Service 的集群内虚拟地址。Service 再通过 EndpointSlice 和数据面规则选择一个就绪 Pod；七层入口不会绕过 Service 自己猜 Pod。', terms: [{ name: '后端引用', definition: 'Ingress 或 HTTPRoute 中指向 Service 名称、端口及可选的权重配置。' }, { name: '上游', definition: '代理实际连接的后端地址；这里通常是 Service ClusterIP。' }], state: 'upstream=order.default.svc:80；Service 选择一个就绪端点。' },
        { title: '处理空端点与应用错误', description: '如果路由存在但 Service 没有就绪端点，代理可能返回 502/503；如果应用返回 500，则请求已经到达应用。状态码要结合入口日志与后端日志判断。', terms: [{ name: '无健康上游', definition: '代理无法选择可连接后端，常表现为 502 或 503。' }, { name: '应用错误', definition: '后端已接收请求但业务处理失败，错误证据通常首先出现在应用日志。' }], state: '分支 A：无端点→503；分支 B：应用失败→500。' },
        { title: '用 Gateway API 重划职责', description: '若改用 Gateway API，平台团队创建 GatewayClass、Gateway 与监听器，业务团队创建 HTTPRoute 并附着到 Gateway。控制器仍负责把两边合成数据面，但资源和所有权边界更清晰。', terms: [{ name: 'Gateway', definition: '描述入口监听器及其基础设施意图的 Gateway API 资源。' }, { name: 'HTTPRoute', definition: '描述 HTTP 匹配和后端引用的 Gateway API 资源，通过 parentRefs 附着到 Gateway。' }], state: 'Gateway=platform-owned；HTTPRoute=team-owned；controller=reconciles。' },
      ],
      stateTable: {
        columns: ['请求 / 状态', 'DNS / TLS', '入口声明', '数据面动作', '结果 / 异常分支'],
        rows: [
          ['正常 HTTPS 请求', 'DNS 正确；证书有效', 'Ingress 或 HTTPRoute 已编程', '匹配 /orders 并代理到 Service', '后端返回响应'],
          ['无匹配路由', 'TLS 成功', 'Host 或路径不匹配', '不选择上游', '通常 404'],
          ['证书或 SNI 失败', 'DNS 可能正确', '规则无需执行', 'TLS 握手终止', '客户端证书错误'],
          ['无控制器', '入口地址可能存在', '声明无人处理', '没有对应监听器或路由', '连接失败或默认页面'],
          ['后端无端点', '入口匹配成功', '后端引用有效', 'Service 无就绪上游', '常见 502/503'],
          ['Gateway 未附着', '监听器可能已就绪', 'HTTPRoute parentRefs 不匹配', '路由不生效', '404 或 Accepted=False'],
        ],
      },
      summary: '七层入口是“声明由控制器编程、数据面执行匹配和代理”的链路；Ingress 与 Gateway API 的区别主要在资源模型和所有权边界，二者都不会让 DNS、TLS、Service 或应用健康自动成立。',
    },
    costs: [
      { choice: '集中式 Ingress', cost: '规则集中、概念较少，但大型团队共享对象时容易产生权限、注解和冲突管理问题。', misread: 'Ingress 文件写好后就一定有一个内置代理开始监听。' },
      { choice: 'Gateway API 角色分离', cost: '提升平台与业务的边界清晰度，却增加 GatewayClass、Gateway、Route 和策略等协调对象。', misread: 'Gateway API 只是 Ingress 的新名称。' },
      { choice: '入口 TLS 终止', cost: '集中管理证书并减少后端负担，但入口成为敏感边界，后端链路也可能需要重新加密。', misread: 'HTTPS 在入口解密后，内部网络就自动安全。' },
      { choice: '丰富路由与策略', cost: '支持按主机、路径、请求头等精细分流，但规则增多会提高配置错误和排障难度。', misread: '所有控制器对注解、重写和策略都有相同语义。' },
    ],
    example: {
      title: '模拟 Ingress 主机路径匹配与 Gateway API 附着',
      intent: '先用固定 Ingress 规则演示 TLS 后的主机、路径选择，再用最小 Gateway API 状态机展示“Gateway 已监听但 HTTPRoute 未附着”这一异常分支。',
      diagram: {
        kind: 'layers',
        title: '外部请求穿过三层入口边界',
        caption: 'DNS 找到入口地址，控制器把声明变成监听器和路由，数据面在 TLS 与匹配后把请求交给 Service。',
        items: [
          { title: '外部 DNS 与入口地址', detail: 'api.example.com 指向 203.0.113.20；这一层只负责找到入口。', tag: '地址', tone: 'blue' },
          { title: '声明层', detail: 'Ingress 或 Gateway + HTTPRoute 描述监听、证书、匹配和后端引用。', tag: '控制面', tone: 'muted' },
          { title: '控制器编程', detail: '控制器验证类、附着、证书和后端引用，并生成代理配置。', tag: '协调', tone: 'orange' },
          { title: '数据面七层处理', detail: '终止 TLS、匹配 Host/path、执行重写与超时，再选择上游。', tag: '请求路径', tone: 'green' },
          { title: 'Service 与 Pod', detail: 'Service 继续提供稳定虚拟地址，并把连接送到就绪端点。', tag: '集群内', tone: 'blue' },
        ],
        footnote: 'Gateway API 把监听器基础设施和业务路由拆成不同资源；是否支持某项策略仍取决于具体实现。',
      },
      commands: [
        {
          title: '模拟 Ingress 主机路径匹配和后端状态',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8")

# 固定控制器已生成的规则；这里只模拟匹配，不启动代理或解析证书。
rules = [
    {"host": "api.example.com", "prefix": "/api", "service": "order"},
    {"host": "api.example.com", "prefix": "/static", "service": "assets"},
    {"host": "admin.example.com", "prefix": "/", "service": "admin"},
]
services = {
    "order": {"cluster_ip": "10.96.0.21", "ready_endpoints": 2},
    "assets": {"cluster_ip": "10.96.0.22", "ready_endpoints": 0},
    "admin": {"cluster_ip": "10.96.0.23", "ready_endpoints": 1},
}

def route(host, path):
    # 按声明顺序取第一个前缀匹配；真实控制器还涉及最长前缀等规则。
    for rule in rules:
        if host == rule["host"] and path.startswith(rule["prefix"]):
            return rule
    return None

def forward(rule):
    backend = services[rule["service"]]
    if backend["ready_endpoints"] == 0:
        return 503, "无就绪上游"
    return 200, f"代理到{backend['cluster_ip']}:80"

cases = [
    ("api.example.com", "/api/orders"),
    ("api.example.com", "/static/app.js"),
    ("api.example.com", "/unknown"),
    ("admin.example.com", "/"),
]
for host, path in cases:
    print(f"请求 Host={host} Path={path} TLS=success")
    matched = route(host, path)
    if matched is None:
        print("匹配=无 状态=404 后端=未选择")
        continue
    status, action = forward(matched)
    print(f"匹配=host+path Service={matched['service']} 状态={status} 动作={action}")
PY`,
          output: `请求 Host=api.example.com Path=/api/orders TLS=success
匹配=host+path Service=order 状态=200 动作=代理到10.96.0.21:80
请求 Host=api.example.com Path=/static/app.js TLS=success
匹配=host+path Service=assets 状态=503 动作=无就绪上游
请求 Host=api.example.com Path=/unknown TLS=success
匹配=无 状态=404 后端=未选择
请求 Host=admin.example.com Path=/ TLS=success
匹配=host+path Service=admin 状态=200 动作=代理到10.96.0.23:80
`,
          note: '输出中的 200 是教学代理的成功状态，不代表真实应用一定返回 200。404、502/503 与后端 500 需要结合日志区分。',
        },
        {
          title: '对比无 Ingress 控制器与 Gateway 路由未附着',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8")

# Ingress 与 Gateway API 是两套声明模型，下面用固定状态展示各自的失效点。
ingress = {"class": "nginx-example", "host": "api.example.com", "backend": "order"}
controller_ready = False
print(f"Ingress class={ingress['class']} controller_ready={controller_ready}")
print("Ingress编程=未发生 监听器=无 结果=声明不会自行产生流量")

gateway = {
    "name": "shared-gateway",
    "listener": "https:443",
    "address": "203.0.113.20",
    "programmed": True,
}
http_route = {
    "name": "orders-route",
    "parent_ref": "another-gateway",
    "hostnames": ["api.example.com"],
    "attached": False,
}
print(f"Gateway name={gateway['name']} address={gateway['address']} programmed={gateway['programmed']}")
print(f"HTTPRoute name={http_route['name']} parentRef={http_route['parent_ref']} attached={http_route['attached']}")
if not http_route["attached"]:
    print("路由生效=否 原因=parentRefs不匹配 结果=404或Accepted=False")

http_route["parent_ref"] = gateway["name"]
http_route["attached"] = True
print(f"修正后 HTTPRoute attached={http_route['attached']} 数据面路由=api.example.com->order")
print("边界=Gateway拥有监听器 HTTPRoute拥有业务匹配 控制器负责协调")
PY`,
          output: `Ingress class=nginx-example controller_ready=False
Ingress编程=未发生 监听器=无 结果=声明不会自行产生流量
Gateway name=shared-gateway address=203.0.113.20 programmed=True
HTTPRoute name=orders-route parentRef=another-gateway attached=False
路由生效=否 原因=parentRefs不匹配 结果=404或Accepted=False
修正后 HTTPRoute attached=True 数据面路由=api.example.com->order
边界=Gateway拥有监听器 HTTPRoute拥有业务匹配 控制器负责协调
`,
          note: '教学状态机没有模拟 ReferenceGrant、跨命名空间引用、证书或策略校验；真实 Gateway API 的这些条件都可能阻止路由被接受。',
        },
      ],
      checkpoints: [
        '知道 Ingress 和 HTTPRoute 都是声明，控制器才负责把声明变成数据面配置',
        '能区分外部 DNS、入口地址、Service ClusterIP 和 Pod IP',
        '看到 TLS 成功仍不代表路由匹配或后端可用',
        '能解释 404、502/503 与后端应用 500 的不同证据位置',
        '知道 IngressClass 选择控制器，但它本身不转发流量',
        '能说明 Gateway 与 HTTPRoute 的所有权和父子附着边界',
      ],
      safety: '真实入口变更会影响外部流量，应先验证 staging、证书、权限和回滚方案；不要在生产入口批量应用未经验证的重写或通配 Host 规则。教学命令不访问 DNS、证书或集群。',
    },
    boundaries: {
      blocks: ['多个域名共享同一外部入口', '按主机和路径分流 HTTP 服务', '在边缘统一终止 TLS', '把入口基础设施与业务路由分权管理'],
      notBlocks: ['四层 TCP/UDP 透明代理', '应用鉴权与业务授权', '外部 DNS 服务不可用', '后端 Service 无端点', '证书私钥保管与自动续期', '控制器特定注解的跨实现兼容性'],
    },
  },
  /**
   * 模块三从“默认全通”的反向直觉入手，解释 NetworkPolicy 的加法白名单模型。
   * 只有 CNI 真正执行策略时，对象才具有隔离效果；DNS 也是需要显式考虑的流量。
   */
  {
    id: 'network-policy',
    title: 'NetworkPolicy 与东西向隔离',
    english: 'NETWORKPOLICY / CNI / EAST-WEST',
    summary: 'NetworkPolicy 用 Pod 和命名空间选择器限制东西向流量，但默认不选择任何 Pod，且未声明策略时通常允许通信。策略是允许规则的并集，不是全局默认拒绝清单；最终是否生效取决于 CNI 数据面是否实现并执行 NetworkPolicy。',
    icon: 'shield',
    track: 'kubernetes',
    group: '网络与入口',
    dependencies: ['service-dns', 'namespaces-rbac'],
    dependents: [],
    philosophy: {
      problem: '同一集群内常有前端、后端、数据库和不同租户。仅靠 Service 发现无法限制谁能访问数据库；如果默认全通，一个被攻陷的 Pod 就可能横向扫描和连接整个集群。',
      rejects: 'NetworkPolicy 不是防火墙管理员的“拒绝列表”，也不能靠创建一条拒绝规则覆盖所有其他允许。它默认不隔离，只有选中 Pod 后才按方向限制；如果 CNI 不执行策略，YAML 看起来再严格也不会产生隔离。',
      counter: '可以把策略理解为“给选中 Pod 建立默认封闭边界，再累加允许规则”。入口、出口、命名空间选择器、端口和 DNS 必须一起设计；先确认执行能力，再用正反向连通性测试验证，而不是只看对象创建成功。',
    },
    design: {
      abstractions: [
        { name: 'NetworkPolicy', role: '选择 Pod 并声明 ingress、egress 或两者允许规则的网络隔离对象。' },
        { name: 'CNI 插件', role: '配置 Pod 网络并可能实现策略执行的数据面组件；不同 CNI 对 NetworkPolicy 的支持程度不同。' },
        { name: 'podSelector', role: '按标签选择被策略隔离的 Pod；空选择器在指定命名空间中选择全部 Pod。' },
        { name: 'namespaceSelector / ipBlock', role: '按命名空间标签或 IP 范围描述对端；Pod 选择器可与命名空间选择器组合。' },
        { name: 'policyTypes', role: '声明策略覆盖 Ingress、Egress 或两者，影响没有对应 allow 时是否默认拒绝。' },
        { name: '东西向流量', role: '集群内部 Pod、Service 或工作负载之间的通信，与外部客户端到集群的南北向流量相对。' },
      ],
      principles: [
        '默认允许优先：没有策略选中 Pod 时，集群通常不限制其网络；创建策略不等于集群立即进入零信任。',
        '策略是加法并集：多个 NetworkPolicy 对同一 Pod 的允许关系取并集，无法用一条 deny 抵消另一条 allow。',
        '隔离按方向发生：ingress 限制谁连入，egress 限制被选中 Pod 连出；只写 ingress 不会自动限制出口。',
        '执行依赖 CNI：API Server 保存对象不代表数据面执行；要确认 CNI 能力、节点代理和实际连通性。',
        'DNS 是常见断点：出口收紧后若忘记允许 DNS，Pod 可能解析不了 Service 名称，即使 IP 直连规则正确也会失败。',
        '身份与端口共同约束：标签选择降低对 IP 的依赖，端口限制可缩小暴露面，但应用仍要做鉴权，网络策略不等于零信任完整方案。',
      ],
      history: [
        { when: '2015—2017', what: 'CNI 与 NetworkPolicy API 逐步形成', why: '容器网络需要可替换插件模型，也需要在 Pod 层表达工作负载隔离。' },
        { when: '2016 起', what: 'NetworkPolicy 在 Kubernetes 中提供', why: '用声明式选择器和允许规则描述东西向访问边界，而不是为每个 IP 写静态规则。' },
        { when: '持续演进', what: 'CNI 实现策略、可观测性与服务网格方案分化', why: '仅 IP/端口级策略难以表达身份、mTLS 和七层授权，于是出现更细粒度方案。' },
      ],
    },
    capabilities: [
      { name: '入口最小化', sentence: '只让指定前端或命名空间访问后端端口，减少数据库等敏感服务的暴露面。' },
      { name: '出口约束', sentence: '限制 Pod 可以连接的目的地、端口和命名空间，降低横向移动与外联风险。' },
      { name: '命名空间隔离', sentence: '用 namespaceSelector 把不同团队或环境的网络边界与标签关联起来。' },
      { name: '分层防护', sentence: '在应用鉴权之外增加网络可达性控制，缩小被攻陷后的活动范围。' },
      { name: '可验证策略', sentence: '通过允许与拒绝两方面的连接测试确认 CNI 是否按声明执行。' },
    ],
    path: {
      intent: '把 database Pod 限制为只接受 backend 命名空间中 app=database-client 的 Pod 在 5432 端口上的连接，同时允许必要 DNS 查询。',
      environment: '教学模拟：固定 Pod 标签、命名空间标签、端口和策略集合；判定函数只遍历内存规则，不发送真实连接。',
      steps: [
        { title: '确认默认与执行能力', description: '开始时没有策略选中 database，因此任何 Pod 都可尝试连接；这是默认允许。接着检查 CNI 是否支持 NetworkPolicy，若不支持，后续声明不会形成隔离。', terms: [{ name: '默认允许', definition: 'Pod 没有被任何 NetworkPolicy 隔离时，通常没有 API 策略造成的连接限制。' }, { name: 'CNI 支持', definition: '数据面插件实现并执行 NetworkPolicy 语义的能力，是隔离生效的前提。' }], state: 'policy_count=0；cni_enforces=False；隔离效果=无。' },
        { title: '选中数据库 Pod', description: '在 data 命名空间创建策略，podSelector 选择 app=database，并设置 policyTypes 为 Ingress。被选中的 database 入口变为默认拒绝，直到存在允许规则。', terms: [{ name: '被隔离 Pod', definition: '至少被一个 NetworkPolicy 按某方向选中的 Pod；未允许的流量会被数据面阻断。' }, { name: 'Ingress', definition: '流入被选中 Pod 的流量方向，由来源选择器和端口规则描述。' }], state: 'database ingress=isolated；egress=unchanged；allow_rules=0。' },
        { title: '添加来自 backend 的允许规则', description: 'ingress 规则组合 namespaceSelector=team=backend 和 podSelector=app=database-client，并只允许 TCP 5432。来源必须同时满足两个条件，其他来源仍被拒绝。', terms: [{ name: 'AND 组合', definition: '同一规则项中的 namespaceSelector 与 podSelector 同时成立，才匹配来源。' }, { name: '端口限制', definition: '只放行指定协议和端口，减少同一对工作负载间不必要的可达面。' }], state: 'backend/database-client:5432=allow；其他来源=deny。' },
        { title: '用并集处理多个入口', description: '若监控 Pod 也需要访问指标端口，可增加另一条允许规则。最终允许是各策略、各规则项的并集，而不是最后一条覆盖前一条。', terms: [{ name: '策略并集', definition: '所有适用于同一 Pod 和方向的 NetworkPolicy 允许项取逻辑 OR。' }, { name: '无显式 deny', definition: 'NetworkPolicy 没有单独的拒绝规则；未命中并集才保持默认拒绝。' }], state: 'backend:5432=allow；monitoring:9090=allow；其余=deny。' },
        { title: '单独设计出口与 DNS', description: '如果 database 还需要连接备份服务，可为它增加 Egress 策略。出口限制会同时影响 Service DNS 查询，因此通常要显式允许 kube-system 中 DNS 组件的 UDP/TCP 53。', terms: [{ name: 'Egress', definition: '从被选中 Pod 流出的流量方向；未声明时其他策略不会自动限制它。' }, { name: 'DNS 放行', definition: '允许 Pod 向集群 DNS 发送 UDP/TCP 53 查询，否则域名解析会先于业务连接失败。' }], state: 'egress 未配置=仍允许；配置后仅放行 backup 与 DNS。' },
        { title: '验证 CNI 是否真正执行', description: '先发允许连接的测试，再发应拒绝连接的测试。如果两者都成功，可能是 CNI 不支持、选择器写错或规则未传播；对象 Accepted 并不足以证明数据面隔离。', terms: [{ name: '负向测试', definition: '主动验证本应被拒绝的流量确实失败，避免只测成功路径造成虚假安全感。' }, { name: '策略传播', definition: '数据面接收并应用策略所需的时间与一致性过程。' }], state: 'allow_case=success；deny_case=timeout/denied；CNI 执行得到证据。' },
        { title: '保留应用层鉴权', description: '即使只有 backend 能连接数据库，backend 被攻陷后仍可能在允许范围内访问数据库。网络策略缩小可达面，不能替代数据库认证、最小权限和审计。', terms: [{ name: '纵深防御', definition: '在网络、身份、应用和数据层分别设置控制，使单层失守不等于完全失守。' }, { name: '应用鉴权', definition: '应用验证调用方身份与权限，决定是否执行具体业务操作。' }], state: '网络允许≠业务授权；仍需凭据、TLS 和审计。' },
      ],
      stateTable: {
        columns: ['场景', 'Pod 是否被选中', '匹配的允许规则', 'CNI 执行', '判定 / 异常分支'],
        rows: [
          ['无任何策略', '否', '不需要', '任意', '通常允许，策略对象不存在'],
          ['已隔离且无 allow', '是：Ingress', '无', '是', '入口默认拒绝'],
          ['backend 客户端', '是：Ingress', '命名空间与 Pod 标签匹配，端口 5432', '是', '允许'],
          ['陌生 Pod', '是：Ingress', '标签或端口不匹配', '是', '拒绝'],
          ['出口访问 DNS', '是：Egress', '未包含 DNS 放行', '是', '解析失败，业务连接无从开始'],
          ['CNI 不支持策略', '是', '声明正确', '否', '不产生隔离，正反测试都成功'],
        ],
      },
      summary: 'NetworkPolicy 用“选中后默认拒绝、允许规则取并集”的方式缩小东西向可达面；它只在 CNI 真正执行时生效，而且必须同时设计入口、出口、DNS 和应用鉴权。',
    },
    costs: [
      { choice: '默认拒绝入口', cost: '显著缩小暴露面，但错误配置会立即中断服务，需要先梳理调用关系。', misread: '创建第一条 NetworkPolicy 就会保护整个集群。' },
      { choice: '限制出口', cost: '降低外联与横向移动风险，却容易遗漏 DNS、证书、时间同步或依赖服务。', misread: '写了 ingress 就自动限制了所有出站流量。' },
      { choice: '标签与命名空间选择器', cost: '减少对变化 IP 的依赖，但标签错误、权限滥用或重命名会改变策略范围。', misread: '标签是密码学身份，不能被伪造。' },
      { choice: '加法白名单模型', cost: '规则组合可预测、易于叠加，却无法用单条 deny 覆盖其他策略的 allow。', misread: '最后创建的拒绝策略会推翻之前所有允许。' },
    ],
    example: {
      title: '用正反连接测试观察默认允许、隔离与并集',
      intent: '固定 database 的策略和三个来源 Pod，先展示没有策略时的全通，再选择数据库、添加 backend 白名单，最后比较 CNI 支持与不支持两种执行结果。',
      diagram: {
        kind: 'compare',
        title: 'NetworkPolicy 的隔离边界',
        caption: '左侧是声明层，右侧是数据面结果；只有被选中且允许规则命中的流量才能通过执行策略的 CNI。',
        items: [
          { title: '默认状态', detail: '没有策略选中 database 时，来源通常不受 NetworkPolicy 限制。', tag: '默认允许', tone: 'muted' },
          { title: 'Ingress 隔离', detail: '选中 app=database 后，未命中 allow 的入口流量被默认拒绝。', tag: '边界', tone: 'orange' },
          { title: '白名单并集', detail: 'backend:5432 与 monitoring:9090 可分别允许，规则彼此取并集。', tag: '允许', tone: 'green' },
          { title: 'Egress 与 DNS', detail: '出口收紧后必须显式考虑 DNS，否则名称解析先失败。', tag: '易遗漏', tone: 'orange' },
          { title: 'CNI 执行', detail: '插件不支持策略时，声明再严格也不会形成实际隔离。', tag: '前提', tone: 'blue' },
        ],
        footnote: '策略只处理网络可达性；数据库认证、TLS 和审计仍是独立控制层。',
      },
      commands: [
        {
          title: '模拟入口隔离、标签组合与允许并集',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8")

# 固定命名空间标签与 Pod 标签；策略结构模拟 NetworkPolicy 的选择与 allow。
namespaces = {
    "backend": {"team": "backend"},
    "monitoring": {"team": "monitoring"},
    "untrusted": {"team": "other"},
}
pods = {
    "client": {"ns": "backend", "app": "database-client", "port": 5432},
    "metrics": {"ns": "monitoring", "app": "metrics", "port": 9090},
    "stranger": {"ns": "untrusted", "app": "database-client", "port": 5432},
}
policies = []

def is_selected(target):
    # 模拟目标 Pod 是否被某条 Ingress 策略选中。
    return any(policy["target"] == "database" for policy in policies)

def rule_matches(rule, pod):
    # 同一 allow 项中的命名空间与 Pod 选择器必须同时匹配。
    return (
        namespaces[pod["ns"]].get("team") == rule["ns_team"]
        and pod["app"] == rule["pod_app"]
        and pod["port"] == rule["port"]
    )

def evaluate(name):
    pod = pods[name]
    isolated = is_selected("database")
    matched = [rule for policy in policies for rule in policy["allow"] if rule_matches(rule, pod)]
    decision = "deny" if isolated and not matched else "allow"
    print(f"来源={name} ns={pod['ns']} app={pod['app']} port={pod['port']} isolated={isolated} allow命中={len(matched)} 结果={decision}")

print("阶段=无策略")
for name in pods:
    evaluate(name)

policies.append({
    "target": "database",
    "allow": [{"ns_team": "backend", "pod_app": "database-client", "port": 5432}],
})
print("阶段=选择database并添加backend白名单")
for name in pods:
    evaluate(name)

policies.append({
    "target": "database",
    "allow": [{"ns_team": "monitoring", "pod_app": "metrics", "port": 9090}],
})
print("阶段=追加monitoring白名单取并集")
for name in pods:
    evaluate(name)
PY`,
          output: `阶段=无策略
来源=client ns=backend app=database-client port=5432 isolated=False allow命中=0 结果=allow
来源=metrics ns=monitoring app=metrics port=9090 isolated=False allow命中=0 结果=allow
来源=stranger ns=untrusted app=database-client port=5432 isolated=False allow命中=0 结果=allow
阶段=选择database并添加backend白名单
来源=client ns=backend app=database-client port=5432 isolated=True allow命中=1 结果=allow
来源=metrics ns=monitoring app=metrics port=9090 isolated=True allow命中=0 结果=deny
来源=stranger ns=untrusted app=database-client port=5432 isolated=True allow命中=0 结果=deny
阶段=追加monitoring白名单取并集
来源=client ns=backend app=database-client port=5432 isolated=True allow命中=1 结果=allow
来源=metrics ns=monitoring app=metrics port=9090 isolated=True allow命中=1 结果=allow
来源=stranger ns=untrusted app=database-client port=5432 isolated=True allow命中=0 结果=deny
`,
          note: '真实 NetworkPolicy 的 ipBlock、多端口、流量方向和实现细节更丰富；这里只固定展示最重要的默认允许与并集语义。',
        },
        {
          title: '模拟出口 DNS 遗漏与 CNI 不支持策略',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8")

# 出口 allow 列表固定；DNS 与备份服务是两个不同目的地。
egress_allows = [
    {"to": "backup-svc", "port": 443},
]

def egress_decision(destination, port, include_dns):
    for rule in egress_allows:
        if rule["to"] == destination and rule["port"] == port:
            return "allow"
    if include_dns and destination == "kube-dns" and port == 53:
        return "allow"
    return "deny"

print("阶段=限制出口但遗漏DNS")
print(f"解析 backup.default.svc destination=kube-dns port=53 结果={egress_decision('kube-dns', 53, False)}")
print("结果解释=域名解析先失败 即使IP直连规则正确也无法通过名称访问")

print("阶段=补充DNS放行")
print(f"解析 backup.default.svc destination=kube-dns port=53 结果={egress_decision('kube-dns', 53, True)}")
print(f"连接 backup-svc port=443 结果={egress_decision('backup-svc', 443, True)}")
print(f"连接 unknown-svc port=443 结果={egress_decision('unknown-svc', 443, True)}")

# CNI 不执行策略时，API 中存在声明也不会改变实际可达性。
declared_isolation = True
cni_enforces = False
observed_deny = declared_isolation and cni_enforces
print(f"声明隔离={declared_isolation} CNI执行={cni_enforces} 实际拒绝={observed_deny}")
print("结论=对象创建成功不等于隔离生效 必须执行正反向连通性测试")
PY`,
          output: `阶段=限制出口但遗漏DNS
解析 backup.default.svc destination=kube-dns port=53 结果=deny
结果解释=域名解析先失败 即使IP直连规则正确也无法通过名称访问
阶段=补充DNS放行
解析 backup.default.svc destination=kube-dns port=53 结果=allow
连接 backup-svc port=443 结果=allow
连接 unknown-svc port=443 结果=deny
声明隔离=True CNI执行=False 实际拒绝=False
结论=对象创建成功不等于隔离生效 必须执行正反向连通性测试
`,
          note: '真实集群还要确认 DNS 使用 UDP 还是 TCP、kube-system 标签、节点本地 DNS 缓存以及 CNI 的策略实现方式。',
        },
      ],
      checkpoints: [
        '知道没有 NetworkPolicy 选中 Pod 时默认通常允许',
        '能解释策略是允许规则的并集，不能用一条 deny 覆盖另一条 allow',
        '知道 ingress 与 egress 是独立方向，不能互相代替',
        '能识别 namespaceSelector 与 podSelector 在同一规则项中的 AND 关系',
        '看到出口限制后会主动检查 DNS 53 端口',
        '知道 CNI 不支持时对象存在也不会产生隔离',
      ],
      safety: '生产网络策略变更应先以观察模式或测试命名空间验证，再逐步扩大范围；不要直接对关键数据库同时收紧入口和出口。教学命令不发送任何真实连接。',
    },
    boundaries: {
      blocks: ['限制数据库仅对指定后端开放', '按团队或命名空间隔离东西向流量', '约束 Pod 的外联目的地和端口', '缩小被攻陷工作负载的横向移动面'],
      notBlocks: ['CNI 未实现 NetworkPolicy', '请求级身份认证与授权', 'TLS 加密与密钥管理', 'Pod 标签被高权限者篡改', '节点网络或宿主机流量', '外部 DDoS 与入口层攻击'],
    },
  },
  /**
   * 模块四把配置注入的“启动时快照”和“卷投影更新”分开。
   * Secret 提供访问控制与编码，不自动提供静态加密；任何能读取对象或卷的进程都可能看到明文。
   */
  {
    id: 'config-secrets',
    title: 'ConfigMap、Secret 与配置注入',
    english: 'CONFIGMAP / SECRET / INJECTION',
    summary: 'ConfigMap 保存非敏感配置，Secret 保存需要限制访问的敏感数据；Pod 可通过环境变量、卷或 envFrom 消费它们。环境变量通常在容器启动时固定，卷投影会随对象更新，而 Secret 的 base64 编码只是可逆表示，不是加密保险箱。',
    icon: 'lock',
    track: 'kubernetes',
    group: '配置与存储',
    dependencies: ['api-objects', 'namespaces-rbac'],
    dependents: [],
    philosophy: {
      problem: '同一镜像需要在不同环境使用不同地址、功能开关和凭据。把配置写进镜像会降低复用性，把 Secret 提交进代码仓库又会扩大泄露面；因此需要独立对象、注入方式和访问控制。',
      rejects: 'ConfigMap 不是代码发布系统，Secret 也不等于“加密后的保险箱”。把 Secret 作为环境变量会暴露在进程环境和可能的日志中；把 base64 字符串当作密文更危险，因为任何人都能解码。API Server 未配置静态加密时，etcd 中的数据可能以可读 base64 形式保存。',
      counter: '配置管理包含四条边界：对象存储、谁能读取、以什么方式进入容器、更新何时被应用。环境变量是启动快照，卷文件是持续投影，滚动重启可让新 Pod 读取新版本；加密、RBAC、外部密钥系统和审计则分别保护不同环节。',
    },
    design: {
      abstractions: [
        { name: 'ConfigMap', role: '保存键值和文件形式的非敏感配置，可被同一命名空间中有权限的 Pod 引用。' },
        { name: 'Secret', role: '保存凭据、令牌等敏感数据，默认在 API 中以 base64 编码，安全依赖 RBAC、加密和运维流程。' },
        { name: '环境变量注入', role: '在容器启动时把 value 或 valueFrom 解析为进程环境；之后对象更新不会自动改写运行中的环境。' },
        { name: '卷投影', role: '把 ConfigMap 或 Secret 的键挂载为文件，投影器持续更新文件，但应用通常需要重新读取或收到信号。' },
        { name: 'envFrom', role: '把对象中的键批量导入环境变量；键名冲突、非法名称和 optional 语义需要提前设计。' },
        { name: '不可变对象 / 版本引用', role: '通过禁止修改或给配置加版本后缀，降低热更新带来的不确定状态并支持回滚。' },
      ],
      principles: [
        '敏感度先于存储位置：ConfigMap 不应放密码；Secret 也不应被所有服务账号无差别读取，最小权限仍需 RBAC。',
        'base64 不是加密：编码只解决二进制文本传输问题，拿到 Secret 对象或编码值的人可以立即还原明文。',
        '注入方式决定更新语义：env/valueFrom 是启动快照，卷投影会更新文件；两者不能混为一谈。',
        '更新文件不等于应用重载：应用可能缓存配置，需要通过重新读取、SIGHUP、滚动重启或版本化配置显式切换。',
        '密钥旋转是全链路动作：创建新版本、更新引用、让工作负载重新读取、验证、撤销旧值并清理日志，任何一步缺失都可能留下窗口。',
        '避免泄露到日志和镜像：不要把 Secret 打印到启动日志、命令行、诊断页面或镜像层中，并启用必要的审计与访问控制。',
      ],
      history: [
        { when: 'Kubernetes 早期', what: 'ConfigMap 与 Secret 成为配置和凭据对象', why: '把环境差异从镜像中移出，让同一工作负载可复用于多个环境。' },
        { when: '持续演进', what: '卷投影、不可变对象与投射卷能力逐步完善', why: '改善大量键注入、配置更新和生命周期管理，但仍不自动解决应用重载。' },
        { when: '持续演进', what: 'etcd 静态加密、外部密钥系统与密钥轮换实践普及', why: '弥补 Secret 默认编码不是加密的问题，把保管责任延伸到控制平面和运维流程。' },
      ],
    },
    capabilities: [
      { name: '环境配置解耦', sentence: '把数据库地址、功能开关等非敏感设置从镜像中分离，按命名空间覆盖。' },
      { name: '凭据注入', sentence: '通过 Secret 引用向 Pod 提供令牌、密码或 TLS 材料，而不是写死在代码中。' },
      { name: '批量环境变量', sentence: '用 envFrom 把对象键映射为环境变量，减少重复声明。' },
      { name: '文件式配置', sentence: '通过卷把配置投影为文件，便于应用读取并在对象更新时看到新内容。' },
      { name: '版本化与回滚', sentence: '用配置版本、checksum 或不可变对象把配置变更与工作负载重启关联起来。' },
    ],
    path: {
      intent: '让 order Pod 从 app-config 读取日志级别和超时，从 db-credentials 读取数据库密码，并观察环境变量与卷投影在配置更新时的不同行为。',
      environment: '教学模拟：ConfigMap、Secret 和 Pod 环境均为内存字典；Secret 只用标准库 base64 展示可逆编码，不连接 API Server、etcd 或密钥服务。',
      steps: [
        { title: '拆分非敏感配置与凭据', description: '把 LOG_LEVEL=info、REQUEST_TIMEOUT_MS=3000 放入 ConfigMap，把 db-password 放入 Secret。对象仍留在同一命名空间时，读取权限需要按服务账号或工作负载设计。', terms: [{ name: 'ConfigMap', definition: '存放非敏感配置的 Kubernetes 对象，可通过 env、envFrom 或卷注入。' }, { name: 'Secret', definition: '存放敏感数据的对象；类型和用途不会自动改变其底层保护要求。' }], state: 'app-config v1；db-credentials v1；两者同命名空间。' },
        { title: '声明启动时环境变量', description: 'Pod 用 valueFrom.configMapKeyRef 和 secretKeyRef 读取 LOG_LEVEL 与 db-password。kubelet 在启动容器时解析引用，之后运行中的进程不会因对象更新自动获得新环境变量。', terms: [{ name: 'valueFrom', definition: '环境变量不直接写字面值，而是引用 ConfigMap、Secret 或 downward API 的字段。' }, { name: '启动快照', definition: '容器启动时固定下来的环境值；对象后续变化不会反向修改该进程环境。' }], state: '启动时 env LOG_LEVEL=info；容器运行中 env 保持不变。' },
        { title: '按权限读取 Secret', description: '只有被授权的服务账号才能读取 Secret。Pod 能使用引用不代表应该允许它读取整个命名空间的所有 Secret；RBAC 与引用范围都要尽量缩小。', terms: [{ name: 'RBAC', definition: '基于角色和绑定控制谁可以对哪些 Kubernetes 资源执行哪些操作。' }, { name: '最小权限', definition: '只授予完成工作所必需的资源、键和操作，避免默认读取全部凭据。' }], state: 'service-account=order；允许读取指定 Secret；其他 Secret=拒绝。' },
        { title: '用卷投影支持文件读取', description: '若应用更适合读取 /etc/app/app.conf，可把 ConfigMap 投射为卷。对象更新后，投影器会替换文件内容；但应用是否重新读取取决于自身实现。', terms: [{ name: '投射卷', definition: '由 Kubernetes 把 Secret、ConfigMap、 downward API 等来源组合挂载的卷。' }, { name: '原子替换', definition: '投影器通过更新底层文件和符号链接尽量避免应用读到半写文件，但不保证应用自动重载。' }], state: '挂载文件存在；ConfigMap v2 更新后文件内容变化；应用缓存可能仍旧。' },
        { title: '把版本变化触发滚动重启', description: '常见做法是给配置生成版本后缀或 checksum，并写入 Pod 模板，使配置变化引发新 Pod 创建。新容器启动时读取新值，旧 Pod 按发布策略退出。', terms: [{ name: 'checksum', definition: '根据配置内容计算的摘要；放入 Pod 模板后可把内容变化转成模板变化。' }, { name: '滚动重启', definition: '通过工作负载控制器逐步替换 Pod，使新容器读取新配置。' }], state: 'config version=v2；pod-template 变化；新容器 env=debug。' },
        { title: '轮换并撤销旧凭据', description: '创建新 Secret 版本、更新引用、重启或重载、验证连接，再撤销旧凭据。只更新对象而忽略运行中环境变量，会让新旧值不一致；过早撤销旧值又可能中断尚未更新的实例。', terms: [{ name: '密钥轮换', definition: '以受控流程替换凭据，并确保所有使用者在新旧值重叠窗口内完成迁移。' }, { name: '撤销', definition: '让旧凭据失效，是轮换的最终步骤，不能只依赖删除 Kubernetes 对象。' }], state: 'v1→v2；所有实例已重载；旧凭据在数据库侧失效。' },
        { title: '补充静态加密与审计', description: '在控制平面启用 etcd 静态加密，按需使用 KMS 或外部密钥系统，并审计 Secret 读取。这些措施保护不同位置，不能靠 Secret 类型或 base64 自动实现。', terms: [{ name: '静态加密', definition: '对存储在 etcd 等后端的数据进行加密，降低备份或磁盘泄露风险。' }, { name: '审计日志', definition: '记录谁在何时读取或修改资源，用于发现异常访问和满足合规要求。' }], state: 'API 对象受 RBAC 保护；etcd 加密启用；敏感值不进入日志。' },
      ],
      stateTable: {
        columns: ['事件', 'ConfigMap / Secret', '环境变量', '卷文件', '应用结果 / 异常分支'],
        rows: [
          ['首次启动', 'v1 存在', '解析为 info / 旧密码', '投影 v1', '应用读取启动配置'],
          ['对象更新为 v2', 'resourceVersion 增加', '运行中容器不自动变化', '投影器异步更新文件', '热重载与否取决于应用'],
          ['滚动重启', 'Pod 模板触发替换', '新容器读取 v2', '新 Pod 挂载 v2', '完成版本切换'],
          ['缺少非 optional 引用', '键不存在', '容器启动失败', '挂载失败或事件报错', 'Pod 无法进入 Ready'],
          ['缺少 optional 引用', '键不存在', '可省略该变量', '可省略该文件', '应用需处理配置缺失'],
          ['Secret 仅 base64', '编码值可逆', '进程得到明文', '文件得到明文', '必须依赖权限、加密与流程'],
        ],
      },
      summary: 'ConfigMap 和 Secret 解决配置与镜像解耦，不自动解决更新、重载和保密；环境变量是启动快照，卷是持续投影，base64 只是编码，真正的安全来自权限、加密、审计与密钥生命周期管理。',
    },
    costs: [
      { choice: '环境变量注入', cost: '应用读取简单、启动时确定，但更新需要重启，且容易通过进程环境或调试输出泄露。', misread: '修改 Secret 后运行中的环境变量会立即改变。' },
      { choice: '卷投影', cost: '文件可随对象更新，却增加挂载、符号链接和应用重载语义，应用可能继续使用缓存。', misread: '卷文件更新等于应用配置自动生效。' },
      { choice: 'Secret 对象', cost: '便于 RBAC 与注入，但默认 base64 不是加密，etcd、备份、日志和权限都需要额外保护。', misread: 'Secret 类型会自动把值加密成保险箱。' },
      { choice: '不可变版本配置', cost: '状态可预测、回滚容易，却会增加对象数量和发布时更新模板的工作。', misread: '不可变对象能阻止所有错误配置进入集群。' },
    ],
    example: {
      title: '观察环境快照、卷更新与 Secret 可逆编码',
      intent: '固定 ConfigMap 和 Secret 的 v1、v2 两个版本。先启动 Pod，再更新对象，对比环境变量与卷文件；最后用 base64 解码演示 Secret 的编码值不等于密文。',
      diagram: {
        kind: 'flow',
        title: '配置从对象进入容器的两条路径',
        caption: '环境变量在容器启动时解析一次；卷投影持续更新文件。两条路径都产生明文，应用重载和密钥保护是独立步骤。',
        items: [
          { title: '配置对象', detail: 'ConfigMap 放非敏感设置，Secret 放需要限制访问的凭据。', tag: 'API 对象', tone: 'blue' },
          { title: '环境变量快照', detail: '启动时解析 valueFrom；对象更新不会改写运行中环境。', tag: '需重启', tone: 'orange' },
          { title: '卷文件投影', detail: '挂载文件随对象更新，但应用可能仍缓存旧内容。', tag: '需重载', tone: 'orange' },
          { title: '版本化发布', detail: 'checksum 或版本后缀触发 Pod 模板变化，让新容器读取新值。', tag: '可控切换', tone: 'green' },
          { title: '安全边界', detail: 'base64 可逆；RBAC、etcd 加密、审计和撤销共同保护 Secret。', tag: '保密责任', tone: 'muted' },
        ],
        footnote: '教学脚本不读取真实 Secret，也不把任何真实凭据写入输出。',
      },
      commands: [
        {
          title: '对比环境变量快照与 ConfigMap 卷更新',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8")

# 固定配置对象和容器启动时的解析结果，模拟两条注入路径。
config_map = {"LOG_LEVEL": "info", "REQUEST_TIMEOUT_MS": "3000"}
environment = {"LOG_LEVEL": config_map["LOG_LEVEL"]}
volume_file = f"LOG_LEVEL={config_map['LOG_LEVEL']}"
app_cached_level = config_map["LOG_LEVEL"]

print(f"启动 env LOG_LEVEL={environment['LOG_LEVEL']}")
print(f"启动 volume {volume_file}")
print(f"启动 app缓存={app_cached_level}")

# 更新对象：环境仍是旧值；投影文件变化；没有重载时应用缓存不变。
config_map["LOG_LEVEL"] = "debug"
volume_file = f"LOG_LEVEL={config_map['LOG_LEVEL']}"
print(f"更新后对象 LOG_LEVEL={config_map['LOG_LEVEL']}")
print(f"更新后 env LOG_LEVEL={environment['LOG_LEVEL']} 原因=启动快照")
print(f"更新后 volume {volume_file} 原因=投影更新")
print(f"更新后 app缓存={app_cached_level} 原因=应用未重载")

# 用新容器模拟滚动重启，新进程重新读取对象。
new_environment = {"LOG_LEVEL": config_map["LOG_LEVEL"]}
new_cache = new_environment["LOG_LEVEL"]
print(f"新容器启动 env LOG_LEVEL={new_environment['LOG_LEVEL']} app缓存={new_cache}")
print("结论=对象更新 卷文件更新 应用重载 是三个独立事件")
PY`,
          output: `启动 env LOG_LEVEL=info
启动 volume LOG_LEVEL=info
启动 app缓存=info
更新后对象 LOG_LEVEL=debug
更新后 env LOG_LEVEL=info 原因=启动快照
更新后 volume LOG_LEVEL=debug 原因=投影更新
更新后 app缓存=info 原因=应用未重载
新容器启动 env LOG_LEVEL=debug app缓存=debug
结论=对象更新 卷文件更新 应用重载 是三个独立事件
`,
          note: '真实投影更新是异步的，应用还可能通过 inotify、SIGHUP 或自身配置中心重载；本例只展示 Kubernetes 不自动修改运行中环境变量。',
        },
        {
          title: '演示 Secret base64、optional 与轮换状态',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
import base64
sys.stdout.reconfigure(encoding="utf-8")

# Secret 的教学值完全虚构；base64 只做可逆编码，不提供加密。
secret_data = {"db-password": "demo-pass-v1"}
encoded = base64.b64encode(secret_data["db-password"].encode("utf-8")).decode("ascii")
decoded = base64.b64decode(encoded).decode("utf-8")
print(f"Secret键=db-password base64={encoded}")
print(f"任意解码结果={decoded} 结论=base64不是加密")

# optional 决定引用缺失时是否允许容器启动。
def inject(key_ref, optional, objects):
    if key_ref not in objects:
        return "省略" if optional else "启动失败"
    return objects[key_ref]

print(f"缺少必填键 optional=False 结果={inject('missing', False, secret_data)}")
print(f"缺少可选键 optional=True 结果={inject('missing', True, secret_data)}")

# 轮换时先让所有实例读取 v2，再撤销 v1；这里只展示确定性的状态顺序。
active_versions = {"v1"}
print(f"轮换开始 active={sorted(active_versions)} env快照=演示值v1")
active_versions.add("v2")
print(f"发布新引用 active={sorted(active_versions)} 新容器env=演示值v2 旧容器env=演示值v1")
active_versions.remove("v1")
print(f"全部实例重载后撤销旧值 active={sorted(active_versions)} 状态=轮换完成")
PY`,
          output: `Secret键=db-password base64=ZGVtby1wYXNzLXYx
任意解码结果=demo-pass-v1 结论=base64不是加密
缺少必填键 optional=False 结果=启动失败
缺少可选键 optional=True 结果=省略
轮换开始 active=['v1'] env快照=演示值v1
发布新引用 active=['v1', 'v2'] 新容器env=演示值v2 旧容器env=演示值v1
全部实例重载后撤销旧值 active=['v2'] 状态=轮换完成
`,
          note: 'ZGVtby1wYXNzLXYx 是虚构值的 base64。真实 Secret 还需要 RBAC、静态加密、审计、备份保护和数据库侧撤销，不能只删除 Kubernetes 对象。',
        },
      ],
      checkpoints: [
        '能说明 ConfigMap 与 Secret 的敏感度边界',
        '看到 Secret 的 base64 值时知道它可逆，不是加密',
        '能区分环境变量启动快照与卷投影持续更新',
        '知道卷文件更新后应用仍可能需要重载',
        '理解 optional 引用缺失时的两种结果',
        '能列出密钥轮换中发布、重载、验证和撤销的顺序',
      ],
      safety: '不要在终端历史、日志、错误页面或版本控制中记录真实 Secret 值；生产读取应使用最小权限并开启审计。教学命令只处理虚构字符串。',
    },
    boundaries: {
      blocks: ['同一镜像在不同环境使用不同配置', '把非敏感配置从镜像中解耦', '按权限向工作负载注入凭据', '通过卷投影提供可更新配置文件'],
      notBlocks: ['base64 充当加密', '应用自动重载所有配置', 'Secret 防止有权限者读取明文', '数据库侧凭据自动撤销', 'GitOps 仓库中的密钥安全管理', '防止应用把敏感值打印到日志'],
    },
  },
  /**
   * 模块五把“Pod 内临时盘”和“跨 Pod 生命周期的持久数据”分开。
   * PVC 不是磁盘本身，CSI 也不是应用文件系统；attach、stage、publish 与 reclaim
   * 分属不同控制器和节点，任何一步失败都可能让 Pod 停在 ContainerCreating。
   */
  {
    id: 'storage-csi',
    title: '持久卷、PVC 与 CSI',
    english: 'PV / PVC / CSI',
    summary: 'PV 表示集群中的存储资源，PVC 表达工作负载对容量、访问模式和存储类别的请求，StorageClass 与供应器决定如何创建底层卷；CSI 把存储驱动标准化为控制器和节点插件，通过 attach、stage、publish 等步骤把卷接到节点并挂载进容器。emptyDir 随 Pod 生命周期存在，PVC 则可跨 Pod 重建保留数据。',
    icon: 'database',
    track: 'kubernetes',
    group: '配置与存储',
    dependencies: ['pod-controllers', 'namespaces-rbac'],
    dependents: [],
    philosophy: {
      problem: '容器可写层适合临时文件，却会随容器删除而消失；数据库、上传文件和消息状态通常需要在 Pod 重建后继续存在。工作负载又不应知道底层是云盘、NFS 还是分布式存储，因此需要“申请存储”和“实现存储”之间的抽象。',
      rejects: 'PVC 不是一块已经挂好的磁盘，也不是应用数据本身；创建 PVC 不代表 Pod 已经能写。CSI 是插件接口，不负责自动保证应用一致性。emptyDir 不会因为名字里有“存储”就拥有跨 Pod 生命周期，它通常随 Pod 删除而消失。',
      counter: '持久化是一条协调链：PVC 等待绑定，PV 记录实际资源，调度与拓扑决定可用节点，CSI 控制器 attach，节点插件 stage/publish，kubelet 再把卷挂进容器。释放 PVC 后的删除、保留或快照由 reclaimPolicy 和流程决定，不能假设“删 Pod”就会删数据。',
    },
    design: {
      abstractions: [
        { name: 'PV', role: '集群视角的持久存储资源，记录容量、访问模式、存储实现和回收策略等属性。' },
        { name: 'PVC', role: '工作负载对存储的请求，指定容量、访问模式和 StorageClass，并等待匹配 PV 或动态供应。' },
        { name: 'StorageClass', role: '描述使用哪个 provisioner、参数、绑定模式和回收策略；它决定如何创建 PV，不直接保存业务数据。' },
        { name: 'AccessMode', role: '描述卷可被单节点读写、多节点只读或多节点读写等访问语义，具体能力取决于底层存储。' },
        { name: 'CSI 控制器插件', role: '实现创建、删除、attach 等控制面操作，与存储系统通信并维护 VolumeAttachment 等状态。' },
        { name: 'CSI 节点插件', role: '在节点上实现 stage、publish、挂载和统计等操作，把远端卷变成 kubelet 可挂载的本地路径。' },
        { name: 'emptyDir', role: '由 kubelet 在 Pod 所在节点创建的临时目录，通常随 Pod 生命周期结束而删除，适合缓存和共享临时文件。' },
      ],
      principles: [
        '申请与供应分离：PVC 描述需求，PV 是实际资源；静态绑定和 StorageClass 动态供应是两种实现路径。',
        '可调度先于可挂载：节点必须能访问该卷并满足拓扑、访问模式和容量条件，否则 Pod 即使 PVC 已绑定也可能无法启动。',
        'attach 不等于挂载：控制器把远端卷连到节点，节点插件还要 stage 和 publish，kubelet 最后挂进容器；每步都有独立失败状态。',
        '生命周期分层：Pod 删除不必然删除 PVC，PVC 删除也不必然立即删除底层数据，reclaimPolicy 决定保留或回收。',
        '应用一致性独立于存储挂载：文件已 fsync 不代表数据库事务已提交，备份、快照和应用刷盘需要共同设计。',
        'emptyDir 与 PVC 不互换：临时缓存可接受随 Pod 消失，长期状态则需要显式 PVC、备份、恢复和容量规划。',
      ],
      history: [
        { when: 'Kubernetes 1.2 前后', what: 'PV 与 PVC 抽象引入', why: '把管理员供应的存储与开发者的使用申请分离，避免 Pod 直接绑定某种存储实现。' },
        { when: 'Kubernetes 1.4 前后', what: 'StorageClass 与动态供应成熟', why: '让 PVC 按类别自动创建 PV，减少管理员逐卷预配工作。' },
        { when: '2018 起', what: 'CSI 在 Kubernetes 中正式可用并扩展', why: '把存储驱动移出核心树，以统一控制器和节点插件接口对接云盘、块存储和文件存储。' },
      ],
    },
    capabilities: [
      { name: '持久数据声明', sentence: '用 PVC 按容量、访问模式和类别申请存储，而不在 Pod 中硬编码底层卷路径。' },
      { name: '动态供应', sentence: '由 StorageClass 和 provisioner 自动创建 PV，减少手工预分配。' },
      { name: '跨 Pod 重建', sentence: '让新 Pod 重新绑定同一持久卷，在旧 Pod 删除后继续访问业务数据。' },
      { name: '标准化存储插件', sentence: '通过 CSI 控制器和节点插件对接不同后端，避免为每种存储修改 Kubernetes 核心。' },
      { name: '回收与备份策略', sentence: '用 reclaimPolicy、快照和备份流程决定数据保留、删除与恢复边界。' },
    ],
    path: {
      intent: '为 database Pod 申请 10Gi 的 RWO 块存储，并观察 PVC 从 Pending 到 Bound，再到 CSI attach、stage、publish 和容器挂载的全过程。',
      environment: '教学模拟：PVC、PV、VolumeAttachment 和节点路径都是固定字典；状态转换由事件驱动，不创建真实磁盘或执行 mount。',
      steps: [
        { title: '创建 PVC 表达需求', description: 'PVC 申请 storageClassName=fast-rwo、10Gi 和 ReadWriteOnce。此时它只是请求，可能因没有供应器、拓扑不匹配或容量不足而保持 Pending。', terms: [{ name: 'PVC', definition: 'PersistentVolumeClaim，工作负载对持久存储的请求对象。' }, { name: 'Pending', definition: 'PVC 尚未找到或创建可绑定 PV 的状态，不表示数据卷已可使用。' }], state: 'PVC=database-data；status=Pending；requested=10Gi；mode=RWO。' },
        { title: 'StorageClass 动态供应 PV', description: '外部供应器根据 StorageClass 调用后端创建 10Gi 卷，再创建 PV 并绑定 PVC。PVC 与 PV 进入 Bound 后，调度器才可以把节点拓扑作为可用性条件。', terms: [{ name: 'StorageClass', definition: '定义 provisioner、参数、绑定模式和回收策略的存储类别对象。' }, { name: '动态供应', definition: '由供应器根据 PVC 自动创建 PV 和底层存储资源的过程。' }], state: 'PV=pvc-demo；PVC=Bound；zone=zone-a。' },
        { title: '调度器选择可访问节点', description: 'Pod 被调度到 zone-a 的节点。若卷受拓扑限制或另一个节点已以不兼容方式使用，调度会失败或 Pod 无法挂载；RWO 不等于应用层锁。', terms: [{ name: '拓扑', definition: '存储与节点所在的区域或机架等位置关系，影响卷是否可被节点访问。' }, { name: 'ReadWriteOnce', definition: '通常表示卷可由单个节点读写，不保证数据库能够被多个实例安全并发写入。' }], state: 'Pod→node-a；zone 匹配；尚未 attach。' },
        { title: 'CSI 控制器执行 attach', description: '控制器调用 CSI ControllerPublishVolume，让存储后端把卷连接到 node-a，并维护 VolumeAttachment。attach 成功只表示节点拥有设备，不表示文件系统已经挂载到容器路径。', terms: [{ name: 'VolumeAttachment', definition: '记录卷被连接到哪个节点的 Kubernetes 对象。' }, { name: 'ControllerPublishVolume', definition: 'CSI 控制面操作，通常对应把块设备或网络存储连接到目标节点。' }], state: 'attached=True；VolumeAttachment=Attached；容器尚未挂载。' },
        { title: '节点插件 stage 与 publish', description: '节点插件可按实现调用 NodeStageVolume 准备设备或文件系统，再调用 NodePublishVolume 把卷发布到节点上的目标路径。失败时常表现为 Pod 卡在 ContainerCreating。', terms: [{ name: 'NodeStageVolume', definition: '在节点上准备和暂存卷，例如检查设备、格式化或挂载到暂存目录。' }, { name: 'NodePublishVolume', definition: '把已准备的卷发布到 kubelet 请求的目标路径，使其可用于容器挂载。' }], state: 'staged=True；published=True；nodePath=/var/lib/kubelet/pods/demo/volumes/pvc-data。' },
        { title: 'kubelet 挂载并启动应用', description: 'kubelet 把发布路径绑定或挂载进容器，应用才能读写 /var/lib/database。挂载成功仍不保证应用初始化、权限、容量和备份正确。', terms: [{ name: '容器挂载点', definition: '卷在容器文件系统中出现的路径，例如 /var/lib/database。' }, { name: '写权限', definition: '容器进程对挂载目录的访问能力，可能受 fsGroup、所有权和后端 ACL 影响。' }], state: '容器 mount=/var/lib/database；应用可写；Pod=Running。' },
        { title: '释放 PVC 与选择回收', description: 'Pod 删除后 PVC 通常仍存在，新 Pod 可重新绑定。删除 PVC 后，Retain 保留 PV 与数据，Delete 则请求后端回收；误删和备份缺失可能造成不可恢复损失。', terms: [{ name: 'reclaimPolicy', definition: 'PV 的回收策略，常见 Retain 或 Delete，决定 PVC 释放后底层资源如何处理。' }, { name: 'Retain', definition: '释放绑定但保留 PV 和底层数据，需要人工或额外流程重新绑定与清理。' }], state: 'Pod 删除→PVC 仍在；PVC 删除→Retain 时 PV=Released。' },
      ],
      stateTable: {
        columns: ['阶段 / 异常', 'PVC / PV', 'CSI 控制器', 'CSI 节点 / kubelet', '结果 / 排查方向'],
        rows: [
          ['正常绑定', 'Pending→Bound', 'provisioner 创建 PV', '尚无挂载动作', '可进入调度与 attach'],
          ['无供应器或容量不足', '保持 Pending', '未创建或无法创建卷', '不执行节点操作', '检查 StorageClass、权限、配额与拓扑'],
          ['attach 失败', 'PVC 已 Bound', 'VolumeAttachment 未成功', '节点无可用设备', '检查 CSI 控制器、云盘挂载上限与节点身份'],
          ['stage / publish 失败', 'PVC 已 Bound', 'attach 可能成功', '目标路径未发布', '检查节点插件、设备、文件系统与挂载参数'],
          ['正常容器启动', 'PVC Bound', 'attached', 'published 后挂入容器', '应用可写，但仍需权限与备份验证'],
          ['PVC 删除且 Retain', 'PVC 删除；PV Released', '通常不自动删除底层卷', 'Pod 已卸载', '数据保留，重新使用需显式流程'],
        ],
      },
      summary: '持久存储是 PVC 申请、PV 绑定、调度拓扑、CSI attach、节点 stage/publish 和 kubelet 挂载共同完成的协调过程；每一步都有独立异常，Pod、PVC 和底层数据的生命周期不能混为一谈。',
    },
    costs: [
      { choice: 'PVC 动态供应', cost: '开发者按需申请、管理员减少预配，但供应失败、配额、拓扑和 StorageClass 变更会更隐蔽。', misread: '创建 PVC 后 Pod 就一定能立即写入。' },
      { choice: 'RWO 单节点读写', cost: '简化许多数据库和块存储部署，却限制故障迁移和扩容方式，也不提供应用级并发锁。', misread: 'RWO 自动保证同一数据库只有一个写实例。' },
      { choice: 'CSI 插件抽象', cost: '统一接口并解耦核心代码，却增加控制器、节点插件、attach 和多阶段排障复杂度。', misread: 'CSI 插件能自动修复应用数据不一致。' },
      { choice: 'Delete 回收策略', cost: '自动清理闲置资源，却可能在误删 PVC 时连同底层数据一起删除。', misread: '删除 PVC 一定只是解绑，不会影响数据。' },
    ],
    example: {
      title: '模拟 PVC 绑定、CSI attach/publish 与 emptyDir 生命周期',
      intent: '先按固定事件推进 database PVC 的状态机，展示 Bound 与容器可写之间还要经过哪些步骤；再对比 emptyDir 和 PVC 在 Pod 删除、重建时的数据命运。',
      diagram: {
        kind: 'flow',
        title: '从存储申请到容器路径',
        caption: '控制面完成供应和绑定，CSI 控制器负责 attach，节点插件负责 stage/publish，kubelet 最后把卷挂入容器。',
        items: [
          { title: 'PVC 申请', detail: '请求容量、访问模式和 StorageClass，初始可能 Pending。', tag: '需求', tone: 'blue' },
          { title: 'PV 绑定', detail: '供应器创建底层资源，PVC 与 PV 进入 Bound。', tag: '控制面', tone: 'green' },
          { title: 'CSI attach', detail: 'ControllerPublishVolume 把卷连接到选中节点。', tag: '节点设备', tone: 'orange' },
          { title: 'stage / publish', detail: '节点插件准备文件系统并发布到 kubelet 指定路径。', tag: '节点挂载', tone: 'orange' },
          { title: 'kubelet 挂载', detail: '卷进入容器 /var/lib/database，应用才能读写。', tag: '可写证据', tone: 'green' },
        ],
        footnote: 'Block CSI 与文件 CSI 的 stage 行为可能不同；节点插件能力由 CSI 规范中的能力声明和实现共同决定。',
      },
      commands: [
        {
          title: '模拟 PVC 到 CSI attach、stage、publish',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8")

# 固定状态机只打印事件，不创建磁盘、不调用 CSI，也不执行系统挂载。
state = {
    "pvc": "Pending",
    "pv": None,
    "node": None,
    "attached": False,
    "staged": False,
    "published": False,
    "container_mounted": False,
}

def show(step):
    print(
        f"步骤={step} PVC={state['pvc']} PV={state['pv'] or '无'} node={state['node'] or '未调度'} "
        f"attached={state['attached']} staged={state['staged']} published={state['published']} "
        f"container_mounted={state['container_mounted']}"
    )

show("1-创建PVC")
state["pv"] = "pv-demo-10gi"
state["pvc"] = "Bound"
show("2-动态供应并绑定")
state["node"] = "node-a"
show("3-调度到zone-a")
state["attached"] = True
show("4-ControllerPublishVolume")
state["staged"] = True
show("5-NodeStageVolume")
state["published"] = True
show("6-NodePublishVolume")
state["container_mounted"] = True
show("7-kubelet挂载")
print("应用路径=/var/lib/database 可写=True 注意=挂载成功仍需验证权限和备份")
PY`,
          output: `步骤=1-创建PVC PVC=Pending PV=无 node=未调度 attached=False staged=False published=False container_mounted=False
步骤=2-动态供应并绑定 PVC=Bound PV=pv-demo-10gi node=未调度 attached=False staged=False published=False container_mounted=False
步骤=3-调度到zone-a PVC=Bound PV=pv-demo-10gi node=node-a attached=False staged=False published=False container_mounted=False
步骤=4-ControllerPublishVolume PVC=Bound PV=pv-demo-10gi node=node-a attached=True staged=False published=False container_mounted=False
步骤=5-NodeStageVolume PVC=Bound PV=pv-demo-10gi node=node-a attached=True staged=True published=False container_mounted=False
步骤=6-NodePublishVolume PVC=Bound PV=pv-demo-10gi node=node-a attached=True staged=True published=True container_mounted=False
步骤=7-kubelet挂载 PVC=Bound PV=pv-demo-10gi node=node-a attached=True staged=True published=True container_mounted=True
应用路径=/var/lib/database 可写=True 注意=挂载成功仍需验证权限和备份
`,
          note: '不同 CSI 驱动和卷类型可能跳过或合并某些阶段；教学状态机用清晰的布尔值强调 Bound、attached、published 和 container_mounted 不是同一件事。',
        },
        {
          title: '对比 emptyDir 与 PVC 在 Pod 重建后的生命周期',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8")

# 两个卷都只保存教学字符串；用独立字典表达 Pod 临时盘与 PVC 的持久数据。
empty_dir = {"path": "pod-cache", "content": "临时缓存", "owner_pod": "pod-1"}
pvc_data = {"claim": "database-data", "content": "订单记录", "bound_pv": "pv-demo-10gi"}

print(f"Pod1 emptyDir={empty_dir['content']} PVC数据={pvc_data['content']}")
# 删除 Pod：emptyDir 随 Pod 消失，PVC 仍存在，因此数据可被新 Pod 重新绑定。
empty_dir.clear()
print(f"Pod1删除 emptyDir存在={bool(empty_dir)} PVC存在={pvc_data['claim']} PVC数据={pvc_data['content']}")

# 新 Pod 使用同一声明；它不会继承旧 Pod 的 emptyDir，却可以访问原 PVC。
new_empty_dir = {"path": "pod-cache", "content": "", "owner_pod": "pod-2"}
print(f"Pod2 emptyDir={new_empty_dir['content'] or '空'} PVC数据={pvc_data['content']}")

# 删除 PVC 后，数据命运由回收策略决定；这里展示 Retain，不自动删除。
reclaim_policy = "Retain"
pv_status = "Released" if reclaim_policy == "Retain" else "Deleted"
print(f"删除PVC reclaimPolicy={reclaim_policy} PV状态={pv_status} 底层数据={pvc_data['content']}")
print("边界=删Pod不等于删PVC 删PVC不等于所有策略都删数据")
PY`,
          output: `Pod1 emptyDir=临时缓存 PVC数据=订单记录
Pod1删除 emptyDir存在=False PVC存在=database-data PVC数据=订单记录
Pod2 emptyDir=空 PVC数据=订单记录
删除PVC reclaimPolicy=Retain PV状态=Released 底层数据=订单记录
边界=删Pod不等于删PVC 删PVC不等于所有策略都删数据
`,
          note: 'emptyDir 还可能受节点磁盘压力、Pod 驱逐和具体介质影响；Retain 保留数据也意味着需要额外的重新绑定、成本与清理流程。',
        },
      ],
      checkpoints: [
        '能区分 PVC 的申请语义与 PV 的实际存储资源',
        '知道 PVC Bound 不等于卷已经挂进容器',
        '能按顺序说出 attach、stage、publish 和容器挂载的职责',
        '知道 RWO 是存储访问语义，不是数据库应用锁',
        '理解 emptyDir 随 Pod 消失而 PVC 可跨 Pod 重建保留',
        '知道删除 PVC 后的数据行为由 reclaimPolicy 等流程决定',
      ],
      safety: '生产存储操作可能影响数据安全，变更 StorageClass、reclaimPolicy 或删除 PVC 前必须确认备份、引用和恢复方案；不要在共享卷上直接做破坏性教学实验。教学命令不接触真实磁盘。',
    },
    boundaries: {
      blocks: ['Pod 重建后继续访问业务数据', '按容量和访问模式声明存储', '通过 StorageClass 动态供应 PV', '用 CSI 对接不同存储后端', '用 Retain 保留释放后的底层数据'],
      notBlocks: ['应用数据一致性自动保证', '数据库主从与并发写锁', 'emptyDir 跨 Pod 保留', '备份、快照和灾难恢复自动完成', 'CSI 控制器或节点插件故障自愈', '容量与 IO 性能自动满足所有工作负载'],
    },
  },
]
