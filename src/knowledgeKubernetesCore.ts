/**
 * Kubernetes 控制平面与核心对象深潜：从声明式 API 出发，依次理解控制面、API 对象、
 * 命名空间与 RBAC，最后落到 Pod 和工作负载控制器。
 *
 * 本文件面向零基础学习者，但不停留在组件背诵。每个模块都按“意图 → 机制 → 权衡”展开：
 * 先说明想解决的协调问题，再追踪对象如何被验证、存储、观察与纠偏，最后明确抽象的成本和边界。
 * 所有示例均为 Python 标准库离线模拟，不访问网络、不调用 kubectl、不修改真实集群；
 * 固定输入与固定状态保证输出可以逐字复现。
 */
import type { KnowledgeModule } from './knowledgeTypes'

/**
 * 导出 Kubernetes 控制面与核心对象课程数组，供知识地图、学习路径与 ModuleView 消费。
 * 四个模块形成单向前置链：架构解释循环，API 对象解释并发契约，RBAC 解释调用边界，
 * Pod 与控制器解释循环最终要维持的工作负载状态。dependents 由全站索引统一反向补全。
 */
export const kubernetesCoreModules: KnowledgeModule[] = [
  /**
   * 架构模块先建立全局分工：用户声明目标，API Server 负责验证与持久化，
   * 控制器持续比较期望与实际，调度器只负责选择节点，kubelet 在节点上落实状态。
   * 关键不是画出一张静态组件图，而是观察一次外部漂移如何被重新纠偏。
   */
  {
    id: 'kubernetes-architecture',
    title: 'Kubernetes 架构与声明式控制',
    english: 'KUBERNETES / CONTROL PLANE / RECONCILIATION',
    summary: 'Kubernetes 把“希望系统怎样运行”写成 API 对象，由 API Server 验证并保存，再由控制器持续比较期望状态与实际状态，驱动调度器、kubelet 和运行时逐步靠近目标。它不是一条从主节点直达每台机器的命令流水线，而是一组围绕共享对象协作的控制循环。',
    icon: 'network',
    track: 'kubernetes',
    group: '控制平面',
    dependencies: [],
    dependents: [],
    philosophy: {
      problem: '当应用由多个副本分布在多台机器上时，人工执行“在哪台机器启动哪个容器、失败后如何补回”会迅速变得不可维护。系统需要一种能表达目标、容忍局部失败，并在机器上下线后持续恢复的协调方式。',
      rejects: 'Kubernetes 不是把 SSH 脚本包装成 API，也不是一个全知中央进程直接操作每个容器。控制平面通常不逐秒替节点运行容器，更不会因为用户写了一次 apply 就保证所有副本已经启动。对象被接受与目标真正实现之间隔着调度、拉取镜像、网络和运行时等多个环节。',
      counter: '命令式脚本描述“先做 A，再做 B”，声明式 API 描述“最终应是 C”。控制循环反复读取当前事实并修复差异，因此即使中间步骤失败、控制器重启或副本被人工删除，系统仍能重新推导下一步，而不是依赖某一次执行永不丢失。',
    },
    design: {
      abstractions: [
        { name: '声明式对象', role: '用 spec 表达期望状态，用 status 报告观察结果；对象本身是控制面协作的共同契约。' },
        { name: 'API Server', role: '集群 API 的统一入口，负责认证、授权、准入、结构校验、版本转换与读写 etcd。' },
        { name: 'etcd', role: '保存集群对象和协调数据的强一致存储；应用通常不直接访问它，而通过 API Server 操作。' },
        { name: '控制器', role: '观察一个或多个对象，比较期望与现状，并创建、更新或删除其他对象以推动收敛。' },
        { name: '调度器', role: '为尚未绑定节点的 Pod 寻找满足资源与约束的节点，并把绑定结果写回 API。' },
        { name: 'kubelet', role: '每个节点上的代理，观察绑定到本节点的 Pod，通过容器运行时管理容器、卷和状态回报。' },
        { name: '控制循环', role: '观察、比较、行动、等待、再观察的重复过程；它处理当前状态，而不是只响应一次事件。' },
      ],
      principles: [
        '期望与观察分离：spec 是目标，status 是控制器或运行时看到的结果；把 status 当配置会掩盖真实差异。',
        '声明式优于步骤清单：控制器自己决定下一步，因而能从部分成功、重启和外部修改中恢复。',
        '水平触发而非只处理边沿：即使错过一个变更事件，下一轮完整比较仍能发现“现在有几副本”。',
        '控制面与节点分工：API Server、etcd、调度器和控制器运行在控制面，kubelet 与容器运行时在节点执行具体工作。',
        '收敛是最终过程而非瞬间事务：写入对象只是起点，调度、绑定、拉取镜像和启动都需要时间，并可能失败重试。',
        '纠偏动作要幂等：重复创建或更新不能无限放大副作用；所有权、resourceVersion 和退避机制共同约束重复行动。',
      ],
      history: [
        { when: '2000 年代', what: 'Google 的 Borg 与 Omega 等系统积累大规模集群调度经验', why: '让“共享对象状态、独立控制器、持续协调”成为可借鉴的系统设计，而不是依赖人工运维。' },
        { when: '2014—2015', what: 'Kubernetes 开源并形成 Pod、ReplicationController 与声明式 API 的早期模型', why: '把容器编排从单机启动提升为跨节点、可自我修复的工作负载管理。' },
        { when: '2016 年起', what: '控制器模式扩展到 Deployment、自定义资源与 Operator', why: '平台能力从管理固定内建对象扩展到用同一套 API 协调任意领域状态。' },
      ],
    },
    capabilities: [
      { name: '目标驱动协调', sentence: '提交期望副本数或配置，让多个控制器分工完成实际状态调整。' },
      { name: '故障后自愈', sentence: 'Pod、节点或控制器进程变化后，后续循环仍能根据当前事实补回差异。' },
      { name: '跨节点编排', sentence: '把容器放置、网络、存储和配置等单机能力组合成集群级工作负载。' },
      { name: '可扩展控制逻辑', sentence: '用自定义资源和控制器把数据库、消息队列等领域系统纳入相同的声明式模型。' },
      { name: '渐进式收敛', sentence: '用状态、事件和条件观察目标实现过程，而不是把一次 API 写入误判为上线完成。' },
    ],
    path: {
      intent: '声明一个需要 3 个副本的 api Deployment，再从实际只有 1 个副本开始，观察控制面如何补建、调度、启动，并在副本被外部删除后再次恢复。',
      environment: '教学控制面；对象、Pod、节点和事件都保存在 Python 风格的内存列表中，调度与运行时被压缩成确定性的状态迁移，不连接真实集群。',
      steps: [
        { title: '把目标写成 API 对象', description: '用户提交 Deployment，spec.replicas=3 表示期望数量，Pod 模板描述容器和标签。对象先表达意图，并不直接等于三个正在运行的进程。', terms: [{ name: 'Deployment', definition: '描述无状态工作负载副本数、Pod 模板和发布策略的 API 对象。' }, { name: 'spec', definition: '用户或控制器声明的期望配置部分；具体资源可以拥有不同字段。' }], state: 'api.spec.replicas=3；Deployment generation=1；尚未创建 Pod。' },
        { title: 'API Server 验证并持久化', description: 'API Server 完成认证、授权、准入和结构校验，为对象分配 UID 与 resourceVersion，再写入 etcd。校验失败的对象不会进入持久化状态。', terms: [{ name: '准入控制', definition: '对象通过基础校验前后，由集群策略继续检查、修改或拒绝请求的阶段。' }, { name: 'etcd', definition: '保存 API 对象与集群协调数据的强一致键值存储。' }], state: '对象已保存；uid=dep-api；resourceVersion=1；状态变为已接受。' },
        { title: 'Deployment 控制器创建 ReplicaSet', description: 'Deployment 控制器读取 spec，发现还没有对应 ReplicaSet，于是创建一个模板与副本数一致的下层对象。控制器通过 API 改变对象，而不是直接登录节点启动容器。', terms: [{ name: 'ReplicaSet', definition: '持续维持匹配标签 Pod 数量的控制器对象。' }, { name: '所有权引用', definition: 'ownerReferences 记录对象由谁创建，支持级联回收并避免独立对象被误删。' }], state: 'ReplicaSet=api-rs-1；desired=3；owned_by=dep-api；availableReplicas=0。' },
        { title: '副本控制器比较数量并补建 Pod', description: 'ReplicaSet 控制器数到只有 1 个匹配 Pod，而期望是 3，于是创建 2 个 Pod。每个 Pod 继承模板中的标签和容器规格，但拥有自己的 UID。', terms: [{ name: 'Pod 模板', definition: '创建新 Pod 时复用的标签、容器、卷等配置蓝本。' }, { name: '漂移', definition: '当前实际状态与声明目标之间的差异，例如副本数少了 2 个。' }], state: '实际 Pod=1；缺失=2；创建 pod-2、pod-3；新 Pod 尚未调度。' },
        { title: '调度器选择节点并完成绑定', description: '调度器为 Pending Pod 过滤和打分节点，选出可行位置后通过 API 写入 spec.nodeName。绑定成功只表示分配了节点，不表示镜像已下载或容器已运行。', terms: [{ name: 'Pending', definition: 'Pod 尚未完成节点绑定的常见阶段；具体原因需要结合条件和事件判断。' }, { name: '节点绑定', definition: '把 Pod 分配给具体节点并记录在 spec.nodeName 中的调度结果。' }], state: 'pod-2→node-a；pod-3→node-b；两个 Pod 均为 Pending，等待 kubelet。' },
        { title: 'kubelet 与运行时启动容器', description: '节点上的 kubelet 看到分配给自己的 Pod，准备卷和网络，调用容器运行时创建、启动容器，并把 Phase、容器状态与条件写回 status。', terms: [{ name: 'kubelet', definition: '节点上的 Kubernetes 代理，负责把 Pod 规格落实到本机运行时并汇报状态。' }, { name: '容器运行时', definition: '实际创建和运行容器的软件层，例如 containerd 或 CRI-O。' }], state: '3 个 Pod 均 Running；Deployment status.availableReplicas=3。' },
        { title: '外部删除副本触发再次纠偏', description: '有人删除了 pod-2。ReplicaSet 的下一轮比较发现实际数量变成 2，重新创建替代 Pod；新 Pod 使用新 UID，Service 等选择器仍按标签找到新的后端。', terms: [{ name: '自愈', definition: '持续比较目标与现状并恢复缺失状态的能力，不依赖保留同一个 Pod 实例。' }, { name: '最终一致', definition: '各组件经过传播和重试后逐步达到目标，而非所有步骤在同一原子事务完成。' }], state: 'pod-2 被删除；创建 pod-4；再次调度到 node-a；副本数重新趋向 3。' },
      ],
      stateTable: {
        columns: ['协调阶段', '期望状态', '观察到的现状', '谁采取行动', '结果与边界'],
        rows: [
          ['提交 Deployment', 'api replicas=3', '对象尚不存在', '用户与 API Server', '对象持久化，但副本尚未创建'],
          ['创建 ReplicaSet', '副本数为 3', '没有下层控制器', 'Deployment 控制器', '生成 api-rs-1，并建立所有权'],
          ['比较副本数', 'Pod 数量为 3', '只有 pod-1', 'ReplicaSet 控制器', '补建 pod-2、pod-3'],
          ['调度', 'Pod 应有节点', '两个 Pod 未绑定', '调度器', '分别绑定 node-a、node-b'],
          ['启动容器', 'Pod 应运行', '节点尚无容器', 'kubelet 与运行时', '状态逐步变为 Running'],
          ['外部删除', '仍需要 3 个', '实际只剩 2 个', 'ReplicaSet 控制器', '创建新 Pod，不恢复旧 UID'],
          ['再次收敛', '3 个可用副本', '新 Pod 正在调度启动', '各控制组件', '最终回到 3，中途仍有窗口'],
        ],
      },
      summary: 'Kubernetes 的架构核心是“共享对象 + 独立循环”：声明提供目标，API Server 提供一致入口，控制器持续纠偏，调度器决定位置，kubelet 在节点执行。对象写入成功只是协调的开始，系统通过反复观察逐步达到最终状态。',
    },
    costs: [
      { choice: '声明式 API', cost: '获得可恢复的目标模型，但用户不能精确控制每个执行步骤，也必须理解状态传播的异步性。', misread: 'apply 返回成功就代表所有副本已经可用。' },
      { choice: '多控制器协作', cost: '职责可以独立扩展和容错，却增加对象层级、事件顺序和故障定位复杂度。', misread: '只有一个总控进程在按固定顺序完成部署。' },
      { choice: '持续协调', cost: '能够修复漂移和丢失事件，却会反复读写 API，产生控制面负载和重试流量。', misread: '控制器只在对象创建时执行一次。' },
      { choice: '最终一致', cost: '允许局部失败和并行推进，却使发布期间出现短暂副本数、端点或配置不一致。', misread: '集群任一时刻都与清单逐字段完全一致。' },
    ],
    example: {
      title: '观察副本漂移如何被两个控制器逐层纠偏',
      intent: '用固定状态模拟 Deployment 控制器和 ReplicaSet 控制器。第一次循环补建缺失 Pod，第二次循环在外部删除后再次补建，突出“比较当前事实”而不是“记住已经执行过”。',
      diagram: {
        kind: 'flow',
        title: '一次声明如何穿过控制面到达节点',
        caption: '实线表示对象和状态的单向传递；各组件通过 API 读写对象协作，而不是由总控进程直接发出每条机器命令。',
        items: [
          { title: '用户声明目标', detail: '提交 api Deployment，期望 3 个副本。', tag: '意图', tone: 'blue' },
          { title: 'API Server 保存对象', detail: '验证、准入并写入 etcd，分配 UID 和 resourceVersion。', tag: '一致入口', tone: 'blue' },
          { title: '控制器创建与比较', detail: 'Deployment 创建 ReplicaSet，ReplicaSet 比较 Pod 数量并补建。', tag: '纠偏', tone: 'orange' },
          { title: '调度器分配节点', detail: '为未绑定 Pod 选择节点，再把绑定写回 API。', tag: '放置', tone: 'muted' },
          { title: 'kubelet 落实并回报', detail: '节点创建容器，状态经 API Server 写回对象。', tag: '执行', tone: 'green' },
        ],
        footnote: '真实控制器会并发、重试并使用 informer 缓存；模拟只保留“观察—比较—行动”的最小闭环。',
      },
      commands: [
        {
          title: '模拟 Deployment 与 ReplicaSet 的两层纠偏',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 固定内存对象：不连接 API Server，也不创建任何进程或容器。
deployment = {"name": "api", "replicas": 3, "replica_set": None}
replica_set = {"name": None, "desired": 0, "pods": []}
next_pod = 2

def reconcile_deployment():
    # Deployment 控制器只关心下层 ReplicaSet 是否存在、模板是否匹配。
    if deployment["replica_set"] is None:
        replica_set["name"] = "api-rs-1"
        replica_set["desired"] = deployment["replicas"]
        deployment["replica_set"] = replica_set["name"]
        print("Deployment控制器=创建 ReplicaSet=api-rs-1 desired=3")
    else:
        print("Deployment控制器=ReplicaSet 已存在，无需动作")

def reconcile_replicas():
    # ReplicaSet 控制器按当前数量计算差值，动作可重复执行而不会多建。
    global next_pod
    missing = replica_set["desired"] - len(replica_set["pods"])
    while missing > 0:
        name = "pod-" + str(next_pod)
        next_pod += 1
        replica_set["pods"].append({"name": name, "phase": "Pending", "node": None})
        print("ReplicaSet控制器=补建 " + name + " phase=Pending")
        missing -= 1

# 第一轮：先建控制器，再把已有 1 个副本补到 3 个。
replica_set["pods"].append({"name": "pod-1", "phase": "Running", "node": "node-a"})
print("第一轮：desired=3 actual=1")
reconcile_deployment()
reconcile_replicas()

# 调度和启动被压缩为固定状态转换，只用于观察控制面之后的责任边界。
for pod in replica_set["pods"]:
    if pod["node"] is None:
        pod["node"] = "node-b" if pod["name"] == "pod-2" else "node-a"
    pod["phase"] = "Running"
    print("节点阶段=" + pod["name"] + " node=" + pod["node"] + " phase=Running")

# 第二轮：外部删除 pod-2，控制器重新观察当前事实，而不是依赖第一次动作。
replica_set["pods"] = [pod for pod in replica_set["pods"] if pod["name"] != "pod-2"]
print("外部事件=删除 pod-2 actual=2")
reconcile_deployment()
reconcile_replicas()
new_pod = replica_set["pods"][-1]
new_pod["node"] = "node-b"
new_pod["phase"] = "Running"
print("再次收敛=" + new_pod["name"] + " node=node-b phase=Running actual=3")
print("最终：Deployment=api ReplicaSet=api-rs-1 actual=3 desired=3")
PY`,
          output: `第一轮：desired=3 actual=1
Deployment控制器=创建 ReplicaSet=api-rs-1 desired=3
ReplicaSet控制器=补建 pod-2 phase=Pending
ReplicaSet控制器=补建 pod-3 phase=Pending
节点阶段=pod-1 node=node-a phase=Running
节点阶段=pod-2 node=node-b phase=Running
节点阶段=pod-3 node=node-a phase=Running
外部事件=删除 pod-2 actual=2
Deployment控制器=ReplicaSet 已存在，无需动作
ReplicaSet控制器=补建 pod-4 phase=Pending
再次收敛=pod-4 node=node-b phase=Running actual=3
最终：Deployment=api ReplicaSet=api-rs-1 actual=3 desired=3
`,
          note: '新 Pod 使用新名字和新身份；自愈恢复的是副本数量与能力，不是被删除实例的原进程。',
        },
        {
          title: '观察水平触发循环为何能处理缺失事件',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 控制器可能错过通知，因此每一轮都重新读取当前副本数。
state = {"desired": 3, "pods": ["pod-1", "pod-2", "pod-3"]}
events = ["ADDED pod-1", "ADDED pod-2", "MODIFIED pod-3", "DELETED pod-2"]

# 只处理一条通知时可能漏掉其他变化，不能假设事件队列永远完整。
received = [events[0]]
print("通知处理：收到 " + received[0] + " 当前实际仍需完整比较")
print("第一次比较：desired=3 actual=3 action=none")

# 模拟其余通知丢失；当前对象仍然真实少了 pod-2。
state["pods"].remove("pod-2")
print("漏掉通知：DELETED pod-2 actual=2")

# 下一轮不依赖“是否收到删除事件”，直接比较当前状态并补建。
missing = state["desired"] - len(state["pods"])
if missing > 0:
    state["pods"].append("pod-4")
    print("完整比较：desired=3 actual=2 action=create pod-4")
print("再比较：desired=3 actual=3 action=none")
print("结果：即使事件丢失，当前差异仍在后续循环中被修复")
PY`,
          output: `通知处理：收到 ADDED pod-1 当前实际仍需完整比较
第一次比较：desired=3 actual=3 action=none
漏掉通知：DELETED pod-2 actual=2
完整比较：desired=3 actual=2 action=create pod-4
再比较：desired=3 actual=3 action=none
结果：即使事件丢失，当前差异仍在后续循环中被修复
`,
          note: '事件通常用于及时唤醒循环，完整状态比较用于保证最终修复。真实实现还会使用 informer 重连和重新列举来刷新缓存。',
        },
      ],
      checkpoints: ['能说明 API Server、etcd、控制器、调度器和 kubelet 各自负责什么', '知道 Deployment 与 ReplicaSet 是两层控制器而不是同一对象', '能解释对象写入成功与 Pod Running 之间的时间差', '知道删除 Pod 后会创建新实例而不是恢复旧进程', '能说明为什么错过事件后完整比较仍可修复漂移', '不会把控制平面理解为一个直接操作所有机器的总控脚本'],
      safety: '示例完全在内存中运行。真实集群应先使用隔离环境和只读诊断，再谨慎执行变更；不要直接修改 etcd，也不要把教学状态机当作控制器实现或生产可用性保证。',
    },
    boundaries: {
      blocks: ['把 apply 成功当作应用已经上线', '依赖一次性脚本维持长期副本数', '让用户直接绕过 API Server 修改 etcd', '忽略控制器重试与状态传播窗口', '把调度绑定误认为容器已经启动'],
      notBlocks: ['应用代码错误与内存泄漏', '镜像仓库或外部依赖不可用', '节点操作系统与内核故障', '容量长期不足', '错误的应用配置和端口', '业务数据一致性与备份策略'],
    },
  },
  /**
   * API 对象模块把“写进集群的东西”拆成身份、模式、版本、并发与生命周期契约。
   * 重点是 resourceVersion 冲突为何是保护机制，以及 watch、generation、finalizer
   * 如何让多个客户端和控制器在共享对象上安全协作。
   */
  {
    id: 'api-objects',
    title: 'API 对象、资源版本与纠偏',
    english: 'API OBJECT / RESOURCEVERSION / CONTROLLER',
    summary: 'API 对象是 Kubernetes 中可命名、可验证、可持久化的协调单元。spec 表达期望，status 报告观察，resourceVersion 提供对象级并发控制，watch 提供持续变化流；当多个写入者基于旧版本修改同一对象时，API Server 用冲突拒绝覆盖，客户端必须重新读取、合并并再次提交。',
    icon: 'layers',
    track: 'kubernetes',
    group: '控制平面',
    dependencies: ['kubernetes-architecture'],
    dependents: [],
    philosophy: {
      problem: '多个用户和控制器会同时读取并修改同一个对象。若后提交的人直接覆盖整份数据，就可能抹掉另一方的副本数、标签或状态更新。集群还需要在进程重启、网络中断和版本升级后，仍能准确知道对象是什么、属于谁，以及哪些清理尚未完成。',
      rejects: 'API 对象不是一份随意保存的 JSON 文本，resourceVersion 也不是递增的版本号或业务版本。客户端不能自行修改它，更不能把它解析成时间或计数。status 也不是用户表达目标的地方；在 status 里写期望副本数不会让控制器按该值运行。',
      counter: 'Kubernetes 把对象建模成“身份 + 类型契约 + 期望 + 观察 + 并发标记”的组合。冲突不是故障，而是阻止静默覆盖的边界：重新读取最新对象，保留他人的修改，再提交自己的差异，才能得到可解释的合并结果。',
    },
    design: {
      abstractions: [
        { name: 'GVK 与资源路径', role: 'Group、Version、Kind 描述对象类型；REST 路径用资源和命名空间定位可访问的集合。' },
        { name: '对象身份', role: 'namespace 与 name 定位命名空间内对象，UID 标识具体实例；删除后重建同名对象会得到新 UID。' },
        { name: 'metadata', role: '保存名称、命名空间、标签、注解、resourceVersion、generation、UID 与所有权等元数据。' },
        { name: 'spec 与 status', role: 'spec 是期望配置，status 是控制器观察结果；不同 Kind 的字段和子资源权限各不相同。' },
        { name: 'Schema 与默认值', role: 'OpenAPI 描述字段结构，校验与默认化在持久化前把输入转换为合法对象。' },
        { name: 'resourceVersion', role: 'API Server 给出的不透明对象版本标记，用于更新前置条件和 watch 断点续传。' },
        { name: 'finalizer 与 ownerReference', role: 'finalizer 阻止对象在清理完成前消失，ownerReference 建立父子所有权与级联删除关系。' },
      ],
      principles: [
        '对象是持久化契约而非临时消息：控制器重启后可以从 API 重新读取目标，不依赖本地会话。',
        '结构先于语义：未知字段、错误类型和非法值应在校验或准入阶段暴露，避免把隐式约定带进运行时。',
        '更新携带旧版本：普通更新通常要求 resourceVersion 与服务器当前值一致，不一致就返回 Conflict。',
        '冲突后重新读取再合并：不能只换一个 resourceVersion 重试，否则可能覆盖别人刚写入的字段。',
        'watch 是增量观察而非永久事实：连接会断开、事件会过期，客户端需要从断点恢复或重新 list。',
        '生命周期需要显式机制：finalizer 处理外部清理，ownerReference 处理级联回收，generation 帮助区分配置变化与状态回报。',
      ],
      history: [
        { when: 'Kubernetes 早期', what: 'API 对象以 v1beta 等版本提供，字段约束和验证逐步完善', why: '让客户端不仅发送数据，还能依据公开结构理解对象和检测不兼容配置。' },
        { when: '2016 起', what: 'watch、resourceVersion、OpenAPI 与结构化对象模型持续成熟', why: '支持高效缓存、并发更新、客户端生成和集群 API 的可演进性。' },
        { when: '2020 年', what: 'Server-Side Apply 进入正式可用阶段', why: '把字段级所有权交给 API Server 管理，减少多方整对象覆盖造成的冲突。' },
      ],
    },
    capabilities: [
      { name: '统一资源模型', sentence: '用 Kind、元数据、spec 和 status 描述内建与自定义工作负载，并复用认证、授权和审计入口。' },
      { name: '并发保护', sentence: '通过 resourceVersion 拒绝基于陈旧快照的更新，降低静默覆盖风险。' },
      { name: '增量观察', sentence: '用 watch 接收对象变化，减少反复全量列举，并支持控制器构建本地缓存。' },
      { name: '生命周期协调', sentence: '用 finalizer 与 ownerReference 安排外部资源清理和父子对象回收顺序。' },
      { name: '字段级协作', sentence: '通过 Server-Side Apply 的字段管理减少不同写入者整份互相覆盖。' },
    ],
    path: {
      intent: '让两个自动化客户端同时把 api Deployment 的副本数从 3 改成 4 和 5，观察第二个客户端如何被 resourceVersion 冲突拦住，再通过重新读取合并成最终值 5。',
      environment: '教学 API；对象只包含 replicas、generation、resourceVersion 和 UID。更新规则按对象级前置条件模拟，不连接真实 API Server，也不读写 etcd。',
      steps: [
        { title: '读取同一份初始对象', description: '两个客户端都 GET api，得到 replicas=3、resourceVersion=7 和同一个 UID。resourceVersion 标记它们看到的是同一份持久化快照。', terms: [{ name: 'GET', definition: '读取对象当前表示的 API 请求；教学模型用一次读取代表返回快照。' }, { name: '对象快照', definition: '某次读取得到的一组字段值，之后服务器可能接受其他人的新写入。' }], state: '客户端 A 与 B 均看到 replicas=3；resourceVersion=7；uid=dep-api。' },
        { title: '客户端 A 提交更新', description: 'A 把 replicas 改为 4，并携带 resourceVersion=7。服务器发现当前仍是 7，接受更新并生成 resourceVersion=8。', terms: [{ name: '前置条件', definition: '更新只有满足指定条件才可执行；这里要求对象版本仍为 7。' }, { name: '资源版本', definition: '由 API Server 管理的不透明标记，用于并发控制和观察断点。' }], state: 'A 成功；replicas=4；resourceVersion=8；generation=2。' },
        { title: '客户端 B 提交旧快照', description: 'B 仍携带 resourceVersion=7 想把 replicas 改为 5。服务器当前已是 8，因此返回 409 Conflict，不修改对象。', terms: [{ name: '409 Conflict', definition: '表示请求与服务器当前状态冲突的 HTTP 状态；常见原因是 resourceVersion 不匹配。' }, { name: '陈旧写入', definition: '基于旧对象快照提交的更新，可能覆盖读取之后发生的变化。' }], state: 'B 被拒绝；对象保持 replicas=4；resourceVersion=8。' },
        { title: 'B 重新读取而不是盲改版本', description: 'B 重新 GET，发现 A 已写入 4。它必须在这个新对象上决定自己的目标，而不是只把 resourceVersion 换成 8 后覆盖全部字段。', terms: [{ name: '重新读取', definition: '获取最新对象作为下一次合并的基础，确保自己能看到已提交变化。' }, { name: '三方合并', definition: '以共同基线、本地修改和服务器修改为依据合并字段，而不是简单二选一。' }], state: 'B 新快照：replicas=4；resourceVersion=8；已看到 A 的修改。' },
        { title: 'B 合并目标并再次提交', description: 'B 的明确目标是 5，因此在最新快照上把 replicas 改为 5，携带 resourceVersion=8。服务器接受并推进到 9。', terms: [{ name: '重试', definition: '在获取新状态并重新判断后再次提交；不是原样重复旧请求。' }, { name: '原子更新', definition: '一次更新在服务器端作为完整条件检查与写入生效，不会只完成一半。' }], state: 'B 成功；replicas=5；resourceVersion=9；generation=3。' },
        { title: 'watch 从断点继续观察', description: '观察者已处理到 resourceVersion=8，连接断开后携带 from=8 重连，收到 8 到 9 之间的变化。事件过期时则需重新 list 再继续 watch。', terms: [{ name: 'watch', definition: '持续订阅资源集合变化的 API 机制，返回新增、修改和删除等事件。' }, { name: '断点续传', definition: '从已知 resourceVersion 继续读取变化，避免只靠内存记住全部历史。' }], state: 'watch from=8；收到 MODIFIED replicas=5 rv=9；观察游标推进到 9。' },
        { title: '配置变化与状态回报分开', description: 'replicas 修改使 generation 增加，控制器随后更新 status.availableReplicas，却不改变 generation。观察者因此能区分“目标变了”和“进度更新了”。', terms: [{ name: 'generation', definition: '通常随 spec 变化递增的元数据，用于标识配置世代。' }, { name: 'status 子资源', definition: '许多控制器用来独立更新状态报告的 API 子资源，权限可与 spec 分开。' }], state: 'spec.replicas=5；generation=3；status 更新后 resourceVersion=10；generation 仍为 3。' },
      ],
      stateTable: {
        columns: ['API 动作', '请求携带版本', '对象结果', '并发或生命周期含义', '客户端下一步'],
        rows: [
          ['A 与 B GET', '读取得到 rv=7', 'replicas=3', '两个快照相同', '分别形成自己的修改'],
          ['A PUT', 'rv=7', '接受；replicas=4；rv=8', '前置条件成立', 'A 完成'],
          ['B 旧快照 PUT', 'rv=7', '409 Conflict；rv 仍为 8', '拒绝陈旧覆盖', 'B 必须重新 GET'],
          ['B 合并后 PUT', 'rv=8', '接受；replicas=5；rv=9', '基于最新事实重试', 'B 完成'],
          ['watch 重连', 'from=8', '收到 rv=9 的 MODIFIED', '从断点补观察', '推进本地游标'],
          ['控制器写 status', '当前最新版本', 'rv=10；generation 不变', '状态变化不等于配置变化', '继续观察可用副本'],
        ],
      },
      summary: 'API 对象把集群状态变成可验证、可并发控制的持久化记录。resourceVersion 拒绝陈旧覆盖，重新读取与合并修复冲突，watch 提供持续观察，finalizer 与所有权管理生命周期；理解这些契约，才能读懂控制器为何能安全协作。',
    },
    costs: [
      { choice: 'resourceVersion 前置条件', cost: '避免静默覆盖，却要求客户端处理 409、重新读取并设计合理的重试上限。', misread: '把 resourceVersion 改成最新值就能安全覆盖整份对象。' },
      { choice: '完整对象更新', cost: '请求直观，但多个写入者容易在无关字段上互相覆盖。', misread: '最后提交的人一定拥有整份对象的最终决定权。' },
      { choice: 'watch 缓存', cost: '降低读取压力并加快控制器响应，却要处理断线、重复事件、缓存滞后和重新列举。', misread: 'watch 连接建立后永远不会漏变化。' },
      { choice: 'finalizer 清理', cost: '能保证外部资源先被回收，却可能让对象长期停留在 Terminating，阻塞删除和重建。', misread: '删除请求发出后对象会立即从 API 消失。' },
    ],
    example: {
      title: '用 resourceVersion 观察冲突、合并与 watch 断点',
      intent: '两个客户端从同一版本出发，先后修改 replicas。第二个客户端先被拒绝，再读取新状态并提交；随后观察者从已处理版本继续 watch，展示并发保护与增量观察的配合。',
      diagram: {
        kind: 'compare',
        title: '旧快照覆盖与重新读取合并的差别',
        caption: '左侧直接重放旧快照会丢失 A 的修改；右侧先读取 rv=8，再在最新对象上表达 B 的目标，冲突才转化为可解释的更新。',
        items: [
          { title: '共同基线 rv=7', detail: 'A 与 B 都看到 replicas=3。', tag: '读取', tone: 'blue' },
          { title: 'A 写入 rv=8', detail: 'replicas 变为 4，服务器推进版本。', tag: '第一次更新', tone: 'green' },
          { title: 'B 使用旧 rv=7', detail: '服务器返回 409，对象保持不变。', tag: '拒绝覆盖', tone: 'orange' },
          { title: 'B 读取并合并 rv=8', detail: '看到 A 的结果，再把明确目标写成 5。', tag: '安全重试', tone: 'blue' },
          { title: '服务器接受 rv=9', detail: 'watch 从 8 继续，收到 replicas=5 的变化。', tag: '持续观察', tone: 'green' },
        ],
        footnote: '教学模拟只处理 replicas 一个字段；真实对象还包含标签、注解、status 和多个子资源。',
      },
      commands: [
        {
          title: '模拟两个客户端基于 resourceVersion 的并发更新',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 固定对象与两份初始快照；resourceVersion 只由模拟服务器递增。
server = {"uid": "dep-api", "replicas": 3, "rv": 7, "generation": 1}
snapshot_a = dict(server)
snapshot_b = dict(server)
print("初始读取 A: replicas=3 rv=7 uid=dep-api")
print("初始读取 B: replicas=3 rv=7 uid=dep-api")

def update(snapshot, desired, client):
    # 更新前同时检查实例身份与版本，防止把同名重建对象误作原对象。
    if snapshot["uid"] != server["uid"]:
        print(client + " 更新=拒绝 reason=uid_changed")
        return False
    if snapshot["rv"] != server["rv"]:
        print(client + " 更新=409 Conflict 请求rv=" + str(snapshot["rv"]) + " 当前rv=" + str(server["rv"]))
        return False
    server["replicas"] = desired
    server["rv"] += 1
    server["generation"] += 1
    print(client + " 更新=接受 replicas=" + str(desired) + " rv=" + str(server["rv"]) + " generation=" + str(server["generation"]))
    return True

# A 先提交成功，B 的旧快照被服务器拒绝，对象内容保持不变。
update(snapshot_a, 4, "A")
update(snapshot_b, 5, "B")

# B 不盲目替换版本，而是重新读取最新对象，再表达自己的明确目标。
latest = dict(server)
print("B 重新读取: replicas=4 rv=8 generation=2")
latest["replicas"] = 5
update(latest, 5, "B")
print("最终对象: uid=" + server["uid"] + " replicas=" + str(server["replicas"]) + " rv=" + str(server["rv"]) + " generation=" + str(server["generation"]))
PY`,
          output: `初始读取 A: replicas=3 rv=7 uid=dep-api
初始读取 B: replicas=3 rv=7 uid=dep-api
A 更新=接受 replicas=4 rv=8 generation=2
B 更新=409 Conflict 请求rv=7 当前rv=8
B 重新读取: replicas=4 rv=8 generation=2
B 更新=接受 replicas=5 rv=9 generation=3
最终对象: uid=dep-api replicas=5 rv=9 generation=3
`,
          note: 'resourceVersion 是服务器管理的对象级并发标记。409 的正确处理是重新读取并重新合并，不是把旧请求的版本字段直接改成最新值。',
        },
        {
          title: '模拟 watch 断点重放与 status 更新',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 固定历史事件，模拟客户端已处理 rv=8 后断线，再从该断点继续观察。
history = [
    {"rv": 7, "type": "ADDED", "detail": "replicas=3", "generation": 1},
    {"rv": 8, "type": "MODIFIED", "detail": "replicas=4", "generation": 2},
    {"rv": 9, "type": "MODIFIED", "detail": "replicas=5", "generation": 3},
    {"rv": 10, "type": "MODIFIED", "detail": "status.availableReplicas=5", "generation": 3},
]
print("已处理基线 rv=8 detail=replicas=4 generation=2")
print("watch 重连 from=8")

# 只重放严格大于游标的事件，重复收到的同一版本不会再次推进游标。
cursor = 8
for event in history:
    if event["rv"] > cursor:
        print("重放 rv=" + str(event["rv"]) + " type=" + event["type"] + " detail=" + event["detail"] + " generation=" + str(event["generation"]))
        cursor = event["rv"]
print("游标推进=8 -> " + str(cursor))
print("结论：rv=9 改变 spec；rv=10 只更新 status，generation 仍为 3")
PY`,
          output: `已处理基线 rv=8 detail=replicas=4 generation=2
watch 重连 from=8
重放 rv=9 type=MODIFIED detail=replicas=5 generation=3
重放 rv=10 type=MODIFIED detail=status.availableReplicas=5 generation=3
游标推进=8 -> 10
结论：rv=9 改变 spec；rv=10 只更新 status，generation 仍为 3
`,
          note: '如果历史事件已经过期，真实客户端必须重新 list 获取当前集合，并从新的资源版本继续 watch；不能假设任意旧断点永远可重放。',
        },
      ],
      checkpoints: ['能说明 resourceVersion 为什么不能让客户端自行填写业务含义', '能解释两个客户端读到同一版本后为何只有一个能先更新成功', '知道 409 之后应重新读取并合并，而不是盲目替换版本号', '能区分 UID 与同名对象重建后的身份', '知道 watch 断线需要断点恢复或重新列举', '能区分 generation 变化与 status 更新'],
      safety: '示例不连接 Kubernetes API。真实自动化应限制更新字段、使用 patch 或服务端字段所有权策略、设置重试上限并记录冲突；不要在诊断时绕过版本检查直接写入存储层。',
    },
    boundaries: {
      blocks: ['多个写入者基于旧快照静默覆盖', '把 status 当成用户期望配置', '直接解析或伪造 resourceVersion', '假设 watch 永不中断', '忽略 finalizer 导致删除悬挂', '用对象名代替 UID 追踪重建前后的实例'],
      notBlocks: ['业务字段本身设计错误', '控制器逻辑死循环或重试风暴', 'etcd 容量与备份问题', '恶意调用者持有过高权限', 'API Server 不可用', '外部系统清理实现有缺陷'],
    },
  },
  /**
   * 命名空间与 RBAC 模块把“谁能对哪个资源做什么”拆成范围、主体、角色和绑定。
   * 示例刻意让一个 ServiceAccount 只能读取一个命名空间的 Pod，
   * 用拒绝结果说明命名空间是组织边界，RBAC 是授权边界，两者都不是完整租户隔离。
   */
  {
    id: 'namespaces-rbac',
    title: '命名空间与 RBAC 权限',
    english: 'NAMESPACE / RBAC / BOUNDARY',
    summary: '命名空间为大多数 API 对象提供名称作用域、策略附着点和团队边界；RBAC 用主体、角色与绑定回答“谁能在什么范围对哪些资源执行哪些动词”。默认拒绝来自缺少允许规则，而不是存在一条显式 deny；命名空间和 RBAC 都不能单独提供网络、进程或数据层面的完整隔离。',
    icon: 'shield',
    track: 'kubernetes',
    group: '控制平面',
    dependencies: ['api-objects'],
    dependents: [],
    philosophy: {
      problem: '共享集群需要让多个团队使用同名资源、分别配置策略，并限制自动化账号只访问自己的对象。若所有身份都能读取或修改整个集群，一次配置错误或凭据泄露就可能影响所有团队。',
      rejects: '命名空间不是虚拟机，也不是天然的安全沙箱。把两个应用放进不同命名空间不会自动阻断网络，更不会隔离内核、宿主机或共享存储。RBAC 的默认拒绝也不是一条 deny 规则：它只是请求没有匹配到允许规则。',
      counter: '权限必须同时回答四个问题：谁在请求、操作什么资源、在哪个范围、执行哪个动词。Role 描述局部允许，RoleBinding 把它授予某范围内的主体；ClusterRole 可复用规则，但只有 ClusterRoleBinding 才把权限授予整个集群范围。',
    },
    design: {
      abstractions: [
        { name: 'Namespace', role: '为多数命名空间级资源提供名称作用域、标签、注解和配额等策略的附着点。' },
        { name: '资源范围', role: '资源可以是集群级或命名空间级；范围决定请求路径和可授权边界。' },
        { name: '主体 Subject', role: '被授权的用户、组或 ServiceAccount；ServiceAccount 为工作负载提供集群内身份。' },
        { name: 'Role', role: '在单个命名空间内定义 apiGroups、resources、verbs，以及可选的 resourceNames 或 URL 子资源规则。' },
        { name: 'ClusterRole', role: '一组可复用权限规则，可在命名空间绑定，也可通过集群绑定授予集群范围能力。' },
        { name: 'RoleBinding', role: '把 Role 或 ClusterRole 的规则授予主体，绑定自身的命名空间决定局部授权范围。' },
        { name: '授权与准入', role: '授权决定 API 动作是否允许，准入再执行租户策略；RBAC 允许后仍可能被准入或网络策略阻断。' },
      ],
      principles: [
        '先判断资源范围：Pod 是命名空间级资源，Node 是集群级资源；不能用命名空间内 Role 授权修改集群对象。',
        '权限由动词和资源共同定义：get 某个 Pod 不包含 list 全部 Pod，更不包含 create、update 或 delete。',
        'RBAC 是加法允许模型：多个允许规则可以叠加，没有显式 deny；默认拒绝表示没有匹配的允许。',
        '绑定位置决定范围：RoleBinding 只在其所在命名空间授权，即使引用 ClusterRole 也不会自动获得全集群权限。',
        '工作负载使用 ServiceAccount：容器通常不应持有长期静态管理员凭据，权限应跟随 Pod 使用的最小身份。',
        'RBAC 只是 API 权限边界：节点逃逸、共享内核、网络可达性、存储访问和数据外泄仍需其他控制共同防护。',
      ],
      history: [
        { when: 'Kubernetes 早期', what: '命名空间与基础多租户组织能力逐步形成', why: '让团队能在同一集群复用资源名称并分别附着策略。' },
        { when: '2017', what: 'RBAC 在 Kubernetes 1.8 达到正式可用', why: '用可组合的角色和绑定替代粗粒度授权，使 API 权限可以被明确审计和收窄。' },
        { when: '2021 年起', what: '绑定 ServiceAccount 令牌等短期凭据机制逐步成熟', why: '减少工作负载长期保存静态 token 的风险，并让凭据与身份生命周期更紧密。' },
      ],
    },
    capabilities: [
      { name: '名称与策略分区', sentence: '用命名空间让团队复用资源名称，并分别设置配额、标签策略和所有权。' },
      { name: '最小权限授权', sentence: '只授予工作负载完成职责所需的资源、动词和范围，减少凭据泄露影响。' },
      { name: '可复用权限模板', sentence: '用 ClusterRole 复用只读或诊断规则，再按命名空间绑定给不同团队。' },
      { name: '集群与局部分离', sentence: '把日常应用权限限制在命名空间，把节点和集群配置留给少量管理员。' },
      { name: '可审计身份', sentence: '通过 ServiceAccount、请求身份与审计记录解释哪个工作负载发起了 API 动作。' },
    ],
    path: {
      intent: '让 team-a 中的 reporter 工作负载读取本命名空间的 Pod，但禁止读取 Secret、创建 Pod 或列出 team-b 的 Pod，从而观察一次请求如何经过主体、动词、资源和范围判断。',
      environment: '教学授权器；规则和绑定均为固定内存数据。请求只用 ServiceAccount、namespace、verb 和 resource 表示，不生成令牌、不访问网络，也不创建真实角色。',
      steps: [
        { title: '确认对象所在范围', description: 'reporter 位于 team-a，准备读取的 Pod 也是 team-a 的命名空间级对象。范围来自资源类型和请求路径，不来自 Pod 标签。', terms: [{ name: '命名空间级资源', definition: '名称只在特定命名空间内唯一的 API 资源，例如 Pod 和 ConfigMap。' }, { name: '集群级资源', definition: '不属于单个命名空间的 API 资源，例如 Node 和 PersistentVolume。' }], state: '请求范围=team-a；资源=Pod；发起主体=team-a/reporter。' },
        { title: '使用工作负载身份发起请求', description: 'Pod 通过 ServiceAccount 获得集群内身份。授权器看到的不是“reporter 这个人”，而是 system:serviceaccount:team-a:reporter 这样的主体标识。', terms: [{ name: 'ServiceAccount', definition: '与命名空间关联、供 Pod 使用的 API 身份。' }, { name: '主体', definition: 'RBAC 规则可以被授予的用户、组或服务账号。' }], state: 'subject=system:serviceaccount:team-a:reporter；verb=get。' },
        { title: '默认没有匹配规则则拒绝', description: '初始状态没有 RoleBinding，reporter 的 get pods 请求找不到允许规则，因此被拒绝。这里不是匹配到一条 deny，而是默认没有 allow。', terms: [{ name: '默认拒绝', definition: '请求未匹配任何允许规则时不被授权，是 RBAC 加法模型的结果。' }, { name: '授权器', definition: '根据身份、动作和策略决定是否允许 API 请求的组件。' }], state: 'get team-a/pods → Denied；reason=no_matching_allow。' },
        { title: '创建只读 Pod Role', description: '在 team-a 定义 Role，只允许 apiGroups=[""]、resources=["pods"]、verbs=["get","list","watch"]。Role 本身不会授予任何人权限。', terms: [{ name: 'Role', definition: '命名空间内的权限规则集合；没有绑定时不会自动生效。' }, { name: '动词 Verb', definition: 'API 动作类别，例如 get、list、watch、create、update 和 delete。' }], state: 'Role=pod-reader；rules=get,list,watch pods；未绑定，仍无权限。' },
        { title: '通过 RoleBinding 在 team-a 授权', description: '创建 RoleBinding，把 pod-reader 绑定给 reporter 服务账号。授权范围由 Binding 所在命名空间决定，因此只影响 team-a。', terms: [{ name: 'RoleBinding', definition: '把角色规则授予某命名空间内主体的授权对象。' }, { name: '规则叠加', definition: '若多个允许规则匹配同一请求，结果仍是允许；不会互相抵消。' }], state: 'Binding=team-a/pod-reader-binding；reporter 获得 team-a 内 Pod 只读权限。' },
        { title: '逐项检查被允许与被拒绝的请求', description: 'get、list、watch team-a Pod 被允许；读取 Secret、创建 Pod 或读取 team-b Pod 都因没有匹配允许规则被拒绝。一个 Role 不会因为“只读”就自动覆盖所有资源。', terms: [{ name: '资源类型', definition: '请求操作的对象类别，例如 pods、secrets 或 deployments。' }, { name: '最小权限', definition: '只授予完成明确职责所必需的资源、动作和范围，而不是整个命名空间的全部能力。' }], state: 'team-a pods 只读→Allowed；secrets get、pods create、team-b pods list→Denied。' },
        { title: '复用 ClusterRole 但保持局部绑定', description: '许多命名空间都需要 pod-reader，可把规则定义为 ClusterRole，再由每个团队分别创建 RoleBinding。它不是把 reporter 提升为集群管理员，也不会自动跨命名空间生效。', terms: [{ name: 'ClusterRole', definition: '可复用的规则集合；既可在局部绑定，也可通过 ClusterRoleBinding 授予集群范围。' }, { name: 'ClusterRoleBinding', definition: '在集群范围授予角色规则的绑定，使用它意味着权限不再受单命名空间限制。' }], state: 'team-a 与 team-b 可分别局部绑定；reporter 仍只能读取 team-a。' },
      ],
      stateTable: {
        columns: ['主体 / 范围', '请求动作', '匹配规则', '结果', '边界解释'],
        rows: [
          ['reporter / team-a', 'get pods', '初始无绑定', 'Denied', '默认拒绝，不是显式 deny'],
          ['reporter / team-a', 'get pods', 'pod-reader + RoleBinding', 'Allowed', '局部只读权限生效'],
          ['reporter / team-a', 'list pods', 'pod-reader + RoleBinding', 'Allowed', 'get 与 list 都需显式声明'],
          ['reporter / team-a', 'get secrets', '无 secrets 规则', 'Denied', 'Pod 只读不包含 Secret'],
          ['reporter / team-a', 'create pods', '无 create 动词', 'Denied', '只读角色不授予写能力'],
          ['reporter / team-b', 'list pods', '绑定不在 team-b', 'Denied', '局部绑定不能跨命名空间'],
          ['管理员 / 集群', 'list nodes', '集群级允许规则', 'Allowed', 'Node 不属于命名空间'],
        ],
      },
      summary: '命名空间划分名称与策略范围，RBAC 通过主体、资源、动词和绑定位置计算 API 权限。默认拒绝来自缺少允许，局部绑定不会自动扩展为集群权限；要形成真正的多租户边界，还必须叠加网络、节点、存储和运行安全措施。',
    },
    costs: [
      { choice: '按团队划分命名空间', cost: '权限、配额和所有权更清晰，却增加跨团队服务地址、共享资源和运维协调成本。', misread: '不同命名空间自动拥有网络与内核隔离。' },
      { choice: '细粒度 RBAC', cost: '泄露影响更小，却要求维护更多角色、绑定和规则测试，也更容易出现遗漏。', misread: '角色写得越长越细，系统就越安全。' },
      { choice: '复用 ClusterRole', cost: '规则模板可以复用，但绑定位置很容易被误解为集群范围。', misread: '引用 ClusterRole 的 RoleBinding 会自动授予所有命名空间。' },
      { choice: '使用 ServiceAccount', cost: '工作负载获得可轮换身份，却需要治理令牌使用、权限挂载和轮换，避免把高权限身份发给每个 Pod。', misread: 'Pod 里的 ServiceAccount 只是显示名称，不影响 API 权限。' },
    ],
    example: {
      title: '用固定规则观察 RBAC 的局部允许与默认拒绝',
      intent: 'reporter 初始没有任何绑定。添加 team-a 的 Pod 只读 Role 和 RoleBinding 后，重新评估五类请求，逐项看到“允许什么”和“仍然拒绝什么”。',
      diagram: {
        kind: 'layers',
        title: '一次 API 请求穿过多层边界',
        caption: '命名空间先确定对象范围，RBAC 再检查主体是否有匹配允许；即使通过，网络与准入策略仍可能阻止实际访问。',
        items: [
          { title: '主体：谁在请求', detail: 'team-a 的 reporter ServiceAccount 提供可审计身份。', tag: '身份层', tone: 'blue' },
          { title: '范围：对象在哪里', detail: 'team-a Pod 与 team-b Pod 虽同名同类，仍处于不同命名空间。', tag: '范围层', tone: 'muted' },
          { title: '规则：资源与动词', detail: 'pod-reader 只包含 pods 的 get、list、watch。', tag: '动作层', tone: 'orange' },
          { title: '绑定：权限授予谁', detail: 'RoleBinding 在 team-a 把规则授予 reporter。', tag: '授权层', tone: 'blue' },
          { title: '后续边界：仍可能阻断', detail: '准入、NetworkPolicy、节点权限和数据保护需另行配置。', tag: '纵深防御', tone: 'green' },
        ],
        footnote: '本模拟只展示 RBAC 授权判断，不把“Allowed”解释为网络一定可达或应用一定安全。',
      },
      commands: [
        {
          title: '模拟 pod-reader 的 RoleBinding 与六类请求',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 固定角色与绑定；空列表表示 RBAC 加法模型中没有匹配的允许规则。
role = {"namespace": "team-a", "rules": [{"resources": {"pods"}, "verbs": {"get", "list", "watch"}}]}
bindings = []

def allowed(subject, namespace, verb, resource):
    # 教学范围只覆盖命名空间级资源，不展开通配符、resourceNames 和 REST 子资源。
    for binding in bindings:
        if binding["namespace"] != namespace or binding["subject"] != subject:
            continue
        if binding["role_namespace"] != namespace:
            continue
        for rule in role["rules"]:
            if resource in rule["resources"] and verb in rule["verbs"]:
                return True
    return False

subject = "system:serviceaccount:team-a:reporter"
requests = [
    ("team-a", "get", "pods"),
    ("team-a", "list", "pods"),
    ("team-a", "get", "secrets"),
    ("team-a", "create", "pods"),
    ("team-b", "list", "pods"),
    ("team-a", "watch", "deployments"),
]

print("阶段=未绑定")
for namespace, verb, resource in requests:
    result = "Allowed" if allowed(subject, namespace, verb, resource) else "Denied"
    print(namespace + " " + verb + " " + resource + " -> " + result)

# 在 team-a 局部绑定同一角色；team-b 不会因此获得 reporter 的权限。
bindings.append({"namespace": "team-a", "subject": subject, "role_namespace": "team-a"})
print("阶段=team-a RoleBinding 已生效")
for namespace, verb, resource in requests:
    result = "Allowed" if allowed(subject, namespace, verb, resource) else "Denied"
    print(namespace + " " + verb + " " + resource + " -> " + result)
print("结论：Denied 表示没有匹配允许；RBAC 不提供显式 deny 规则")
PY`,
          output: `阶段=未绑定
team-a get pods -> Denied
team-a list pods -> Denied
team-a get secrets -> Denied
team-a create pods -> Denied
team-b list pods -> Denied
team-a watch deployments -> Denied
阶段=team-a RoleBinding 已生效
team-a get pods -> Allowed
team-a list pods -> Allowed
team-a get secrets -> Denied
team-a create pods -> Denied
team-b list pods -> Denied
team-a watch deployments -> Denied
结论：Denied 表示没有匹配允许；RBAC 不提供显式 deny 规则
`,
          note: '真实授权还要处理 apiGroups、非资源 URL、resourceNames 和系统组等规则；本模拟只保留范围、资源与动词的最小判断。',
        },
        {
          title: '对比 RoleBinding 与 ClusterRoleBinding 的授权范围',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# ClusterRole 只是可复用规则；真正决定范围的是绑定类型和位置。
rules = [{"resources": {"pods"}, "verbs": {"get", "list", "watch"}}]
subject = "system:serviceaccount:team-a:reporter"
local_bindings = [{"namespace": "team-a", "role": "pod-reader"}]
cluster_bindings = []

def decide(namespace, verb):
    local = any(
        binding["namespace"] == namespace and binding["role"] == "pod-reader"
        for binding in local_bindings
    )
    cluster = any(binding["role"] == "pod-reader" for binding in cluster_bindings)
    matched = any(
        verb in rule["verbs"] and "pods" in rule["resources"]
        for rule in rules
    )
    return (local or cluster) and matched

for namespace in ["team-a", "team-b", "team-c"]:
    result = "Allowed" if decide(namespace, "list") else "Denied"
    print("局部绑定阶段 namespace=" + namespace + " list pods -> " + result)

# 只有 ClusterRoleBinding 才把同一规则授予所有命名空间。
cluster_bindings.append({"role": "pod-reader", "subject": subject})
for namespace in ["team-a", "team-b", "team-c"]:
    result = "Allowed" if decide(namespace, "list") else "Denied"
    print("集群绑定阶段 namespace=" + namespace + " list pods -> " + result)
print("差异来源=绑定范围；ClusterRole 本身不自动授予任何主体")
PY`,
          output: `局部绑定阶段 namespace=team-a list pods -> Allowed
局部绑定阶段 namespace=team-b list pods -> Denied
局部绑定阶段 namespace=team-c list pods -> Denied
集群绑定阶段 namespace=team-a list pods -> Allowed
集群绑定阶段 namespace=team-b list pods -> Allowed
集群绑定阶段 namespace=team-c list pods -> Allowed
差异来源=绑定范围；ClusterRole 本身不自动授予任何主体
`,
          note: '这里故意把 cluster binding 作为范围对照，并不建议给普通应用账号授予跨命名空间读取。生产环境应先从局部最小权限开始。',
        },
      ],
      checkpoints: ['能说出 Pod 与 Node 在资源范围上的区别', '能解释默认拒绝为什么不是一条显式 deny 规则', '知道 Role 只有经过绑定才会授予主体', '能区分 RoleBinding 与 ClusterRoleBinding 的范围', '知道读取 Pod 不自动包含读取 Secret', '能说明命名空间和 RBAC 不能单独构成完整租户隔离'],
      safety: '示例不创建令牌或角色。真实集群应优先使用短期 ServiceAccount 凭据、最小权限和审计，并定期清理无用绑定；测试拒绝结果时使用隔离身份，不要直接使用管理员账号或共享凭据。',
    },
    boundaries: {
      blocks: ['无绑定主体读取工作负载对象', '让局部 RoleBinding 意外跨命名空间生效', '把 Pod 只读权限扩展成 Secret 读取', '把集群管理权限发给普通应用', '把命名空间误当作网络隔离'],
      notBlocks: ['共享内核漏洞与容器逃逸', '节点被攻陷', '错误的 NetworkPolicy 或 CNI 实现', '共享存储的数据越权', '应用主动把数据发往外部', '缺失的审计留存与告警'],
    },
  },
  /**
   * Pod 与控制器模块回答“为什么不能把容器当作可长期依赖的实例”。
   * Pod 是调度、资源和网络边界，控制器用标签与所有权维持副本集合；
   * 模板更新会创建新 ReplicaSet，旧实例逐步退出，身份更替而不是原地修改。
   */
  {
    id: 'pod-controllers',
    title: 'Pod 与工作负载控制器',
    english: 'POD / CONTROLLER / OWNERSHIP',
    summary: 'Pod 是 Kubernetes 调度、网络与容器生命周期管理的基本单位，可以包含一个或多个共享网络和存储视图的容器，但它不是可永久依赖的虚拟机。ReplicaSet、Deployment 等控制器根据标签和所有权维持 Pod 集合，用新实例替换失败或过期实例，并通过模板与副本策略实现扩缩容和发布。',
    icon: 'box',
    track: 'kubernetes',
    group: '工作负载与调度',
    dependencies: ['api-objects'],
    dependents: [],
    philosophy: {
      problem: '应用需要多个副本分摊流量，也需要在实例失败或节点下线后自动补回。如果直接管理每个容器的创建和地址，调用方会被实例生灭绑死；如果多个控制器都修改同一批 Pod，又会重复创建或互相缩减副本。',
      rejects: 'Pod 不是轻量虚拟机，也不是“容器”的同义词。一个 Pod 内共享网络命名空间和部分存储卷，但通常不共享进程命名空间；删除 Pod 后不会保留原容器进程和原 UID。直接手工创建 Pod 可以完成实验，却不能自动维持副本数或按模板发布。',
      counter: '控制器把易变的 Pod 当作可替换成员，把标签、模板和所有权当作稳定契约。ReplicaSet 维持数量，Deployment 管理模板版本与 ReplicaSet 之间的转换；应用则应把状态外置，让任何新副本都能从共享服务或持久存储继续工作。',
    },
    design: {
      abstractions: [
        { name: 'Pod', role: '共享网络、存储卷和生命周期策略的容器组，是调度与 Pod IP 的基本单位。' },
        { name: '应用与初始化容器', role: '应用容器承载长期服务，init container 在主容器前顺序执行；sidecar 可承担日志、代理等辅助职责。' },
        { name: '标签与 Selector', role: '标签是对象元数据，selector 按条件选择 Pod；选择结果决定控制器成员和服务后端。' },
        { name: 'ownerReferences', role: '记录 Pod 等对象的所有者，使删除或替换上层对象时可以级联处理下层对象。' },
        { name: 'ReplicaSet', role: '依据 selector 和模板维持指定数量 Pod，并在成员缺失或多余时纠偏。' },
        { name: 'Deployment', role: '管理 ReplicaSet 与 Pod 模板版本，通过副本策略推进发布、暂停或回滚。' },
        { name: 'Pod 状态与重启策略', role: 'Phase、容器状态、条件和 restartPolicy 描述实例生命周期；控制器依此观察但不把 Pod 当永久身份。' },
      ],
      principles: [
        'Pod 是可替换执行单元：新实例使用新 UID 和通常新的 Pod IP，应用不能把本地进程状态当作唯一事实。',
        '控制器按当前集合纠偏：统计匹配 selector 的 Pod，比较期望数量，再创建或删除，而不是只响应一次创建通知。',
        '所有权明确才可级联：上层控制器通过 ownerReference 声明对下层对象的责任，避免清理时误删独立对象。',
        '模板变化创建新成员集合：ReplicaSet 的 Pod 模板不可变，Deployment 发布新模板时创建新 ReplicaSet，而不是改写旧 Pod。',
        '标签选择需要稳定契约：selector 不能同时匹配多个控制器；标签变更可能使 Pod 脱离原控制器管理。',
        '状态必须外置或可重建：本地临时文件、进程内缓存和固定 Pod IP 都不应成为跨副本恢复的唯一依据。',
      ],
      history: [
        { when: 'Kubernetes 早期', what: 'Pod 成为容器编排与网络模型的基本单元', why: '让紧密协作的容器共享网络和卷，同时保持统一的调度与生命周期边界。' },
        { when: '2016', what: 'ReplicaSet 引入并逐步替代 ReplicationController', why: '用更强的标签选择器描述副本成员，为 Deployment 的模板版本管理打下基础。' },
        { when: '2017 起', what: 'Deployment 与滚动更新策略逐步成熟并普及', why: '把副本数量维持与模板版本发布组合成可声明、可暂停和可回滚的工作负载模型。' },
      ],
    },
    capabilities: [
      { name: '多副本承载', sentence: '用多个 Pod 分摊请求，并在实例失败时由控制器补回容量。' },
      { name: '声明式扩缩容', sentence: '修改 replicas 后由 ReplicaSet 控制器创建或删除成员，而非手工逐台操作。' },
      { name: '模板化发布', sentence: '用 Deployment 和多个 ReplicaSet 管理镜像或配置版本切换。' },
      { name: '协作容器组合', sentence: '把需要共享网络和卷的应用、代理或初始化步骤组织在一个 Pod 中。' },
      { name: '可追踪所有权', sentence: '通过 ownerReference 和标签解释 Pod 由哪个控制器管理，以及删除上层对象时会回收什么。' },
    ],
    path: {
      intent: '用 api Deployment 维持 3 个副本，观察 ReplicaSet 补建 Pod、节点故障导致成员替换，以及修改镜像模板后新旧 ReplicaSet 如何并存并逐步切换。',
      environment: '教学工作负载模型；Pod 只有名称、标签、UID、镜像、节点和状态。调度和启动被压缩为固定动作，不创建容器、不分配真实 IP，也不访问网络。',
      steps: [
        { title: '把副本与模板写进 Deployment', description: 'spec.replicas=3 定义数量，template 定义 app=api、镜像 api:v1 和容器规格。Deployment 先保存目标，随后才创建下层 ReplicaSet。', terms: [{ name: 'Pod 模板', definition: '创建 Pod 时复用的元数据与规格蓝本，不包含已存在 Pod 的状态。' }, { name: 'ReplicaSet 选择器', definition: 'ReplicaSet 用来识别所属 Pod 的标签条件；Deployment 会生成包含模板哈希的选择器。' }], state: 'Deployment=api；replicas=3；template.image=api:v1；尚无 ReplicaSet。' },
        { title: '创建带模板哈希的 ReplicaSet', description: 'Deployment 为模板生成 pod-template-hash，并创建 selector 同时包含 app=api 和该哈希的 ReplicaSet。不同模板版本因此不会互相统计成员。', terms: [{ name: 'pod-template-hash', definition: '由 Pod 模板计算并加入标签与选择器的标识，用于区分 ReplicaSet 版本。' }, { name: '不可变模板', definition: 'ReplicaSet 的 Pod 模板创建后不能原地更新，版本变化需要新对象。' }], state: 'ReplicaSet=api-rs-v1；selector=app=api,template=v1；desired=3。' },
        { title: 'ReplicaSet 补建三个 Pod', description: '控制器发现实际成员为 0，创建三个带匹配标签的 Pod。每个 Pod 都有独立 UID，但共享模板中的镜像和配置。', terms: [{ name: 'UID', definition: 'API Server 为对象实例分配的唯一标识；删除后重建同名对象会得到新 UID。' }, { name: '成员集合', definition: '匹配某控制器 selector 的一组 Pod，是数量纠偏的观察对象。' }], state: 'pod-1、pod-2、pod-3 被创建；owner=api-rs-v1；phase=Pending。' },
        { title: '调度与 kubelet 让 Pod 进入运行', description: '调度器为三个 Pod 选择节点，kubelet 启动容器并回报状态。只有所有必要条件满足，控制器才可以把它们计为可用副本。', terms: [{ name: '节点绑定', definition: 'Pod 被分配到具体节点并写入 spec.nodeName。' }, { name: '可用副本', definition: '控制器依据就绪和运行状态统计、可用于承接流量的成员数量。' }], state: '三个 Pod Running；分布为 node-a 两个、node-b 一个；available=3。' },
        { title: '节点故障触发替换而非修复旧进程', description: 'node-a 下线后，其上的 Pod 最终被判定不可用。Deployment 与 ReplicaSet 仍要求 3 个可用副本，于是创建替代 Pod，由调度器选择健康节点。', terms: [{ name: '不可用判定', definition: '节点失联经过宽限期后，控制器可把其 Pod 视为需要替换的成员。' }, { name: '替代 Pod', definition: '为恢复集合而创建的新对象，不保留被替换 Pod 的 UID 和本地进程状态。' }], state: 'pod-1、pod-2 不可用；创建 pod-4、pod-5；新成员绑定 node-b、node-c。' },
        { title: '修改副本数只改变成员数量', description: '把 replicas 从 3 调到 4，ReplicaSet 控制器基于当前匹配集合补建一个 Pod。该操作不改变镜像模板，也不会创建新的 ReplicaSet。', terms: [{ name: '水平扩缩容', definition: '增加或减少同一工作负载模板的副本数量。' }, { name: '期望副本数', definition: '控制器试图维持的匹配 Pod 数量，与当前可用数量是两个状态。' }], state: 'replicas=4；创建 pod-6；ReplicaSet 仍为 api-rs-v1。' },
        { title: '修改镜像模板创建新 ReplicaSet', description: '把镜像改为 api:v2，Deployment 创建 api-rs-v2，并把期望副本数分配给新集合。旧 ReplicaSet 的期望数逐步降为 0，已有 Pod 不会原地换镜像。', terms: [{ name: '滚动发布', definition: '逐步增加新版本副本、减少旧版本副本的发布过程。' }, { name: '最大不可用', definition: '发布期间允许相对期望副本数减少的可用容量上限。' }], state: 'api-rs-v1 desired=0；api-rs-v2 desired=4；新旧 Pod 可短暂并存。' },
        { title: '新副本就绪后回收旧集合', description: 'api:v2 的新 Pod 通过就绪检查后，旧 Pod 被逐步终止。旧 ReplicaSet 可保留历史模板用于回滚，但不继续持有运行副本。', terms: [{ name: '回滚', definition: '把工作负载切回先前 Deployment 修订所对应的模板与 ReplicaSet 策略。' }, { name: '级联回收', definition: '上层对象删除时，依据所有权和回收策略处理其拥有的下层对象。' }], state: 'v2 可用副本=4；v1 运行副本=0；旧 ReplicaSet 保留为发布历史。' },
      ],
      stateTable: {
        columns: ['工作负载动作', 'Deployment / ReplicaSet', 'Pod 集合变化', '所有权与标签', '关键边界'],
        rows: [
          ['声明 replicas=3', '创建 api-rs-v1', '从 0 补到 3', 'owner=api-rs-v1', '对象写入不等于容器运行'],
          ['Pod 启动', '期望仍为 3', 'Pending → Running', '标签保持匹配', 'Running 与 Ready 仍需区分'],
          ['node-a 故障', '期望仍为 3', '删除不可用成员并补建', '新 Pod 使用新 UID', '不恢复旧进程和本地状态'],
          ['replicas 改为 4', '同一 ReplicaSet', '补建 pod-6', '模板与选择器不变', '扩容不产生新模板版本'],
          ['镜像改为 api:v2', '创建 api-rs-v2', '新 Pod 使用 v2', '哈希区分两个集合', '旧 Pod 不会原地换镜像'],
          ['滚动推进', 'v1 desired→0；v2 desired→4', '新副本就绪后旧副本退出', 'Deployment 拥有 ReplicaSet', '期间允许短暂并存'],
          ['删除 Deployment', '进入回收流程', '下层对象按策略删除', 'ownerReference 链', '外部资源需额外清理机制'],
        ],
      },
      summary: 'Pod 提供调度和容器组合边界，控制器提供长期目标。ReplicaSet 按标签与所有权维持数量，Deployment 用新 ReplicaSet 管理模板版本；实例会被替换，应用必须把共享状态外置，才能从“保住某个 Pod”转向“保住服务能力”。',
    },
    costs: [
      { choice: '多副本', cost: '提高容量与容错，却增加资源消耗、流量分布和状态一致性的复杂度。', misread: '副本越多，应用自动就能线性扩展。' },
      { choice: 'Pod 内多容器', cost: '共享网络和卷便于紧密协作，却使资源统计、日志、升级和故障边界耦合。', misread: '一个 Pod 内所有容器共享同一个进程和所有本地状态。' },
      { choice: '频繁替换 Pod', cost: '有利于环境一致性和故障隔离，却会丢失本地临时状态并增加启动、拉镜像和连接重建成本。', misread: 'Pod 重启或重建后 Pod IP 和本地数据一定保持不变。' },
      { choice: '保留旧 ReplicaSet 历史', cost: '支持快速回滚，却增加 API 对象数量，也需要清理过期修订和避免误用。', misread: '旧 ReplicaSet 有对象就说明旧版本仍在提供流量。' },
    ],
    example: {
      title: '观察 ReplicaSet 成员替换与模板版本分离',
      intent: '先让 api-rs-v1 补建并维持 3 个 Pod，再删除一个成员观察新 UID 替代；最后修改镜像模板，创建 api-rs-v2，并把运行成员从 v1 切换到 v2。',
      diagram: {
        kind: 'flow',
        title: 'Deployment 如何用两层对象管理工作负载',
        caption: 'Deployment 管理模板版本和发布进度，ReplicaSet 维持各自成员数量，Pod 承载实际容器；所有权关系与标签选择贯穿整条链。',
        items: [
          { title: 'Deployment 模板 v1', detail: '声明 replicas=3、镜像 api:v1。', tag: '目标', tone: 'blue' },
          { title: 'ReplicaSet api-rs-v1', detail: '使用 template=v1 标签识别并维持三个成员。', tag: '数量控制', tone: 'orange' },
          { title: 'Pod 实际执行', detail: '独立 UID 的 Pod 被调度并运行 api:v1 容器。', tag: '实例', tone: 'green' },
          { title: '删除或故障触发补建', detail: '控制器创建新 Pod，不复活旧进程或旧 UID。', tag: '可替换', tone: 'orange' },
          { title: '模板 v2 创建新集合', detail: 'api-rs-v2 接收期望副本，v1 逐步缩到 0。', tag: '发布', tone: 'blue' },
        ],
        footnote: '模拟中的标签和版本是简化表示；真实 Deployment 选择器还包含由模板计算的 pod-template-hash。',
      },
      commands: [
        {
          title: '模拟 ReplicaSet 补建、成员删除与幂等比较',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# ReplicaSet 与 Pod 全部放在内存中；UID 是固定序列，不使用随机数或时间。
replica_set = {"name": "api-rs-v1", "desired": 3, "template": "v1", "pods": []}
next_uid = 1

def reconcile(rs, reason):
    global next_uid
    members = [pod for pod in rs["pods"] if pod["labels"]["template"] == rs["template"]]
    missing = rs["desired"] - len(members)
    print(reason + " desired=" + str(rs["desired"]) + " actual=" + str(len(members)) + " missing=" + str(missing))
    if missing == 0:
        print("控制器=无需创建，集合已匹配")
    while missing > 0:
        uid_number = next_uid
        next_uid += 1
        uid = "uid-" + str(uid_number)
        name = "pod-" + str(uid_number)
        pod = {
            "name": name,
            "uid": uid,
            "labels": {"app": "api", "template": rs["template"]},
            "image": "api:" + rs["template"],
            "phase": "Running",
        }
        rs["pods"].append(pod)
        print("控制器=创建 " + name + " uid=" + uid + " image=" + pod["image"])
        missing -= 1
    if missing < 0:
        print("控制器=需要删除多余成员，本模拟不执行破坏动作")

reconcile(replica_set, "首次协调")
# 同一状态再比较一次，不应重复创建。
reconcile(replica_set, "重复协调")
# 外部删除 pod-2；控制器看到新集合，补建一个新 UID 成员。
removed = replica_set["pods"].pop(1)
print("外部删除=" + removed["name"] + " old_uid=" + removed["uid"])
reconcile(replica_set, "删除后协调")
replacement = replica_set["pods"][-1]
print("替代成员=" + replacement["name"] + " new_uid=" + replacement["uid"] + " 旧UID未复用")
print("最终成员=" + ",".join(pod["uid"] for pod in replica_set["pods"]))
PY`,
          output: `首次协调 desired=3 actual=0 missing=3
控制器=创建 pod-1 uid=uid-1 image=api:v1
控制器=创建 pod-2 uid=uid-2 image=api:v1
控制器=创建 pod-3 uid=uid-3 image=api:v1
重复协调 desired=3 actual=3 missing=0
控制器=无需创建，集合已匹配
外部删除=pod-2 old_uid=uid-2
删除后协调 desired=3 actual=2 missing=1
控制器=创建 pod-4 uid=uid-4 image=api:v1
替代成员=pod-4 new_uid=uid-4 旧UID未复用
最终成员=uid-1,uid-3,uid-4
`,
          note: '控制器比较的是当前匹配成员数量，而不是“是否已经执行过创建”。这使重复协调保持幂等，删除后也能补回数量。',
        },
        {
          title: '模拟模板更新后新旧 ReplicaSet 的滚动切换',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 固定两个版本的 Pod；发布动作只改变 ReplicaSet 期望数，不改写旧 Pod 镜像。
old_rs = {"name": "api-rs-v1", "template": "v1", "desired": 3,
          "pods": [{"name": "pod-v1-a", "image": "api:v1"},
                   {"name": "pod-v1-b", "image": "api:v1"},
                   {"name": "pod-v1-c", "image": "api:v1"}]}
new_rs = {"name": "api-rs-v2", "template": "v2", "desired": 0, "pods": []}

def show(stage):
    print(stage + " v1_desired=" + str(old_rs["desired"]) + " v1_actual=" + str(len(old_rs["pods"]))
          + " v2_desired=" + str(new_rs["desired"]) + " v2_actual=" + str(len(new_rs["pods"])))

def reconcile_new():
    # 新 ReplicaSet 根据当前缺口补建，重复调用不会创建超过期望数量的 Pod。
    missing = new_rs["desired"] - len(new_rs["pods"])
    for suffix in ["a", "b", "c", "d"]:
        if missing <= 0:
            break
        name = "pod-v2-" + suffix
        new_rs["pods"].append({"name": name, "image": "api:v2", "ready": True})
        print("v2控制器=创建 " + name + " image=api:v2 ready=True")
        missing -= 1

show("初始")
# Deployment 把副本目标改为 4，并全部交给新模板对应的 ReplicaSet。
old_rs["desired"] = 0
new_rs["desired"] = 4
show("发布目标已更新")
# 新集合先补建并达到期望数量，旧集合暂时仍保留三个运行成员。
reconcile_new()
show("新副本已创建")
# 旧控制器缩容两个成员；新旧实例短暂并存，总实例暂时为 5 个。
old_rs["pods"] = old_rs["pods"][:1]
show("滚动中途")
# 新副本就绪后，最后一个旧成员退出；旧 Pod 的镜像从未被原地修改。
old_image = old_rs["pods"][0]["image"]
print("旧Pod镜像=" + old_image + " 新Pod镜像=" + new_rs["pods"][0]["image"])
old_rs["pods"] = []
show("发布完成")
print("结果=v2 运行副本 4；v1 运行副本 0；旧 ReplicaSet 可保留用于回滚")
PY`,
          output: `初始 v1_desired=3 v1_actual=3 v2_desired=0 v2_actual=0
发布目标已更新 v1_desired=0 v1_actual=3 v2_desired=4 v2_actual=0
v2控制器=创建 pod-v2-a image=api:v2 ready=True
v2控制器=创建 pod-v2-b image=api:v2 ready=True
v2控制器=创建 pod-v2-c image=api:v2 ready=True
v2控制器=创建 pod-v2-d image=api:v2 ready=True
新副本已创建 v1_desired=0 v1_actual=3 v2_desired=4 v2_actual=4
滚动中途 v1_desired=0 v1_actual=1 v2_desired=4 v2_actual=4
旧Pod镜像=api:v1 新Pod镜像=api:v2
发布完成 v1_desired=0 v1_actual=0 v2_desired=4 v2_actual=4
结果=v2 运行副本 4；v1 运行副本 0；旧 ReplicaSet 可保留用于回滚
`,
          note: '模拟让新副本一次全部就绪，以便清楚展示期望数变化；真实 Deployment 会依据 maxSurge、maxUnavailable 和实际就绪状态逐步推进。',
        },
      ],
      checkpoints: ['能解释 Pod 为什么不是可永久依赖的虚拟机', '知道一个 Pod 内容器共享网络但不共享所有命名空间', '能说明 ReplicaSet 如何根据当前成员数量纠偏', '知道删除 Pod 后替代实例会使用新 UID', '能解释 pod-template-hash 如何隔离新旧 ReplicaSet 的成员', '知道模板更新不会原地修改旧 Pod 镜像'],
      safety: '示例不创建容器。真实操作应先用无状态测试工作负载验证扩缩容和发布，设置合理的就绪检查、终止宽限期与回滚条件；不要在 Pod 本地磁盘保存唯一业务数据，也不要手工修改控制器拥有的 Pod 来强行改变数量。',
    },
    boundaries: {
      blocks: ['直接手工创建 Pod 却期望自动维持副本数', '把 Pod IP 或本地进程状态当作永久身份', '让多个控制器 selector 重叠管理同一批 Pod', '把模板更新误认为旧 Pod 会原地换镜像', '删除实例后假设原 UID 和本地数据仍存在'],
      notBlocks: ['应用无法水平扩展的内部状态瓶颈', '共享数据库迁移与数据一致性问题', '镜像拉取失败或外部服务不可用', '节点容量长期不足', '错误的有状态存储设计', '发布期间应用协议不兼容'],
    },
  },
]
