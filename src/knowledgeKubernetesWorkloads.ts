import type { KnowledgeModule } from './knowledgeTypes'

/**
 * Kubernetes 工作负载、调度与发布深潜。
 *
 * 面向零基础学习者，但不把机制简化成命令口诀：每个模块都从“想让系统做什么”出发，
 * 追踪控制器、调度器、kubelet 或运行时如何实现，再明确能力边界与工程权衡。
 * 所有命令都是 Python 标准库离线模拟，不访问集群、网络、时钟或随机源；
 * 输出只来自固定输入，便于逐字复现，同时避免把教学状态机误认为真实集群实现。
 */
export const kubernetesWorkloadModules: KnowledgeModule[] = [
  /**
   * 资源模块先区分“调度时的资源报价”和“运行时的强制边界”。
   * 学习者需要看到：requests 参与配额与摆放，limits 进入 cgroup；
   * QoS 则在内存压力下改变淘汰优先级，而不是给容器发一张免死金牌。
   */
  {
    id: 'resources-qos',
    title: '资源请求、限制与 QoS',
    english: 'REQUEST / LIMIT / QOS',
    summary: 'requests 描述容器期望获得的调度与共享权重，limits 描述运行时允许消耗的上限；Pod 聚合二者后形成资源画像，并决定 Guaranteed、Burstable 或 BestEffort QoS。CPU 超限通常被限流，内存超限可能触发 OOM Kill，QoS 影响节点压力下的处理顺序，但不能替代容量规划。',
    icon: 'chart',
    track: 'kubernetes',
    group: '工作负载与调度',
    dependencies: ['pod-controllers'],
    dependents: [],
    philosophy: {
      problem: '多个应用共享节点时，系统既要知道“把 Pod 放在哪里才不会超卖”，又要在运行时约束失控进程，还要在内存不足时决定先牺牲谁。仅看 CPU 百分比或只看容器是否 Running，都无法回答这三个问题。',
      rejects: 'requests 不是预留给某容器独占的物理内存，limits 也不是节点资源总量；CPU request 达到 100m 不代表立刻获得一个完整核心。QoS 不是应用重要性评分，Guaranteed 也不保证永不被 OOM Kill 或驱逐。',
      counter: '同一份 Pod 清单先被资源模型翻译成可计算的调度需求，再由 kubelet 与 cgroup 翻译成运行时约束。配置正确只能提高可预测性，代码内存泄漏、容量不足或节点故障仍会突破任何应用级承诺。',
    },
    design: {
      abstractions: [
        { name: 'Resource Request', role: '应用向调度器声明的资源需求；也是节点请求记账、配额和 QoS 分类的重要输入。' },
        { name: 'Resource Limit', role: '单个容器允许消耗的资源上限；进入 cgroup 后约束 CPU 时间或内存可分配量。' },
        { name: 'Pod 有效请求', role: '对 CPU、内存等每个资源维度分别计算：普通容器 request 求和，再与 init container 的阶段性峰值取最大值；limit 同理。' },
        { name: 'Init Container 峰值', role: '初始化容器依次运行，Pod 的请求或限制按初始化阶段峰值与普通容器运行阶段需求合成，不是把所有容器无脑相加。' },
        { name: 'cgroup v2', role: 'Linux 内核按容器组实施 CPU、内存等资源控制的对象；CPU 常用 cpu.max 限流，内存常用 memory.max 限制。' },
        { name: 'QoS Class', role: '依据 Pod 中所有应用与初始化容器的 requests/limits 组合推导的 Guaranteed、Burstable 或 BestEffort 类别。' },
        { name: '节点压力与 OOM', role: '节点可用内存下降或 cgroup 内存越界时，内核与 kubelet 分别可能触发 OOM Kill、驱逐或重调度。' },
      ],
      principles: [
        '先理解资源维度再理解数值：CPU 是可压缩资源，超额时进程得到的 CPU 时间变少；内存通常不可压缩，超额时更可能杀死进程而不是让它“慢一点”。',
        'requests 用于放置与记账，limits 用于运行时约束：调度通过不等于应用一定能实时拿到请求量，更不等于可以无限 burst 到 limits。',
        'Pod 资源是聚合结果：多容器 Pod 要逐维求和；init container 要比较初始化峰值与普通容器阶段，sidecar 的长期运行语义还需单独理解。',
        '只写 limit 时，Kubernetes 会在准入时默认 request 等于 limit；显式写清两者能让容量假设可见，也便于识别突发型工作负载。',
        'QoS 由整份 Pod 配置推导：每个容器都设置 CPU/内存 limits 且 request 等于 limit 才形成 Guaranteed；任一容器缺少边界就进入较低类别。',
        '压力处理有层次：cgroup 超限主要杀死越界进程，节点级压力则可能驱逐 Pod；QoS 影响候选优先级，但系统进程、存储压力和节点状态仍会改变结果。',
      ],
      history: [
        { when: '2014—2015', what: 'Kubernetes 早期引入资源请求、限制与 QoS 设计', why: '让共享集群能够用统一对象描述资源需求，并在超配时定义可解释的驱逐顺序。' },
        { when: '2017 起', what: 'CPU request 与 limit 的 cgroup 权重、配额语义逐步稳定', why: '把平台声明落实到 Linux 内核控制，同时暴露 request 与 limit 之间并非同一约束的问题。' },
        { when: '2020 年代', what: 'cgroup v2、Pod 资源请求聚合与 sidecar 生命周期支持持续演进', why: '更准确地表达初始化、常驻辅助容器和现代 Linux 运行时中的资源边界。' },
      ],
    },
    capabilities: [
      { name: '容量声明', sentence: '用 requests 告诉调度器应用需要多少 CPU 与内存，减少仅凭副本数猜测容量的做法。' },
      { name: '失控隔离', sentence: '用 limits 与 cgroup 阻止单个容器无限占用 CPU 时间或无限申请内存。' },
      { name: '压力分级', sentence: '用 QoS 区分边界完整、可突发和无显式资源边界的 Pod，辅助节点压力决策。' },
      { name: '成本归因', sentence: '把资源请求与实际使用分开观察，判断超配来自调度保守、配额限制还是运行峰值。' },
      { name: '故障定位', sentence: '通过退出原因、throttling 指标与节点事件区分 CPU 限流、内存 OOM 和驱逐。' },
    ],
    path: {
      intent: '为一个双容器 Pod 声明资源，把它送入多节点集群，并观察一次内存越界和一次节点资源不足如何产生不同结果。',
      environment: '教学状态机；CPU、内存都以毫核和 MiB 为整数计数，cgroup 行为按规则模拟，不读取宿主机内核，也不执行任何 kill。',
      steps: [
        { title: '把业务需求写成 requests', description: '先测量常态 CPU 与内存，再给应用容器写 request。调度器将使用它比较节点可分配资源；它不是对真实用量的测量，也不是独占锁。', terms: [{ name: 'millicore', definition: 'CPU 的千分之一核心，100m 表示 0.1 核的调度计量。' }, { name: '可分配资源', definition: '节点容量扣除系统与 kubelet 预留后，可供 Pod 请求使用的资源口径。' }], state: 'api request=(250m,128Mi)；worker request=(100m,64Mi)。' },
        { title: '为每个容器设置 limits', description: 'limits 给出运行时上界。CPU 超额会在 cgroup 配额周期内被限流；内存超额使分配失败，内核可能选择进程执行 OOM Kill。', terms: [{ name: 'CPU throttling', definition: 'cgroup 的 CPU 时间配额耗尽后，组内任务被迫等待下一周期。' }, { name: 'OOM Kill', definition: '内存不足时内核杀死进程以回收内存；被杀对象不一定等同整个 Pod。' }], state: 'api limit=(500m,256Mi)；worker limit=(200m,128Mi)。' },
        { title: '计算 Pod 级资源画像', description: '普通运行阶段把两个容器的 CPU、内存分别相加。若还有 init container，则要比较初始化峰值和普通阶段，再得到 Pod 的有效请求与限制。', terms: [{ name: '有效请求', definition: '调度器为一个 Pod 记账的聚合请求，可能大于任一单容器请求。' }, { name: '初始化峰值', definition: '按顺序执行的 init container 对 Pod 资源需求形成的阶段性最大值。' }], state: 'Pod request=(350m,192Mi)；Pod limit=(700m,384Mi)。' },
        { title: '推导 QoS 类别', description: '检查所有容器是否都有 CPU/内存 limit，以及 request 是否逐项等于 limit。任一条件不满足就不能是 Guaranteed，但仍可能有请求而属于 Burstable。', terms: [{ name: 'Guaranteed', definition: '所有容器都设置 CPU/内存限制且请求等于限制的 QoS 类别。' }, { name: 'Burstable', definition: '未达到 Guaranteed、但至少一个容器设置 CPU 或内存 request 的类别。' }], state: '本例 request≠limit → Burstable。' },
        { title: '准入、调度与请求记账', description: '准入检查配额与字段合法性；调度器只把 Pod 放到请求可容纳的节点；绑定后节点记账该请求。请求没有被转换成永久物理预留。', terms: [{ name: 'ResourceQuota', definition: '限制命名空间中资源请求、限制或对象数量的准入约束。' }, { name: '绑定', definition: '把 Pod 的 spec.nodeName 写入目标节点；绑定完成仍不等于容器已启动。' }], state: '通过配额后进入 Pending，等待调度与绑定。' },
        { title: '由运行时落实 cgroup 边界', description: 'kubelet 拉起容器后，运行时把 CPU 与内存限制落实到 cgroup。应用可以在边界内变化；真实使用量继续由指标系统采集。', terms: [{ name: 'cpu.max', definition: 'cgroup v2 中描述一个周期内 CPU 配额与周期长度的控制文件。' }, { name: 'memory.max', definition: 'cgroup v2 中限制内存组可分配内存的控制文件。' }], state: 'CPU 配额=500m；内存上界=256Mi；实际使用独立变化。' },
        { title: '在越界与压力下分类处理', description: '单容器超过 memory.max 时可能被 OOM Kill；节点整体内存紧张时，kubelet 还会根据 QoS、实际使用与节点压力驱逐 Pod。重启或重新调度都不能修复泄漏代码。', terms: [{ name: '驱逐', definition: 'kubelet 为缓解节点压力主动终止 Pod，并通常由控制器创建替代实例。' }, { name: '重启策略', definition: '容器退出后由 kubelet 按 Always、OnFailure 或 Never 决定是否重启。' }], state: '越界→OOM；节点压力→可能 Evicted；QoS 只影响排序。' },
      ],
      stateTable: {
        columns: ['阶段 / 输入', '资源计算', '平台动作', '可见状态', '反直觉分支'],
        rows: [
          ['双容器 api+worker', 'request 逐维相加=(350m,192Mi)', '调度器按聚合请求记账', 'Pending → 可被绑定', '不是只取较大容器'],
          ['request≠limit', '两类边界都不完整相等', '归为 Burstable', 'Pod 可运行', '有 limits 也可能不是 Guaranteed'],
          ['节点剩余 300m', '小于 Pod request 350m', '过滤该节点', '保持 Pending', '节点总容量够也可能因预留而不够'],
          ['CPU 用量超过 request', '仍可能低于 limit', '不会仅因超 request 杀死容器', '延迟或 throttling 增加', 'request 不是硬上限'],
          ['内存超过 memory.max', '越过容器运行时边界', '内核可能 OOM Kill', '容器重启或失败', 'QoS 高也不能豁免'],
          ['节点内存压力', '比较实际使用与 QoS 等信号', 'kubelet 可能驱逐', 'Evicted 后再创建', '驱逐不等于应用做错了配置'],
        ],
      },
      summary: 'requests 是调度与共享资源语言，limits 是 cgroup 运行时边界，QoS 是压力下的分类信号。三者相互关联，但不能互相替代：先声明需求，再验证真实用量，最后用事件与指标解释限流、OOM 和驱逐。',
    },
    costs: [
      { choice: '提高 requests', cost: '更容易获得稳定资源与调度位置，但会降低集群装箱率，低利用率应用可能长期 Pending。', misread: '“request 越大，运行时就一定用得越多。”' },
      { choice: '提高 limits', cost: '给突发留出空间，但会扩大单 Pod 对节点的潜在冲击，并可能改变 QoS 与突发行为。', misread: '“limit 是应用会消耗的量，写得越高越安全。”' },
      { choice: '追求 Guaranteed', cost: '边界完整、可解释性强，但要求 request=limit，可能牺牲弹性并增加闲置。', misread: '“Guaranteed 表示绝不会被杀。”' },
      { choice: '忽略 requests', cost: '配置更短，但调度器无法可靠判断拥挤程度，BestEffort Pod 在压力下更脆弱。', misread: '“没有 request 就说明应用不占资源。”' },
    ],
    example: {
      title: '从 Pod 资源清单到 QoS、cgroup 与节点记账',
      intent: '三组固定实验分别展示 QoS 分类、运行时越界和可分配资源不足。脚本不读取 /sys，也不杀进程，只用整数规则复现平台会做什么。',
      diagram: {
        kind: 'compare',
        title: '同一资源声明在三个层面的不同含义',
        caption: '配置先进入 Pod 模型，再分别影响调度、运行时和压力处理；不能把其中一层的结果直接当成另一层的保证。',
        items: [
          { title: 'requests：放置与共享', detail: '聚合后参与节点筛选与配额；不等于独占预留。', tag: '调度层', tone: 'blue' },
          { title: 'limits：运行时上界', detail: '由 kubelet/运行时写入 cgroup；CPU 限流，内存越界可能 OOM。', tag: '运行时层', tone: 'orange' },
          { title: 'QoS：压力分类', detail: 'Guaranteed、Burstable、BestEffort 影响候选顺序。', tag: '节点层', tone: 'green' },
          { title: '可分配资源', detail: '节点容量扣除预留后才是 Pod 请求可比较的口径。', tag: '容量层', tone: 'muted' },
          { title: '真实用量', detail: '由指标采集，是判断浪费、泄漏与限流的证据。', tag: '观测层', tone: 'blue' },
        ],
        footnote: 'QoS 高只能改善压力下的相对处境，不能修复容量不足、内存泄漏或错误的资源声明。',
      },
      commands: [
        {
          title: '按整份 Pod 配置推导三种 QoS',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import json, sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 固定三个 Pod，只使用标准库和内存字典。
# 每个容器记录 CPU/内存 request 与 limit；None 表示该字段未设置。
pods = {
    "api": [
        {"cpu_request": 250, "cpu_limit": 250, "memory_request": 128, "memory_limit": 128},
    ],
    "worker": [
        {"cpu_request": 100, "cpu_limit": 500, "memory_request": 64, "memory_limit": 256},
    ],
    "scratch": [
        {"cpu_request": None, "cpu_limit": None, "memory_request": None, "memory_limit": None},
    ],
}

def pod_request(containers):
    # 教学场景没有 init container：普通容器的同一资源维度求和。
    cpu = sum(c["cpu_request"] or 0 for c in containers)
    memory = sum(c["memory_request"] or 0 for c in containers)
    return cpu, memory

def classify(containers):
    # Guaranteed 要求每个容器都有 CPU/内存 limit，且逐项 request=limit。
    complete_equal = all(
        c["cpu_limit"] is not None
        and c["memory_limit"] is not None
        and c["cpu_request"] == c["cpu_limit"]
        and c["memory_request"] == c["memory_limit"]
        for c in containers
    )
    if complete_equal:
        return "Guaranteed"
    # 任一容器设置 CPU 或内存 request，即可归为 Burstable。
    has_request = any(
        c["cpu_request"] is not None or c["memory_request"] is not None
        for c in containers
    )
    return "Burstable" if has_request else "BestEffort"

for name, containers in pods.items():
    cpu, memory = pod_request(containers)
    qos = classify(containers)
    encoded = json.dumps({"cpu_milli": cpu, "memory_mib": memory}, ensure_ascii=False, sort_keys=True)
    print(f"Pod={name} request={encoded} QoS={qos}")
print("判断顺序：先检查完整相等边界，再检查是否存在请求，最后才是 BestEffort")
PY`,
          output: `Pod=api request={"cpu_milli": 250, "memory_mib": 128} QoS=Guaranteed
Pod=worker request={"cpu_milli": 100, "memory_mib": 64} QoS=Burstable
Pod=scratch request={"cpu_milli": 0, "memory_mib": 0} QoS=BestEffort
判断顺序：先检查完整相等边界，再检查是否存在请求，最后才是 BestEffort
`,
          note: '只设置 limits 的容器会在准入时得到与 limits 相等的默认 requests；本模拟直接展示已默认化的结果。真实 QoS 还必须检查 init containers。',
        },
        {
          title: '区分 CPU 限流与内存 OOM',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 用固定整数模拟 cgroup 判定，不读取 cpu.max，也不执行 kill。
pod = {"name": "api", "cpu_request_milli": 250, "cpu_limit_milli": 500,
       "memory_request_mib": 128, "memory_limit_mib": 256, "qos": "Burstable"}
print(f"Pod={pod['name']} QoS={pod['qos']} CPU_request={pod['cpu_request_milli']}m CPU_limit={pod['cpu_limit_milli']}m")

# CPU 是可压缩资源：达到 limit 才可能因为配额耗尽而限流。
for demand in [pod["cpu_request_milli"], pod["cpu_limit_milli"], pod["cpu_limit_milli"] + 1]:
    if demand <= pod["cpu_limit_milli"]:
        print(f"CPU需求={demand}m <= limit：未因越界被限制")
    else:
        print(f"CPU需求={demand}m > limit：cgroup 配额耗尽后可被限流")

# 内存通常不可压缩：超过 memory.max 时，内核可杀死越界 cgroup 内进程。
for allocation in [pod["memory_limit_mib"], pod["memory_limit_mib"] + 1]:
    if allocation > pod["memory_limit_mib"]:
        print(f"内存申请={allocation}Mi > limit：模拟 OOM Kill")
    else:
        print(f"内存申请={allocation}Mi <= limit：未越过 memory.max")

print("request 不是硬上限；QoS 只影响节点压力下的候选顺序，不豁免 cgroup 边界")
PY`,
          output: `Pod=api QoS=Burstable CPU_request=250m CPU_limit=500m
CPU需求=250m <= limit：未因越界被限制
CPU需求=500m <= limit：未因越界被限制
CPU需求=501m > limit：cgroup 配额耗尽后可被限流
内存申请=256Mi <= limit：未越过 memory.max
内存申请=257Mi > limit：模拟 OOM Kill
request 不是硬上限；QoS 只影响节点压力下的候选顺序，不豁免 cgroup 边界
`,
          note: 'CPU 达到 limit 并不必然持续限流；关键是一个配额周期内是否耗尽允许的 CPU 时间。OOM 的具体受害进程由内核在越界 cgroup 中选择。',
        },
        {
          title: '观察容量足够但可分配资源不足的 Pending',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 节点容量先扣除系统/kubelet 预留，再与 Pod 聚合 request 比较。
node = {"capacity_cpu": 4000, "capacity_memory": 8192,
        "reserved_cpu": 400, "reserved_memory": 1024,
        "used_request_cpu": 1000, "used_request_memory": 2048}
node["allocatable_cpu"] = node["capacity_cpu"] - node["reserved_cpu"]
node["allocatable_memory"] = node["capacity_memory"] - node["reserved_memory"]
node["free_request_cpu"] = node["allocatable_cpu"] - node["used_request_cpu"]
node["free_request_memory"] = node["allocatable_memory"] - node["used_request_memory"]
print(f"节点 capacity CPU={node['capacity_cpu']}m memory={node['capacity_memory']}Mi")
print(f"节点 allocatable CPU={node['allocatable_cpu']}m memory={node['allocatable_memory']}Mi")
print(f"剩余请求额度 CPU={node['free_request_cpu']}m memory={node['free_request_memory']}Mi")

# 大 Pod 的 request 恰好等于物理 capacity，但仍超过 allocatable 的剩余额度。
large = {"name": "large", "cpu": 3000, "memory": 4096}
small = {"name": "small", "cpu": 2000, "memory": 3072}
for pod in [large, small]:
    fits = pod["cpu"] <= node["free_request_cpu"] and pod["memory"] <= node["free_request_memory"]
    state = "可绑定" if fits else "Pending"
    print(f"Pod={pod['name']} request CPU={pod['cpu']}m memory={pod['memory']}Mi -> {state}")
print("capacity 是硬件口径；allocatable 与已用 requests 才决定本次能否放下")
PY`,
          output: `节点 capacity CPU=4000m memory=8192Mi
节点 allocatable CPU=3600m memory=7168Mi
剩余请求额度 CPU=2600m memory=5120Mi
Pod=large request CPU=3000m memory=4096Mi -> Pending
Pod=small request CPU=2000m memory=3072Mi -> 可绑定
capacity 是硬件口径；allocatable 与已用 requests 才决定本次能否放下
`,
          note: '真实调度还会考虑亲和性、污点、卷拓扑、DaemonSet 等占用以及并发绑定；本模拟只隔离资源请求筛选这一条规则。',
        },
      ],
      checkpoints: ['能分别用一句话解释 request、limit 与 QoS', '知道多容器 Pod 的请求需要按资源维度聚合', '能解释 CPU 超 request 与内存超 limit 的不同结果', '知道 Guaranteed 不保证免于 OOM 或驱逐', '能区分节点 capacity、allocatable 与剩余请求额度'],
      safety: '真实调参应基于指标、压测与配额进行，并保留安全余量。不要为消除 Pending 盲目降低 requests，也不要为提高 QoS 把 limit 当作预计用量；内存密集型应用还应配置合理的 JVM/运行时堆上限。',
    },
    boundaries: {
      blocks: ['仅设置 limits 而误以为 QoS 已完整', '把 CPU request 当成硬配额', '忽略 init container 的峰值资源需求', '把节点 capacity 直接当作 Pod 可申请资源', '只靠 Guaranteed 应对内存泄漏'],
      notBlocks: ['应用自身的内存泄漏或无限递归', '节点宕机与内核故障', '集群容量长期不足', '错误配置 LimitRange 或 ResourceQuota', '存储 IO 争用与网络拥塞'],
    },
  },
  /**
   * 调度模块把“选中节点”和“应用已经运行”拆开。
   * 先过滤硬约束，再对可行节点评分，最后异步绑定；每一步都可能留下 Pending，
   * 因此事件与 nodeName 必须结合阅读，不能只凭一次调度成功宣布发布成功。
   */
  {
    id: 'scheduling',
    title: '调度器与节点选择',
    english: 'SCHEDULER / FILTER / SCORE',
    summary: '调度是给尚未绑定节点的 Pod 寻找放置位置的两阶段决策：先用硬约束过滤不可行节点，再按亲和性、资源分布等偏好给可行节点评分。调度成功只表示 Pod 被绑定到某节点，随后 kubelet 的准入、卷挂载、镜像拉取和探针仍可能失败。',
    icon: 'target',
    track: 'kubernetes',
    group: '工作负载与调度',
    dependencies: ['pod-controllers', 'resources-qos'],
    dependents: [],
    philosophy: {
      problem: '集群有不同 CPU、内存、区域、磁盘和网络条件的节点，应用又可能要求特定拓扑或避开某些节点。调度器需要在硬约束与软偏好之间找到可解释的位置，还要接受节点状态和缓存变化。',
      rejects: '调度不是轮询分配，也不是简单地选“剩余内存最多”的节点；节点亲和性不是强制排除，Pod 反亲和性也不保证绝对均衡。Pod 被调度成功不等于镜像已拉取、卷已挂载或 readiness 已通过。',
      counter: 'Kubernetes 把决策拆成 Predicates/Filter 与 Priorities/Score 等插件阶段，并让绑定异步发生。理解这些边界后，Pending 不再是一个模糊错误，而能定位到标签不匹配、污点、资源不足、卷拓扑或节点失联。',
    },
    design: {
      abstractions: [
        { name: 'Scheduling Queue', role: '保存等待调度的 Pod，并按优先级、时间与就绪条件组织后续处理。' },
        { name: 'Node Snapshot', role: '调度器从缓存获得的节点资源、标签、污点与 Pod 占用快照，而非直接读取每个节点。' },
        { name: 'Filter / Predicate', role: '判断节点是否满足硬约束；任一必需条件不满足，节点即被排除。' },
        { name: 'Score / Priority', role: '仅在可行节点之间比较偏好程度，不能把不满足硬约束的节点“评分救回来”。' },
        { name: 'Affinity / Anti-affinity', role: '声明期望靠近或远离的拓扑集合，并区分必须满足与尽量满足的语义。' },
        { name: 'Taint / Toleration', role: '节点用污点表达不适配的负载，Pod 用容忍声明可接受的污点组合。' },
        { name: 'Bind', role: '把选定节点写入 Pod 的 spec.nodeName；这是调度决策落地，不是应用就绪。' },
      ],
      principles: [
        '先过滤再评分：资源、节点选择器、必需亲和性和污点容忍属于可行性问题；评分只能在剩余节点中改变偏好顺序。',
        'Pod 的 nodeName 由调度器或绑定插件写入：用户通常不直接修改它来“手动调度”，因为绕过调度可能跳过资源与约束检查。',
        '必需亲和性与反亲和性必须同时成立：相互冲突的规则会让候选集合为空，而不是由评分阶段自动折中。',
        '软亲和性允许失败：preferred 规则无法满足时仍可调度，但相关节点会失去相应加分。',
        '绑定是异步且基于快照的决策：节点状态、缓存或资源占用可能在决策后变化，所以需要事件、条件和 kubelet 结果共同确认。',
        '抢占以优先级和可驱逐性为条件：高优先级 Pod 可能促使低优先级受害者退出，但不保证立即获得资源，也不能抢占不可驱逐对象。',
      ],
      history: [
        { when: '2014—2015', what: '早期调度器围绕 predicates 与 priorities 组织节点筛选', why: '把“能否放置”和“更愿意放置在哪里”分成可扩展插件，便于独立演进。' },
        { when: '2018—2020', what: '调度框架与卷绑定、拓扑等决策逐步解耦', why: '让存储与网络约束能在正确阶段影响节点选择，而不是启动后再随机失败。' },
        { when: '2021 起', what: '抢占、队列与多调度器插件持续完善', why: '在共享集群中兼顾优先级、吞吐和公平性，同时保留失败原因可观测性。' },
      ],
    },
    capabilities: [
      { name: '硬约束筛选', sentence: '排除资源不足、标签不符、污点不容忍或必需拓扑冲突的节点。' },
      { name: '偏好评分', sentence: '在多个可行节点之间比较资源均衡、亲和性与拓扑偏好。' },
      { name: '拓扑分布', sentence: '用 zone、hostname 等 topologyKey 表达跨故障域部署意图。' },
      { name: '节点角色隔离', sentence: '用污点与容忍把普通业务、系统组件和专用硬件负载分开。' },
      { name: '调度诊断', sentence: '通过 Pending 事件和条件识别是约束过严、容量不足还是绑定后运行失败。' },
    ],
    path: {
      intent: '把一个需要专用盘、生产区域标签且不能与自身挤在同一节点的 Pod 调度进三节点集群，观察候选如何减少。',
      environment: '教学调度器；节点和 Pod 数据均为固定内存对象，亲和性、污点、资源与卷规则逐条判断，不连接 Kubernetes API。',
      steps: [
        { title: 'Pod 进入等待调度队列', description: '控制器创建 Pod 后，若 spec.nodeName 为空，调度器尝试处理。此时应关注调度器是否在运行、Pod 是否被其他机制拦截，而不是先怀疑应用代码。', terms: [{ name: 'Pending', definition: '尚未完成调度或尚未被节点接管的常见 Pod 状态。' }, { name: '调度队列', definition: '调度器内部等待处理的工作集合，不是节点上的运行队列。' }], state: 'Pod=api-2；nodeName 为空；phase=Pending。' },
        { title: '读取节点与 Pod 缓存快照', description: '调度器使用 API 缓存建立候选视图，包括节点可分配资源、已有 Pod、标签、污点和卷信息。缓存可能略微滞后。', terms: [{ name: '调度快照', definition: '一次调度周期使用的节点状态视图，用于一致地筛选与评分。' }, { name: '可分配资源', definition: '节点扣除系统预留后可用于 Pod 请求的资源量。' }], state: '候选节点=n1,n2,n3；资源与标签已装载。' },
        { title: '过滤节点选择器与污点', description: 'nodeSelector 和必需的 nodeAffinity 是硬匹配；节点污点若没有对应容忍，节点也会被排除。role=api 并不自动获得污点容忍。', terms: [{ name: 'NodeSelector', definition: '按节点标签键值进行硬匹配的最简单节点选择方式。' }, { name: 'Toleration', definition: 'Pod 对某类节点污点的显式容忍声明。' }], state: 'n3 缺少 zone=prod → 过滤。' },
        { title: '过滤资源与卷拓扑', description: '调度器比较聚合 requests 与节点可分配额度，并检查所需存储是否能满足拓扑。仅有 CPU 足够，不代表卷能挂到该节点。', terms: [{ name: 'Volume Binding', definition: '把 Pod 的卷声明与具体存储卷及可用节点关联的决策。' }, { name: '拓扑约束', definition: '要求存储与计算位于相同或指定故障域的规则。' }], state: 'n1 缺少 fast-disk 区域 → 过滤；n2 暂存。' },
        { title: '检查必需反亲和性', description: '必需 Pod 反亲和性要求避开带有匹配标签 Pod 的拓扑。若 n2 上已有同应用副本且 topologyKey=hostname，该节点也被排除。', terms: [{ name: 'Pod 反亲和性', definition: '声明不应与匹配 Pod 位于同一拓扑域的规则。' }, { name: 'topologyKey', definition: '定义“同一个域”的节点标签键，例如 kubernetes.io/hostname 或 zone。' }], state: '若 n2 冲突则无候选；本场景假设 n2 不冲突，仍可行。' },
        { title: '对可行节点评分并选择', description: '评分比较资源余量、软亲和性等偏好。所有硬过滤必须先通过；评分最高的节点成为首选，同分时的内部排序可能受实现影响。', terms: [{ name: 'Score', definition: '调度插件对可行节点给出的偏好分数。' }, { name: '首选节点', definition: '评分阶段选中的节点，仍需经过绑定与节点端确认。' }], state: 'n2 得分最高 → 选择 n2。' },
        { title: '异步绑定并等待 kubelet', description: '调度器或绑定插件写入 nodeName。kubelet 随后还要通过准入、拉取镜像、配置卷并启动容器；任何一步失败都可能留下已调度但未运行的 Pod。', terms: [{ name: '绑定', definition: '把 Pod 与目标节点关联的 API 写入动作。' }, { name: 'Kubelet 准入', definition: 'kubelet 决定是否接纳 Pod 到本节点的检查，绑定成功并不代表已通过。' }], state: 'spec.nodeName=n2；后续可能 Running、ImagePullBackOff 或重新 Pending。' },
      ],
      stateTable: {
        columns: ['检查阶段', 'n1', 'n2', 'n3', '状态含义'],
        rows: [
          ['zone=prod 硬亲和', '通过', '通过', '标签缺失，过滤', '先满足硬约束'],
          ['fast-disk 卷拓扑', '不满足，过滤', '满足', '满足但已过滤', '卷约束可决定候选'],
          ['资源 requests', '即使资源够也已出局', '通过', '即使资源够也已出局', '过滤不可被评分覆盖'],
          ['必需反亲和', '无需再评分', '不冲突，通过', '无需再评分', '冲突会直接减少候选'],
          ['软资源均衡评分', '不参与', '得分最高', '不参与', '只在可行节点间比较'],
          ['绑定后 kubelet 拉镜像', '—', '失败可进入 ImagePullBackOff', '—', '已调度不等于运行'],
        ],
      },
      summary: '调度是一条“可行性优先、偏好其次、绑定后继续验证”的链路。排查 Pending 要沿筛选原因逐层前进；排查已绑定但不运行，则要把视线从调度器转到 kubelet、镜像、存储、网络和探针。',
    },
    costs: [
      { choice: '大量硬约束', cost: '放置意图精确，但候选集合可能很小，扩容、故障转移和资源利用率都会受影响。', misread: '“约束写得越具体，系统越稳定。”' },
      { choice: '强反亲和与打散', cost: '降低同故障域同时受损的概率，但可能阻止缩容或让 Pod 在紧张集群中长期 Pending。', misread: '“反亲和性保证所有副本永远分散。”' },
      { choice: '高优先级与抢占', cost: '保护关键任务及时获得资源，但会增加低优先级任务被中断和抖动的风险。', misread: '“优先级高就一定能抢到节点并运行。”' },
      { choice: '自定义评分', cost: '能优化特定目标，却增加配置、版本兼容和预测难度，不能修复硬约束冲突。', misread: '“只要调高分数，资源不足也能调度。”' },
    ],
    example: {
      title: '逐节点执行过滤、评分与绑定',
      intent: '第一组脚本打印每个节点被过滤的真实原因；第二组在可行节点上做简化评分；第三组把绑定成功与 kubelet 就绪明确分成两个阶段。',
      diagram: {
        kind: 'flow',
        title: '从 Pending 到 Running 的两次决策',
        caption: '蓝色部分是调度器的节点选择，橙色部分是节点端接管；两个阶段共享 Pod 对象，但成功条件不同。',
        items: [
          { title: '队列与快照', detail: '读取 Pod 需求、节点标签、污点、资源与已有 Pod。', tag: '输入', tone: 'muted' },
          { title: 'Filter 硬约束', detail: '资源、标签、污点、亲和性与卷拓扑逐项淘汰节点。', tag: '可行性', tone: 'blue' },
          { title: 'Score 偏好', detail: '只对剩余节点比较资源均衡与软偏好。', tag: '选择', tone: 'green' },
          { title: 'Bind 绑定', detail: '写入 nodeName，Pod 离开未调度状态。', tag: '调度完成', tone: 'orange' },
          { title: 'Kubelet 接管', detail: '准入、镜像、卷与容器启动决定最终是否运行。', tag: '运行验证', tone: 'blue' },
        ],
        footnote: 'Filter 没有候选时，Score 不会运行；Bind 成功时，Kubelet 也尚未证明应用可用。',
      },
      commands: [
        {
          title: '打印三个节点的过滤原因',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 节点字段均为固定输入；模拟只覆盖四个常见硬约束。
nodes = {
    "n1": {"zone": "prod", "disk": "standard", "free_cpu": 2000, "free_memory": 4096, "taints": []},
    "n2": {"zone": "prod", "disk": "fast", "free_cpu": 1500, "free_memory": 3072, "taints": []},
    "n3": {"zone": "dev", "disk": "fast", "free_cpu": 4000, "free_memory": 8192, "taints": ["dedicated=gpu:NoSchedule"]},
}
pod = {"zone": "prod", "disk": "fast", "cpu": 1000, "memory": 2048, "tolerations": []}

def rejection_reasons(node, pod):
    reasons = []
    if node["zone"] != pod["zone"]:
        reasons.append("zone 不匹配")
    if node["disk"] != pod["disk"]:
        reasons.append("卷拓扑不匹配")
    if node["free_cpu"] < pod["cpu"] or node["free_memory"] < pod["memory"]:
        reasons.append("资源不足")
    if node["taints"] and not pod["tolerations"]:
        reasons.append("污点不容忍")
    return reasons

print(f"Pod需求 zone={pod['zone']} disk={pod['disk']} CPU={pod['cpu']}m memory={pod['memory']}Mi")
feasible = []
for name, node in nodes.items():
    reasons = rejection_reasons(node, pod)
    if reasons:
        print(f"节点={name} -> 过滤：{'；'.join(reasons)}")
    else:
        feasible.append(name)
        print(f"节点={name} -> 可行，进入评分")
print(f"评分候选={','.join(feasible) if feasible else '空'}")
PY`,
          output: `Pod需求 zone=prod disk=fast CPU=1000m memory=2048Mi
节点=n1 -> 过滤：卷拓扑不匹配
节点=n2 -> 可行，进入评分
节点=n3 -> 过滤：zone 不匹配；污点不容忍
评分候选=n2
`,
          note: '真实 FailedScheduling 事件通常逐条列出 Predicate 失败原因；某条原因消失不代表其他原因也消失。',
        },
        {
          title: '只在可行节点上进行确定性评分',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 这是教学评分：先硬性保证 request 能放下，再奖励 CPU 与内存使用比例更均衡。
nodes = {
    "n1": {"free_cpu": 3000, "free_memory": 2048},
    "n2": {"free_cpu": 2000, "free_memory": 4096},
}
request = {"cpu": 1000, "memory": 1024}
request_ratio_cpu = request["cpu"] / nodes["n1"]["free_cpu"]
request_ratio_memory = request["memory"] / nodes["n1"]["free_memory"]
request_ratio = (request_ratio_cpu + request_ratio_memory) / 2
print(f"教学请求占比 CPU={request_ratio_cpu:.4f} memory={request_ratio_memory:.4f}")

scored = []
for name, node in nodes.items():
    if request["cpu"] > node["free_cpu"] or request["memory"] > node["free_memory"]:
        print(f"节点={name} -> 硬过滤，不参与评分")
        continue
    cpu_after = (node["free_cpu"] - request["cpu"]) / node["free_cpu"]
    memory_after = (node["free_memory"] - request["memory"]) / node["free_memory"]
    score = round(100 - abs(cpu_after - memory_after) * 100)
    scored.append((score, name))
    print(f"节点={name} -> 可行 score={score}")
# 分数相同时按节点名排序，保证离线输出确定。
scored.sort(key=lambda item: (-item[0], item[1]))
print(f"首选节点={scored[0][1]}；同分规则仅为本模拟约定")
PY`,
          output: `教学请求占比 CPU=0.3333 memory=0.5000
节点=n1 -> 可行 score=83
节点=n2 -> 可行 score=75
首选节点=n1；同分规则仅为本模拟约定
`,
          note: '真实评分由多个插件加权，可能包含资源余量、镜像、拓扑和卷等因素；这里只演示“不可行节点不能靠高分复活”。',
        },
        {
          title: '把绑定成功与 kubelet 就绪分开',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

pod = {"name": "api-2", "node": "", "scheduled": False, "kubelet_ready": False, "image_ready": False}

def bind(node):
    # 绑定只写 nodeName，不启动容器。
    pod["node"] = node
    pod["scheduled"] = True
    print(f"事件=绑定完成 node={pod['node']} scheduled={pod['scheduled']} kubelet_ready={pod['kubelet_ready']}")

def kubelet_observe(image_ready):
    # 节点端按固定事件推进；镜像失败不会让绑定动作本身撤回。
    pod["kubelet_ready"] = True
    pod["image_ready"] = image_ready
    if image_ready:
        print("事件=镜像与卷就绪 -> 容器可进入 Running")
    else:
        print("事件=镜像拉取失败 -> ImagePullBackOff；已绑定但不是 Running")

bind("n2")
print(f"调度阶段结束：nodeName={pod['node']}；仍不能证明应用运行")
kubelet_observe(False)
# 节点随后失联是另一类事件，不等同于最初的 Filter 失败。
pod["kubelet_ready"] = False
print(f"节点失联事件：调度记录仍为 node={pod['node']}，但 kubelet_ready=False")
PY`,
          output: `事件=绑定完成 node=n2 scheduled=True kubelet_ready=False
调度阶段结束：nodeName=n2；仍不能证明应用运行
事件=镜像拉取失败 -> ImagePullBackOff；已绑定但不是 Running
节点失联事件：调度记录仍为 node=n2，但 kubelet_ready=False
`,
          note: '真实节点失联后的重新调度受 Pod 生命周期、控制器和 deletion 策略影响；本模拟只强调“有 nodeName”不是“Running”的同义词。',
        },
      ],
      checkpoints: ['能按顺序说出 Filter、Score、Bind 与 kubelet 接管', '知道软亲和性失败后仍可能调度', '能解释污点和容忍为何需要成对理解', '知道必需反亲和性冲突会让候选为空', '看到 nodeName 已填写时仍会检查容器是否运行'],
      safety: '不要通过直接写 nodeName 绕过调度器，也不要为了消除 Pending 一次性删除所有硬约束。生产变更应先在预发环境验证标签、卷拓扑和中断预算，并检查对专用节点与高优先级任务的影响。',
    },
    boundaries: {
      blocks: ['把资源与标签等硬约束转成可协商偏好', '在不可行节点上靠评分强行放置', '将绑定成功误报为应用就绪', '用直接修改 nodeName 的方式绕过容量检查', '让专用硬件节点无意接收普通业务'],
      notBlocks: ['镜像仓库不可用或镜像拉取失败', '应用启动崩溃与配置错误', '持久卷后端故障', '节点宕机后的运行时失联', '存储 IO 或网络带宽瓶颈'],
    },
  },
  /**
   * 探针模块围绕“何时接收流量、何时重启、何时允许其他探针”建立状态机。
   * 生命周期钩子与探针并行讲解，因为它们都带 hook/health 的直觉，
   * 但一个是管理动作，一个是持续观测，不能互相替代。
   */
  {
    id: 'probes-lifecycle',
    title: '健康探针与容器生命周期',
    english: 'PROBE / READINESS / LIFECYCLE',
    summary: '探针让 kubelet 持续观察容器状态：readiness 决定是否接收流量，liveness 决定是否重启，startup 为慢启动应用保护初始化阶段。生命周期钩子负责启动后或终止前的管理动作；它们不是健康检查，且与容器主进程的执行顺序并不总是可推导。',
    icon: 'play',
    track: 'kubernetes',
    group: '工作负载与调度',
    dependencies: ['pod-controllers'],
    dependents: [],
    philosophy: {
      problem: '进程存在不代表能服务请求，暂时过载也不一定代表应该被杀；慢启动应用又可能在旧版健康检查窗口内被误重启。平台需要多种独立信号，并在 Pod 删除时提供受控退出机会。',
      rejects: 'readiness 失败不会重启容器，liveness 失败也不保证 Service 立即摘除流量；startup 不是启动脚本，postStart/preStop 也不是探针。进程没有退出、探针通过、Pod Ready 和用户请求成功，是四个不同命题。',
      counter: 'kubelet 按探针参数反复执行检查，并把结果分别写入容器状态、就绪条件和端点集合。终止时先进入 Terminating，再执行必要的停止钩子与宽限期；理解每条链路后才能安全配置健康语义。',
    },
    design: {
      abstractions: [
        { name: 'Probe', role: 'kubelet 对容器执行的周期性健康检查，可由 HTTP、TCP、exec 或 gRPC 实现。' },
        { name: 'Startup Probe', role: '判断慢启动容器是否完成初始化；成功前禁用 readiness 与 liveness 检查。' },
        { name: 'Readiness Probe', role: '判断容器此刻是否适合接收请求；失败会从匹配端点移除该 Pod。' },
        { name: 'Liveness Probe', role: '判断容器是否应被重启；连续失败达到阈值后触发容器重启。' },
        { name: 'Lifecycle Hook', role: 'postStart 或 preStop 管理钩子，用于辅助动作，不是周期性健康信号。' },
        { name: 'Termination Grace Period', role: 'Pod 删除后允许完成停止钩子、排空连接并退出的有限窗口。' },
        { name: 'Pod Ready Condition', role: '汇总容器就绪等条件的状态；端点控制器通常据此维护 Service 可用端点。' },
      ],
      principles: [
        'readiness 管流量，liveness 管重启：暂时无法服务时应先摘流量，只有确认进程失去恢复能力时才考虑重启。',
        'startup 为慢初始化争取时间：它成功前不运行 readiness 与 liveness，成功后才把检查交给后两者。',
        '阈值要结合探测周期理解：failureThreshold 次连续失败才触发动作，不是第一次失败就立即重启或永久摘除。',
        'liveness 与 startup 的 successThreshold 必须为 1；就绪探针可以在恢复后多次成功再重新接流量。',
        '生命周期钩子与主进程不是可靠的前后门：postStart 与容器 ENTRYPOINT 并行启动，不能用它承担必须完成的初始化。',
        '终止要允许排空：Pod 删除先改变就绪并停止新流量，再执行 preStop 和发送 SIGTERM；宽限期耗尽才强制结束。',
      ],
      history: [
        { when: '2015—2017', what: 'readiness 与 liveness 探针成为 Pod 健康管理基础', why: '把“进程活着”与“可以服务”分开，支撑滚动发布和故障恢复。' },
        { when: '2018', what: 'startup probe 引入 Kubernetes', why: '避免慢启动应用被固定窗口的 liveness 检查误杀，减少对超大阈值的依赖。' },
        { when: '2020 年代', what: 'gRPC 探针、容器状态与终止流程持续完善', why: '支持更多协议，并让探针结果、重启原因和停止阶段更容易观测。' },
      ],
    },
    capabilities: [
      { name: '流量摘除', sentence: '在容器暂时不可服务时通过 readiness 失败停止接收新请求。' },
      { name: '僵死恢复', sentence: '在 liveness 连续失败时重启卡住或失去响应能力的容器。' },
      { name: '慢启动保护', sentence: '用 startup probe 推迟 liveness 与 readiness 判断，降低误重启。' },
      { name: '受控退出', sentence: '用 preStop、SIGTERM 和宽限期让应用完成连接排空与状态保存。' },
      { name: '状态诊断', sentence: '通过探针事件、Last State 与重启计数定位初始化、健康检查和终止问题。' },
    ],
    path: {
      intent: '启动一个需要较长初始化的 API，让它先通过 startup，再依次经历 readiness 失败、liveness 失败和 Pod 删除，观察三种动作为何不同。',
      environment: '确定性事件模拟；不发起真实 HTTP，也不等待真实秒数，按固定事件序列推进探针状态。',
      steps: [
        { title: '启动容器并进入初始化保护', description: '容器进程启动后，如果配置了 startup probe，kubelet 先只检查它。初始化期间应用可能无法响应业务请求，但这不应立即触发 liveness 重启。', terms: [{ name: '初始化保护', definition: 'startup probe 成功前暂停 readiness 与 liveness 检查的机制。' }, { name: '探测周期', definition: 'kubelet 连续执行同一探针的固定频率。' }], state: 'startup 检查中；readiness/liveness 暂停；容器未接流量。' },
        { title: 'startup 成功并启动其他探针', description: 'startup 达到成功条件后，kubelet 开始执行 readiness 与 liveness。startup 成功只说明初始化结束，不说明业务端点已经可用。', terms: [{ name: '探针成功阈值', definition: '需要连续成功多少次才认为检查通过；liveness/startup 固定为 1。' }, { name: '初始延迟', definition: '容器启动后开始探测前的等待配置。' }], state: 'startup=true；进入 readiness 与 liveness 周期。' },
        { title: 'readiness 控制端点与流量', description: 'readiness 连续失败后，容器状态变为未就绪，端点控制器把 Pod 从匹配 Service 的 endpoints 中移除；容器本身继续运行。', terms: [{ name: '端点移除', definition: '端点控制器根据就绪状态把 Pod 从 Service 后端集合删除。' }, { name: '未就绪', definition: '容器此刻不适合接收流量，但不等于进程已经死亡。' }], state: 'ready=false；endpoint 移除；restarts 不变。' },
        { title: 'readiness 恢复后重新接流量', description: 'readiness 按 successThreshold 连续成功后，Pod 可重新进入端点集合。这个恢复过程不会自动回滚代码或修复外部依赖。', terms: [{ name: '就绪恢复', definition: '连续成功的 readiness 检查让容器重新适合接收流量。' }, { name: '端点重新加入', definition: '端点控制器观察就绪条件后再次把 Pod 列为 Service 后端。' }], state: 'ready=true；endpoint 重新加入。' },
        { title: 'liveness 连续失败触发重启', description: '如果进程死锁且无法恢复，liveness 达到 failureThreshold 后 kubelet 杀死并重启容器。重启会中断现有连接，因此阈值必须保守。', terms: [{ name: '失败阈值', definition: '连续失败达到多少次才执行探针对应动作。' }, { name: '容器重启', definition: 'kubelet 在 Pod 内重建容器实例，通常增加 restartCount。' }], state: 'liveness 连续失败 → 容器重启；restartCount+1。' },
        { title: '删除 Pod 并执行终止阶段', description: '删除先把 Pod 标记为 Terminating 并推动就绪变化，随后执行 preStop、发送 SIGTERM，并在宽限期内等待退出。生产应用应利用这个窗口排空连接。', terms: [{ name: 'Terminating', definition: 'Pod 已收到删除请求、正在停止的状态标记。' }, { name: 'preStop', definition: '终止前执行的管理钩子，可用于延迟接收 SIGTERM 或执行清理。' }], state: 'Terminating → preStop → SIGTERM → 正常退出或宽限期耗尽。' },
        { title: '区分钩子失败与探针失败', description: 'postStart 或 preStop 失败会生成事件并可能影响启动或终止，但它们不会像 liveness 那样按周期累计失败并触发重启。', terms: [{ name: 'Hook 失败', definition: '管理钩子返回非成功结果，kubelet 记录事件并按对应生命周期处理。' }, { name: '探针失败', definition: '周期检查未通过，可能改变就绪或在达到阈值后重启。' }], state: '钩子结果进入事件；健康判断仍由对应探针负责。' },
      ],
      stateTable: {
        columns: ['触发', 'readiness', 'liveness', '流量 / 重启', '反直觉点'],
        rows: [
          ['startup 尚未成功', '暂停', '暂停', '不接流量也不因业务检查重启', '慢启动不是僵死'],
          ['readiness 连续失败', '失败', '仍可运行', '摘除端点；不重启', '无法服务不等于必须死亡'],
          ['readiness 连续成功', '成功', '独立判断', '重新加入端点', '恢复流量不是探针自动修复'],
          ['liveness 连续失败', '可能同时失败', '触发重启', 'restartCount 增加', '误报会杀死健康进程'],
          ['startup 成功', '开始执行', '开始执行', '初始化保护解除', 'startup 成功不等于 Ready'],
          ['Pod 删除', '推动端点移除', '停止新增健康决策', 'preStop/SIGTERM/宽限期', '删除不是瞬时强制 kill'],
        ],
      },
      summary: '探针的价值在于分工明确：startup 保护初始化，readiness 管理流量，liveness 处理失去响应能力的进程。生命周期钩子与终止宽限期负责管理动作，只有把这些状态分开观察，才能避免“摘流量导致雪崩”或“过度重启制造雪崩”。',
    },
    costs: [
      { choice: '激进 liveness', cost: '能快速恢复部分僵死，但网络抖动、GC 暂停或依赖阻塞都可能制造无意义重启。', misread: '“检查越频繁、阈值越低，系统越可靠。”' },
      { choice: '宽松 readiness', cost: '减少抖动，但失败实例可能继续接收请求并放大错误。', misread: '“readiness 失败只是告警，不用摘流量。”' },
      { choice: '长终止宽限期', cost: '给排空和保存状态留时间，但故障节点上的 Pod 可能长时间无法彻底删除或腾出资源。', misread: '“宽限期越长，优雅退出就越有保证。”' },
      { choice: '复杂生命周期钩子', cost: '能补充清理动作，但增加失败点，并可能与主进程、终止流程产生意外竞争。', misread: '“postStart 一定在应用入口之前执行。”' },
    ],
    example: {
      title: '用固定事件观察三种探针与一次终止',
      intent: '脚本把探测结果按事件顺序输入状态机，打印端点、重启计数和生命周期阶段。它不调用 HTTP，也不读取真实容器，因此适合核对每条规则的动作边界。',
      diagram: {
        kind: 'flow',
        title: '初始化、服务与退出的三段状态机',
        caption: 'startup 是前置门，readiness 与 liveness 是并列的持续观察；删除流程则沿另一条生命周期路径推进。',
        items: [
          { title: 'Startup 门', detail: '初始化未完成时暂停另外两种探针，避免慢启动被误杀。', tag: '初始化', tone: 'blue' },
          { title: 'Readiness 分支', detail: '失败摘流量，恢复后重新加入；容器不因此重启。', tag: '流量', tone: 'green' },
          { title: 'Liveness 分支', detail: '连续失败触发容器重启，可能中断所有现有连接。', tag: '恢复', tone: 'orange' },
          { title: '生命周期钩子', detail: 'postStart/preStop 执行管理动作，不积累探针失败次数。', tag: '管理', tone: 'muted' },
          { title: 'Termination 排空', detail: 'Terminating、preStop、SIGTERM 与宽限期共同完成退出。', tag: '退出', tone: 'blue' },
        ],
        footnote: 'Pod Ready 是条件汇总，单个容器就绪不等于所有容器就绪；端点变化也不是瞬时全局生效。',
      },
      commands: [
        {
          title: '观察 startup、readiness 与 liveness 的不同动作',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 用固定事件驱动；阈值是教学配置，脚本不等待真实周期。
state = {"startup_ok": False, "readiness_ok": False, "liveness_ok": True,
         "endpoint": False, "restarts": 0}

def report(label):
    print(f"事件={label} startup_ok={state['startup_ok']} ready={state['readiness_ok']} "
          f"endpoint={state['endpoint']} liveness_ok={state['liveness_ok']} restarts={state['restarts']}")

def sync_readiness():
    # 只有 startup 已成功，readiness 结果才可影响端点。
    ready = state["startup_ok"] and state["readiness_ok"]
    state["endpoint"] = ready

report("容器启动")
# startup 连续失败达到阈值时，动作仍是重启；后两种探针保持暂停。
report("startup 尚未达标，另外两种探针暂停")
state["restarts"] += 1
report("startup 连续失败触发重启")
state["startup_ok"] = True
state["readiness_ok"] = True
sync_readiness()
report("startup 成功，readiness 通过")
# readiness 失败只摘流量，不修改重启计数。
state["readiness_ok"] = False
sync_readiness()
report("readiness 连续失败")
state["readiness_ok"] = True
sync_readiness()
report("readiness 恢复")
# liveness 连续失败达到阈值，容器被重启，重新进入 startup 门。
state["liveness_ok"] = False
report("liveness 连续失败")
state["restarts"] += 1
state["startup_ok"] = False
state["readiness_ok"] = False
state["liveness_ok"] = True
sync_readiness()
report("liveness 触发容器重启")
PY`,
          output: `事件=容器启动 startup_ok=False ready=False endpoint=False liveness_ok=True restarts=0
事件=startup 尚未达标，另外两种探针暂停 startup_ok=False ready=False endpoint=False liveness_ok=True restarts=0
事件=startup 连续失败触发重启 startup_ok=False ready=False endpoint=False liveness_ok=True restarts=1
事件=startup 成功，readiness 通过 startup_ok=True ready=True endpoint=True liveness_ok=True restarts=1
事件=readiness 连续失败 startup_ok=True ready=False endpoint=False liveness_ok=True restarts=1
事件=readiness 恢复 startup_ok=True ready=True endpoint=True liveness_ok=True restarts=1
事件=liveness 连续失败 startup_ok=True ready=True endpoint=True liveness_ok=False restarts=1
事件=liveness 触发容器重启 startup_ok=False ready=False endpoint=False liveness_ok=True restarts=2
`,
          note: '示例把“连续失败达到阈值”压缩成单个事件。真实节奏由 initialDelaySeconds、periodSeconds 与 failureThreshold 等参数共同决定。',
        },
        {
          title: '区分 postStart 失败与 liveness 失败',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# postStart 与容器主进程并行；此处用固定标志表示它们都可能先推进。
container = {"main_started": True, "post_start_ok": False, "hook_failures": 0,
             "probe_failures": 0, "restarts": 0}

def show(label):
    print(f"阶段={label} main_started={container['main_started']} post_start_ok={container['post_start_ok']} "
          f"hook_failures={container['hook_failures']} probe_failures={container['probe_failures']} restarts={container['restarts']}")

show("主进程与 postStart 已开始")
container["post_start_ok"] = False
container["hook_failures"] += 1
show("postStart 失败，记录 Hook 事件")
# Hook 失败不会自动增加 probe_failures，也不会单独触发 liveness 动作。
show("Hook 失败之后，仍需等待 liveness 判定")
container["probe_failures"] += 1
container["probe_failures"] += 1
container["restarts"] += 1
container["probe_failures"] = 0
show("liveness 连续失败达到阈值，触发重启")
print("postStart 不保证先于 ENTRYPOINT；必须完成的初始化应放进应用启动流程")
PY`,
          output: `阶段=主进程与 postStart 已开始 main_started=True post_start_ok=False hook_failures=0 probe_failures=0 restarts=0
阶段=postStart 失败，记录 Hook 事件 main_started=True post_start_ok=False hook_failures=1 probe_failures=0 restarts=0
阶段=Hook 失败之后，仍需等待 liveness 判定 main_started=True post_start_ok=False hook_failures=1 probe_failures=0 restarts=0
阶段=liveness 连续失败达到阈值，触发重启 main_started=True post_start_ok=False hook_failures=1 probe_failures=0 restarts=1
postStart 不保证先于 ENTRYPOINT；必须完成的初始化应放进应用启动流程
`,
          note: 'postStart 失败的实际影响取决于运行时和失败方式，kubelet 会发出事件；不能把它设计成“初始化成功后才启动主进程”的同步屏障。',
        },
        {
          title: '模拟删除时的排空与宽限期分支',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 用逻辑阶段替代真实等待；不输出墙钟时间，也不发送信号。
def terminate(grace_is_sufficient):
    state = {"phase": "Running", "endpoint": True}
    print("事件=删除请求 -> phase=Terminating endpoint=False")
    state["phase"], state["endpoint"] = "Terminating", False
    print("事件=端点控制器推动摘流量")
    print("事件=执行 preStop 管理钩子")
    print("事件=发送 SIGTERM，等待应用排空")
    if grace_is_sufficient:
        state["phase"] = "Exited"
        print("结果=应用在宽限期内正常退出")
    else:
        state["phase"] = "ForceKilled"
        print("结果=宽限期耗尽，容器被强制结束")
    return state["phase"]

print("分支A：应用配合排空")
end_a = terminate(True)
print("分支B：应用忽略终止或退出过慢")
end_b = terminate(False)
print(f"最终分支={end_a},{end_b}；宽限期提高排空机会，但不替应用实现排空")
PY`,
          output: `分支A：应用配合排空
事件=删除请求 -> phase=Terminating endpoint=False
事件=端点控制器推动摘流量
事件=执行 preStop 管理钩子
事件=发送 SIGTERM，等待应用排空
结果=应用在宽限期内正常退出
分支B：应用忽略终止或退出过慢
事件=删除请求 -> phase=Terminating endpoint=False
事件=端点控制器推动摘流量
事件=执行 preStop 管理钩子
事件=发送 SIGTERM，等待应用排空
结果=宽限期耗尽，容器被强制结束
最终分支=Exited,ForceKilled；宽限期提高排空机会，但不替应用实现排空
`,
          note: '真实摘除端点与停止新请求之间可能存在传播延迟，负载均衡或客户端长连接也可能继续发送请求；应用仍需正确处理 SIGTERM。',
        },
      ],
      checkpoints: ['能说明 readiness 失败为何不重启容器', '知道 startup 成功前另外两种探针暂停', '能区分探针失败与生命周期钩子失败', '知道 postStart 与容器主进程并行', '能按顺序说出 Terminating、preStop、SIGTERM 与强制结束'],
      safety: '探针端点应轻量、可靠且具有明确业务语义，避免在探针中触发昂贵副作用或依赖会一起故障的下游。不要用 liveness 检查数据库等外部依赖，否则依赖故障可能引发全集群重启风暴。',
    },
    boundaries: {
      blocks: ['用 liveness 代替 readiness 管理流量', '用 readiness 自动修复僵死进程', '把 postStart 当成可靠的初始化屏障', '忽略终止宽限期直接强制删除', '用健康探针检查会共同故障的下游'],
      notBlocks: ['应用自身死锁或内存泄漏', '负载均衡器缓存端点造成流量延迟', '下游数据库整体不可用', '客户端不支持连接排空', '节点宕机导致的强制失联'],
    },
  },
  /**
   * 发布模块把模板更新、副本集推进、就绪门槛和回滚放在同一条时间线上。
   * 重点不是记住 rollout 命令，而是推导 maxSurge/maxUnavailable 的可用性窗口，
   * 并接受“Deployment 完成副本替换”不等于“数据库变更也可逆”的边界。
   */
  {
    id: 'deployments-rollouts',
    title: 'Deployment 与滚动发布',
    english: 'DEPLOYMENT / ROLLOUT / REVISION',
    summary: 'Deployment 通过 ReplicaSet 把 Pod 模板与期望副本数转成实际副本，并在模板变化时创建新 ReplicaSet、逐步替换旧 Pod。maxSurge 控制临时超出期望副本数的数量，maxUnavailable 控制允许低于可用副本数的窗口；readiness 与 progress 条件决定发布能否继续或回滚。',
    icon: 'reset',
    track: 'kubernetes',
    group: '工作负载与调度',
    dependencies: ['pod-controllers', 'probes-lifecycle', 'service-dns'],
    dependents: [],
    philosophy: {
      problem: '应用更新要求减少停机，同时避免新旧版本容量爆炸；如果新版本不可用，还必须知道何时停止推进、如何恢复旧版本。简单“全部删除再创建”无法满足这些目标。',
      rejects: '滚动发布不是一次性替换全部 Pod，也不是先删旧 Pod 再祈祷新 Pod 就绪。maxSurge 与 maxUnavailable 不是相同指标的两个名字，revision 只记录模板历史，不包含数据库或外部系统的全部副作用。',
      counter: 'Deployment 是声明式控制器：它观察实际 ReplicaSet 与 Pod，计算新旧副本预算，再逐步创建、扩缩和清理。发布是否健康取决于新 Pod 是否真正 Ready，而不仅是容器进程是否启动。',
    },
    design: {
      abstractions: [
        { name: 'Deployment', role: '声明期望副本数、Pod 模板、发布策略和更新方式的工作负载控制器。' },
        { name: 'ReplicaSet', role: '维护带有特定模板哈希的 Pod 集合，确保其匹配副本数量达到声明值。' },
        { name: 'PodTemplateHash', role: '由 Pod 模板计算的选择器后缀，用于区分不同 ReplicaSet 拥有的 Pod。' },
        { name: 'Revision', role: 'Deployment 控制器记录的模板版本，用于追溯与回滚到历史模板。' },
        { name: 'maxSurge', role: '滚动更新期间允许超过 spec.replicas 的最大 Pod 数量，百分比按向上取整计算。' },
        { name: 'maxUnavailable', role: '滚动更新期间允许低于 spec.replicas 的最大可用 Pod 数量，百分比按向下取整计算。' },
        { name: 'Progress Deadline', role: '控制器判断发布是否在允许窗口内取得进展的条件；超时标记失败，但不会自动回滚。' },
      ],
      principles: [
        '先理解总副本数与可用副本数：maxSurge 约束总副本峰值，maxUnavailable 约束可用副本低谷，二者共同决定容量窗口。',
        '新 Pod 要 Ready 才替代旧副本：仅创建成功或 Running 不足以让发布继续，readiness 是容量判断的关键输入。',
        '百分比先按副本数取整：maxSurge 向上取整，maxUnavailable 向下取整；小副本数时结果可能与直觉不同。',
        'maxSurge=0 且 maxUnavailable=0 不能形成推进路径：不许多额外副本，也不许减少可用副本，控制器无法完成替换。',
        'minReadySeconds 增加新 Pod 的稳定观察窗口：它能降低刚 Ready 就再次变化的概率，但也会拖慢发布。',
        '回滚是新的声明式推进：控制器复用或创建目标 ReplicaSet，把模板切回历史版本；外部数据变更需要独立回滚方案。',
      ],
      history: [
        { when: '2015', what: 'Deployment 成为 Kubernetes 中声明式应用更新的重要对象', why: '把副本管理与版本推进标准化，取代仅靠脚本删除和重建 Pod 的做法。' },
        { when: '2017 起', what: '滚动更新策略与 progressDeadlineSeconds 逐步成熟', why: '让发布拥有明确的容量窗口、进展判断和失败可见性。' },
        { when: '2020 年代', what: '修订历史限制、就绪与金丝雀发布实践持续演进', why: '在频繁发布中控制对象数量，并支持更细粒度的验证与流量切换。' },
      ],
    },
    capabilities: [
      { name: '声明式更新', sentence: '修改 Pod 模板后由控制器逐步收敛实际副本，无需手工逐个替换 Pod。' },
      { name: '容量窗口控制', sentence: '用 maxSurge 与 maxUnavailable 明确发布期间允许的额外容量和可用性低谷。' },
      { name: '发布暂停与恢复', sentence: '暂停后不再推进新变更，可在验证后继续；暂停不会撤销已经发生的副本变化。' },
      { name: '版本追溯与回滚', sentence: '查看 revision 与 ReplicaSet 状态，将 Pod 模板恢复到历史声明。' },
      { name: '进展诊断', sentence: '结合 Pod 就绪、事件与 Deployment conditions 识别拉镜像、探针或资源导致的阻塞。' },
    ],
    path: {
      intent: '把三副本 API 从 v1 滚动发布到 v2，先使用一额外副本且不允许不可用，再观察 readiness 阻塞和回滚分支。',
      environment: '固定三副本教学模型；只跟踪旧、新 ReplicaSet 的 ready/unready 数量，不调用 API、不读取时钟。',
      steps: [
        { title: '提交新 Pod 模板', description: '用户修改镜像或模板后，Deployment 的 spec 成为新期望。控制器为模板生成 PodTemplateHash，并创建对应 ReplicaSet。', terms: [{ name: 'Pod 模板', definition: 'Deployment 中用于创建 Pod 的声明，包括镜像、标签、资源、探针等。' }, { name: 'ReplicaSet', definition: '保证具有同一模板选择器的 Pod 数量符合目标的工作负载控制器。' }], state: 'Deployment 期望=3；新 ReplicaSet=new-v2；revision 增加。' },
        { title: '计算发布容量窗口', description: '控制器把 maxSurge/maxUnavailable 的数值或百分比换算为本次允许的总副本上限与可用副本下限。小副本数时必须核对取整结果。', terms: [{ name: 'Surge', definition: '允许短暂存在的额外 Pod 数量，用于先启动新版本再替换旧版本。' }, { name: 'Unavailable', definition: '允许暂时不可用的 Pod 数量，用于限制发布造成的容量损失。' }], state: 'desired=3；surge=1；unavailable=0；总副本上限=4。' },
        { title: '创建新 Pod 并等待就绪', description: '在 surge 预算内创建 v2 Pod。新 Pod 启动期间仍保持旧 v1 的可用副本；如果 v2 一直未 Ready，总副本达到上限后发布会停住。', terms: [{ name: 'Ready', definition: 'Pod 的 readiness 条件已满足，可作为 Service 后端接收流量。' }, { name: '副本上限', definition: 'spec.replicas 与 maxSurge 之和，限制本次发布的总 Pod 数量。' }], state: 'old ready=3；new ready=0/unready=1；total=4。' },
        { title: '新副本就绪后缩减旧副本', description: 'v2 Ready 使可用副本仍不低于下限，控制器可以按策略缩减一个旧副本。每一步都重新检查条件，而不是一次性删光旧版本。', terms: [{ name: '可用副本下限', definition: 'spec.replicas 减 maxUnavailable，表示滚动过程中至少应维持的可用数量。' }, { name: '渐进收敛', definition: '每次只改变部分副本，并在观察结果后继续下一步。' }], state: 'new ready=1；old ready=2；total=4；available=3。' },
        { title: '重复替换直到新版本占满', description: '控制器继续在 surge 预算内创建 v2，等待 Ready 后缩减 v1，直到新 ReplicaSet 达到期望副本数且可用性满足条件。', terms: [{ name: 'Observed Generation', definition: '控制器已观察到的最新 Deployment 代数，避免把旧状态当成新声明结果。' }, { name: '收敛', definition: '实际副本与就绪状态逐步接近声明目标的过程。' }], state: 'new ready=3；old ready=0；total=3；发布完成。' },
        { title: '识别 readiness 阻塞与超时', description: '如果额外副本已经用满但新 Pod 未 Ready，控制器不能在不违反 unavailable 的情况下继续缩旧。进展条件最终可能失败，但默认不会自动回滚。', terms: [{ name: 'ProgressDeadlineExceeded', definition: 'Deployment 在允许窗口内未取得进展的条件。' }, { name: '暂停', definition: '阻止控制器继续处理新的模板变更，但不撤销已经创建的副本。' }], state: 'new ready=0；surge 已用满；发布无进展；需人工判断。' },
        { title: '回滚模板并保留历史', description: '回滚到旧 revision 会创建或复用对应 ReplicaSet，再按同样策略推进。历史记录受 revisionHistoryLimit 约束，且不会自动恢复数据库。', terms: [{ name: '回滚', definition: '把 Deployment 的 Pod 模板恢复到历史版本并重新收敛副本。' }, { name: '修订历史', definition: '控制器保留的有限模板版本记录，不是完整外部副作用日志。' }], state: 'revision=3 回滚目标=2；Deployment 继续向前记录新的变化。' },
      ],
      stateTable: {
        columns: ['发布步骤', 'old v1', 'new v2', '总 / 可用', '反直觉分支'],
        rows: [
          ['初始稳定', 'ready=3', 'ready=0', 'total=3 / available=3', '更新模板不改数据库'],
          ['创建 surge Pod', 'ready=3', 'ready=0 unready=1', 'total=4 / available=3', '额外 Pod 不立刻贡献容量'],
          ['v2 Ready 后缩旧', 'ready=2', 'ready=1', 'total=4 / available=3', '总副本可暂时大于期望'],
          ['新 Pod 未 Ready', 'ready=3', 'unready=1', 'total=4 / available=3', 'surge 用满后不能继续创建'],
          ['替换完成', 'ready=0', 'ready=3', 'total=3 / available=3', '旧 ReplicaSet 可能保留历史'],
          ['回滚 revision', '模板重新成为目标', '新创建 Pod', '按策略重新推进', '不回滚外部数据副作用'],
        ],
      },
      summary: '滚动发布是用容量窗口换取连续性的状态机：新副本先获得就绪证据，旧副本才逐步退出。maxSurge 决定能否先扩容，maxUnavailable 决定能承受多大低谷；完成或回滚都只改变 Pod 模板与副本，不自动撤销外部副作用。',
    },
    costs: [
      { choice: '较大 maxSurge', cost: '发布更快且更稳妥，但短时间占用更多节点资源，可能挤压同集群其他工作负载。', misread: '“Surge 越大，应用运行时就一定越稳定。”' },
      { choice: '较大 maxUnavailable', cost: '减少额外容量需求，但发布期间可用副本更少，故障叠加时更容易雪崩。', misread: '“副本少了只是慢一点，不会影响成功率。”' },
      { choice: '较长 minReadySeconds', cost: '过滤快速闪烁的就绪状态，但延长整体发布时间并占用额外副本更久。', misread: '“等得越久，就一定能发现所有问题。”' },
      { choice: '频繁回滚', cost: '能快速恢复模板版本，但反复变更会增加连接中断，也无法修复已经写入的外部数据。', misread: '“rollout undo 会撤销应用做过的所有事情。”' },
    ],
    example: {
      title: '用三副本发布推导 Surge、Unavailable 与回滚',
      intent: '脚本逐事件打印旧、新副本数；第二组检查小副本数的百分比取整与零窗口，第三组展示回滚只恢复模板，不恢复外部数据。',
      diagram: {
        kind: 'flow',
        title: '一次安全滚动发布的容量轨迹',
        caption: '总副本可以短暂升到 4，可用副本始终保持 3；这正是先 surge、再缩旧的典型窗口。',
        items: [
          { title: '旧版本稳定', detail: 'v1 ready=3，Service 有三个可用后端。', tag: '起点', tone: 'blue' },
          { title: '创建 v2 额外副本', detail: '总副本升到 4，但可用仍为 3。', tag: 'Surge', tone: 'orange' },
          { title: 'v2 通过 readiness', detail: '新副本进入端点，可用副本升到 4。', tag: '验证', tone: 'green' },
          { title: '缩减一个 v1 副本', detail: '可用回到 3，总副本仍为 4。', tag: 'Unavailable=0', tone: 'blue' },
          { title: '收敛或回滚', detail: '新版本占满后完成；失败则按历史模板重新推进。', tag: '终态', tone: 'muted' },
        ],
        footnote: '百分比取整规则：maxSurge 向上取整，maxUnavailable 向下取整；二者都为 0 会阻止替换。',
      },
      commands: [
        {
          title: '保持三副本可用地完成滚动替换',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 固定 desired=3、surge=1、unavailable=0，按事件推进而不是等待墙钟。
desired, max_surge, max_unavailable = 3, 1, 0
state = {"old_ready": 3, "new_ready": 0, "new_unready": 0}

def show(action):
    total = state["old_ready"] + state["new_ready"] + state["new_unready"]
    available = state["old_ready"] + state["new_ready"]
    print(f"动作={action} old_ready={state['old_ready']} new_ready={state['new_ready']} "
          f"new_unready={state['new_unready']} total={total} available={available}")

def create_new():
    total = state["old_ready"] + state["new_ready"] + state["new_unready"]
    if total < desired + max_surge:
        state["new_unready"] += 1
        return True
    return False

def mark_ready():
    if state["new_unready"]:
        state["new_unready"] -= 1
        state["new_ready"] += 1
        return True
    return False

def scale_old():
    total = state["old_ready"] + state["new_ready"] + state["new_unready"]
    available_after_removing_one_old = state["new_ready"] + max(state["old_ready"] - 1, 0)
    if state["old_ready"] > 0 and total > desired and available_after_removing_one_old >= desired - max_unavailable:
        state["old_ready"] -= 1
        return True
    return False

show("初始 v1 稳定")
for round_index in range(1, 4):
    assert create_new()
    show(f"第{round_index}轮创建 surge")
    assert mark_ready()
    show(f"第{round_index}轮 v2 Ready")
    assert scale_old()
    show(f"第{round_index}轮缩减 v1")
print("发布完成：new_ready=3 old_ready=0；全程 available 未低于 3")
PY`,
          output: `动作=初始 v1 稳定 old_ready=3 new_ready=0 new_unready=0 total=3 available=3
动作=第1轮创建 surge old_ready=3 new_ready=0 new_unready=1 total=4 available=3
动作=第1轮 v2 Ready old_ready=3 new_ready=1 new_unready=0 total=4 available=4
动作=第1轮缩减 v1 old_ready=2 new_ready=1 new_unready=0 total=3 available=3
动作=第2轮创建 surge old_ready=2 new_ready=1 new_unready=1 total=4 available=3
动作=第2轮 v2 Ready old_ready=2 new_ready=2 new_unready=0 total=4 available=4
动作=第2轮缩减 v1 old_ready=1 new_ready=2 new_unready=0 total=3 available=3
动作=第3轮创建 surge old_ready=1 new_ready=2 new_unready=1 total=4 available=3
动作=第3轮 v2 Ready old_ready=1 new_ready=3 new_unready=0 total=4 available=4
动作=第3轮缩减 v1 old_ready=0 new_ready=3 new_unready=0 total=3 available=3
发布完成：new_ready=3 old_ready=0；全程 available 未低于 3
`,
          note: '上面的旧、新就绪计数把控制器动作压缩成一次一步。真实 Deployment 会在 ReplicaSet 层进一步处理全部 desired、ready 与 available 状态；这里只表达发布预算。',
        },
        {
          title: '检查百分比取整与不可推进的零窗口',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 只用整数计算 ceil 与 floor，避免浮点误差；不访问时间或 API。
def ceil_div(value, divisor):
    return (value + divisor - 1) // divisor

def surge(desired, percent):
    return ceil_div(desired * percent, 100)

def unavailable(desired, percent):
    return desired * percent // 100

cases = [(2, 25, 25), (3, 25, 25), (1, 0, 0)]
for desired, surge_pct, unavailable_pct in cases:
    s = surge(desired, surge_pct)
    u = unavailable(desired, unavailable_pct)
    print(f"desired={desired} maxSurge={surge_pct}% -> {s}；maxUnavailable={unavailable_pct}% -> {u}")
    if s == 0 and u == 0:
        print("推进检查=拒绝：不能超出期望，也不能降低可用副本")
    else:
        print(f"推进检查=可推进；total上限={desired + s} available下限={desired - u}")

# readiness 失败时，surge 已用满且 unavailable=0，控制器不会冒险缩旧。
state = {"old_ready": 2, "new_ready": 1, "new_unready": 1}
total = state["old_ready"] + state["new_ready"] + state["new_unready"]
print(f"阻塞分支：old_ready={state['old_ready']} new_ready={state['new_ready']} new_unready={state['new_unready']} total={total}")
print("结果=surge 已用满且新副本未 Ready；不缩旧，发布等待或最终标记无进展")
PY`,
          output: `desired=2 maxSurge=25% -> 1；maxUnavailable=25% -> 0
推进检查=可推进；total上限=3 available下限=2
desired=3 maxSurge=25% -> 1；maxUnavailable=25% -> 0
推进检查=可推进；total上限=4 available下限=3
desired=1 maxSurge=0% -> 0；maxUnavailable=0% -> 0
推进检查=拒绝：不能超出期望，也不能降低可用副本
阻塞分支：old_ready=2 new_ready=1 new_unready=1 total=4
结果=surge 已用满且新副本未 Ready；不缩旧，发布等待或最终标记无进展
`,
          note: 'Kubernetes 会拒绝 maxSurge 与 maxUnavailable 同时为 0 的 RollingUpdateDeployment。小副本数下，maxUnavailable=25% 经常因向下取整而等于 0。',
        },
        {
          title: '回滚模板但不假装撤销外部数据',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# revision 与外部 ledger 是两类独立状态；回滚只改变前者对应的模板目标。
history = {1: "api:v1", 2: "api:v2", 3: "api:v3-bad"}
current_revision = 3
external_ledger = ["schema-change-from-v3"]
ready_pods = {"api:v1": 0, "api:v2": 0, "api:v3-bad": 1}

print(f"当前 revision={current_revision} template={history[current_revision]} ready_pods={ready_pods[history[current_revision]]}")
print(f"检测到新版本未 Ready：revision={current_revision}")
# 回滚到 revision 2：控制器复用或创建其 ReplicaSet，再逐步推进副本。
target = 2
ready_pods[history[current_revision]] = 0
ready_pods[history[target]] = 3
current_revision = target
print(f"回滚目标 revision={target} template={history[target]} ready_pods={ready_pods[history[target]]}")
print("历史记录：revision=3 的模板仍保留，是否受 revisionHistoryLimit 限制")
print(f"外部 ledger 未改变={external_ledger}；数据库回滚需要独立方案")
PY`,
          output: `当前 revision=3 template=api:v3-bad ready_pods=1
检测到新版本未 Ready：revision=3
回滚目标 revision=2 template=api:v2 ready_pods=3
历史记录：revision=3 的模板仍保留，是否受 revisionHistoryLimit 限制
外部 ledger 未改变=['schema-change-from-v3']；数据库回滚需要独立方案
`,
          note: '真实 rollout undo 会创建新的 Deployment revision，历史编号含义可能随之变化；本模拟用“回滚目标 revision”表达所选模板，而不是承诺内部编号永不增加。',
        },
      ],
      checkpoints: ['能分别解释 maxSurge 与 maxUnavailable', '知道 maxSurge 向上取整、maxUnavailable 向下取整', '能解释为何两者不能同时为 0', '知道新 Pod Ready 是继续替换旧副本的关键', '知道回滚 Pod 模板不等于回滚数据库'],
      safety: '发布前应验证应用能同时运行新旧版本、数据库变更保持向后兼容，并配置合理的 readiness 与 progressDeadlineSeconds。不要在未确认数据库兼容性的情况下把自动回滚当作完整恢复方案。',
    },
    boundaries: {
      blocks: ['先删除全部旧 Pod 再等待新 Pod', '用 maxUnavailable 代替 readiness 判断', '把 revision 当成完整外部变更日志', '同时设置 maxSurge=0 与 maxUnavailable=0', '忽略小副本数下百分比向下取整'],
      notBlocks: ['应用不兼容的数据库结构变更', '镜像仓库故障与拉取超时', '错误或过敏感的 readiness 配置', 'Service 或负载均衡传播延迟', '节点容量不足以容纳 surge'],
    },
  },
  /**
   * 批处理模块围绕有限任务、失败替换与重复副作用建立模型。
   * Job 只保证 Pod 最终完成相应次数，并不替业务实现“恰好一次”；
   * 因此重试与幂等必须一起讲，CronJob 的调度触发也不能等同于业务只执行一次。
   */
  {
    id: 'jobs-cronjobs',
    title: 'Job 与 CronJob 批处理',
    english: 'JOB / CRONJOB / IDEMPOTENCY',
    summary: 'Job 为有限任务创建并跟踪 Pod，直到成功完成数达到目标或重试、期限等条件终止；CronJob 按调度计划创建 Job，而不是让一个 Pod 永久循环。两者都可能重试，因此业务必须用幂等键、去重表或原子操作防止重复副作用。',
    icon: 'workflow',
    track: 'kubernetes',
    group: '工作负载与调度',
    dependencies: ['pod-controllers'],
    dependents: [],
    philosophy: {
      problem: '批处理任务与在线服务不同：它需要明确完成次数、允许并行度、失败重试和最长生命周期；失败后还可能因为节点失联或退出状态丢失而重复执行。调度触发频繁时，还必须处理重叠运行与错过计划。',
      rejects: 'Job 不是“退出码非零就原进程原地重试”，CronJob 也不是一个每分钟自动重启的长期 Pod。完成一个 Job 不保证业务副作用恰好发生一次，backoffLimit 也不代表业务层的重试预算。',
      counter: '控制器维护期望与观察状态，按失败策略创建替代 Pod，并把完成标记累计到目标。真正可靠的任务设计需要把 Kubernetes 的至少一次执行倾向与业务幂等结合起来，先定义重复请求的效果，再定义重试。',
    },
    design: {
      abstractions: [
        { name: 'Job', role: '创建一个或多个 Pod 执行有限任务，并跟踪成功、失败和完成条件。' },
        { name: 'Completion Mode', role: '描述完成计数方式；非索引 Job 通常按成功 Pod 计数，索引 Job 还关联固定索引。' },
        { name: 'Parallelism', role: 'Job 允许同时运行的 Pod 数量，不是任务总数。' },
        { name: 'Backoff Limit', role: '控制器层允许的失败次数上限，超过后 Job 进入 Failed。' },
        { name: 'Pod RestartPolicy', role: 'Job Pod 通常使用 OnFailure 或 Never，决定容器退出后是重启还是以失败 Pod 结束。' },
        { name: 'Active Deadline', role: 'Job 允许存在的最长生命周期，超过后控制器终止活动 Pod 并标记失败。' },
        { name: 'CronJob 计划与并发', role: '按 cron 表达式创建 Job，并用 concurrencyPolicy 与 suspend 控制重叠运行和暂停。' },
      ],
      principles: [
        '先定义完成语义再配置副本：completions 是需要的成功 Pod 数，parallelism 是同时最多运行数，两者不能混用。',
        '区分容器重启与 Pod 替换：OnFailure 会在同一 Pod 内重启容器；Never 让失败 Pod 保留终态，由 Job 控制器按策略创建新 Pod。',
        '失败计数与业务重试是两层：backoffLimit 限制 Job 的失败推进，但单次任务内部的循环重试仍需独立超时和幂等保护。',
        '重试可能重复副作用：进程可能在写完后、上报完成前死亡，控制器看到失败便创建新 Pod，业务必须识别同一逻辑任务。',
        'CronJob 触发不是分布式单例：Allow 允许重叠，Forbid 会跳过仍在运行时的新触发，Replace 可能取消旧活动 Job。',
        '期限与清理是资源治理：activeDeadlineSeconds 阻止无限运行，ttlSecondsAfterFinished 控制完成后对象保留，不能替代审计与日志留存。',
      ],
      history: [
        { when: '2015—2016', what: 'Job 与 CronJob 成为 Kubernetes 批处理基础对象', why: '用控制器表达有限任务与周期计划，而不是依赖常驻容器自己实现循环。' },
        { when: '2021', what: '索引 Job 与按索引完成、失败策略逐步成熟', why: '为分布式批处理提供可寻址子任务和更细粒度的并行控制。' },
        { when: '2023—2025', what: 'Pod 失败策略、按 Pod 替换与成功策略持续增强', why: '让复杂任务能区分可重试错误、不可重试错误和部分失败场景。' },
      ],
    },
    capabilities: [
      { name: '有限任务执行', sentence: '把一次性或固定数量的工作建模为会到达完成或失败终态的 Job。' },
      { name: '并行与限流', sentence: '用 completions 和 parallelism 控制总工作量与同时运行的 Pod 数。' },
      { name: '失败替换', sentence: '在退避重试、失败上限和活动期限内创建替代 Pod。' },
      { name: '周期触发', sentence: '用 CronJob 的 cron 计划定期创建独立 Job，并控制暂停和重叠。' },
      { name: '幂等协作', sentence: '通过业务键、去重记录和原子提交，让重试不会造成重复扣款或重复写入。' },
    ],
    path: {
      intent: '运行一个需要两次成功、最多两个并行、允许有限失败的批处理任务，再观察一次“写完后崩溃”的重试和 CronJob 重叠分支。',
      environment: '内存任务与账本模拟；退出结果和调度触发均为固定输入，不访问网络、数据库、时钟或随机源。',
      steps: [
        { title: '把有限工作声明为 Job', description: '明确 completions、parallelism、失败上限与重启策略。若使用 CronJob，则先声明 cron 计划，再由它按触发创建 Job。', terms: [{ name: 'completions', definition: 'Job 期望成功完成的 Pod 总数。' }, { name: 'cron 表达式', definition: '描述周期触发规则的字段组合，由 CronJob 控制器解释。' }], state: 'Job desired=2；parallelism=2；CronJob 仅负责创建 Job。' },
        { title: '控制器创建带标签的 Pod', description: 'Job 给 Pod 添加关联标签，使完成与失败能归属到正确任务。控制器不会把 Pod 的普通 exit 0 直接当成业务已验证。', terms: [{ name: 'Job 标签', definition: '把 Pod 与创建它的 Job 关联起来的元数据。' }, { name: '退出码', definition: '进程返回给运行时的状态；0 通常表示成功，非零表示失败。' }], state: '创建 task-a、task-b 两个活动 Pod。' },
        { title: '任务执行并暴露重复风险', description: '任务可能执行到一半或完成副作用后失败。控制器只能观察 Pod 结果，无法知道外部系统是否已经收到同一次写入。', terms: [{ name: '副作用', definition: '任务对外部状态的改变，例如扣款、发消息或写数据库。' }, { name: '执行窗口', definition: '任务从开始到报告结果的区间，重复风险集中在结果未被确认时。' }], state: 'task-a 第一次失败；task-b 成功一次。' },
        { title: '按重启与失败策略重试', description: 'OnFailure 先在同一 Pod 内容器重启；Never 则保留失败 Pod。Job 控制器依据失败策略与退避上限创建替代 Pod，并累计完成数。', terms: [{ name: 'Backoff', definition: '失败后逐渐延长重试间隔的控制策略，用于降低持续故障压力。' }, { name: '替代 Pod', definition: 'Job 为推进未完成工作而创建的新 Pod，不等于原容器原地重启。' }], state: 'task-a-2 替代失败 Pod；成功后 completions 达到 2。' },
        { title: '完成、失败或期限终止', description: '成功数达到目标后 Job 进入成功终态；失败超过上限或活动期限到达则失败。终态对象是否保留由 TTL 与人工清理策略决定。', terms: [{ name: 'Complete', definition: 'Job 已达到所需成功完成数的终态。' }, { name: 'Failed', definition: 'Job 因失败上限、期限或其他策略无法继续推进的终态。' }], state: '成功路径 Complete；重试耗尽或期限到达则 Failed。' },
        { title: '用幂等保护重复执行', description: '业务使用稳定任务键、数据库唯一约束或状态机拒绝重复提交。即使 Kubernetes 创建第二个 Pod，也只会产生一次有效副作用。', terms: [{ name: '幂等键', definition: '标识同一逻辑操作的稳定键，重复请求据此复用首次结果。' }, { name: '恰好一次', definition: '业务效果只发生一次的强保证，通常需要事务、去重和提交协议协作。' }], state: '相同 task-key 第二次请求返回已处理，不重复扣款。' },
        { title: '控制 CronJob 重叠与错过触发', description: 'CronJob 按策略处理新触发：Forbid 跳过与活动 Job 重叠的新触发，Allow 允许并行；暂停期间不创建新 Job，恢复也不会自动补跑所有错过计划。', terms: [{ name: 'concurrencyPolicy', definition: 'CronJob 对重叠运行采用的 Allow、Forbid 或 Replace 策略。' }, { name: '错过计划', definition: '控制器未及时创建对应 Job 的周期触发；不能假设一定会自动补执行。' }], state: 'Forbid+活动任务 → 新触发跳过；suspend=true → 不创建。' },
      ],
      stateTable: {
        columns: ['事件', 'Pod / Job 状态', '完成计数', '副作用风险', '反直觉点'],
        rows: [
          ['创建两个 Pod', 'Active=2；desired=2', '0', '业务尚未确认', 'parallelism 不是完成数'],
          ['a 失败、b 成功', 'a Failed；b Succeeded', '1', 'a 可能已部分写入', '失败不代表没有副作用'],
          ['创建 a-2', 'Active=1；失败数增加', '仍为 1', '同一逻辑任务再次执行', '替代 Pod 不是原地重启'],
          ['a-2 成功', 'Succeeded=2', '2 → Complete', '若无幂等可能重复', 'Job 不提供业务恰好一次'],
          ['失败达到 backoffLimit', 'Job Failed', '小于目标', '保留已发生副作用', '重试不是无限恢复'],
          ['CronJob 新触发且旧任务活动', 'Forbid 跳过 / Allow 新建', '取决于策略', '重叠可能争用资源', '周期触发不是单例锁'],
        ],
      },
      summary: 'Job 把有限工作推进到 Complete 或 Failed，CronJob 只负责按计划创建 Job。控制器重试解决的是执行中断，不能自动解决重复副作用；可靠批处理必须同时设计完成计数、失败预算、期限与业务幂等。',
    },
    costs: [
      { choice: '提高 parallelism', cost: '缩短总时长，但会增加数据库、网络和下游压力，也可能放大重复写入。', misread: '“并行越高，批处理吞吐就一定越好。”' },
      { choice: '提高 backoffLimit', cost: '能从更多暂时故障中恢复，但会延长任务生命周期并增加重复副作用与资源占用。', misread: '“多重试几次，最终一定会成功。”' },
      { choice: '使用 Allow 并发 CronJob', cost: '不遗漏重叠触发，但长任务可能越积越多并争抢同一业务资源。', misread: '“CronJob 会自己保证同一任务不重叠。”' },
      { choice: '缩短 activeDeadlineSeconds', cost: '限制失控任务的影响，但可能杀死本可完成的长任务，造成更多重试。', misread: '“期限一到，任务效果会自动回滚。”' },
    ],
    example: {
      title: '观察 Job 重试、幂等账本与 CronJob 并发',
      intent: '三个脚本分别展示失败 Pod 被替换、写完后崩溃造成重复风险，以及 CronJob 的重叠与暂停。所有业务账本和触发顺序都固定在内存中。',
      diagram: {
        kind: 'flow',
        title: '控制器重试与业务幂等的双重防线',
        caption: 'Job 控制器看到 Pod 失败后创建替代实例；业务层看到相同任务键后必须拒绝重复副作用。',
        items: [
          { title: '创建有限任务', detail: 'completions 定义成功目标，parallelism 限制同时运行。', tag: '声明', tone: 'blue' },
          { title: 'Pod 执行与失败', detail: '退出失败让控制器知道需要推进，但无法证明外部写入未发生。', tag: '执行', tone: 'orange' },
          { title: '替代 Pod 重试', detail: '控制器按失败预算创建新 Pod，累计成功完成数。', tag: '控制面', tone: 'blue' },
          { title: '业务幂等检查', detail: '稳定 task-key 与去重记录阻止同一逻辑操作再次生效。', tag: '数据面', tone: 'green' },
          { title: '完成或进入 Failed', detail: '达到成功目标则完成；超过失败上限或期限则失败。', tag: '终态', tone: 'muted' },
        ],
        footnote: 'CronJob 在流程之前增加“按计划创建 Job”；它不会改变 Job 内部的重试与幂等需求。',
      },
      commands: [
        {
          title: '失败 Pod 被替代，成功后累计完成数',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# completions=2、parallelism=2、backoffLimit=2；退出结果按固定顺序给出。
job = {"desired": 2, "parallelism": 2, "backoff_limit": 2,
       "succeeded": 0, "failed": 0, "active": 0, "state": "Running"}
attempts = [
    ("task-a-1", "Failed"),
    ("task-b-1", "Succeeded"),
    ("task-a-2", "Succeeded"),
]

def show(pod_name, phase):
    job["active"] -= 1
    if phase == "Succeeded":
        job["succeeded"] += 1
    else:
        job["failed"] += 1
    if job["succeeded"] >= job["desired"]:
        job["state"] = "Complete"
    elif job["failed"] >= job["backoff_limit"]:
        job["state"] = "Failed"
    print(f"Pod={pod_name} phase={phase} succeeded={job['succeeded']} failed={job['failed']} "
          f"active={job['active']} Job={job['state']}")

print(f"初始 desired={job['desired']} parallelism={job['parallelism']} backoffLimit={job['backoff_limit']}")
job["active"] = 2
print(f"创建 task-a-1、task-b-1；active={job['active']}")
show("task-a-1", "Failed")
if job["state"] == "Running":
    job["active"] += 1
    print("控制器创建替代 Pod=task-a-2；已失败 Pod 保持 Failed")
show("task-b-1", "Succeeded")
show("task-a-2", "Succeeded")
print("完成路径结束；达到目标后不再为新工作创建 Pod")
PY`,
          output: `初始 desired=2 parallelism=2 backoffLimit=2
创建 task-a-1、task-b-1；active=2
Pod=task-a-1 phase=Failed succeeded=0 failed=1 active=1 Job=Running
控制器创建替代 Pod=task-a-2；已失败 Pod 保持 Failed
Pod=task-b-1 phase=Succeeded succeeded=1 failed=1 active=1 Job=Running
Pod=task-a-2 phase=Succeeded succeeded=2 failed=1 active=0 Job=Complete
完成路径结束；达到目标后不再为新工作创建 Pod
`,
          note: '模拟展示 Pod 替换路径。若 restartPolicy=OnFailure，kubelet 可先在同一 Pod 内重启失败容器；控制器何时创建替代 Pod 还取决于具体失败策略。',
        },
        {
          title: '对比无幂等与有幂等的重复扣款',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 同一个逻辑任务执行两次：模拟第一次写完后崩溃、控制器创建替代 Pod。
task_key = "charge-order-42"
amount = 10

def run_without_idempotency(balance):
    balance -= amount
    print(f"无幂等执行：扣款 {amount}，余额 {balance}")
    return balance

def run_with_idempotency(balance, ledger):
    # 真实系统应把查重、记账与标记处理放进同一事务；这里只模拟结果。
    if task_key in ledger:
        print(f"幂等执行：task-key={task_key} 已处理，重复请求 skipped")
        return balance
    balance -= amount
    ledger[task_key] = amount
    print(f"幂等执行：首次扣款 {amount}，余额 {balance}，记录 task-key={task_key}")
    return balance

print("分支A：没有业务幂等键")
balance_a = 100
balance_a = run_without_idempotency(balance_a)
balance_a = run_without_idempotency(balance_a)
print(f"无幂等合计扣款={100 - balance_a}；同一逻辑任务产生两次效果")

print("分支B：使用稳定 task-key 与去重记录")
balance_b = 100
ledger = {}
balance_b = run_with_idempotency(balance_b, ledger)
balance_b = run_with_idempotency(balance_b, ledger)
print(f"有幂等合计扣款={100 - balance_b}；重复执行没有重复效果")
print("Kubernetes 的 Job 完成计数不能替代业务事务与去重")
PY`,
          output: `分支A：没有业务幂等键
无幂等执行：扣款 10，余额 90
无幂等执行：扣款 10，余额 80
无幂等合计扣款=20；同一逻辑任务产生两次效果
分支B：使用稳定 task-key 与去重记录
幂等执行：首次扣款 10，余额 90，记录 task-key=charge-order-42
幂等执行：task-key=charge-order-42 已处理，重复请求 skipped
有幂等合计扣款=10；重复执行没有重复效果
Kubernetes 的 Job 完成计数不能替代业务事务与去重
`,
          note: '查重与写入之间的并发窗口必须由数据库唯一约束、事务或原子条件更新消除；仅在内存中先查后写不足以提供强幂等。',
        },
        {
          title: '观察 CronJob 重叠、暂停与活动期限',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 触发用逻辑名称表示，不输出墙钟时间；所有状态均为固定内存值。
cron = {"suspend": False, "concurrency": "Forbid", "active": 1,
        "created": 0, "skipped": 0, "deadline_reached": False}

def trigger(label):
    if cron["suspend"]:
        print(f"触发={label} -> 不创建 Job：CronJob 已暂停")
    elif cron["active"] > 0 and cron["concurrency"] == "Forbid":
        cron["skipped"] += 1
        print(f"触发={label} -> 跳过：已有活动 Job 且策略=Forbid")
    elif cron["deadline_reached"]:
        cron["skipped"] += 1
        print(f"触发={label} -> 跳过：当前 Job 已达活动期限并进入 Failed")
    else:
        cron["created"] += 1
        cron["active"] += 1
        print(f"触发={label} -> 创建 Job；active={cron['active']}")

print("初始：concurrency=Forbid，已有 1 个活动 Job")
trigger("计划A")
cron["suspend"] = True
trigger("计划B")
cron["suspend"] = False
cron["active"] = 0
cron["deadline_reached"] = True
trigger("计划C")
print(f"汇总 created={cron['created']} skipped={cron['skipped']} active={cron['active']}")
print("暂停不会自动补跑所有错过计划；活动期限终止执行，不回滚已发生副作用")
PY`,
          output: `初始：concurrency=Forbid，已有 1 个活动 Job
触发=计划A -> 跳过：已有活动 Job 且策略=Forbid
触发=计划B -> 不创建 Job：CronJob 已暂停
触发=计划C -> 跳过：当前 Job 已达活动期限并进入 Failed
汇总 created=0 skipped=2 active=0
暂停不会自动补跑所有错过计划；活动期限终止执行，不回滚已发生副作用
`,
          note: '真实 CronJob 对补建、并发与 startingDeadlineSeconds 有更细规则；无论采用哪种并发策略，都应为每个 Job 设置幂等键、失败预算与期限。',
        },
      ],
      checkpoints: ['能区分 completions 与 parallelism', '知道失败 Pod 被替代不同于原容器原地重启', '能解释为何写完后崩溃会导致重复副作用', '知道 Forbid 会跳过与活动 Job 重叠的新触发', '知道活动期限或暂停不会自动回滚业务数据'],
      safety: '批任务必须限制单次执行时长、下游并发和失败次数，并为写操作设计幂等键与事务。不要用 CronJob 承载必须严格单例的关键任务而不加分布式锁，也不要在没有数据兼容方案时依赖自动重试。',
    },
    boundaries: {
      blocks: ['把 Job 当成常驻在线服务', '把 CronJob 当成会自动防重的单例', '用 backoffLimit 代替业务超时与幂等', '忽略失败 Pod 可能已经产生副作用', '认为暂停或期限到达会自动补跑或回滚'],
      notBlocks: ['外部数据库缺少唯一约束或事务', '下游服务限流与部分成功', '任务算法本身不幂等', '节点失联造成的执行结果不确定', '调度器长期无法为任务 Pod 分配资源'],
    },
  },
]
