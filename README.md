# 心智实验室（Container Mind Lab）

一个面向零基础学习者的中文可视化学习应用，用「意图 → 机制 → 权衡」的顺序讲透 **Docker、Kubernetes、Agent、RAG、Linux 与计算机网络**。

它不是命令速查表，而是把每项技术拆成可播放的机制、完整的状态变化、可复现的示例和可观察的证据。学习目标是：读完一个模块后，你能解释它为什么存在、内部如何变化、输出应该是什么、如何验证与排障，只剩亲手实操。

## 当前内容

| 知识分类 | 独立主题 | 深潜模块 | 首页路由 | 学习路径 |
| --- | --- | ---: | --- | --- |
| 基础设施与运行时 | Docker | 14 | `#docker` | 5 个阶段：运行时总览 → 制品文件 → 隔离机制 → OCI 运行时 → 编排边界 |
| 基础设施与运行时 | Kubernetes | 18 | `#kubernetes` | 6 个阶段：控制平面 → 工作负载调度 → 网络入口 → 配置存储发布 → 弹性观测运维 → 生产边界 |
| 智能系统与工程 | Agent | 16 | `#agent` | 5 个阶段：模型运行时 → 知识工具 → 规划控制 → 协作恢复 → 生产运维 |
| 智能系统与工程 | RAG | 13 | `#rag` | 5 个阶段：问题资料 → 检索排序 → 证据生成 → 质量安全 → 上线运维 |
| 基础设施与运行时 | Linux | 15 | `#linux` | 5 个阶段：系统内核 → 进程文件 → 命令行 → 服务网络 → 存储启动排障 |
| 基础设施与运行时 | 计算机网络 | 16 | `#network` | 5 个阶段：通信模型 → 链路寻址 → 路由传输 → 应用命名 → 边界排障 |

六个主题是彼此独立的学习模块，没有默认先后顺序。它们共享统一的数据契约与七节阅读结构，但拥有各自的模块集合、依赖图、首页、交互实验与最佳学习路径；一级知识分类只用于组织目录，不生成跨主题依赖。

## 七节学习结构

每个深潜模块严格按照以下顺序组织，标题不变：

1. **理念**：它要解决什么，拒绝什么，以及最容易看错的反直觉事实。
2. **设计**：核心抽象、设计不变量、历史动机与关键取舍。
3. **能力地图**：能做什么，每项一句，并链接到对应模块。
4. **一条代表路径**：用最能代表设计的用法，逐步播放内部状态。
5. **代价**：为什么这样设计，用在这里的成本，以及常见混淆。
6. **示例**：机制图、命令、真实预期输出、验收点与安全边界。
7. **边界**：它挡住了什么，没有挡住什么。

所有代表路径都包含状态表。遇到「不懂就会看错机制」的术语，会在第一次真正使用时展开；需要独立理解的依赖会进入完整模块，而不是只给一句术语解释。

## 快速开始

### 环境要求

- Node.js **20.19+** 或 **22.12+**（Vite 7 要求）
- npm（随 Node.js 安装）
- 可选：Python 3，用于执行课程中的离线教学示例

### 安装与启动

在项目根目录执行：

```bash
npm ci
npm run dev
```

然后打开：

```text
http://127.0.0.1:8080
```

开发服务器由 [vite.config.ts](vite.config.ts) 固定为 `127.0.0.1:8080`。如果端口被占用，可以临时指定其他端口：

```bash
npm run dev -- --port 4185
```

### 构建与预览

```bash
npm run build
npm run preview
```

- `npm run build`：先运行 TypeScript 严格检查，再生成 `dist/`。
- `npm run preview`：预览生产构建，默认地址仍为 `http://127.0.0.1:4183`。

当前应用是纯前端项目，不需要后端、数据库或外部 API 即可学习。Kubernetes、RAG 与计算机网络示例使用确定性的离线模拟，不会连接或修改真实集群、模型、文档服务或网络设备；Linux 与网络真实命令只在读者自己的对应环境中执行，并会明确标注适用平台。

## 页面与路由

应用使用本地 hash 路由，刷新页面或直接分享地址都能回到对应位置。

| 地址 | 页面 |
| --- | --- |
| 空地址或 `#home` | 网站导览：理念、设计与学习意图 |
| `#docker` | Docker 首页 |
| `#kubernetes` | Kubernetes 首页 |
| `#agent` | Agent 首页 |
| `#rag` | RAG 首页 |
| `#linux` | Linux 首页 |
| `#network` | 计算机网络首页 |
| `#module/<module-id>` | 任意深潜模块 |
| `#module/kubernetes-architecture` | 示例：Kubernetes 架构与声明式控制 |
| `#module/deployments-rollouts` | 示例：Deployment 与滚动发布 |

模块页的「返回知识图谱」会根据模块所属轨道跳回正确首页，不会错误返回上一个浏览的技术。

## 主要交互

- **可伸缩、可隐藏的分类侧边栏**：拖动右侧边缘可在 72–480px 间调整；低于 190px 自动进入图标窄栏，方向键微调，双击恢复默认宽度。点击侧栏关闭按钮或按 `Ctrl+\` 可完全隐藏，左上角恢复按钮可重新打开；宽度与隐藏状态会保存在本地。
- **四级知识目录**：知识分类 → 独立主题 → 知识组 → 深潜模块，每一级都可分别折叠。分类数据集中在 `src/knowledge.ts`，便于后续增加新领域与主题。
- **实时学习路径定位**：进入任意深潜模块后，吸顶阶段栏会自动显示所属阶段、本阶段进度和全程位置；可直接回到上一阶段、进入下一阶段或点击任意阶段。
- **渐进式分步示例**：不再默认堆叠全部命令。每次只展示一个操作目标、原因和成功迹象，命令与完整输出按需展开，支持复制、步骤切换和完成进度。
- **Docker 运行时模拟器**：重放镜像、OCI 运行时、namespace、cgroup、文件系统与网络的创建过程。
- **cgroup v2 实验室**：切换负载、调整资源上限并观察内核状态变化。
- **镜像分层实验室**：对照 Dockerfile 指令、只读镜像层、可写层与镜像元数据。
- **Agent 循环实验室**：切换只读检索、高风险写入审批等轨迹，区分模型提案、宿主执行与工具观察。
- **上下文预算实验室**：调整历史、检索与输出预留，观察窗口不足时的裁剪与溢出。
- **Kubernetes 控制循环实验室**：切换副本纠偏、镜像失败与滚动发布场景，逐步推进 API Server、控制器、调度器、kubelet 与 EndpointSlice 的状态。
- **RAG 流水线实验室**：切换退款、发票与资料不足场景，逐步观察片段、候选、重排、上下文、引用与拒答。
- **Linux 运行时实验室**：播放 fork、exec、信号与回收状态，并切换文件权限预判不同用户的访问结果。
- **计算机网络数据包实验室**：切换跨网 HTTPS、局域网传输与 DNS 失败场景，观察 DNS、ARP、路由、TCP、TLS、HTTP 的状态与证据。

## 技术栈

- React 19
- TypeScript（`strict`、`noUnusedLocals`、`noUnusedParameters`）
- Vite 7
- 原生 CSS，无额外 UI 框架
- 本地 hash 路由，无后端依赖

## 项目结构

```text
container-mind-lab/
├─ index.html                         # HTML 入口与中文页面元数据
├─ package.json                       # 依赖与 npm 脚本
├─ vite.config.ts                     # 开发/预览服务器配置
├─ tsconfig.json                      # TypeScript 严格配置
├─ src/
│  ├─ main.tsx                        # React 入口
│  ├─ App.tsx                         # 应用外壳、默认导览、轨道切换与 hash 路由
│  ├─ Sidebar.tsx                     # 可伸缩三级知识目录与章节导航
│  ├─ SiteOverview.tsx                # 网站理念、设计与学习意图首页
│  ├─ knowledgeTypes.ts               # KnowledgeModule 统一数据契约
│  ├─ knowledge.ts                    # 内容聚合、依赖计算与学习路径
│  ├─ knowledgeCore.ts                # Docker 控制面与制品内容
│  ├─ knowledgeSystem.ts              # Docker Linux 依赖与运维内容
│  ├─ knowledgeKubernetesCore.ts      # Kubernetes 控制面与核心对象
│  ├─ knowledgeKubernetesWorkloads.ts # Kubernetes 工作负载、调度与发布
│  ├─ knowledgeKubernetesNetworking.ts # Kubernetes 网络、配置与存储
│  ├─ knowledgeKubernetesOps.ts       # Kubernetes 弹性、观测与生产边界
│  ├─ knowledgeAgentMind.ts           # Agent 模型、上下文与推理
│  ├─ knowledgeAgentKnowledge.ts      # Agent 知识与工具
│  ├─ knowledgeAgentControl.ts        # Agent 规划、控制与安全
│  ├─ knowledgeAgentOps.ts            # Agent 协作、评估与生产运维
│  ├─ knowledgeRagRetrieval.ts        # RAG 资料、向量、检索与问题改写
│  ├─ knowledgeRagGeneration.ts       # RAG 重排、证据生成、评估、安全与运维
│  ├─ knowledgeLinuxFoundation.ts     # Linux 内核、进程、文件、权限与命令行
│  ├─ knowledgeLinuxOperations.ts     # Linux 服务、网络、存储、启动与排障
│  ├─ knowledgeNetworkFoundation.ts   # 计算机网络模型、分层、链路与寻址
│  ├─ knowledgeNetworkTransport.ts    # 路由、TCP 与 UDP
│  ├─ knowledgeNetworkApplications.ts # DNS、HTTP 与 TLS
│  ├─ knowledgeNetworkOperations.ts   # NAT、DHCP、抓包、排障与性能
│  ├─ AgentOverview.tsx               # Agent 七节首页
│  ├─ RagOverview.tsx                 # RAG 七节首页
│  ├─ LinuxOverview.tsx               # Linux 七节首页
│  ├─ NetworkOverview.tsx             # 计算机网络七节首页
│  ├─ TopicPrimer.tsx                 # RAG/Linux/网络零基础共享导读
│  ├─ RagPipelineLab.tsx              # RAG 代表路径实验室
│  ├─ LinuxRuntimeLab.tsx             # Linux 进程与权限实验室
│  ├─ NetworkPacketLab.tsx            # 计算机网络数据包路径实验室
│  ├─ KubernetesOverview.tsx          # Kubernetes 七节首页
│  ├─ KnowledgeMap.tsx                # 六轨道依赖知识地图
│  ├─ LearningPath.tsx                # 六轨道分阶段学习路径
│  ├─ ModuleView.tsx                  # 通用七节深潜页
│  ├─ KubernetesReconcileLab.tsx      # Kubernetes 控制循环实验室
│  ├─ AgentLoopLab.tsx                # Agent 运行时轨迹实验室
│  ├─ ContextBudgetLab.tsx            # 上下文预算实验室
│  ├─ CgroupLab.tsx                   # cgroup v2 实验室
│  ├─ DockerSimulator.tsx             # Docker 运行时模拟器
│  ├─ ImageLayerAnatomy.tsx           # 镜像分层实验室
│  ├─ MechanismDiagram.tsx            # 通用机制图
│  ├─ Icons.tsx                       # 图标与小型可视化组件
│  ├─ SectionHeading.tsx              # 七节标题组件
│  └─ styles.css                      # 全站样式、响应式与减少动画支持
└─ dist/                              # npm run build 生成的生产文件
```

## 内容模型

所有课程内容都是类型化数据，核心契约位于 [src/knowledgeTypes.ts](src/knowledgeTypes.ts)。

一个 `KnowledgeModule` 包含：

- 模块元数据：`id`、`track`、`title`、`english`、`summary`、`icon`、`group`
- 依赖关系：`dependencies` 与自动计算的 `dependents`
- 理念：`philosophy`
- 设计：`design.abstractions`、`design.principles`、`design.history`
- 能力：`capabilities`
- 代表路径：`path.steps`、`path.stateTable`
- 代价与常见看错：`costs`
- 示例：机制图、命令、输出、验收点与安全说明
- 边界：`boundaries.blocks` 与 `boundaries.notBlocks`

### 如何新增模块

1. 在 [src/knowledgeTypes.ts](src/knowledgeTypes.ts) 的 `ModuleId` 中新增唯一 ID。
2. 在对应 `knowledge*.ts` 数组中新增完整 `KnowledgeModule` 对象。
3. 设置所属 `track`、`group` 与 `dependencies`。
4. 把模块加入该轨道的 `*LearningStages`，保证学习路径完整覆盖。
5. 如果属于新技术主题，还需补齐 `modulesByTrack`、`groupsByTrack`、`pathConfig` 和首页路由。
6. 运行 `npm run build`，检查严格类型错误。

依赖边建议只表达真正的学习前置关系。不要把「同一章节」误当成依赖，也不要把依赖图谱当成唯一学习顺序。

### 示例代码约定

- 课程示例优先使用 Python 标准库做离线、确定性模拟。
- 跨平台示例在 Windows Git Bash 与 Linux Shell 中运行；平台专用命令会明确标注环境，不在 Windows 上冒充 Linux/macOS 实跑结果。
- 输出中不使用随机地址、当前时间或其他不可复现信息。
- 示例代码与页面逻辑都附有中文注释，重点解释状态、边界与设计原因。
- 不执行真实集群写操作、不访问外网、不删除用户文件。

## 代码注释约定

项目使用中文说明性注释，重点覆盖：

- 文件与导出组件/函数的用途；
- 输入、输出和关键不变量；
- 状态派生、定时器、边界分支与可访问性处理；
- 内容数组按模块或章节分组；
- 非显然设计选择的「为什么」。

注释不会逐行复述代码，也不会替代命名和类型。

## 开发检查

```bash
# TypeScript 严格检查与生产构建
npm run build

# 启动开发服务器
npm run dev

# 预览生产构建
npm run preview
```

修改课程内容后，建议至少检查：

- 模块 ID 是否唯一；
- 依赖是否都存在且没有跨轨道悬空；
- 七节字段是否完整；
- 状态表每一行列数是否一致；
- 学习路径是否覆盖该轨道全部模块；
- 命令输出是否与实际执行一致；
- 桌面与 390px 移动端是否出现横向溢出；
- 浏览器控制台是否有 React key、状态更新或可访问性警告。

## 常见问题

### 页面打不开

确认当前目录是项目根目录，并且 `package.json` 与 `src/` 在同一层。然后重新执行：

```bash
npm ci
npm run dev
```

### 端口被占用

```bash
npm run dev -- --port 4185
```

打开 `http://127.0.0.1:4185` 即可。

### `npm run build` 提示 chunk 超过 500 kB

这是课程内容较多导致的 Vite 包体积提示，不是类型错误或构建失败。当前优先保证内容完整与交互正确；后续可通过路由级代码分割或内容按需加载优化首屏体积。

### Windows 下 Python 示例无法运行

课程命令会优先检测 `python3`，不存在时使用 `python`。请确认 Python 已安装并加入 PATH；在 Git Bash 中执行页面展示的命令即可。

### Linux 命令应该在哪里运行

Linux 模块会明确区分两类示例：内部状态演示使用可在本机运行的 Python 标准库脚本；`systemctl`、`journalctl`、`ss`、`mount` 等真实命令需要在 Linux 终端中执行。页面会给出预期输出与中文验收点，Windows 下不要假装这些命令已经运行，也不要在生产主机上执行未经理解的 privileged 命令。

### Kubernetes 示例会操作我的集群吗？

不会。当前 Kubernetes 课程示例是离线教学模拟，用于稳定展示声明、调度、探针、端点和滚动发布的状态变化。真实 `kubectl` 命令只作为课堂示例输出展示，不会由应用自动执行。

## 设计原则

- **零基础优先**：第一次出现的机制词在真正使用时解释。
- **意图先于命令**：先说明要解决什么，再看内部怎样工作。
- **状态先于结论**：区分对象存在、Pod Ready、端点更新与请求成功。
- **证据先于猜测**：命令必须配预期输出与验收点。
- **依赖独立成模块**：不允许用一句术语掩盖关键机制。
- **反直觉分支显式化**：失败、拒绝、超时、回滚与恢复都进入状态表。
- **安全边界可见**：模拟优先，不把教学示例变成真实环境的破坏性操作。
