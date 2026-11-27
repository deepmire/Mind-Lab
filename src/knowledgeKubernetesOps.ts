import type { KnowledgeModule } from './knowledgeTypes'

/**
 * Kubernetes 运维与生产边界课程。
 *
 * 本文件延续“意图 → 机制 → 权衡”的深潜结构：先说明运维动作要解决什么用户问题，
 * 再拆解控制器、指标链路、备份与发布机制，最后用确定性状态表和边界说明它不能保证什么。
 * 所有命令都是 Python 标准库教学模拟，只处理内存中的固定数据，不访问集群、网络、时钟或随机源。
 */
export const kubernetesOpsModules: KnowledgeModule[] = [
  /**
   * 弹性模块把“负载变化”拆成三个不同的控制问题：HPA 调副本，VPA 调请求，CA 调节点。
   * 三者共享指标与容量，却有不同的反馈周期；课程重点不是调参口诀，而是识别互相干扰。
   */
  {
    id: 'autoscaling',
    title: 'HPA、VPA 与集群自动扩缩容',
    english: 'HPA / VPA / CLUSTER AUTOSCALER',
    summary: '自动扩缩容不是一个按钮，而是三个反馈回路：HPA 根据指标修改工作负载副本，VPA 根据历史请求修改 Pod 资源请求，集群自动扩缩容器根据调度与容量信号修改节点数。理解它们分别测量什么、以多快速度行动，才能避免扩容了副本却没有容量，或请求一变就让 CPU 利用率凭空跳变。',
    icon: 'chart',
    track: 'kubernetes',
    group: '弹性与可观测',
    dependencies: ['resources-qos', 'scheduling'],
    dependents: [],
    philosophy: {
      problem: '流量会随时间变化，但应用副本、单副本资源请求和节点数量不会自动知道“现在需要多少”。手动调整往往滞后于突发流量，盲目增加又会在低谷浪费容量，还可能把请求、节点和配额一起推向失控。',
      rejects: '副本数不是应用质量，HPA 也不是看到 CPU 高就立即加 Pod 的神器。VPA 不等于自动分配节点，CA 也不保证任何 Pending Pod 都能被满足；资源利用率只是容量信号，不能替代延迟、错误率和饱和度判断。',
      counter: '真正可靠的弹性来自分层闭环：应用暴露可行动指标，HPA 在稳定窗口与上下限内调整副本，VPA 谨慎校准请求，CA 在节点组、配额与拓扑允许时补容量。每一层都要有观测、限幅和人工停止条件。',
    },
    design: {
      abstractions: [
        { name: 'HPA 指标源', role: '从资源指标 API 或自定义、外部指标适配器读取当前值；指标缺失时控制器不能可靠计算期望副本。' },
        { name: '期望副本数', role: '根据当前副本与指标相对目标值的比例计算，再经过容差、稳定窗口、行为策略和 min/max 限制。' },
        { name: '资源请求', role: '调度与配额使用的预留量，也是平均 CPU 利用率公式的分母；它不是实际用量，也不等于 limits。' },
        { name: 'VPA 推荐', role: '根据历史用量推荐 requests 与可控 limits；Off、Initial、Recreate 等模式产生不同的 Pod 生命周期影响。' },
        { name: '节点组容量', role: '一组具有相似规格、区域和约束的可扩缩节点；CA 必须能实际创建符合调度条件的节点。' },
        { name: '稳定窗口与行为', role: '用时间窗聚合多次推荐，限制扩容和缩容速度，防止指标抖动造成反复震荡。' },
      ],
      principles: [
        '先选能代表用户压力的指标：CPU 适合吞吐型负载，队列长度、并发或请求速率可能更适合排队型与 I/O 型服务。',
        '利用率必须有请求作分母：平均 CPU 利用率是 Pod CPU 用量相对于 requests 的比例，不设置 requests 就无法用这个公式解释。',
        '反馈要有阻尼：通过 stabilizationWindowSeconds、扩容策略、缩容策略和容差降低震荡，而不是取消所有保护追求最快。',
        '不同控制回路拥有不同变量：HPA 改副本、VPA 改请求、CA 改节点；共享同一指标或直接相互覆盖会产生难以定位的振荡。',
        '副本就绪不等于服务达标：还要有反亲和、拓扑分布、Pod 启动时间、应用预热、存储与上游容量共同支撑。',
        '自动策略必须有边界：min/max、节点组上限、云配额、预算和人工暂停入口决定故障时最坏能自动发生多少变化。',
      ],
      history: [
        { when: '2015—2017', what: '早期 Kubernetes 提供基于 CPU 的 HPA，并逐步完善扩缩容子资源与控制条件', why: '让控制器通过标准 API 修改 Deployment 等对象的副本，而不是直接操作 Pod。' },
        { when: '2018 起', what: 'HPA 行为策略、稳定窗口以及自定义和外部指标路径逐步成熟', why: '平均 CPU 无法覆盖所有业务，控制器的响应速度也需要防止抖动。' },
        { when: '2020 年代', what: 'VPA 能力与集群自动扩缩容生态持续演进，不同发行版和云平台提供差异化实现', why: '请求推荐、原地调整和节点供给都依赖具体版本，必须把版本能力写入运行手册。' },
      ],
    },
    capabilities: [
      { name: '基于指标调副本', sentence: '让 HPA 根据资源、自定义或外部指标，在上下限内改变 Deployment 等可扩缩对象的副本数。' },
      { name: '校准资源请求', sentence: '用 VPA 的历史用量推荐降低浪费或缓解频繁 OOM，同时评估 Pod 重建和调度变化。' },
      { name: '补充节点容量', sentence: '让 CA 针对无法调度的 Pod 请求新节点，并在容量闲置且策略允许时回收节点。' },
      { name: '抑制扩缩容震荡', sentence: '利用稳定窗口、步长与容差把瞬时抖动转换成有边界的渐进调整。' },
      { name: '暴露弹性失败原因', sentence: '通过 HPA 条件、事件和 Pending 原因区分指标缺失、配额不足、拓扑约束和节点组不可用。' },
    ],
    path: {
      intent: '让一个固定负载的 API 从 2 个副本调整到 3 个，再观察低负载为何不会立刻缩回，以及 VPA 修改 requests 后 HPA 公式为何会改变。',
      environment: '内存教学模型。指标值、资源请求、稳定窗口和节点容量全部固定；HPA、VPA 与 CA 的计算规则被简化，但保留“指标—推荐—约束—执行”的顺序。',
      steps: [
        { title: '先定义用户压力与容量目标', description: '把“流量上升”转成可测信号。本例用每 Pod 平均 CPU 用量相对于 requests 的利用率，目标 60%；同时记录 minReplicas=2、maxReplicas=8，防止任何计算把副本推到边界之外。', terms: [{ name: '资源请求', definition: 'requests 声明的调度与 QoS 预留量；CPU 利用率通常以它为分母。' }, { name: '扩容上下限', definition: 'HPA 可以自动设置的副本范围，超出范围的需求必须靠人工或其他容量规划处理。' }], state: '目标=60%；当前副本=2；允许范围=2…8。' },
        { title: '建立 Metrics Server 到 HPA 的链路', description: 'kubelet 暴露节点与容器资源采样，Metrics Server 汇聚后通过 metrics.k8s.io 聚合 API 提供短时资源指标；HPA 控制器查询对应 Pod 指标。链路中断时看到的是条件与事件，而不是一个可假装为零的 CPU 值。', terms: [{ name: '聚合 API', definition: '由 apiserver 注册并转发的扩展 API；metrics.k8s.io 是资源指标的一条常见入口。' }, { name: '采样窗口', definition: '指标不是数学上的瞬时真值，Metrics Server 与 HPA 读取的是某个采集周期内的样本。' }], state: '链路=Pod → kubelet → Metrics Server → 聚合 API → HPA；样本可用。' },
        { title: '把当前指标换算成利用率', description: '两个 Pod 的 CPU 用量分别为 120m 和 540m，每 Pod requests=500m。平均用量 330m，因此平均利用率为 330÷500=66%，不是 330m 这个绝对数字，也不是 330%。', terms: [{ name: 'millicpu', definition: 'CPU 的千分之一单位；500m 表示 0.5 核，100m 表示 0.1 核。' }, { name: '平均利用率', definition: 'Pod 平均资源用量除以对应 requests 后得到的百分比，用于跨副本数比较相对压力。' }], state: '平均 CPU=330m；requests=500m；利用率=66%。' },
        { title: '计算推荐并应用控制策略', description: '最简公式给出 ceil(2×66÷60)=3，随后 min/max 与行为策略检查这个候选；本例在允许范围内扩容到 3。真实 HPA 还要考虑容差、指标缺失、扩容稳定窗口和缩容稳定窗口，不能把公式当成唯一行为。', terms: [{ name: '期望副本', definition: '控制器根据指标算出的候选值，仍需经过行为策略与边界裁剪。' }, { name: '稳定窗口', definition: '控制器回看一段时间内推荐值的机制；缩容时常取窗口内较高推荐以避免过早减容。' }], state: '高负载推荐=3；扩容执行后 currentReplicas=3。' },
        { title: '低负载时先等待缩容窗口', description: '副本增加后每 Pod 用量下降，公式可能推荐缩容。缩容稳定窗口会保留最近一段时间的较高推荐，让流量回落被确认；窗口过期且持续低负载后，才允许向下调整。', terms: [{ name: '缩容稳定', definition: '用历史推荐抵抗短暂低谷，降低“扩容后立刻缩容”的震荡。' }, { name: '容差', definition: '指标接近目标时允许不行动的小区间，用于过滤无意义的小幅变化。' }], state: '低负载推荐=1；窗口内仍保持 3；窗口过后缩至 minReplicas=2。' },
        { title: '识别 VPA 与 HPA 的交叉反馈', description: '若 VPA 把 requests 从 500m 改成 300m，而实际用量不变，CPU 利用率会从 40% 上升到约 67%，HPA 因而可能增加副本。这个变化不代表流量上涨，却会让 HPA 与 VPA 互相追赶。通常避免用同一资源信号驱动两者，或只让 VPA 提供 Initial 推荐。', terms: [{ name: '交叉反馈', definition: '一个控制器改变的量恰好是另一个控制器测量公式的分母，导致没有负载变化也发生调整。' }, { name: 'VPA 模式', definition: '决定 VPA 只给初始建议、重建 Pod，还是按版本能力原地调整资源的运行方式。' }], state: '用量不变；requests 下降；利用率上升；HPA 候选副本增加。' },
        { title: '让 CA 检查真实可调度性', description: '副本超过节点容量后会出现 Pending Pod，CA 才根据节点组、亲和性、可用区、配额和可创建规格判断能否加节点。若 PVC 无法供给、IP 不足或节点组到上限，增加副本只会制造更多 Pending，不能改善服务。', terms: [{ name: '可调度性', definition: 'Pod 的 requests、卷、亲和性与污点等条件能否被某个节点同时满足。' }, { name: '节点组上限', definition: '自动扩缩容允许存在的最大节点数，可能由节点池配置、配额或预算共同决定。' }], state: '容量足够时不加节点；容量或外部约束失败时 Pending 原因可见。' },
      ],
      stateTable: {
        columns: ['阶段', 'HPA 指标与推荐', '策略结果', 'VPA / CA 交互', '异常证据'],
        rows: [
          ['采样准备', 'requests 或 metrics API 缺失', '无法计算，保持原副本', 'VPA 修改 requests 可能让分母失效', 'AbleToComputeMetrics=False；FailedGetResourceMetric'],
          ['高负载', '利用率高于目标', '在 maxReplicas 内扩容', '新 Pod 需要时间预热与调度', 'DesiredReplicas 上升；新 Pod 可能 Pending'],
          ['短暂低负载', '利用率下降，公式推荐缩容', '缩容窗口保留较高推荐', 'VPA 重建 Pod 会扰动样本', 'ScalingLimited 或事件说明未立即缩容'],
          ['持续低负载', '窗口内推荐持续较低', '受 minReplicas 与缩容速率约束', 'CA 可能稍后回收闲置节点', '副本下降但服务错误率需同时观察'],
          ['请求被 VPA 调整', '实际用量不变，利用率变化', 'HPA 可能误判为压力变化', '共享 CPU 信号产生交叉反馈', 'requests 变更事件与 HPA 扩容同时出现'],
          ['容量受限', 'HPA 仍可增加期望副本', 'Pod 无法全部 Ready', 'CA 无法突破卷、拓扑、配额或节点组上限', 'FailedScheduling；节点组扩容失败事件'],
          ['指标适配器异常', '指标陈旧或查询失败', '进入未知或受限状态', '不能把缺失指标当成零', 'ScalingActive=False；指标延迟与 API 错误'],
        ],
      },
      summary: '弹性链路是“压力信号 → 候选副本或请求 → 阻尼与边界 → 调度与就绪 → 用户结果”。HPA、VPA、CA 各自只解决其中一段，只有把指标延迟、资源请求、节点约束和应用质量放在一起观察，自动扩缩容才真正有效。',
    },
    costs: [
      { choice: '更激进的扩容', cost: '缩短容量追赶时间，但需要更多预热副本、节点余量和预算，也可能放大依赖服务压力。', misread: 'maxReplicas 越大，系统就越可靠。' },
      { choice: '更长的稳定窗口', cost: '减少震荡，却会延迟对真实持续变化的响应。', misread: '窗口越长越安全，不需要按业务突发性调整。' },
      { choice: 'VPA 自动调整请求', cost: '提高资源利用率，但可能重建 Pod、改变 QoS，并与 HPA 的利用率分母互相干扰。', misread: 'requests 调小一定没有代价。' },
      { choice: 'CA 自动增删节点', cost: '减少闲置容量，但节点供给有延迟、配额和费用，缩节点也可能打断尚未迁走的工作负载。', misread: '只要有 Pending，CA 就一定能瞬间补出节点。' },
    ],
    example: {
      title: '在内存中观察 HPA 阻尼、VPA 交叉反馈与 CA 上限',
      intent: '三组固定实验分别展示缩容窗口、requests 改变利用率、以及 CA 面对节点配额时的边界。输出没有真实时间、随机采样或集群调用。',
      diagram: {
        kind: 'flow',
        title: '三个控制回路如何共享容量与指标',
        caption: 'HPA 修改副本，VPA 修改请求，CA 修改节点；三条箭头最终都汇入调度与就绪，而不是直接汇入“应用质量”。',
        items: [
          { title: '指标采集', detail: 'kubelet 样本经 Metrics Server 或适配器进入指标 API；应用自定义指标可来自另一条链路。', tag: '输入', tone: 'blue' },
          { title: 'HPA 调副本', detail: '计算利用率与候选副本，经过稳定窗口、行为策略和 min/max 后更新工作负载。', tag: '副本回路', tone: 'green' },
          { title: 'VPA 调请求', detail: '推荐或修改 requests；可能改变 CPU 利用率的分母，并触发 Pod 重建。', tag: '资源回路', tone: 'orange' },
          { title: 'CA 调节点', detail: '看到无法调度的 Pod 后检查节点组、配额与拓扑，尝试供给或回收容量。', tag: '容量回路', tone: 'blue' },
          { title: '调度与就绪', detail: '只有 Pod 真正 Ready、分布合理且应用健康，副本变化才转化为服务能力。', tag: '结果边界', tone: 'orange' },
        ],
        footnote: '示例把控制器计算写成简化函数；生产行为必须以所部署版本的官方文档、指标适配器和发行版实现为准。',
      },
      commands: [
        {
          title: '模拟 HPA 指标链路与 300 秒缩容稳定窗口',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import math
import sys
from collections import deque

sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 所有数据固定，不使用时钟、随机数或网络。
request_m = 500              # 每个 Pod 的 CPU requests，单位 millicpu。
target_utilization = 60      # HPA 目标平均利用率，单位百分比。
current = 2                  # 当前副本数。
minimum, maximum = 2, 8
window = 300                 # 缩容稳定窗口，单位秒。
recommendations = deque()    # 保存 (逻辑时刻, 候选副本)，用于回看窗口。
print("链路=Pod → kubelet → Metrics Server → metrics.k8s.io → HPA")

# 第一周期给高负载样本；之后固定为低负载，用来观察窗口何时放行缩容。
samples = [
    (0, [120, 540], "扩容"),
    (60, [20, 20, 20], "缩容"),
    (120, [20, 20, 20], "缩容"),
    (180, [20, 20, 20], "缩容"),
    (240, [20, 20, 20], "缩容"),
    (300, [20, 20, 20], "缩容"),
    (360, [20, 20, 20], "缩容"),
]

for second, usages, direction in samples:
    # Metrics Server 返回的样本数量对应采样时刻的 Pod 数。
    average_m = sum(usages) / len(usages)
    utilization = average_m / request_m * 100
    raw = math.ceil(current * utilization / target_utilization)
    candidate = max(minimum, min(maximum, raw))

    # 严格保留窗口内所有推荐；缩容候选只能向下，不能反向放大缩容动作。
    recommendations.append((second, candidate))
    while recommendations and second - recommendations[0][0] > window:
        recommendations.popleft()
    if direction == "扩容":
        desired = candidate
        reason = "扩容策略放行"
    else:
        desired = max(item[1] for item in recommendations)
        reason = "缩容窗口保留较高推荐" if desired > candidate else "缩容窗口已放行"

    previous = current
    current = desired
    print(
        f"周期秒={second} 样本={usages} 平均CPU={average_m:.0f}m "
        f"利用率={utilization:.0f}% 原始期望={raw} 候选={candidate} "
        f"动作={previous}→{current} 原因={reason}"
    )

print(f"最终副本={current} min={minimum} max={maximum} 注意=副本数不证明应用质量")
PY`,
          output: `链路=Pod → kubelet → Metrics Server → metrics.k8s.io → HPA
周期秒=0 样本=[120, 540] 平均CPU=330m 利用率=66% 原始期望=3 候选=3 动作=2→3 原因=扩容策略放行
周期秒=60 样本=[20, 20, 20] 平均CPU=20m 利用率=4% 原始期望=1 候选=2 动作=3→3 原因=缩容窗口保留较高推荐
周期秒=120 样本=[20, 20, 20] 平均CPU=20m 利用率=4% 原始期望=1 候选=2 动作=3→3 原因=缩容窗口保留较高推荐
周期秒=180 样本=[20, 20, 20] 平均CPU=20m 利用率=4% 原始期望=1 候选=2 动作=3→3 原因=缩容窗口保留较高推荐
周期秒=240 样本=[20, 20, 20] 平均CPU=20m 利用率=4% 原始期望=1 候选=2 动作=3→3 原因=缩容窗口保留较高推荐
周期秒=300 样本=[20, 20, 20] 平均CPU=20m 利用率=4% 原始期望=1 候选=2 动作=3→3 原因=缩容窗口保留较高推荐
周期秒=360 样本=[20, 20, 20] 平均CPU=20m 利用率=4% 原始期望=1 候选=2 动作=3→2 原因=缩容窗口已放行
最终副本=2 min=2 max=8 注意=副本数不证明应用质量`,
          note: '第一个周期由高负载样本触发扩容；低负载候选先被 minReplicas=2 裁剪，再由 300 秒缩容窗口保留较高的 3，窗口过期后才降到 2。公式只是候选计算，最终动作还要经过上下限与稳定策略。',
        },
        {
          title: '观察 VPA 修改 requests 如何改变 HPA 利用率',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import math
import sys

sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 负载固定为每 Pod 200m；唯一变化是 VPA 推荐并写入新的 requests。
replicas = 4
actual_m = 200
target = 60
scenarios = [
    ("A", 500, "业务流量不变"),
    ("B", 300, "VPA 将 requests 从 500m 调到 300m"),
]

for label, request_m, cause in scenarios:
    utilization = actual_m / request_m * 100
    raw = math.ceil(replicas * utilization / target)
    desired = min(8, max(2, raw))
    # 节点容量固定为 2 台 × 4 核；该请求量远未触及 CPU 容量上限。
    node_capacity_m = 2 * 4000
    total_request_m = desired * request_m
    ca_action = "不加节点" if total_request_m <= node_capacity_m else "请求新节点"
    print(
        f"场景={label} 原因={cause} 实际CPU={actual_m}m requests={request_m}m "
        f"利用率={utilization:.1f}% 当前副本={replicas} HPA原始期望={raw} "
        f"裁剪后期望={desired} CA判断={ca_action}"
    )

# CA 不是按 HPA 公式复制结果；这里显式展示配额和拓扑才是节点动作的输入。
print("交叉反馈=requests 变小 → 利用率变大 → HPA 可能扩容；流量并没有增加")
print("防护选择=避免同一 CPU 信号同时驱动 VPA 与 HPA，或仅使用 VPA Initial 推荐")
print("边界=CA 不能突破节点组上限、配额、PVC、可用区或 IP 地址约束")
PY`,
          output: `场景=A 原因=业务流量不变 实际CPU=200m requests=500m 利用率=40.0% 当前副本=4 HPA原始期望=3 裁剪后期望=3 CA判断=不加节点
场景=B 原因=VPA 将 requests 从 500m 调到 300m 实际CPU=200m requests=300m 利用率=66.7% 当前副本=4 HPA原始期望=5 裁剪后期望=5 CA判断=不加节点
交叉反馈=requests 变小 → 利用率变大 → HPA 可能扩容；流量并没有增加
防护选择=避免同一 CPU 信号同时驱动 VPA 与 HPA，或仅使用 VPA Initial 推荐
边界=CA 不能突破节点组上限、配额、PVC、可用区或 IP 地址约束`,
          note: '场景按“当前副本仍为 4”分别计算，便于隔离 requests 的影响。真实系统中，HPA 修改副本后样本集合也会变化，两个回路还会在不同周期继续互相影响。',
        },
        {
          title: '模拟指标缺失与节点配额两类扩容失败',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys

sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 失败一：metrics.k8s.io 查询失败。缺失不是 0%，HPA 不应据此缩容。
current_replicas = 3
metrics_available = False
if not metrics_available:
    print("场景=指标缺失 AbleToComputeMetrics=False ScalingActive=False")
    print(f"HPA动作=保持 currentReplicas={current_replicas} desired=unknown")
    print("排障起点=Metrics Server Pod、聚合 API 注册、kubelet 采样与 RBAC")

# 失败二：指标正常，HPA 已到上限；新 Pod 因节点组配额无法调度。
hpa = {"current": 3, "desired": 6, "maximum": 6, "metric": "queue=12 target=4"}
nodes = [{"name": "node-a", "allocatable_cpu": 4}, {"name": "node-b", "allocatable_cpu": 4}]
node_quota = 2
pending_pods = 3
print(
    f"场景=容量受限 current={hpa['current']} desired={hpa['desired']} "
    f"max={hpa['maximum']} {hpa['metric']} Pending={pending_pods}"
)
if len(nodes) >= node_quota:
    print("CA动作=不加节点 原因=节点组已达 quota=2")
else:
    print("CA动作=请求新节点")
print("结果=HPA达到上限且新Pod无法Ready 副本目标不等于服务容量")
print("正确动作=核对配额和节点组规格，必要时人工提高容量或降低非关键负载")
PY`,
          output: `场景=指标缺失 AbleToComputeMetrics=False ScalingActive=False
HPA动作=保持 currentReplicas=3 desired=unknown
排障起点=Metrics Server Pod、聚合 API 注册、kubelet 采样与 RBAC
场景=容量受限 current=3 desired=6 max=6 queue=12 target=4 Pending=3
CA动作=不加节点 原因=节点组已达 quota=2
结果=HPA达到上限且新Pod无法Ready 副本目标不等于服务容量
正确动作=核对配额和节点组规格，必要时人工提高容量或降低非关键负载`,
          note: '真实 HPA 的条件和事件会因版本与指标类型不同而变化。不要根据模拟字符串直接诊断生产，应把状态对象、控制器日志和调度事件一起保存。',
        },
      ],
      checkpoints: [
        '能解释 HPA 的 CPU 利用率为什么以 requests 为分母',
        '能说明 Metrics Server 到 metrics.k8s.io 再到 HPA 的查询方向',
        '能区分原始期望副本与经过稳定窗口、行为策略、min/max 后的动作',
        '能解释 VPA 改变 requests 时，为什么实际负载不变也会让 HPA 扩容',
        '能列出至少三种 CA 无法解决 Pending 的原因',
        '能说明副本数上升为什么不等于延迟、错误率或业务质量改善',
      ],
      safety: '本模块不执行 kubectl scale、不修改 VPA 推荐、不创建节点。生产变更前应在测试环境验证指标口径、资源请求、节点组上限、预算和回滚方式，并设置停止自动策略的人工开关。',
    },
    boundaries: {
      blocks: ['CPU、队列或并发驱动的副本自动调整', '请求资源与历史用量的推荐校准', '有可用节点组与配额时的节点容量补充', '由稳定窗口和步长约束的扩缩容震荡'],
      notBlocks: ['容量或云配额不足', '指标采集链路失效', '应用启动慢、预热不足或存在隐藏单点', '数据库、消息队列或第三方服务的容量瓶颈', '拓扑、存储、IP 或亲和性造成的不可调度', '把副本数误当成 SLO 或应用质量保证'],
    },
  },
  /**
   * 观测模块以“症状—证据—假设—验证”为主线，避免把指标、日志、事件和追踪当成可互换的文字。
   * 示例刻意展示证据冲突与缺失，训练学习者只对能被数据支持的结论采取行动。
   */
  {
    id: 'kubernetes-observability',
    title: 'Kubernetes 可观测性与排障证据',
    english: 'METRICS / LOGS / EVENTS / TRACES',
    summary: 'Kubernetes 可观测性不是把四种数据堆在一起，而是用不同证据回答不同问题：指标发现异常在何时与何处扩大，日志解释单个实例说了什么，事件记录对象生命周期中的状态变化，追踪还原一次请求跨服务的路径。可靠的排障需要指标定位、日志解释、事件佐证和追踪串联，并明确每种信号的采样、保留与因果局限。',
    icon: 'terminal',
    track: 'kubernetes',
    group: '弹性与可观测',
    dependencies: ['api-objects', 'pod-controllers'],
    dependents: [],
    philosophy: {
      problem: '分布式系统中“服务变慢”可能来自应用代码、资源争用、网络、存储、依赖服务或配置变化。单看一个百分比无法还原请求经历，单看一条错误日志也可能把相关关系误认为根因。',
      rejects: '事件不是长期性能数据库，Metrics Server 不是完整监控系统，一条 OOMKilled 也不自动证明业务代码有内存泄漏。追踪默认可能采样，日志可能丢失或重复，指标聚合更会隐藏异常实例。',
      counter: '有效观测从用户症状定义证据需求，再沿资源标识、时间范围和请求标识把四类数据关联起来。每个结论都要能回答“由什么信号支持、还缺什么反证、下一步怎样验证”，而不是先找一个看起来像根因的对象。',
    },
    design: {
      abstractions: [
        { name: 'Metric', role: '按标签聚合的数值时间序列，适合发现趋势、速率和异常，但通常不能解释单个请求的完整上下文。' },
        { name: 'Log', role: '应用或组件产生的事件文本或结构化记录，适合解释状态与错误细节，需控制量、敏感信息和保留成本。' },
        { name: 'Event', role: '关于 Kubernetes 对象变化的短寿命记录，适合解释调度、探针、拉镜像和生命周期，但不是持久审计或性能数据库。' },
        { name: 'Trace / Span', role: '一次分布式请求中带父子关系的操作记录，用 trace_id 串联服务，展示耗时与调用路径。' },
        { name: 'Resource Metric API', role: 'metrics.k8s.io 等 API 提供节点和 Pod 的短时资源指标，是 Metrics Server、HPA 与 kubectl top 的常见数据路径。' },
        { name: '关联键与上下文', role: 'cluster、namespace、Pod UID、容器名、请求 ID 和 trace_id 等字段，把不同来源的证据绑定到同一对象或请求。' },
      ],
      principles: [
        '先定义症状与窗口：用错误率、延迟、吞吐或用户任务描述问题，再限定集群、命名空间、工作负载和时间范围。',
        '让每类信号做擅长的事：指标看群体趋势，日志看个体语义，事件看对象状态变化，追踪看跨服务请求路径。',
        '保留对象身份而非只看名字：Pod 重建后名称可能不变但 UID 会变，错误标签和过期样本必须能识别。',
        '警惕基数与采样：高基数标签会推高指标成本，日志与追踪采样会让“没有看到”不等于“没有发生”。',
        '相关不等于根因：同一时刻的 OOM、重启和延迟上升需要内存曲线、退出码、上下游追踪共同验证。',
        '证据要可复现：记录查询条件、时间段、对象版本和采样策略，使另一位值班人员能重走排障路径。',
      ],
      history: [
        { when: '2015 起', what: 'Kubernetes 提供 Events、容器日志与 cAdvisor/kubelet 资源采样', why: '控制面需要解释 Pod 生命周期，节点需要暴露容器资源使用情况。' },
        { when: '2018—2020', what: 'Metrics Server 与 metrics.k8s.io 成为常见资源指标路径，Prometheus 等生态承担长期监控', why: '把短时调度与 HPA 指标同长期趋势监控分开，避免让 Metrics Server 承担历史存储职责。' },
        { when: '2020 年代', what: 'OpenTelemetry 等规范推动指标、日志与追踪的上下文传播和统一关联', why: '跨服务问题需要共享 trace_id 等字段，但统一协议不意味着所有信号可互相替代。' },
      ],
    },
    capabilities: [
      { name: '用指标定位异常', sentence: '从 RED、USE 或业务指标识别错误率、延迟、吞吐与资源饱和度的变化范围。' },
      { name: '用日志解释实例', sentence: '读取容器标准输出与错误、节点组件或审计日志，还原具体实例发生了什么。' },
      { name: '用事件解释生命周期', sentence: '从 FailedScheduling、BackOff、Unhealthy 等事件找到对象状态变化的直接线索。' },
      { name: '用追踪还原请求', sentence: '沿 trace_id 和 span 父子关系定位跨服务调用中的高耗时或错误分支。' },
      { name: '建立证据链', sentence: '把 Pod UID、工作负载、资源版本和请求标识关联起来，支持可复现的故障判断。' },
    ],
    path: {
      intent: '从“API 延迟升高、部分请求失败”出发，先定位受影响实例，再判断是资源不足、依赖变慢还是配置问题，而不是看到一条错误日志就重启全部副本。',
      environment: '教学证据包。所有指标值、日志、事件与 span 都硬编码在内存中，相对耗时以微秒表示；不查询真实 apiserver、日志平台或追踪后端。',
      steps: [
        { title: '把模糊症状改成可验证问题', description: '先记录用户可见结果：过去一个观测窗口内 P95 延迟上升、5xx 比例增加，确认影响范围与开始条件。没有基线时，“变慢”只是形容词，不能指导排查。', terms: [{ name: 'SLI', definition: '衡量服务某个质量维度的指标，例如成功请求比例或低于阈值的请求比例。' }, { name: 'P95 延迟', definition: '95% 的请求不超过该延迟；它关注尾部，不代表每个请求都一样。' }], state: '症状=P95 升高且 5xx 增加；范围=checkout 命名空间。' },
        { title: '用指标缩小范围', description: '按工作负载和实例比较请求速率、错误率、P95、CPU、内存和重启次数。若只有部分实例异常，先保留实例标签；若所有实例同时变化，再检查共享依赖与发布。', terms: [{ name: '基数', definition: '时间序列中标签组合的数量；Pod 名、用户 ID 等高变化标签可能造成成本爆炸。' }, { name: '饱和', definition: '资源接近上限，继续增加负载会使排队或失败显著恶化。' }], state: '异常集中在 checkout-7b9；其他副本指标正常。' },
        { title: '检查资源指标链路是否可信', description: 'kubelet 采集容器资源，Metrics Server 聚合后暴露 metrics.k8s.io。先确认样本新鲜、Pod UID 对应且 API 可用，再使用 CPU、内存值；缺失或陈旧数据不能当作真实零值。', terms: [{ name: '样本新鲜度', definition: '指标采集时间与当前观测窗口的接近程度；陈旧样本不适合证明当前状态。' }, { name: 'Pod UID', definition: 'Pod 每次重建都会变化的身份，可防止把旧实例日志或样本误挂到新实例。' }], state: '资源 API 可用；异常实例 UID 与日志、事件一致。' },
        { title: '用事件核对状态变化', description: '查看 Pending、FailedScheduling、OOMKilled、Unhealthy、BackOff 等事件及其次数与对象。事件能指出发生过什么变化，但通常不能直接证明性能根因，也不适合当作长期审计。', terms: [{ name: 'Kubernetes Event', definition: '关于对象状态变化的短寿命记录，可能被聚合、去重或因保留策略消失。' }, { name: '审计日志', definition: '记录谁对 apiserver 做了什么的安全审计，与普通 Event 的目的和保留方式不同。' }], state: '事件显示该实例曾被 Killing；需继续验证退出原因。' },
        { title: '读取对应容器的日志', description: '按 Pod UID、容器名与窗口读取标准输出和错误，查找异常栈、超时、配置变更和重试。容器重启前的日志可能已轮转，不能仅因当前日志为空就断言没有发生过错误。', terms: [{ name: '日志轮转', definition: '达到大小或时间条件后归档、删除旧日志的机制；Pod 重建也会丢失节点上的原容器日志。' }, { name: '结构化日志', definition: '把级别、组件、错误码和请求标识写成可解析字段，便于过滤与关联。' }], state: '日志显示 payment 调用超时；同时存在重试记录。' },
        { title: '沿追踪验证请求路径', description: '用请求 ID 找到对应 trace，检查入口、checkout、payment 与数据库 span 的父子关系和耗时。父 span 会包含子操作耗时，不能把父 span 当作独立耗时；如果 payment/db 是最慢叶子，仍需比较 checkout 未被子 span 解释的自身耗时，再决定检查共享依赖还是本地处理。', terms: [{ name: 'Trace', definition: '由同一 trace_id 关联的一组 span，描述一次请求经过的操作路径。' }, { name: '采样', definition: '只保留部分请求的观测策略；尾部采样可优先保留慢请求或错误请求，但仍可能漏掉证据。' }], state: 'payment/db 是较慢叶子；checkout 自身仍有未分解耗时。' },
        { title: '形成假设并设计最小验证', description: '把“payment 数据库调用变慢导致 checkout 延迟”写成可证伪假设，对比同窗口数据库连接、慢查询和正常 trace。修复后同时观察用户 SLI 与资源指标，避免只让某个技术指标变绿。', terms: [{ name: '可证伪假设', definition: '能用新证据推翻的判断，而不是无法被测试的笼统结论。' }, { name: '恢复验证', definition: '确认用户指标回到基线，且没有把故障转移到上游、存储或其他可用区。' }], state: '假设已形成；等待依赖指标与修复后 SLI 双重验证。' },
      ],
      stateTable: {
        columns: ['症状 / 场景', '指标能说明', '日志与事件能补充', '追踪能补充', '不能直接推出'],
        rows: [
          ['Pod 长期 Pending', '待调度数量、节点资源余量', 'FailedScheduling 给出卷、污点、亲和性等原因', '通常无请求路径信息', '加节点一定能解决所有约束'],
          ['Pod 反复重启', '重启速率、OOM 前后内存趋势', '事件与退出码可指向 OOMKilled 或探针失败', '可观察重启期间失败请求', '仅凭重启就断定代码泄漏'],
          ['API 延迟升高', 'P95/P99、错误率、并发与资源饱和度', '超时、重试和配置错误细节', '跨服务 span 中真正耗时的位置', '单个慢日志就是根因'],
          ['指标查询失败', '指标断点、API 错误与陈旧程度', 'Metrics Server 与聚合 API 组件日志', '请求是否打到指标 API', '指标缺失代表负载为零'],
          ['节点磁盘压力', '磁盘使用、inode 与写入延迟', 'Evicted、容器无法写入等事件', '受影响请求的存储 span', '删除日志就能永久解决容量问题'],
          ['追踪中没有样本', '采样率与错误率可提供背景', '请求 ID 与入口日志可能仍存在', '无 trace 时无法还原该请求', '没有 trace 就等于没有慢请求'],
        ],
      },
      summary: '排障质量取决于证据链而不是工具数量：用指标找到异常群体，用事件核对对象变化，用日志理解单个实例，用追踪还原请求路径。每一类信号都有盲区，结论必须跨信号验证并保留可复现的查询上下文。',
    },
    costs: [
      { choice: '高基数指标', cost: '可以定位到更细的实例或用户维度，但会显著增加存储、查询和保留费用。', misread: '标签越多，监控一定越准确。' },
      { choice: '全量日志与追踪', cost: '证据更完整，但成本、隐私暴露和写入压力也会上升，甚至反过来影响服务。', misread: '采样越少越好，最好每个请求都永久保存。' },
      { choice: '短时事件', cost: '便于快速查看状态变化，但会过期、聚合，无法替代持久审计和长期趋势。', misread: 'kubectl get events 能还原所有历史操作。' },
      { choice: '长期指标保留', cost: '支持容量分析与事故复盘，但需要规划降采样、分层存储与访问权限。', misread: 'Metrics Server 可以承担整个公司的历史监控。' },
    ],
    example: {
      title: '用固定证据包演练四类信号的关联与反证',
      intent: '三个实验分别展示 Metrics Server 到 HPA 的链路、事件与指标日志的证据差异、以及一次慢请求的 span 路径。所有标识和数值均固定。',
      diagram: {
        kind: 'layers',
        title: '从用户症状下沉到 Kubernetes 与请求证据',
        caption: '上层症状提出查询问题，中层信号定位对象，底层资源与请求上下文提供验证；箭头不是自动根因结论。',
        items: [
          { title: '用户症状', detail: 'P95 延迟与 5xx 上升，先定义影响范围、窗口和成功标准。', tag: '为什么查', tone: 'orange' },
          { title: '指标与事件', detail: '指标找到异常实例与资源趋势，事件补充调度、重启和探针变化。', tag: '在哪里', tone: 'blue' },
          { title: '日志', detail: '按 Pod UID 与容器读取错误、超时、重试和配置输出。', tag: '发生了什么', tone: 'muted' },
          { title: '追踪', detail: '沿 trace_id 比较入口、应用与数据库 span 的耗时。', tag: '请求走过哪里', tone: 'green' },
          { title: '假设与验证', detail: '跨信号确认根因，再用修复后的 SLI 和资源状态验证恢复。', tag: '下一步', tone: 'orange' },
        ],
        footnote: '“没有看到”可能来自采样、日志轮转或 Event 过期；证据缺口本身也应记录。',
      },
      commands: [
        {
          title: '模拟 kubelet、Metrics Server 与 HPA 的指标链路',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys

sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 固定 kubelet 采样，模拟 Metrics Server 聚合与 HPA 查询；不发起任何 API 请求。
kubelet_samples = [
    {"pod": "api-a", "uid": "uid-a", "cpu_m": 120, "memory_mi": 210},
    {"pod": "api-b", "uid": "uid-b", "cpu_m": 180, "memory_mi": 260},
]
aggregated = {
    "apiVersion": "metrics.k8s.io/v1beta1",
    "kind": "PodMetrics",
    "items": [
        {
            "pod": item["pod"],
            "uid": item["uid"],
            "cpu_m": item["cpu_m"],
            "memory_mi": item["memory_mi"],
        }
        for item in kubelet_samples
    ],
}

print("链路=kubelet /metrics/resource → Metrics Server → metrics.k8s.io → HPA")
for item in aggregated["items"]:
    print(
        f"聚合样本 pod={item['pod']} uid={item['uid']} "
        f"CPU={item['cpu_m']}m 内存={item['memory_mi']}Mi"
    )
average_cpu = sum(item["cpu_m"] for item in aggregated["items"]) / len(aggregated["items"])
print(f"HPA读取=apiVersion={aggregated['apiVersion']} 样本数={len(aggregated['items'])} 平均CPU={average_cpu:.0f}m")
print("边界=该API服务短时资源指标，不保存长期历史，也不自动包含业务错误率")
PY`,
          output: `链路=kubelet /metrics/resource → Metrics Server → metrics.k8s.io → HPA
聚合样本 pod=api-a uid=uid-a CPU=120m 内存=210Mi
聚合样本 pod=api-b uid=uid-b CPU=180m 内存=260Mi
HPA读取=apiVersion=metrics.k8s.io/v1beta1 样本数=2 平均CPU=150m
边界=该API服务短时资源指标，不保存长期历史，也不自动包含业务错误率`,
          note: '真实采集端点与 API 版本可能随部署方式变化。这里用固定字典表达数据方向，重点是 Metrics Server 不负责长期监控，HPA 只是指标 API 的消费者之一。',
        },
        {
          title: '对比指标、日志和事件分别能证明什么',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys

sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

pod_uid = "uid-checkout-7b9"
metric = {"restarts_5m": 3, "memory_before_oom_mi": 246, "memory_limit_mi": 256}
event = {"type": "Warning", "reason": "OOMKilled", "object": "Pod/checkout-7b9", "count": 1}
log = {"uid": pod_uid, "stream": "stderr", "message": "batch_size=5000; allocation failed"}
trace = {"trace_id": "trace-fixed-91", "outcome": "timeout", "child": "payment/db"}

print(
    f"指标 restarts_5m={metric['restarts_5m']} OOM前内存={metric['memory_before_oom_mi']}Mi "
    f"limit={metric['memory_limit_mi']}Mi 能支持=资源压力与重启相关"
)
print(
    f"事件 reason={event['reason']} object={event['object']} count={event['count']} "
    "能支持=该对象发生过OOM终止"
)
print(f"日志 uid={log['uid']} stream={log['stream']} message={log['message']} 能补充=分配失败的上下文")
print(f"追踪 trace={trace['trace_id']} outcome={trace['outcome']} child={trace['child']} 能补充=失败请求的调用路径")
print("尚缺证据=内存是否持续增长、请求批大小是否突增、limits是否刚被修改")
print("禁止结论=仅凭一条OOMKilled就认定应用存在内存泄漏")
print("关联检查=日志uid必须等于异常Pod UID；旧Pod日志不能挂到新Pod")
PY`,
          output: `指标 restarts_5m=3 OOM前内存=246Mi limit=256Mi 能支持=资源压力与重启相关
事件 reason=OOMKilled object=Pod/checkout-7b9 count=1 能支持=该对象发生过OOM终止
日志 uid=uid-checkout-7b9 stream=stderr message=batch_size=5000; allocation failed 能补充=分配失败的上下文
追踪 trace=trace-fixed-91 outcome=timeout child=payment/db 能补充=失败请求的调用路径
尚缺证据=内存是否持续增长、请求批大小是否突增、limits是否刚被修改
禁止结论=仅凭一条OOMKilled就认定应用存在内存泄漏
关联检查=日志uid必须等于异常Pod UID；旧Pod日志不能挂到新Pod`,
          note: '事件与日志可能由不同组件记录，字段并不总是一一对应。关联时应使用稳定身份和字段语义，而不是仅靠相似的显示名称。',
        },
        {
          title: '用固定 span 耗时定位慢请求路径',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys

sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# span 的 offset 与 duration 都是固定相对微秒，不读取系统时钟。
spans = [
    {"name": "ingress", "parent": None, "offset": 0, "duration": 320000},
    {"name": "checkout", "parent": "ingress", "offset": 12000, "duration": 300000},
    {"name": "payment", "parent": "checkout", "offset": 42000, "duration": 90000},
    {"name": "payment/db", "parent": "payment", "offset": 50000, "duration": 76000},
    {"name": "inventory", "parent": "checkout", "offset": 190000, "duration": 25000},
]
trace_id = "trace-fixed-91"
print(f"trace={trace_id} 采样策略=尾部采样 根span总耗时={spans[0]['duration']}us")
for span in spans:
    parent = span["parent"] if span["parent"] is not None else "root"
    print(
        f"span={span['name']} parent={parent} offset={span['offset']}us "
        f"duration={span['duration']}us"
    )

by_name = {span["name"]: span for span in spans}
# 父 span 包含子操作耗时，不能直接拿来判断“最慢叶子”；只比较没有子节点的 span。
leaf_spans = [span for span in spans if not any(other["parent"] == span["name"] for other in spans)]
slowest = max(leaf_spans, key=lambda span: span["duration"])
print(f"最慢非根span={slowest['name']} 耗时={slowest['duration']}us")
print("候选假设=payment/db是当前最慢叶子；checkout自身剩余耗时仍需分解")
print("验证动作=对比正常trace、数据库慢查询与同窗口连接池饱和度")
print("采样边界=未被采样的慢请求不会出现在这份trace列表中")
PY`,
          output: `trace=trace-fixed-91 采样策略=尾部采样 根span总耗时=320000us
span=ingress parent=root offset=0us duration=320000us
span=checkout parent=ingress offset=12000us duration=300000us
span=payment parent=checkout offset=42000us duration=90000us
span=payment/db parent=payment offset=50000us duration=76000us
span=inventory parent=checkout offset=190000us duration=25000us
最慢非根span=payment/db 耗时=76000us
候选假设=payment/db是当前最慢叶子；checkout自身剩余耗时仍需分解
验证动作=对比正常trace、数据库慢查询与同窗口连接池饱和度
采样边界=未被采样的慢请求不会出现在这份trace列表中`,
          note: '追踪展示耗时与父子关系，不会自动说明“为什么慢”。数据库 span 长既可能是查询慢，也可能是连接池排队、网络或锁等待，需要对应系统指标继续验证。',
        },
      ],
      checkpoints: [
        '能分别说明指标、日志、事件和追踪最适合回答的问题',
        '能画出 kubelet 到 Metrics Server、metrics.k8s.io 与 HPA 的数据方向',
        '能用 Pod UID 避免旧实例与新实例证据混淆',
        '能解释为什么 Metrics Server 不替代长期监控系统',
        '能从 OOM 与重启证据中列出尚缺的反证而不是直接认定根因',
        '能说明采样、日志轮转和 Event 保留为何会造成证据缺口',
      ],
      safety: '本模块只读取预置内存证据。生产中采集日志和追踪前应处理密钥、个人信息与租户隔离，限制高基数标签，并对审计与排障数据设置访问权限、保留周期和成本上限。',
    },
    boundaries: {
      blocks: ['基于趋势的异常发现与容量分析', '单实例错误与状态的语义解释', '对象生命周期变化的快速取证', '跨服务请求耗时与调用路径还原', '跨信号、可复现的排障证据链'],
      notBlocks: ['采样与日志丢失造成的证据缺口', '未传播 trace_id 或跨系统标识无法关联', '指标、日志和追踪后端本身不可用', '未授权访问敏感观测数据', '仅凭相关性自动确定根因', '缺乏基线、容量或业务上下文时解释质量变化'],
    },
  },
  /**
   * 集群运维模块把升级、备份和恢复视为一条可演练的变更链，而不是三个独立命令。
   * 课程特别区分控制面版本兼容、数据面滚动替换、etcd 快照以及完整灾备恢复目标。
   */
  {
    id: 'cluster-operations',
    title: '集群升级、备份与故障恢复',
    english: 'UPGRADE / BACKUP / RECOVERY',
    summary: '集群运维的目标不是让每个组件都保持最新，而是在明确的版本兼容边界内，以可回滚、可验证的方式升级控制面与数据面，并证明数据能够恢复。etcd 快照只保存集群状态数据库的一部分，完整灾备还依赖证书、静态配置、镜像、持久数据、外部服务与恢复演练。升级 skew、节点维护和 PDB 都必须放进同一套容量与影响评估。',
    icon: 'reset',
    track: 'kubernetes',
    group: '集群运维',
    dependencies: ['kubernetes-architecture', 'kubernetes-observability', 'storage-csi', 'ingress-gateway'],
    dependents: [],
    philosophy: {
      problem: 'Kubernetes 控制面、kubelet、插件和 API 客户端由不同团队按不同节奏演进。升级过程中组件会短暂混版，节点维护会主动移动工作负载，故障恢复又必须在有限 RTO 与数据丢失范围内重建服务。',
      rejects: '升级不是“把二进制替换成最新版”，etcd 备份成功也不是完整灾备完成。PDB 只约束部分自愿驱逐，不能阻止节点硬故障；控制面可用更不等于数据面应用、入口和存储都能正常服务。',
      counter: '可靠运维先定义兼容策略与恢复目标，再盘点版本、弃用 API、证书、插件和外部依赖；通过滚动变更、健康检查和业务验证控制升级风险；通过隔离备份、校验与恢复演练证明可恢复性，而不是仅证明备份任务退出码为零。',
    },
    design: {
      abstractions: [
        { name: '版本 skew 策略', role: '声明同一集群中控制面、kubelet、客户端和插件允许的版本差，且必须匹配具体发行版与官方支持矩阵。' },
        { name: '滚动升级与健康门槛', role: '逐个替换组件并检查就绪、错误率和容量；失败时暂停或按预案回退，而不是同时影响全部节点。' },
        { name: 'Cordon / Drain', role: 'cordon 阻止新调度到节点，drain 在遵守 PDB 等约束下驱逐可迁移 Pod，并处理无法终止的工作负载。' },
        { name: 'PDB', role: '限制特定选择器下自愿中断导致的最小可用数量或最大不可用数量，不保护所有故障类型。' },
        { name: 'etcd 快照', role: '保存 etcd 在某一 revision 的一致性状态，用于恢复 Kubernetes API 对象，但不包含所有集群外数据。' },
        { name: 'RPO / RTO', role: 'RPO 定义可接受的数据丢失时间范围，RTO 定义服务恢复时间目标；两者决定备份频率、复制与演练要求。' },
      ],
      principles: [
        '版本兼容以支持矩阵和变更公告为准：控制面、kubelet、API 客户端、CNI、CSI 与 ingress 控制器可能各有独立约束。',
        '先小批次后全量：在预生产和金丝雀节点验证启动、探针、网络、存储、关键 API 和真实业务，再扩大升级范围。',
        '升级期间保留容量：节点逐个排空会减少可调度资源，突发流量或 CA 延迟不能让剩余节点同时过载。',
        '备份必须可恢复：快照要加密、隔离、校验，并在独立环境实际恢复到健康控制面和可服务应用。',
        '恢复按依赖顺序：证书与配置、etcd、控制面、网络与存储、工作负载、入口、外部依赖、业务验证。',
        '维护动作区分故障语义：PDB 约束自愿驱逐，但节点宕机、磁盘损坏或进程崩溃不会等待预算许可。',
      ],
      history: [
        { when: '2014—2015', what: 'Kubernetes 早期以 etcd 保存集群状态，并建立控制面与节点组件分工', why: '声明式对象与运行中的 Pod 需要分开存储和协调，备份恢复从一开始就是控制面问题。' },
        { when: '2018 起', what: 'CSI 与插件生态成熟，节点维护逐步涉及卷挂载、快照和外部存储能力', why: '集群状态恢复不能脱离持久卷与存储后端，升级也不能只检查 apiserver。' },
        { when: '2020 年代', what: '版本 skew 文档、托管控制面和声明式升级工具逐步完善', why: '发行版改变了升级责任边界，运行手册必须明确哪些组件由谁、在何时、如何验证。' },
      ],
    },
    capabilities: [
      { name: '版本兼容盘点', sentence: '核对控制面、kubelet、插件、客户端和已用 API，识别不在支持窗口内的 skew 与弃用。' },
      { name: '滚动节点维护', sentence: '通过 cordon、drain、健康检查和业务验证逐个迁移与替换节点。' },
      { name: '一致性快照备份', sentence: '为 etcd 生成带校验与加密的快照，并明确它覆盖和不覆盖的数据。' },
      { name: '分层恢复编排', sentence: '按证书、控制面、网络存储、工作负载和外部依赖顺序恢复服务。' },
      { name: '中断预算评估', sentence: '判断 PDB、副本分布与剩余容量是否允许当前维护动作，并识别 PDB 无法覆盖的故障。' },
    ],
    path: {
      intent: '把一个 1.31 控制面集群安全地升级到下一受支持小版本，同时准备可在隔离环境恢复的备份；当节点故障或 drain 影响可用副本时，用 PDB 和容量证据决定是否继续。',
      environment: '版本与备份教学的确定性状态机。版本策略、组件、Pod 分布和恢复步骤均为固定输入；不连接 apiserver、etcd、对象存储或云平台。',
      steps: [
        { title: '定义升级窗口与成功标准', description: '明确业务影响上限、维护批次、回退条件和停止条件。成功不只是控制面组件 Running，还包括关键 API 可读写、入口可达、存储挂载正常和用户 SLI 未突破阈值。', terms: [{ name: '维护窗口', definition: '允许主动变更并承担一定影响的时间段，不等于可以无限暂停服务。' }, { name: '停止条件', definition: '触发后暂停升级的客观信号，例如错误率超限、连续探针失败或容量不足。' }], state: '窗口已批准；关键 API、入口和 SLI 验证清单就绪。' },
        { title: '盘点版本与弃用风险', description: '记录控制面、每个 kubelet、kubectl、CNI、CSI、ingress、准入组件与已使用 API。按目标版本支持矩阵检查 skew，删除或迁移弃用 API；托管控制面还要区分云厂商负责与用户负责的部分。', terms: [{ name: '版本 skew', definition: '不同组件版本之间的差异；只有落在支持策略内才保证协同工作。' }, { name: '弃用 API', definition: '仍可能短期可用但计划移除的 API；升级前应迁移清单与客户端。' }], state: '发现 kubelet-29 落后策略；目标控制面仅允许 kubelet 30/31。' },
        { title: '先验证备份与恢复路径', description: '在升级前完成 etcd 快照，并单独备份证书、静态 Pod 清单、关键配置、镜像清单、持久卷和外部数据库。加密、校验并隔离副本，然后在隔离环境按恢复顺序演练。', terms: [{ name: '一致性快照', definition: '在 etcd 某一 revision 上取得的一致状态视图，避免把不同时刻的混合状态当作可恢复备份。' }, { name: '恢复演练', definition: '在隔离环境实际执行恢复并验证服务，而不是只检查备份文件是否存在。' }], state: 'etcd 快照可用；证书与外部数据若缺失，灾备仍不完整。' },
        { title: '升级控制面并观察 API', description: '按发行版要求逐个升级控制面组件，保持 etcd 与证书可用，观察 apiserver 健康、调度、控制器错误、webhook 延迟和资源版本。控制面先升级不等于所有 kubelet 已兼容，必须继续执行数据面计划。', terms: [{ name: '控制面', definition: '提供 API、调度与集群协调的组件集合；其版本决定支持的 API 与功能。' }, { name: '数据面', definition: '运行工作负载的节点、kubelet、容器运行时、网络与存储组件。' }], state: '控制面 1.31.3；部分节点仍是 1.29，兼容门禁阻止继续。' },
        { title: '分批排空并升级工作节点', description: '先 cordon 节点停止新调度，再用 drain 迁移可中断 Pod；确认其他节点有容量、PDB 不被突破、卷可重新挂载，然后升级 kubelet 与运行时并 uncordon。DaemonSet 等本地 Pod 的处理方式必须纳入预案。', terms: [{ name: 'Cordon', definition: '把节点标记为不可调度，通常不移动已在节点上的 Pod。' }, { name: 'Drain', definition: '在约束下安全驱逐 Pod 的维护动作，可能因 PDB 或无法终止的 Pod 而等待。' }], state: '节点逐批替换；每个批次后验证容量、网络、存储和业务。' },
        { title: '验证插件与业务而不是只看版本', description: '检查 CNI、CSI、ingress、DNS、指标、准入和关键控制器与新版本兼容，再跑真实读写、跨节点访问、持久卷重挂载和发布回滚测试。用户 SLI 恶化时暂停升级。', terms: [{ name: '插件兼容', definition: '集群扩展使用的 API、权限与协议必须同时满足节点和控制面版本。' }, { name: '业务验证', definition: '用真实关键路径确认功能与质量，而不只验证组件进程存在。' }], state: '版本 skew 回到策略内；关键路径通过；观察期无新增异常。' },
        { title: '演练故障恢复并记录缺口', description: '在隔离环境从快照恢复 etcd，重新建立证书、控制面、插件和工作负载，再接入外部数据库与持久数据。记录实际 RTO、可恢复到的时间点和未覆盖依赖，把缺口变成下一轮备份与演练任务。', terms: [{ name: 'RPO', definition: '恢复点目标，表示事故中可接受丢失的数据时间范围。' }, { name: 'RTO', definition: '恢复时间目标，表示事故后恢复到可接受服务程度的时间上限。' }], state: '恢复完成且有业务证据；未覆盖的外部依赖被明确记录。' },
      ],
      stateTable: {
        columns: ['运维阶段', '版本 / 数据状态', '主动作', '容量与中断约束', '异常与停止条件'],
        rows: [
          ['升级前盘点', '组件混版或 API 待迁移', '生成兼容清单', '确认剩余容量与维护窗口', '发现超策略 skew 或弃用 API'],
          ['备份', 'etcd revision 固定', '生成并校验快照', '备份存储与集群故障域隔离', '快照失败、校验不符或无恢复演练'],
          ['控制面升级', 'apiserver 等先更新', '逐组件滚动替换', '保持 etcd 仲裁与证书可用', 'API 错误、webhook 阻塞、仲裁丢失'],
          ['节点维护', '节点先 cordon 后 drain', '迁移并升级 kubelet', 'PDB、亲和性、卷和其他节点容量', 'drain 超时、PDB 阻断、卷无法分离'],
          ['节点硬故障', '节点状态 NotReady', '控制器替代或重新调度', 'PDB 不阻止物理故障', '副本不足、存储单点、网络分区'],
          ['恢复演练', '从隔离快照与制品启动', '按依赖顺序恢复', '外部数据库、证书、镜像与网络', 'RTO 超时或 RPO 数据点不满足'],
          ['升级后观察', '版本策略内收敛', '验证关键路径与 SLI', '预留回退和再维护容量', '插件 API 不兼容或用户质量下降'],
        ],
      },
      summary: '集群升级与灾备是一条证据链：先证明版本和容量允许变更，再证明备份真的能恢复，最后用真实业务验证控制面和数据面都健康。etcd 是核心状态，但不是整个生产系统；PDB 是维护约束，也不是故障保险。',
    },
    costs: [
      { choice: '更频繁升级', cost: '缩短暴露在已知问题中的时间并平滑变化，但消耗更多测试、维护窗口与回归成本。', misread: '版本越新，集群一定越安全。' },
      { choice: '更保守的 skew', cost: '降低兼容不确定性，却可能推迟安全修复或功能采用，需要更严格的跟进计划。', misread: '允许范围内就代表无需测试。' },
      { choice: '更短维护批次', cost: '缩小单次影响并便于停止，但会延长整体升级时间与多次状态切换。', misread: '一次排空越多节点，升级越快越好。' },
      { choice: '更完整备份与演练', cost: '增加存储、隔离环境和演练成本，却直接提高可恢复性与恢复时间可预测性。', misread: '备份文件存在就等于可以恢复业务。' },
    ],
    example: {
      title: '用版本门禁、备份覆盖矩阵与 PDB 状态机检验运维边界',
      intent: '三个实验分别阻止不兼容的 kubelet 升级、揭示仅备份 etcd 的灾备缺口、展示主动驱逐与节点硬故障在 PDB 语义上的差异。',
      diagram: {
        kind: 'flow',
        title: '从升级前证据到故障恢复',
        caption: '左侧是变更与备份输入，中间是兼容、容量和中断门禁，右侧是恢复后的业务验证；任何门禁失败都应暂停，而不是用更强的删除或重启动作掩盖。',
        items: [
          { title: '版本与 API 清单', detail: '盘点控制面、kubelet、插件与客户端，按支持矩阵阻止超范围 skew。', tag: '升级输入', tone: 'blue' },
          { title: '备份与恢复演练', detail: 'etcd、证书、配置、持久数据与外部服务分别备份，并在隔离环境恢复。', tag: '恢复输入', tone: 'blue' },
          { title: '容量与 PDB 门禁', detail: '逐个 cordon/drain，确认剩余容量与可用副本，不把 PDB 当作硬故障保护。', tag: '维护边界', tone: 'orange' },
          { title: '分层恢复', detail: '证书与配置 → etcd → 控制面 → 网络存储 → 工作负载 → 入口 → 外部依赖。', tag: '恢复顺序', tone: 'green' },
          { title: '业务验证', detail: '检查真实读写、入口、存储挂载与用户 SLI，记录 RPO/RTO 和未覆盖项。', tag: '完成证据', tone: 'orange' },
        ],
        footnote: '托管集群的 etcd 与部分控制面可能由服务商管理；运行手册必须按实际责任边界调整，不能照搬自建集群命令。',
      },
      commands: [
        {
          title: '用固定支持策略拦截超范围版本 skew',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys

sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 这是一份教学策略，不替代目标发行版和版本的官方 skew 文档。
control_minor = 31
allowed_kubelet_minors = {30, 31}
components = [
    {"name": "kube-apiserver", "role": "control-plane", "minor": 31},
    {"name": "node-a/kubelet", "role": "data-plane", "minor": 31},
    {"name": "node-b/kubelet", "role": "data-plane", "minor": 30},
    {"name": "node-c/kubelet", "role": "data-plane", "minor": 29},
    {"name": "node-d/kubelet", "role": "data-plane", "minor": 32},
]
deprecated_apis = ["extensions/v1beta1/Ingress"]

print(f"目标控制面=1.{control_minor} 允许kubelet小版本={sorted(allowed_kubelet_minors)}")
passed = True
for component in components:
    if component["role"] == "control-plane":
        ok = component["minor"] == control_minor
        reason = "控制面版本匹配"
    else:
        ok = component["minor"] in allowed_kubelet_minors
        reason = "kubelet在策略内" if ok else "kubelet超出允许skew"
    status = "通过" if ok else "阻断"
    passed = passed and ok
    print(f"组件={component['name']} 版本=1.{component['minor']} 门禁={status} 原因={reason}")

if deprecated_apis:
    passed = False
    print(f"API门禁=阻断 待迁移={deprecated_apis}")
else:
    print("API门禁=通过 无已声明弃用API")
print(f"升级决策={'继续小批次验证' if passed else '暂停并先修复阻断项'}")
print("提醒=控制面与数据面只是其中一层；CNI/CSI/ingress还需各自兼容性检查")
PY`,
          output: `目标控制面=1.31 允许kubelet小版本=[30, 31]
组件=kube-apiserver 版本=1.31 门禁=通过 原因=控制面版本匹配
组件=node-a/kubelet 版本=1.31 门禁=通过 原因=kubelet在策略内
组件=node-b/kubelet 版本=1.30 门禁=通过 原因=kubelet在策略内
组件=node-c/kubelet 版本=1.29 门禁=阻断 原因=kubelet超出允许skew
组件=node-d/kubelet 版本=1.32 门禁=阻断 原因=kubelet超出允许skew
API门禁=阻断 待迁移=['extensions/v1beta1/Ingress']
升级决策=暂停并先修复阻断项
提醒=控制面与数据面只是其中一层；CNI/CSI/ingress还需各自兼容性检查`,
          note: '这里明确使用本地固定策略来演示门禁，不声称它适用于所有 Kubernetes 版本。生产升级必须查询目标版本的官方 skew 支持和发行版公告，并测试实际 API 客户端。',
        },
        {
          title: '揭示 etcd 快照与完整灾备之间的差距',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import hashlib
import sys

sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 用固定快照内容计算稳定校验值；不访问磁盘、对象存储或真实 etcd。
snapshot_bytes = b"revision=48219;state=consistent;objects=1842"
checksum = hashlib.sha256(snapshot_bytes).hexdigest()
only_etcd = {
    "etcd_snapshot": True,
    "pki_and_config": False,
    "image_artifacts": False,
    "persistent_volumes": False,
    "external_database": False,
    "restore_rehearsal": False,
}
full_plan = {
    "etcd_snapshot": True,
    "pki_and_config": True,
    "image_artifacts": True,
    "persistent_volumes": True,
    "external_database": True,
    "restore_rehearsal": True,
}

print(f"etcd快照 revision=48219 sha256={checksum}")
for name, ready in only_etcd.items():
    print(f"仅etcd备份 {name}={'有' if ready else '缺'}")
required = list(full_plan)
missing = [name for name in required if not only_etcd[name]]
print(f"仅etcd灾备判定={'不完整' if missing else '完整'} 缺口={missing}")
print("完整计划=证书与配置、镜像制品、持久卷、外部数据库均另有备份")
print("恢复演练=在隔离环境按依赖顺序启动并验证真实业务")
print("目标校验=实际恢复时间<=RTO，可恢复数据点满足RPO")
print("结论=etcd保存API对象状态，不自动保存所有节点配置、卷数据与外部服务数据")
PY`,
          output: `etcd快照 revision=48219 sha256=313ee946b953b78bdc0c9d9e861bde0e1ac87862cdc23adb8b98d116b6eb44e1
仅etcd备份 etcd_snapshot=有
仅etcd备份 pki_and_config=缺
仅etcd备份 image_artifacts=缺
仅etcd备份 persistent_volumes=缺
仅etcd备份 external_database=缺
仅etcd备份 restore_rehearsal=缺
仅etcd灾备判定=不完整 缺口=['pki_and_config', 'image_artifacts', 'persistent_volumes', 'external_database', 'restore_rehearsal']
完整计划=证书与配置、镜像制品、持久卷、外部数据库均另有备份
恢复演练=在隔离环境按依赖顺序启动并验证真实业务
目标校验=实际恢复时间<=RTO，可恢复数据点满足RPO
结论=etcd保存API对象状态，不自动保存所有节点配置、卷数据与外部服务数据`,
          note: '哈希只用于演示“备份需要校验”，不是真实 etcd 快照算法。生产快照的校验、加密、保留、异地隔离与恢复权限都需要独立设计。',
        },
        {
          title: '模拟 PDB 对主动驱逐与节点硬故障的不同约束',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys

sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# PDB minAvailable=2 限制自愿中断；它不会拦截物理故障。
minimum_available = 2
pods = {
    "api-1": {"node": "node-a", "ready": True},
    "api-2": {"node": "node-b", "ready": True},
    "api-3": {"node": "node-a", "ready": True},
}

def healthy_count():
    return sum(1 for pod in pods.values() if pod["ready"])

print(f"初始健康副本={healthy_count()} PDB minAvailable={minimum_available}")

# drain node-a 的主动驱逐：逐个判断，第一个允许，第二个会被预算阻止。
pod = pods["api-1"]
pod["ready"] = False
after = healthy_count()
print(f"主动驱逐 api-1 预计健康={after} PDB={'允许' if after >= minimum_available else '阻止'}")

pod = pods["api-3"]
if healthy_count() - 1 < minimum_available:
    print("主动驱逐 api-3 预计健康=1 PDB=阻止 drain继续等待")
else:
    pod["ready"] = False
    print("主动驱逐 api-3 PDB=允许")

# 硬故障绕过了 PDB 的自愿中断检查，可用副本仍可能跌破下限。
pods["api-2"]["ready"] = False
print(f"节点硬故障 api-2 健康副本={healthy_count()} PDB=不拦截物理故障")

# Deployment 期望 3 个副本；两个缺失 Pod 都获得替代实例，PDB 本身不创建容量。
pods["api-4"] = {"node": "node-c", "ready": True}
pods["api-5"] = {"node": "node-d", "ready": True}
print(f"控制器补出 api-4/api-5 健康副本={healthy_count()} 容量前提=备用节点可调度")
print("边界=探针误判、亲和性、卷故障或没有备用容量时，PDB不能保证服务不中断")
PY`,
          output: `初始健康副本=3 PDB minAvailable=2
主动驱逐 api-1 预计健康=2 PDB=允许
主动驱逐 api-3 预计健康=1 PDB=阻止 drain继续等待
节点硬故障 api-2 健康副本=1 PDB=不拦截物理故障
控制器补出 api-4/api-5 健康副本=3 容量前提=备用节点可调度
边界=探针误判、亲和性、卷故障或没有备用容量时，PDB不能保证服务不中断`,
          note: '真实 drain 还会受到 Pod 终止宽限期、本地存储、控制器行为和调度容量影响。PDB 的可用数量依赖就绪状态，错误的探针可能让预算看起来安全或过度限制维护。',
        },
      ],
      checkpoints: [
        '能列出升级前必须核对的组件、API、插件和容量证据',
        '能解释控制面升级后为什么还需要数据面与业务验证',
        '能区分 cordon 与 drain，并说明 drain 为什么可能等待',
        '能说明 PDB 只约束部分自愿驱逐，不能阻止节点硬故障',
        '能列出至少五项 etcd 快照不能覆盖的灾备依赖',
        '能用 RPO、RTO 和隔离恢复演练判断备份是否真的可用',
      ],
      safety: '本模块不执行升级、排空、快照或恢复。生产变更前必须获得授权、确认责任边界、备份与回退方案、维护窗口和停止条件；恢复演练应在隔离环境进行，避免覆盖仍在服务的状态。',
    },
    boundaries: {
      blocks: ['按支持矩阵约束控制面与数据面版本 skew', '逐节点维护与主动驱逐的容量评估', 'etcd 一致性状态快照与校验', '按依赖顺序编排控制面和业务恢复', '用 RPO、RTO 与演练验证灾备可执行性'],
      notBlocks: ['证书、镜像、持久卷或外部数据库未备份', 'etcd 仲裁丢失或快照损坏', '节点硬故障、磁盘损坏与网络分区', 'PDB 被探针误判或副本集中在同一故障域', '插件、API 客户端或存储后端不兼容', '缺少隔离环境、恢复权限或真实业务验证'],
    },
  },
  /**
   * 生产边界模块把前面所有机制收束为“可验证的可靠性承诺”。
   * 重点不是堆检查项，而是把 SLO、错误预算、容量、故障域和安全策略连成可执行的准入条件。
   */
  {
    id: 'production-boundaries',
    title: '生产边界与可靠性检查清单',
    english: 'PRODUCTION / SLO / FAILURE BOUNDARY',
    summary: '生产可靠性不是“部署了 Kubernetes”或“副本数足够”，而是一组可被证据检验的边界：用户 SLO 是否明确、错误预算能否约束发布、容量是否经得起单节点或单区故障、PDB 与拓扑是否一致、备份是否可恢复、权限和网络是否最小化。清单的价值在于每个“是”都对应对象、测试或演练证据，每个“否”都有风险接受人。',
    icon: 'shield',
    track: 'kubernetes',
    group: '生产边界',
    dependencies: ['cluster-operations', 'network-policy', 'deployments-rollouts', 'autoscaling'],
    dependents: [],
    philosophy: {
      problem: '同一套 Kubernetes 配置在测试环境可以运行，到了生产却会同时面对流量峰值、节点维护、依赖故障、人为误操作和安全攻击。仅检查“Pod Running”无法证明用户任务能持续完成，也无法说明故障发生时最坏损失是多少。',
      rejects: '高可用不是副本数乘以一个百分比，99.9% 也不是“每天可以随便失败”的口头目标。PDB 不创造容量，HPA 不修复单点依赖，NetworkPolicy 不保护已失陷凭证，备份不验证就仍只是未证实的希望。',
      counter: '生产边界应以用户目标为起点：用 SLO 与错误预算决定发布和实验速度，用容量与故障演练验证副本、节点、区域和依赖的最坏路径，用可恢复性、权限、网络和供应链证据约束变更。检查清单必须能量化差距并触发行动。',
    },
    design: {
      abstractions: [
        { name: 'SLO', role: '对服务某个 SLI 在时间窗口内的目标，例如 30 天成功请求比例不低于 99.9%。' },
        { name: '错误预算', role: '由 SLO 与窗口推导的允许失败量；预算消耗速度可约束发布、实验和运维风险。' },
        { name: '故障域与容量余量', role: '节点、机架、可用区、存储或依赖等可能同时失效的范围，以及损失一个域后仍承载负载的余量。' },
        { name: '就绪与可用性', role: '就绪由探针和控制器状态表达，可用性由用户请求结果表达；二者相关但不能互相替代。' },
        { name: '准入证据', role: '把配置、测试、仪表盘、审计、恢复演练和风险接受记录绑定到生产发布决策。' },
        { name: '失效边界', role: '明确哪种故障由哪个机制吸收、哪种故障必须人工接管、最坏影响与数据损失是什么。' },
      ],
      principles: [
        '先定义用户成功：SLO 必须绑定服务、SLI、窗口和排除规则，不能让团队各自使用不同的“可用”。',
        '用错误预算连接可靠性与速度：预算充足时可按流程承担发布风险，预算快速消耗时优先恢复服务并限制高风险变更。',
        '容量按故障后计算：正常运行有余量不代表 N-1 安全；要在损失节点、可用区或关键依赖后仍验证 SLO。',
        '让配置形成一致防线：副本、反亲和、拓扑分布、PDB、探针、HPA 和存储复制必须指向同一可用性目标。',
        '每个检查项都要有证据与责任人：截图、查询、测试或演练记录比口头“已经配置”更可靠。',
        '记录不做什么：明确单区域、单数据库或不支持某些 RPO 的边界，并取得风险接受，而不是隐藏在架构图中。',
      ],
      history: [
        { when: '2000 年代', what: 'SRE 与错误预算思想逐步把可靠性从口号转化为工程决策', why: '用服务目标和可消耗预算平衡发布速度与稳定性，避免无限追求完美。' },
        { when: '2010 年代', what: 'Kubernetes 将探针、PDB、亲和性、资源请求和网络策略纳入统一工作负载模型', why: '可用性需要运行时状态、调度分布和隔离机制共同表达。' },
        { when: '2020 年代', what: '多集群、托管服务与供应链安全让生产边界扩展到区域、身份、镜像和外部依赖', why: '单个集群的高可用不能覆盖控制面责任、共享身份或第三方服务的共同故障。' },
      ],
    },
    capabilities: [
      { name: '定义服务目标', sentence: '把用户成功转换成 SLI、SLO、时间窗口、排除规则和错误预算。' },
      { name: '评估故障后容量', sentence: '按 N-1 或更严格故障域计算请求、调度余量和服务吞吐，而不只看副本数。' },
      { name: '对齐可用性配置', sentence: '让探针、副本分布、PDB、HPA、存储和发布策略指向同一可用性目标。' },
      { name: '执行生产准入', sentence: '用配置、测试、审计和演练证据决定发布、暂停或风险接受。' },
      { name: '记录失效边界', sentence: '说明哪些故障可自动恢复、哪些需要人工接管、最坏数据与可用性损失是什么。' },
    ],
    path: {
      intent: '为一个 99.9% 可用性目标的结账服务做生产准入，验证错误预算、三节点容量、自动扩容与恢复计划；即使所有副本都 Running，也要找出仍可能突破用户目标的故障边界。',
      environment: '确定性生产审查模型。SLO 窗口、请求量、节点 CPU、失败事件和检查项全部固定；不访问监控、集群、网络或外部风险系统。',
      steps: [
        { title: '把业务承诺写成 SLO', description: '结账服务目标是 30 天内成功请求比例不低于 99.9%。先定义什么算成功、哪些维护或客户端错误排除、用什么查询计算，避免发布后各部门对“可用”有不同解释。', terms: [{ name: '服务等级目标', definition: '在明确窗口内对某个 SLI 作出的量化目标，例如成功率不低于 99.9%。' }, { name: '排除规则', definition: '计算 SLI 时预先约定的剔除条件，必须合理且不能任意扩大以掩盖故障。' }], state: '窗口=30 天；目标=99.9%；成功口径已定义。' },
        { title: '计算错误预算并连接发布', description: '30 天有 43,200 秒，99.9% 目标对应 43.2 分钟允许失败时间。固定窗口内若已消耗一半预算，发布、实验和节点维护就应更谨慎；预算耗尽时优先恢复，而不是继续追求功能速度。', terms: [{ name: '错误预算', definition: '1 减 SLO 后在窗口内允许的失败比例或时间，是可靠性风险的可消耗额度。' }, { name: '燃烧率', definition: '当前失败速度相对于预算允许速度的倍数；持续大于 1 会加速耗尽预算。' }], state: '允许失败=43.2 分钟；当前消耗=30 分钟；剩余=13.2 分钟。' },
        { title: '按故障域检查容量余量', description: '三个节点每个扣除系统预留后只有 3 核可调度，常态总量 9 核；工作负载请求 8.4 核看似可运行，但损失一个节点后只剩 6 核，无法承载原请求。需要 N-1 余量、更小请求或更多故障域容量。', terms: [{ name: '故障域', definition: '可能同时失效的一组资源，例如节点、机架、可用区或共享存储。' }, { name: 'N-1 容量', definition: '失去一个指定故障域后，剩余资源仍能满足关键负载与 SLO 的能力。' }], state: '常态余量=0.6 核；失去一节点后缺口=2.4 核。' },
        { title: '让副本、拓扑和 PDB 保护一致', description: '如果三个副本都在同一节点，数字再大也挡不住节点故障。用反亲和或拓扑分布分散副本，用正确就绪探针让 PDB 看到真实可用数，并验证存储复制不是同一故障域。', terms: [{ name: '拓扑分布', definition: '按区域、节点等拓扑键约束 Pod 分布，降低共享故障域风险。' }, { name: '最小可用', definition: 'PDB 中允许自愿中断后仍需保持的就绪副本数量，不是绝对可用保证。' }], state: '三副本分布到三个节点；PDB minAvailable=2；存储跨故障域。' },
        { title: '验证自动扩容不会制造假容量', description: 'HPA 达到 maxReplicas 后不会继续增加；CA 可能受节点配额、卷或拓扑限制。容量审查必须模拟故障后的 Pending 与服务吞吐，而不是把 desiredReplicas 当作已交付容量。', terms: [{ name: '期望副本', definition: '控制器希望达到的副本数；受调度、配额、卷和应用启动影响，未必已经 Ready。' }, { name: '吞吐缺口', definition: '用户需求超过实际就绪实例可提供的处理能力时形成的服务能力不足。' }], state: 'HPA 已到上限；CA 被配额阻断；就绪容量低于需求。' },
        { title: '检查发布、恢复、权限与网络', description: '滚动发布要能在错误预算内暂停与回滚，恢复要满足 RPO/RTO 并通过演练，RBAC 与密钥要最小化，NetworkPolicy 要覆盖实际数据流且允许必要 DNS 与观测。任何一项缺失都应有明确风险接受。', terms: [{ name: '最小权限', definition: '只授予完成任务所需的身份、对象和操作权限，并定期审查与轮换。' }, { name: '默认拒绝', definition: '网络策略先阻断未明确允许的流量，再按业务需要放行；其效果依赖 CNI 实现。' }], state: '发布、恢复、身份、网络检查均有证据或阻断。' },
        { title: '做故障演练并验证用户结果', description: '在受控环境终止一个节点、让一个依赖变慢或耗尽错误预算，观察 Pod 替代、入口错误、数据一致性和人工响应。演练成功以 SLO、RTO 和恢复证据为准，不以“控制器产生了事件”为准。', terms: [{ name: '故障演练', definition: '在受控范围和停止条件下注入故障，验证系统与团队的真实恢复能力。' }, { name: '风险接受', definition: '对已知缺口指定责任人、有效期和缓解措施，而不是把缺口当作不存在。' }], state: '发现容量缺口；发布准入阻断；完成整改或正式风险接受。' },
      ],
      stateTable: {
        columns: ['检查维度', '正常运行证据', '故障 / 异常场景', '生产判定', '必须补的证据'],
        rows: [
          ['SLO 与预算', '30 天 99.9%，预算计算明确', '预算快速燃烧或已耗尽', '限制高风险发布并优先恢复', 'SLI 查询、排除规则与燃烧率仪表盘'],
          ['容量', '常态请求低于可调度 CPU', '单节点损失后出现 Pending', '不满足 N-1，阻断或整改', '故障后调度与服务吞吐测试'],
          ['可用性配置', '三副本、跨节点、PDB=2', '探针错误或副本集中', '配置可能给出虚假安全感', '拓扑、就绪语义与维护演练'],
          ['弹性', 'HPA 指标与 CA 节点组可用', 'HPA 到上限、CA 被配额阻断', '自动策略无法兑现容量', '上限、配额和指标缺失演练'],
          ['恢复', 'etcd 与外部数据均有备份', '恢复超 RTO 或丢数据超 RPO', '灾备不合格', '隔离恢复记录与业务验证'],
          ['安全边界', 'RBAC、Secret、NetworkPolicy 已配置', '越权或策略插件未生效', '配置存在但保护未证实', '权限审计、连通性测试与轮换记录'],
        ],
      },
      summary: '生产边界不是一张“全部打勾”的表，而是一组能量化风险的决定：SLO 决定允许多少失败，错误预算决定多快前进，容量与故障域决定副本是否有意义，恢复和演练决定最坏损失是否可接受。任何无法证明的“是”都应被视为缺口。',
    },
    costs: [
      { choice: '更严格的 SLO', cost: '提升用户体验与故障敏感度，但需要更多冗余、演练和发布约束，成本可能显著上升。', misread: '目标定得越高，系统会自动变得越可靠。' },
      { choice: '更大容量余量', cost: '能在故障后维持服务，却提高日常闲置与资源成本。', misread: '节点利用越满，生产一定越高效。' },
      { choice: '更细的准入检查', cost: '减少带病发布，但增加流程与证据维护成本，需要避免检查项流于形式。', misread: '清单越长，质量就越高。' },
      { choice: '更频繁的故障演练', cost: '暴露真实恢复缺口，但需要隔离环境、停止条件和跨团队协调。', misread: '平时不出事故，说明不需要演练。' },
    ],
    example: {
      title: '用错误预算、容量故障注入和准入门禁做生产审查',
      intent: '三个实验分别量化错误预算、揭示“四副本仍不够用”的容量边界、汇总生产准入证据。结果全部来自固定整数或简单四则运算。',
      diagram: {
        kind: 'compare',
        title: '生产就绪与“看起来能跑”的区别',
        caption: '左侧只证明当前进程运行，右侧要求用户目标、故障后容量、恢复与安全证据同时成立；不是所有项都能靠增加副本解决。',
        items: [
          { title: '当前可运行', detail: 'Pod Running、Deployment 副本数达标、单次健康检查通过。', tag: '现状', tone: 'muted' },
          { title: '用户目标可度量', detail: 'SLO、SLI、窗口与错误预算有明确查询和负责人。', tag: '质量证据', tone: 'green' },
          { title: '故障后仍可服务', detail: '损失一个节点或区域后仍有容量，HPA 与 CA 的边界经过测试。', tag: '容量证据', tone: 'green' },
          { title: '数据可恢复', detail: 'etcd、证书、卷与外部数据可恢复到满足 RPO/RTO 的状态。', tag: '恢复证据', tone: 'blue' },
          { title: '风险被明确接受', detail: '网络、权限、供应链与单点缺口有整改、责任人或有效期。', tag: '治理证据', tone: 'orange' },
        ],
        footnote: 'Kubernetes 提供许多机制，但不会自动把机制组合成业务承诺；每条防线都需要配置、测试和运维责任。',
      },
      commands: [
        {
          title: '计算 99.9% SLO 的错误预算与燃烧率',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys

sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 固定 30 天窗口与整数请求量，不使用日期、时钟或随机采样。
window_seconds = 30 * 24 * 60 * 60
slo = 0.999
total_requests = 3_000_000
failed_requests = 2_600
allowed_requests = int(total_requests * (1 - slo))
remaining_requests = allowed_requests - failed_requests
observed_rate = failed_requests / total_requests
allowed_rate = 1 - slo
burn_rate = observed_rate / allowed_rate

print(f"窗口秒={window_seconds} SLO={slo:.3%} 总请求={total_requests}")
print(f"错误预算请求={allowed_requests} 已失败={failed_requests} 剩余={remaining_requests}")
print(f"预算剩余比例={remaining_requests / allowed_requests:.2%}")
print(f"观测失败率={observed_rate:.6%} 预算允许失败率={allowed_rate:.3%} 燃烧率={burn_rate:.3f}")

# 同样窗口再叠加 30 分钟完全失败；请求数仍固定，避免依赖实时估算。
extra_failed = 1_000
projected_failed = failed_requests + extra_failed
print(f"叠加失败请求={extra_failed} 预计累计={projected_failed} 预算状态={'耗尽' if projected_failed > allowed_requests else '尚有余额'}")
print(f"30分钟窗口内预算允许失败时间={allowed_rate * 30 * 60:.1f}秒")
print("发布规则=燃烧率持续>1时限制高风险发布；预算耗尽时优先恢复用户服务")
print("边界=请求数口径必须一致；错误预算不能替代容量与依赖故障分析")
PY`,
          output: `窗口秒=2592000 SLO=99.900% 总请求=3000000
错误预算请求=3000 已失败=2600 剩余=400
预算剩余比例=13.33%
观测失败率=0.086667% 预算允许失败率=0.100% 燃烧率=0.867
叠加失败请求=1000 预计累计=3600 预算状态=耗尽
30分钟窗口内预算允许失败时间=1.8秒
发布规则=燃烧率持续>1时限制高风险发布；预算耗尽时优先恢复用户服务
边界=请求数口径必须一致；错误预算不能替代容量与依赖故障分析`,
          note: '本例的 1,000 个额外失败请求是固定教学输入，不代表任何真实速率。预算既可按请求数计算，也可按失败时间计算，但 SLI 口径必须与 SLO 一致。',
        },
        {
          title: '揭示四副本仍可能在单节点故障后失去服务容量',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys

sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 每节点 4 核，其中 1 核保留给系统；正常装箱为 2.7、2.7、1.2+1.8=3.0 核。
node_allocatable = [4.0, 4.0, 4.0]
reserved_per_node = 1.0
pod_requests = [2.7, 2.7, 1.2, 1.8]
rps_per_ready_pod = 100
demand_rps = 400
normal_cpu = sum(core - reserved_per_node for core in node_allocatable)
requested_cpu = sum(pod_requests)

print(f"常态 节点可调度CPU={normal_cpu:.1f}核 请求={requested_cpu:.1f}核 余量={normal_cpu - requested_cpu:.1f}核")
print(f"副本声明=4 HPA上限=6 PDB minAvailable=3")

# 模拟 node-c 硬故障：其上的 1.2 核与 1.8 核请求都变为 Pending。
remaining_cpu = normal_cpu - (node_allocatable[2] - reserved_per_node)
pending_cpu = 1.2 + 1.8
capacity_gap = requested_cpu - remaining_cpu
ready_pods = 2
service_capacity = ready_pods * rps_per_ready_pod
print(f"故障后 剩余可调度CPU={remaining_cpu:.1f}核 容量缺口={capacity_gap:.1f}核 PendingPod=2 待调度请求={pending_cpu:.1f}核")
print(f"HPA desired=6 已到上限 但缺CPU无法Ready 当前就绪={ready_pods}")
print("PDB=约束自愿驱逐，不补充CPU，也不阻止节点硬故障")
print("CA=节点组达到quota=3 无法增加node-d")
print(f"服务容量={service_capacity}rps 需求={demand_rps}rps 吞吐缺口={demand_rps - service_capacity}rps")
print("SLO影响=持续过载会增加超时与5xx，错误预算可能加速耗尽")
print("整改=预留N-1容量、降低单Pod请求、提高节点配额或减少非关键负载")
PY`,
          output: `常态 节点可调度CPU=9.0核 请求=8.4核 余量=0.6核
副本声明=4 HPA上限=6 PDB minAvailable=3
故障后 剩余可调度CPU=6.0核 容量缺口=2.4核 PendingPod=2 待调度请求=3.0核
HPA desired=6 已到上限 但缺CPU无法Ready 当前就绪=2
PDB=约束自愿驱逐，不补充CPU，也不阻止节点硬故障
CA=节点组达到quota=3 无法增加node-d
服务容量=200rps 需求=400rps 吞吐缺口=200rps
SLO影响=持续过载会增加超时与5xx，错误预算可能加速耗尽
整改=预留N-1容量、降低单Pod请求、提高节点配额或减少非关键负载`,
          note: '正常装箱为 node-a=2.7 核、node-b=2.7 核、node-c=1.2+1.8=3.0 核；node-c 故障后两个 Pod 同时 Pending。容量缺口 2.4 核是总请求与剩余可调度 CPU 的差，待调度请求 3.0 核是两个受影响 Pod 的请求之和。真实容量审查还必须考虑 limits、系统争用、存储、网络、启动预热和单副本吞吐曲线。',
        },
        {
          title: '汇总生产准入证据并输出阻断项',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys

sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

# 固定检查证据；每项都必须指向可复核对象，而不是口头确认。
checks = [
    ("SLO与错误预算", True, "仪表盘slo-checkout"),
    ("N-1容量", False, "故障演练容量缺口2.4核"),
    ("跨节点拓扑", True, "topologySpreadConstraints已核验"),
    ("PDB与探针", True, "维护演练通过"),
    ("恢复演练", True, "隔离环境RPO/RTO达标"),
    ("NetworkPolicy生效", True, "CNI连通性测试通过"),
    ("HPA与CA边界", False, "HPA到上限且节点组配额不足"),
    ("镜像来源与漏洞", False, "关键镜像签名未核验"),
]
blockers = []
print("生产准入检查：")
for name, passed, evidence in checks:
    status = "通过" if passed else "阻断"
    print(f"{name}={status} 证据={evidence}")
    if not passed:
        blockers.append(name)

print(f"准入决策={'拒绝发布' if blockers else '允许进入灰度'}")
print(f"阻断项数量={len(blockers)} 清单={blockers}")
print("风险接受=若必须发布，需记录责任人、有效期、补偿控制与回滚条件")
print("边界=清单通过只证明已检查项，不覆盖未建模的共同故障与人为误操作")
PY`,
          output: `生产准入检查：
SLO与错误预算=通过 证据=仪表盘slo-checkout
N-1容量=阻断 证据=故障演练容量缺口2.4核
跨节点拓扑=通过 证据=topologySpreadConstraints已核验
PDB与探针=通过 证据=维护演练通过
恢复演练=通过 证据=隔离环境RPO/RTO达标
NetworkPolicy生效=通过 证据=CNI连通性测试通过
HPA与CA边界=阻断 证据=HPA到上限且节点组配额不足
镜像来源与漏洞=阻断 证据=关键镜像签名未核验
准入决策=拒绝发布
阻断项数量=3 清单=['N-1容量', 'HPA与CA边界', '镜像来源与漏洞']
风险接受=若必须发布，需记录责任人、有效期、补偿控制与回滚条件
边界=清单通过只证明已检查项，不覆盖未建模的共同故障与人为误操作`,
          note: '检查证据名称是教学占位标识，不是对真实仪表盘或对象的引用。生产中应把每项绑定到版本化配置、查询、测试报告或演练记录，并定期重新验证。',
        },
      ],
      checkpoints: [
        '能用自己的话定义 SLI、SLO、时间窗口和错误预算',
        '能计算 99.9% 在 30 天窗口内的允许失败时间',
        '能解释错误预算如何影响发布和故障优先级',
        '能用 N-1 容量说明副本数达标为什么仍可能无法服务',
        '能指出 PDB、HPA、CA 与拓扑配置必须保持一致的原因',
        '能为每个生产检查项说出可复核证据、阻断条件和责任人',
      ],
      safety: '本模块不执行真实故障注入、权限修改或生产发布。演练必须在隔离或受控环境进行，设置停止条件和回滚；生产准入证据涉及监控、审计和漏洞信息时，还要遵守最小权限与数据保留要求。',
    },
    boundaries: {
      blocks: ['把用户目标转化为可执行的 SLO 与错误预算决策', '识别单节点或单故障域后的容量缺口', '对齐副本、拓扑、PDB、探针与弹性边界', '用恢复演练验证 RPO/RTO 和完整灾备链', '把权限、网络、发布与供应链证据纳入生产准入'],
      notBlocks: ['共享数据库、身份或第三方服务的共同故障', '未建模的区域级灾难或配置错误', '配额、卷、IP 或节点组规格造成的硬约束', '镜像漏洞、供应链攻击与已失陷凭证', '错误探针、错误 SLO 口径或失效的检查证据', '缺乏容量余量、恢复演练与风险接受时的可靠性承诺'],
    },
  },
]
