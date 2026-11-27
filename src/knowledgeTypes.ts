import type { IconName } from './Icons'

/**
 * 技术轨道标识。
 * 每条轨道共享同一套课程结构，但拥有独立的模块、依赖图、首页与学习路径。
 */
export type TrackId = 'docker' | 'agent' | 'kubernetes' | 'rag' | 'linux' | 'network'

/** 高于技术主题的知识领域；分类只负责收纳，不规定不同主题之间的学习顺序。 */
export type KnowledgeCategoryId = 'infrastructure' | 'intelligent-systems'

/** 全站主题的共享元数据；各主题拥有独立课程，不因归属同一分类而形成前置依赖。 */
export type KnowledgeTopic = {
  id: TrackId
  category: KnowledgeCategoryId
  title: string
  english: string
  subtitle: string
  icon: IconName
}

/** 可扩展的一级知识目录；新增领域时只需继续追加分类和主题。 */
export type KnowledgeCategory = {
  id: KnowledgeCategoryId
  title: string
  subtitle: string
  topics: KnowledgeTopic[]
}

/**
 * 知识地图中的一级分组。
 * 分组表达学习层次，不替代 dependencies；真正的先后关系由模块依赖字段描述。
 */
export type ModuleGroup =
  | '构建与分发'
  | '控制平面'
  | '运行时'
  | '宿主系统'
  | '观测与协作'
  | '模型与推理'
  | '上下文与知识'
  | '工具与执行'
  | '规划与协作'
  | '治理与运维'
  | '工作负载与调度'
  | '网络与入口'
  | '配置与存储'
  | '弹性与可观测'
  | '集群运维'
  | '生产边界'
  | '问题与资料'
  | '检索与排序'
  | '生成与评估'
  | '安全与运维'
  | '系统与内核'
  | '进程与文件'
  | '命令行工作'
  | '服务与网络'
  | '存储与排障'
  | '网络基础'
  | '链路与寻址'
  | '路由与传输'
  | '应用与命名'
  | '边界与排障'

/**
 * 全站模块 ID。
 * 新增模块时必须同时扩展 ModuleId、对应内容数组、分组和学习路径，否则路由与类型检查会拒绝不完整状态。
 */
export type ModuleId =
  // Docker：从单机容器运行时一直延伸到 Linux 内核依赖与编排边界。
  | 'docker-engine'
  | 'image-build'
  | 'registry'
  | 'oci-runtime'
  | 'process-model'
  | 'namespaces'
  | 'cgroup-v2'
  | 'filesystem'
  | 'storage'
  | 'network'
  | 'security'
  | 'observability'
  | 'compose'
  | 'orchestration-boundary'
  // Agent：从模型推理与上下文，到工具、控制、协作和生产治理。
  | 'agent-loop'
  | 'llm-inference'
  | 'context-window'
  | 'prompt-contract'
  | 'context-memory'
  | 'retrieval-rag'
  | 'tool-calling'
  | 'mcp-protocol'
  | 'planning'
  | 'workflow-state'
  | 'multi-agent'
  | 'human-control'
  | 'evaluation-observability'
  | 'security-permissions'
  | 'reliability-recovery'
  | 'production-ops'
  // Kubernetes：控制平面、工作负载、网络、配置存储、弹性观测与生产边界。
  | 'kubernetes-architecture'
  | 'api-objects'
  | 'namespaces-rbac'
  | 'pod-controllers'
  | 'resources-qos'
  | 'scheduling'
  | 'probes-lifecycle'
  | 'deployments-rollouts'
  | 'jobs-cronjobs'
  | 'service-dns'
  | 'ingress-gateway'
  | 'network-policy'
  | 'config-secrets'
  | 'storage-csi'
  | 'autoscaling'
  | 'kubernetes-observability'
  | 'cluster-operations'
  | 'production-boundaries'
  // RAG：从资料准备、检索排序到有依据生成、评估、安全与上线维护。
  | 'rag-intent'
  | 'rag-ingestion'
  | 'rag-chunking'
  | 'rag-embeddings'
  | 'rag-vector-index'
  | 'rag-hybrid-retrieval'
  | 'rag-query-rewriting'
  | 'rag-reranking'
  | 'rag-context-assembly'
  | 'rag-grounded-generation'
  | 'rag-evaluation'
  | 'rag-security'
  | 'rag-operations'
  // Linux：从内核与用户空间，到进程、文件、命令行、服务、网络和排障。
  | 'linux-mental-model'
  | 'linux-kernel-user-space'
  | 'linux-process-model'
  | 'linux-filesystem-vfs'
  | 'linux-permissions-identity'
  | 'linux-shell-essentials'
  | 'linux-streams-text'
  | 'linux-packages'
  | 'linux-systemd-services'
  | 'linux-signals-jobs'
  | 'linux-networking'
  | 'linux-storage-disks'
  | 'linux-observability-performance'
  | 'linux-isolation-boundaries'
  | 'linux-boot-startup'
  // 计算机网络：从网络模型与链路寻址，到路由传输、应用命名和生产排障。
  | 'network-mental-model'
  | 'network-layering'
  | 'network-ethernet-switching'
  | 'network-ipv4-subnetting'
  | 'network-arp-nd'
  | 'network-routing'
  | 'network-tcp'
  | 'network-udp'
  | 'network-dns'
  | 'network-http'
  | 'network-tls'
  | 'network-nat-firewall'
  | 'network-dhcp'
  | 'network-packet-capture'
  | 'network-troubleshooting'
  | 'network-performance'

/** 在术语首次真正出现时给出的短定义，避免把课程写成前置术语表。 */
export type KnowledgeTerm = { name: string; definition: string }

/** 机制图使用的语义色，帮助读者区分稳定状态、变化、风险与辅助信息。 */
export type DiagramTone = 'green' | 'orange' | 'blue' | 'muted'

/**
 * 示例机制图的数据结构。
 * ModuleView 会根据 kind 选择流程、分层或对比布局，内容作者只需描述教学语义。
 */
export type ExampleDiagram = {
  kind: 'flow' | 'layers' | 'compare'
  title: string
  caption: string
  items: {
    title: string
    detail: string
    tag?: string
    tone?: DiagramTone
  }[]
  footnote?: string
}

/** 代表路径中的一个可播放状态切片；terms 只解释本步骤真正需要知道的词。 */
export type MechanismStep = {
  title: string
  description: string
  terms: KnowledgeTerm[]
  state: string
}

/**
 * 一个完整深潜模块的统一数据契约。
 *
 * 该结构固定对应七个教学章节：
 * philosophy → design → capabilities → path → costs → example → boundaries。
 * 内容、交互和测试都依赖这一顺序，修改字段时应同步检查 ModuleView 与校验脚本。
 */
export type KnowledgeModule = {
  id: ModuleId
  track?: TrackId
  title: string
  english: string
  summary: string
  icon: IconName
  group: ModuleGroup
  dependencies: ModuleId[]
  dependents: ModuleId[]
  philosophy: {
    problem: string
    rejects: string
    counter: string
  }
  design: {
    abstractions: { name: string; role: string }[]
    principles: string[]
    history: { when: string; what: string; why: string }[]
  }
  capabilities: { name: string; sentence: string }[]
  path: {
    intent: string
    environment: string
    steps: MechanismStep[]
    stateTable: { columns: string[]; rows: string[][] }
    summary: string
  }
  costs: { choice: string; cost: string; misread: string }[]
  example: {
    title: string
    intent: string
    setup?: string
    terms?: KnowledgeTerm[]
    diagram: ExampleDiagram
    commands: { title: string; command: string; output: string; expect?: string; note?: string }[]
    checkpoints: string[]
    safety?: string
  }
  boundaries: {
    blocks: string[]
    notBlocks: string[]
  }
}
