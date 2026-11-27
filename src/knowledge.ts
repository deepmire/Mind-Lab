import { agentMindModules } from './knowledgeAgentMind'
import { agentKnowledgeModules } from './knowledgeAgentKnowledge'
import { agentControlModules } from './knowledgeAgentControl'
import { agentOpsModules } from './knowledgeAgentOps'
import { coreModules } from './knowledgeCore'
import { systemModules } from './knowledgeSystem'
import { kubernetesCoreModules } from './knowledgeKubernetesCore'
import { kubernetesWorkloadModules } from './knowledgeKubernetesWorkloads'
import { kubernetesNetworkModules } from './knowledgeKubernetesNetworking'
import { kubernetesOpsModules } from './knowledgeKubernetesOps'
import { ragRetrievalModules } from './knowledgeRagRetrieval'
import { ragGenerationModules } from './knowledgeRagGeneration'
import { linuxFoundationModules } from './knowledgeLinuxFoundation'
import { linuxOperationsModules } from './knowledgeLinuxOperations'
import { networkFoundationModules } from './knowledgeNetworkFoundation'
import { networkTransportModules } from './knowledgeNetworkTransport'
import { networkApplicationModules } from './knowledgeNetworkApplications'
import { networkOperationsModules } from './knowledgeNetworkOperations'
import type { KnowledgeCategory, KnowledgeModule, ModuleGroup, ModuleId, TrackId } from './knowledgeTypes'

/**
 * 所有课程的原始集合。
 * 先原样收集，再统一补全 track 和 dependents，避免每个内容文件重复维护反向依赖。
 */
const collectedModules: KnowledgeModule[] = [
  ...coreModules,
  ...systemModules,
  ...agentMindModules,
  ...agentKnowledgeModules,
  ...agentControlModules,
  ...agentOpsModules,
  ...kubernetesCoreModules,
  ...kubernetesWorkloadModules,
  ...kubernetesNetworkModules,
  ...kubernetesOpsModules,
  ...ragRetrievalModules,
  ...ragGenerationModules,
  ...linuxFoundationModules,
  ...linuxOperationsModules,
  ...networkFoundationModules,
  ...networkTransportModules,
  ...networkApplicationModules,
  ...networkOperationsModules,
]

/**
 * 规范化后的全站模块表。
 * dependents 由 dependencies 反向计算；Set 用于防止重复前置声明造成重复边。
 */
export const modules: KnowledgeModule[] = collectedModules.map((module) => ({
  ...module,
  track: module.track ?? 'docker',
  dependents: [...new Set(
    collectedModules
      .filter((candidate) => candidate.dependencies.includes(module.id))
      .map((candidate) => candidate.id),
  )],
}))

/** O(1) 模块查询表；路由、导航和深潜页都通过同一份数据渲染。 */
export const moduleMap = Object.fromEntries(modules.map((module) => [module.id, module])) as Record<ModuleId, KnowledgeModule>

/** 用于验证 hash 路由中的模块 ID 是否真实存在。 */
export const moduleIds = new Set<string>(modules.map((module) => module.id))

/** 六条技术轨道的独立集合，供首页、地图与返回导航使用。 */
export const dockerModules = modules.filter((module) => module.track === 'docker')
export const agentModules = modules.filter((module) => module.track === 'agent')
export const kubernetesModules = modules.filter((module) => module.track === 'kubernetes')
export const ragModules = modules.filter((module) => module.track === 'rag')
export const linuxModules = modules.filter((module) => module.track === 'linux')
export const networkModules = modules.filter((module) => module.track === 'network')

/** TrackId 到模块集合的完整映射；新增轨道时必须补齐，避免出现空路由。 */
export const modulesByTrack: Record<TrackId, KnowledgeModule[]> = {
  docker: dockerModules,
  agent: agentModules,
  kubernetes: kubernetesModules,
  rag: ragModules,
  linux: linuxModules,
  network: networkModules,
}

/** 每条轨道的展示分组；顺序表达学习层次，真正的先后关系仍由 dependencies 决定。 */
export const groupsByTrack: Record<TrackId, ModuleGroup[]> = {
  docker: ['构建与分发', '控制平面', '运行时', '宿主系统', '观测与协作'],
  agent: ['模型与推理', '上下文与知识', '工具与执行', '规划与协作', '治理与运维'],
  kubernetes: ['控制平面', '工作负载与调度', '网络与入口', '配置与存储', '弹性与可观测', '集群运维', '生产边界'],
  rag: ['问题与资料', '检索与排序', '生成与评估', '安全与运维'],
  linux: ['系统与内核', '进程与文件', '命令行工作', '服务与网络', '存储与排障'],
  network: ['网络基础', '链路与寻址', '路由与传输', '应用与命名', '边界与排障'],
}

/**
 * 全站知识分类与独立主题。
 * 分类解决“未来还能收纳什么”，主题解决“当前课程从哪里进入”；两者都不生成跨主题依赖。
 * 后续增加领域时扩展 KnowledgeCategoryId，并在这里登记元数据即可复用目录与首页。
 */
export const knowledgeCategories: KnowledgeCategory[] = [
  {
    id: 'infrastructure',
    title: '基础设施与运行时',
    subtitle: '理解软件如何打包、运行、连接与持续交付',
    topics: [
      { id: 'docker', category: 'infrastructure', title: 'Docker', english: '单机容器运行时', subtitle: '镜像、进程、隔离与运行时', icon: 'box' },
      { id: 'kubernetes', category: 'infrastructure', title: 'Kubernetes', english: '声明式集群控制面', subtitle: '调度、网络、发布与集群运维', icon: 'network' },
      { id: 'linux', category: 'infrastructure', title: 'Linux', english: '操作系统与内核机制', subtitle: '进程、文件、服务、网络与排障', icon: 'terminal' },
      { id: 'network', category: 'infrastructure', title: '计算机网络', english: '网络协议与数据通信', subtitle: '地址、路由、传输、应用与排障', icon: 'network' },
    ],
  },
  {
    id: 'intelligent-systems',
    title: '智能系统与工程',
    subtitle: '理解模型如何获取上下文、调用工具并可靠行动',
    topics: [
      { id: 'agent', category: 'intelligent-systems', title: 'Agent', english: '受约束的行动循环', subtitle: '上下文、工具、规划与治理', icon: 'workflow' },
      { id: 'rag', category: 'intelligent-systems', title: 'RAG', english: '检索增强生成', subtitle: '资料、检索、证据与评估', icon: 'database' },
    ],
  },
]

/** 主题元数据索引；侧边栏、首页卡片与浏览器标题都从这里读取，避免多处文案漂移。 */
export const topicMap = Object.fromEntries(knowledgeCategories.flatMap((category) => category.topics).map((topic) => [topic.id, topic])) as Record<TrackId, KnowledgeCategory['topics'][number]>

/** 根据主题反查一级分类，目录展开与当前主题高亮共用这一映射。 */
export const categoryByTopic = Object.fromEntries(knowledgeCategories.flatMap((category) => category.topics.map((topic) => [topic.id, category]))) as Record<TrackId, KnowledgeCategory>

/** 根据模块反查所属轨道，使模块页的返回按钮始终回到正确的首页。 */
export function moduleTrack(id: ModuleId): TrackId {
  return moduleMap[id].track ?? 'docker'
}

/**
 * 术语到深潜模块的索引。
 * 页面需要解释一个陌生词时，可以跳到完整机制，而不是只显示一句术语释义。
 */
export const termModules: Record<string, ModuleId> = {
  'Docker CLI': 'docker-engine',
  'Docker API': 'docker-engine',
  dockerd: 'docker-engine',
  containerd: 'oci-runtime',
  '镜像（Image）': 'image-build',
  镜像: 'image-build',
  '只读镜像层': 'image-build',
  overlayfs: 'filesystem',
  可写层: 'filesystem',
  'OCI bundle': 'oci-runtime',
  'OCI runtime spec': 'oci-runtime',
  namespace: 'namespaces',
  cgroup: 'cgroup-v2',
  runc: 'oci-runtime',
  veth: 'network',
  '网桥与 NAT': 'network',
  'PID 1': 'process-model',
  '容器端口': 'network',
  Volume: 'storage',
  'Named volume': 'storage',
  'Bind mount': 'storage',
  capability: 'security',
  Seccomp: 'security',
  Manifest: 'registry',
  Blob: 'registry',
  BuildKit: 'image-build',
  Agent: 'agent-loop',
  智能体: 'agent-loop',
  Token: 'llm-inference',
  上下文窗口: 'context-window',
  系统提示: 'prompt-contract',
  工具调用: 'tool-calling',
  MCP: 'mcp-protocol',
  RAG: 'rag-intent',
  检索增强生成: 'rag-intent',
  'Agent 中的 RAG': 'retrieval-rag',
  向量: 'rag-embeddings',
  重排: 'rag-reranking',
  Shell: 'linux-shell-essentials',
  内核: 'linux-kernel-user-space',
  系统调用: 'linux-kernel-user-space',
  文件权限: 'linux-permissions-identity',
  数据包: 'network-mental-model',
  协议: 'network-layering',
  封装: 'network-layering',
  'MAC 地址': 'network-ethernet-switching',
  子网: 'network-ipv4-subnetting',
  ARP: 'network-arp-nd',
  路由: 'network-routing',
  TCP: 'network-tcp',
  UDP: 'network-udp',
  DNS: 'network-dns',
  HTTP: 'network-http',
  TLS: 'network-tls',
  NAT: 'network-nat-firewall',
  抓包: 'network-packet-capture',
  工作流: 'workflow-state',
  多智能体: 'multi-agent',
  人在回路: 'human-control',
  提示注入: 'security-permissions',
  '声明式 API': 'api-objects',
  '控制循环': 'kubernetes-architecture',
  '期望状态': 'api-objects',
  Pod: 'pod-controllers',
  ReplicaSet: 'pod-controllers',
  调度: 'scheduling',
  '服务发现': 'service-dns',
  NetworkPolicy: 'network-policy',
  CSI: 'storage-csi',
  探针: 'probes-lifecycle',
  HPA: 'autoscaling',
}

/** 学习路径中的一个阶段；goal 说明为什么这些模块应该按此顺序出现。 */
export type LearningStage = {
  id: string
  title: string
  goal: string
  modules: ModuleId[]
}

/**
 * Docker 最佳学习路径。
 * 顺序遵循“运行时总览 → 制品文件 → 隔离机制 → 组装执行 → 多容器边界”。
 */
export const learningStages: LearningStage[] = [
  {
    id: 'overview',
    title: '建立全局模型',
    goal: '先看清 CLI、API、daemon、containerd 与 runc 的分工，知道后面每个模块位于一次容器运行中的哪一层。',
    modules: ['docker-engine'],
  },
  {
    id: 'artifacts',
    title: '制品、文件与数据',
    goal: '从 Dockerfile 到镜像层，再到 overlayfs、仓库分发与数据卷，理解“起始内容”和“需要留存的数据”为什么不同。',
    modules: ['image-build', 'filesystem', 'registry', 'storage'],
  },
  {
    id: 'isolation',
    title: '进程、隔离与安全',
    goal: '拆开容器背后的普通进程、namespace、cgroup、网络与安全边界，建立“共享内核，但视图和资源受控”的准确模型。',
    modules: ['process-model', 'namespaces', 'cgroup-v2', 'network', 'security'],
  },
  {
    id: 'runtime',
    title: '把机制组装成运行时',
    goal: '用 OCI bundle 与 create/start 状态把前面的文件、进程、namespace、cgroup 和网络知识串成完整执行路径。',
    modules: ['oci-runtime'],
  },
  {
    id: 'operations',
    title: '观测、协作与编排边界',
    goal: '先取得证据，再组合多容器应用，最后理解为什么单机 Compose 不能替代跨主机声明式协调。',
    modules: ['observability', 'compose', 'orchestration-boundary'],
  },
]

export const learningPath: ModuleId[] = learningStages.flatMap((stage) => stage.modules)

/**
 * Agent 最佳学习路径。
 * 先建立模型与运行时边界，再补知识和工具，最后进入控制、协作与生产治理。
 */
export const agentLearningStages: LearningStage[] = [
  {
    id: 'agent-model',
    title: '先认识 Agent 的完整工作过程',
    goal: '不用先懂代码。先用“用户提问 → 模型建议 → 程序执行 → 结果返回”认识 Agent，再理解模型怎样产生文字、上下文是什么，以及怎样把任务说清楚。',
    modules: ['agent-loop', 'llm-inference', 'context-window', 'prompt-contract'],
  },
  {
    id: 'agent-knowledge-tools',
    title: '让 Agent 查到资料、做成事情',
    goal: '先分清聊天记录与长期记忆，再看它怎样查资料、调用工具、连接外部能力。每一步都先讲生活场景，再讲背后的机制。',
    modules: ['context-memory', 'retrieval-rag', 'tool-calling', 'mcp-protocol'],
  },
  {
    id: 'agent-control',
    title: '让自动行动可控',
    goal: '理解 Agent 怎样拆解任务、保存进度、等待人批准，以及怎样限制权限，避免它越过边界擅自行动。',
    modules: ['planning', 'workflow-state', 'human-control', 'security-permissions'],
  },
  {
    id: 'agent-collaboration',
    title: '多个 Agent 怎样协作与验证',
    goal: '先判断什么时候真的需要多个 Agent，再用运行记录和测试判断它是否可靠，最后学习出错后怎样恢复。',
    modules: ['multi-agent', 'evaluation-observability', 'reliability-recovery'],
  },
  {
    id: 'agent-production',
    title: '把一次演示变成稳定服务',
    goal: '把前面所有机制组合成可运行的服务，理解上线后怎样监控质量、控制成本、保存记录，并在新版本出错时退回旧版本。',
    modules: ['production-ops'],
  },
]

export const agentLearningPath: ModuleId[] = agentLearningStages.flatMap((stage) => stage.modules)

/**
 * Kubernetes 最佳学习路径。
 * 先掌握声明式控制面，再理解工作负载与调度、网络、配置存储、发布和弹性，最后处理真实集群的运维与生产边界。
 */
export const kubernetesLearningStages: LearningStage[] = [
  {
    id: 'kubernetes-control-plane',
    title: '建立控制平面模型',
    goal: '从 API 对象、资源版本与控制器循环建立声明式模型，再用命名空间和 RBAC 划清多租户与权限边界。',
    modules: ['kubernetes-architecture', 'api-objects', 'namespaces-rbac'],
  },
  {
    id: 'kubernetes-workloads',
    title: '工作负载与调度',
    goal: '理解 Pod 为什么是调度与网络的基本单位，再掌握资源 QoS、节点筛选、健康探针和生命周期。',
    modules: ['pod-controllers', 'resources-qos', 'scheduling', 'probes-lifecycle'],
  },
  {
    id: 'kubernetes-networking',
    title: '网络与入口',
    goal: '把 Pod 地址、Service、DNS、七层入口和网络策略连成一条完整请求路径，分清“能连上”和“被允许”。',
    modules: ['service-dns', 'ingress-gateway', 'network-policy'],
  },
  {
    id: 'kubernetes-delivery',
    title: '配置、存储与发布',
    goal: '把配置与密钥注入工作负载，理解持久卷和 CSI，再用 Deployment、滚动发布以及批处理任务交付真实应用。',
    modules: ['config-secrets', 'storage-csi', 'deployments-rollouts', 'jobs-cronjobs'],
  },
  {
    id: 'kubernetes-operations',
    title: '弹性、观测与运维',
    goal: '在资源模型上叠加自动扩缩容，用指标、事件和日志取得证据，最后处理升级、备份与故障恢复。',
    modules: ['autoscaling', 'kubernetes-observability', 'cluster-operations'],
  },
  {
    id: 'kubernetes-production',
    title: '生产边界',
    goal: '把网络隔离、发布策略、容量、安全与成本放进同一套生产检查清单，明确 Kubernetes 不替你解决的系统问题。',
    modules: ['production-boundaries'],
  },
]

export const kubernetesLearningPath: ModuleId[] = kubernetesLearningStages.flatMap((stage) => stage.modules)

/** RAG 最佳学习路径：先准备资料，再学会检索与排序，最后进入证据生成、评估、安全和运维。 */
export const ragLearningStages: LearningStage[] = [
  {
    id: 'rag-data',
    title: '先弄清问题与资料',
    goal: '不用先懂模型训练。先分清 RAG 要解决什么，再把原始文档变成带来源、版本和权限的可检索片段。',
    modules: ['rag-intent', 'rag-ingestion', 'rag-chunking'],
  },
  {
    id: 'rag-retrieval',
    title: '让资料能够被找到',
    goal: '从文字转向向量，理解语义检索怎样工作，再组合关键词与向量，并学会把对话问题改写成独立查询。',
    modules: ['rag-embeddings', 'rag-vector-index', 'rag-hybrid-retrieval', 'rag-query-rewriting'],
  },
  {
    id: 'rag-evidence',
    title: '从候选资料到有依据的答案',
    goal: '先重排候选，再按预算装配上下文，最后让模型依据证据回答；资料不足时能够明确停下。',
    modules: ['rag-reranking', 'rag-context-assembly', 'rag-grounded-generation'],
  },
  {
    id: 'rag-quality',
    title: '证明质量与安全',
    goal: '分别评估检索和回答，检查权限过滤、提示注入与数据泄露，避免只看答案是否流畅。',
    modules: ['rag-evaluation', 'rag-security'],
  },
  {
    id: 'rag-production',
    title: '把一次演示变成稳定服务',
    goal: '把延迟、缓存、索引更新、监控和回滚放进同一条运维路径，保证资料变化后系统仍可验证。',
    modules: ['rag-operations'],
  },
]

export const ragLearningPath: ModuleId[] = ragLearningStages.flatMap((stage) => stage.modules)

/** Linux 最佳学习路径：先建立内核模型，再理解进程文件，最后进入命令行、服务、网络和排障。 */
export const linuxLearningStages: LearningStage[] = [
  {
    id: 'linux-system',
    title: '先建立操作系统模型',
    goal: '不用先懂代码。先认识内核、发行版和用户空间，再看一个程序怎样通过系统调用请求内核服务。',
    modules: ['linux-mental-model', 'linux-kernel-user-space'],
  },
  {
    id: 'linux-process-files',
    title: '理解进程、文件与权限',
    goal: '把程序运行、路径解析和访问控制连起来，能够解释进程状态以及一次文件访问为什么成功或失败。',
    modules: ['linux-process-model', 'linux-filesystem-vfs', 'linux-permissions-identity'],
  },
  {
    id: 'linux-command-line',
    title: '学会命令行工作方式',
    goal: '从 Shell 的输入输出和退出码开始，再用文本工具组合命令，并理解软件包与依赖怎样安装和维护。',
    modules: ['linux-shell-essentials', 'linux-streams-text', 'linux-packages'],
  },
  {
    id: 'linux-services-network',
    title: '管理服务与网络连接',
    goal: '理解后台服务、信号和日志，再分开检查网卡、地址、路由、端口与 DNS，定位连接问题。',
    modules: ['linux-systemd-services', 'linux-signals-jobs', 'linux-networking'],
  },
  {
    id: 'linux-operations',
    title: '存储、启动与生产排障',
    goal: '最后把磁盘、挂载、启动链、资源观测和隔离机制串起来，形成从现象到证据的完整排障路径。',
    modules: ['linux-storage-disks', 'linux-observability-performance', 'linux-isolation-boundaries', 'linux-boot-startup'],
  },
]

export const linuxLearningPath: ModuleId[] = linuxLearningStages.flatMap((stage) => stage.modules)

/** 计算机网络最佳学习路径：先建立通信模型，再逐层理解寻址、传输、应用与排障证据。 */
export const networkLearningStages: LearningStage[] = [
  {
    id: 'network-foundations',
    title: '先建立网络通信模型',
    goal: '不用先懂代码。先认识主机、链路、数据包和协议，再看应用数据怎样经过分层、封装与解封装。',
    modules: ['network-mental-model', 'network-layering'],
  },
  {
    id: 'network-link-address',
    title: '让数据在同一链路找到对方',
    goal: '理解 MAC、交换机、IPv4 地址、子网与 ARP，能够判断两个地址是否可以直接通信，以及为什么需要网关。',
    modules: ['network-ethernet-switching', 'network-ipv4-subnetting', 'network-arp-nd'],
  },
  {
    id: 'network-routing-transport',
    title: '跨越网络并控制传输',
    goal: '跟随路由逐跳转发，再比较 TCP 的可靠字节流与 UDP 的无连接数据报，理解连接、重传、顺序和实时性之间的取舍。',
    modules: ['network-routing', 'network-tcp', 'network-udp'],
  },
  {
    id: 'network-applications',
    title: '从地址进入日常应用',
    goal: '把名称解析、网页请求和加密握手连成一次完整访问，知道 DNS、HTTP 与 TLS 各自证明什么、没有证明什么。',
    modules: ['network-dns', 'network-http', 'network-tls'],
  },
  {
    id: 'network-boundaries-ops',
    title: '穿过边界并用证据排障',
    goal: '理解 NAT、防火墙、DHCP 与抓包，再从延迟、丢包和带宽证据定位问题，而不是只凭“ping 不通”猜结论。',
    modules: ['network-nat-firewall', 'network-dhcp', 'network-packet-capture', 'network-troubleshooting', 'network-performance'],
  },
]

export const networkLearningPath: ModuleId[] = networkLearningStages.flatMap((stage) => stage.modules)
