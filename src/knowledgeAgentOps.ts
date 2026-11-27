/**
 * Agent 协作与生产运维课程内容：覆盖多智能体、评估观测、可靠性恢复与生产运营。
 * 课程关注可验证结果、失败隔离、成本归因和持续治理，而不是把 Agent 数量或自主程度当作质量指标。
 */
import type { KnowledgeModule } from './knowledgeTypes'

/**
 * 导出多 Agent 与生产运维模块数组，供知识地图、学习路径和深潜入口消费。
 * 无函数输入；输出为 KnowledgeModule[]。数组顺序从协作机制推进到评估、恢复和生产边界。
 * 不变量：子任务成功不等于总任务成功，观测到行为不等于质量达标，恢复策略必须保留审计事实。
 */
export const agentOpsModules: KnowledgeModule[] = [
  // 多 Agent 协作：以任务契约、消息信封、私有草稿和版本仲裁隔离职责，防止自由聊天放大成本与错误。
  {
    id: 'multi-agent',
    track: 'agent',
    title: '多智能体：委派、隔离与协作',
    english: 'MULTI-AGENT / DELEGATION / ISOLATION',
    summary: 'Agent（按目标调用工具、看到结果后再决定下一步的程序）可以把一个目标拆成边界清晰的子任务，再用带身份与状态的消息协议连接 Supervisor（总协调者）与 Worker（只做一项子任务的执行者）。分工是否值得，取决于任务之间的相互影响、证据与失败成本，而不是 Agent 的数量。',
    icon: 'network',
    group: '规划与协作',
    dependencies: ['agent-loop', 'tool-calling', 'workflow-state', 'context-memory'],
    dependents: [],
    philosophy: {
      problem: '真实任务常常同时需要检索、计算、写作和校验。单人 Agent 会把不同职责、上下文（模型当前能参考的信息）与权限混在一个循环里；多 Agent 的目标是用明确接口隔离这些差异，再可靠地汇总结果。',
      rejects: '多 Agent 不自动更聪明，不替代清晰接口，也不保证并行更快。把同一段提示词发给多个角色、让它们自由聊天，只会放大误解、成本与失败传播（一个分支的错误影响父任务）。',
      counter: '增加一个 Agent，就增加一条消息边界、一份上下文成本和一种失败方式。很多任务用单个 Agent 加确定性工作流（步骤固定、同样输入得到同样输出的流程）更便宜、更可预测；只有子任务能独立验收、独立恢复时，分工才真正成立。',
    },
    design: {
      abstractions: [
        { name: '总协调者（Supervisor）', role: '理解总目标、拆分任务、分派资源、校验子结果并决定继续、重做或终止的协调者。' },
        { name: '子任务执行者（Worker）', role: '只对某个窄任务负责的执行者；拥有明确输入、输出契约、工具权限与完成条件。' },
        { name: '消息信封（Envelope）', role: '在正文之外携带 task_id（任务编号）、message_id（消息编号）、sender（发送者）、receiver（接收者）、类型、版本与关联信息，让消息可追踪、可去重。' },
        { name: '任务契约', role: '描述子目标、允许操作、禁止操作、输入证据、输出数据格式（schema）、截止时间与预算的边界。' },
        { name: '共享状态', role: '保存任务事实与已提交产物的地方。多个角色可以读，但本课只有 Supervisor 校验后能提交；Worker 的临时内容先留在私有草稿（只对当前 Worker 可见、尚未提交的内容）。' },
        { name: '结果回执', role: 'Worker 返回的结构化结论，也就是字段固定的机器可读结果；至少包含状态、证据、产物版本、未解决问题与资源消耗。' },
      ],
      principles: [
        '按任务相互影响而非按人名拆分：能够独立输入、独立验收、独立回滚的工作才适合委派；有严格先后依赖的工作应留在同一流程中。',
        '最少上下文交接：Supervisor 传递目标、约束、必要证据与输出契约，不倾倒全部历史；交接内容必须能回答“为什么做、做到什么程度”。',
        '消息是核心协议：每条消息有唯一编号（ID）、任务关联编号、类型与消息格式（schema）版本；重发、乱序与重复投递都必须可识别。',
        '隔离先于共享：Worker 使用私有草稿与最小工具权限（只授予完成分支所必需的工具）；多角色可读事实快照，但只有 Supervisor 校验通过的产物才能提交到共享状态，避免未完成内容污染他人。',
        '并发（多个执行同时发生）必须有冲突仲裁（决定哪个写入有效）规则：同一资源的同时修改使用版本号或归属规则；检测到冲突后重做或合并，不能静默“后写覆盖”。',
        'Supervisor 对最终结果负责：子任务成功不等于总任务成功；汇总后仍要检查证据覆盖（关键事实是否有有效证据支持）、相互矛盾与未完成分支。',
      ],
      history: [
        { when: '1973', what: '参与者消息模型（Actor，各参与者通过消息通信的计算方式）把计算描述为独立实体之间的消息往来', why: '隔离状态与异步消息让并发系统不必假设所有参与者共享一块内存。' },
        { when: '1980s', what: '黑板架构（Blackboard，多个专家围绕共享知识库协作）让知识与分工集中到一块共享区域', why: '它展示了“共享状态能促进协作”，也暴露了访问控制与冲突仲裁难题。' },
        { when: '1990s—2000s', what: '多 Agent 系统形成编排与协商研究', why: '服务可以跨组织、跨进程协作后，任务分配、信任与失败恢复成为核心问题。' },
        { when: '2022 年后', what: '大语言模型（LLM）Agent 框架把自然语言委派产品化', why: '模型能理解宽松指令，但生产系统仍需要把宽松意图编译成严格消息与状态协议。' },
      ],
    },
    capabilities: [
      { name: '角色隔离', sentence: '让检索、写作、校验等职责拥有不同上下文、工具权限与完成标准。' },
      { name: '并行委派', sentence: '真实并发时同时运行互不依赖的子任务，并用任务编号收回各自结果；本课脚本只用顺序回放展示事件，不表示真并行。' },
      { name: '结构化交接', sentence: '用字段固定的消息信封和输出契约传递证据，而不是复制整段聊天记录。' },
      { name: '冲突检测', sentence: '通过版本号、归属规则或不可变产物（创建后不再修改的版本）发现并发写冲突。' },
      { name: '失败隔离', sentence: '把单个 Worker 的失败限制在分支内，由 Supervisor 重试、替换或明确降级。' },
      { name: '成本归因', sentence: '按任务和角色记录 token（模型处理文字的小单位，也是计费与用量计量单位）、工具调用与耗时，判断分工是否真的划算。' },
    ],
    path: {
      intent: '让 Supervisor 把“整理一个团队方案”委派给检索 Worker 与政策校验 Worker，再汇总成带证据的结论。',
      environment: '本地单进程模拟；两个 Worker 只读同一份事实快照，各自写入私有草稿，最后由 Supervisor 校验并提交。没有网络、模型或真实外部工具；第一段命令按顺序回放两个分支的事件，第二段顺序回放并发冲突，二者都不是真并行。',
      steps: [
        { title: '把总目标变成可验收契约', description: 'Supervisor 先定义最终交付物、必须覆盖的事实、允许工具与预算，再判断哪些子任务真的独立。若检索结果会决定政策问题的含义，两个分支就不应盲目并行。', terms: [{ name: '可验收契约', definition: '可用证据判断“完成没有”的输入、输出、权限与约束集合。' }, { name: '耦合', definition: '一个子任务的结果会多大程度改变另一个子任务的输入或正确性。' }], state: '任务树（总任务与子任务的层级清单）与验收条件存在，尚无 Worker 执行。' },
        { title: '创建消息信封并派发', description: '每个委派写入 task_id（任务编号）、message_id（消息编号）、sender（发送者）、receiver（接收者）、schema_version（消息格式版本）与截止时间。正文只携带分支所需的上下文快照，不携带 Supervisor 的全部私有推理。', terms: [{ name: '关联标识（Correlation ID）', definition: '贯穿请求、工具调用与结果回执的关联编号，本模块使用 task_id 承担关联作用。' }, { name: '消息格式版本（Schema version）', definition: '消息结构的版本；升级时用于兼容旧 Worker 或拒绝无法解析的消息。' }], state: '两条委派消息进入等待执行（pending）队列，Worker 尚未读取。' },
        { title: 'Worker 在隔离草稿中执行', description: '每个 Worker 只看到自己的输入与最小工具集，把中间结果写入私有草稿。它可以读共享事实快照，但不能直接修改最终产物，因此一个错误分支不会污染 Supervisor 的共享状态。', terms: [{ name: '私有草稿', definition: '只对当前 Worker 可见的临时状态，提交前不进入共享产物。' }, { name: '最小权限', definition: '只授予完成该分支必需的工具与数据访问，不授予全部系统能力。' }], state: '两个分支处于执行中（running）；共享状态仍保持原始只读快照。' },
        { title: '校验回执而不是相信文本', description: 'Supervisor 检查状态字段、证据编号、输出数据格式（schema）与截止时间，再判断事实是否足够。格式正确不代表内容正确，因此还要检查引用是否存在、结论是否被证据支持。', terms: [{ name: '结果回执', definition: 'Worker 返回的机器可校验结论，而不是仅供人阅读的自由文本。' }, { name: '证据覆盖', definition: '最终答案的关键事实是否能映射到分支提供的有效证据。' }], state: '回执进入已收到（received）；无效分支进入被拒收（rejected）或需要重试（needs_retry）。' },
        { title: '检测并发冲突并提交', description: '两个分支若要修改同一资源，Supervisor 比较其基于的状态版本。只有一个提交能成功，另一个进入版本冲突（conflict）；不能把到达时间较晚的结果默认视为更新、更正确。', terms: [{ name: '乐观并发控制', definition: '写入前确认基础版本仍相同，用版本冲突代替长时间锁。' }, { name: '提交', definition: 'Supervisor 校验后，把私有草稿变成共享状态中可被其他角色使用的不可变版本。' }], state: '无冲突的产物由 Supervisor 提交；冲突产物保留草稿并等待重做或合并。' },
        { title: '汇总、复核与结束', description: 'Supervisor 合并证据并检查总目标，而不是简单拼接 Worker 文本。任一关键分支失败时，任务保持部分成功（partial）或失败（failed），并向调用方说明缺口；只有所有必要条件满足才标记已完成（completed）。', terms: [{ name: '部分成功', definition: '部分分支已完成，但关键交付条件仍缺失；它不是成功，也不是全部工作都丢失。' }, { name: '失败传播', definition: '子任务错误沿依赖边影响父任务的过程；应保留发生位置，避免只显示最终失败。' }], state: '任务进入已完成（completed）、部分成功（partial）或失败（failed），并保存汇总、总 token、按角色归因的 token、工具调用次数与模拟耗时。' },
      ],
      stateTable: {
        columns: ['阶段', 'Supervisor', 'Worker', '共享状态', '消息 / 证据'],
        rows: [
          ['定义契约', '拆分并设置验收', '尚未创建', '事实快照只读', '任务树、预算、输出 schema（数据格式）'],
          ['派发', '发送委派', '等待执行（pending）', '不变', '两个不同消息编号（message_id），同一任务编号（task_id）'],
          ['执行', '等待并观察', '执行中（running），写私有草稿', '仍为旧版本', '本课记录工具调用次数；真实系统可逐次记录工具调用明细'],
          ['一个分支返回', '校验证据', '一个成功（succeeded）', '尚未提交', '出现有效回执'],
          ['一个分支超时', '标记需要重试（needs_retry）/ 降低要求（degraded）', '超时（timeout）', '未完成分支不提交', '错误分类与尝试次数'],
          ['发现版本冲突', '保留一方，重做另一方', '版本冲突（conflict）', '只有一个新版本', '预期旧版本（expected_version）与实际版本'],
          ['汇总复核', '检查总目标', '均已结束', '不可变产物版本', '证据映射与缺口清单'],
          ['完成', '返回已完成（completed）/ 部分成功（partial）/ 失败（failed）', '无运行任务', '结果可审计（能查清谁做了什么）', '总 token、token 角色归因、工具调用次数、模拟耗时'],
        ],
      },
      summary: '多 Agent 的本质是把总目标编译成带身份、契约、隔离草稿和仲裁规则的消息协议；Supervisor 用证据汇总结果，而不是用聊天数量证明智能。',
    },
    costs: [
      { choice: '按角色拆分', cost: '每个角色都要重新获得上下文，委派与汇总增加 token、延迟和协调代码。', misread: '“角色越多，问题就会被分得越细。”' },
      { choice: '私有草稿隔离', cost: '避免未完成内容互相污染，但 Supervisor 必须设计清晰的提交与合并协议。', misread: '“共享同一份聊天记录就能自然协作。”' },
      { choice: '并发执行', cost: '缩短关键路径，却引入限流（限制单位时间请求数）、冲突、乱序与失败组合，调试跨度更大。', misread: '“两个 Worker 同时成功，总任务就一定成功。”' },
      { choice: '结构化消息', cost: '协议更可靠，但字段设计、版本兼容与数据格式（schema）校验需要长期维护。', misread: '“自然语言足够精确，不需要 task_id 和结果回执。”' },
      { choice: 'Supervisor 汇总', cost: '集中控制便于审计，但协调者可能成为延迟、权限和错误判断的唯一致命环节。', misread: '“Worker 都说完成，Supervisor 不用再检查。”' },
    ],
    example: {
      title: '用本地消息轨迹（trace）看懂委派、隔离与结果汇总',
      intent: '读者在本机终端运行两段 Python 标准库脚本：输入是虚构的团队事实与版本号，输出是消息轨迹、冲突结果和用量汇总。第一段顺序回放两个 Worker 的委派与校验事件，第二段顺序回放两个分支同时基于旧版本提交时会发生的冲突。所有事件和用量都在内存中，不会访问网络、模型或真实 Agent。',
      setup: '本段模拟一个团队整理套餐方案的协作任务：Supervisor 负责派发与验收，researcher 和 checker 两个 Worker 分别核对座位数与退款政策。两个角色都可读同一份事实快照，但只有 Supervisor 校验后提交；脚本用 for 循环顺序回放分支，不表示同时运行。团队、事实、版本号与 token 记账均为虚构。',
      terms: [
        { name: '执行者（Worker）/ 执行者变量（worker）', definition: 'Worker 是只负责一个窄任务的执行者；代码中的 worker 变量依次代表 researcher 和 checker，不是真实人员或服务。' },
        { name: '消息轨迹（trace）/ 轨迹列表（trace）', definition: 'trace 是按时间打印的事件清单，记录发送者（sender）、事件（event）和字段（fields），用它查看委派、执行、校验与提交的先后。' },
        { name: '共享状态（shared state）/ 状态变量（state）', definition: '共享状态保存任务事实与已提交产物；本课 Worker 只能读事实、写自己的私有草稿，只有 Supervisor 能提交。第二个脚本用 state 字典顺序回放并发冲突。' },
        { name: '版本检查：预期旧版本（expected_version）/ 起草时版本（base）', definition: '提交前比较起草时版本（base）与 state["version"]，只有基础版本没变才写入；expected_version 表示提交者以为的旧版本。' },
        { name: '计量单位（token）/ 按角色记账（token_by_role）', definition: 'token 是模型处理文字的小单位，也是用量与计费计量单位；本课没有调用模型，token_by_role 只是演示如何按角色记账。' },
      ],
      diagram: {
        kind: 'flow',
        title: '一次多 Agent 任务的控制流与数据流',
        caption: 'Supervisor 不把全部上下文交给 Worker，而是发送最小任务信封；Worker 在私有草稿中产生回执，Supervisor 校验后才提交到共享产物。',
        items: [
          { title: 'Supervisor 建契约', detail: '冻结目标、预算、允许工具、验收条件与任务编号。', tag: '任务定义', tone: 'blue' },
          { title: '发送两个消息信封', detail: '分别携带 message_id（消息编号）、receiver（接收者）、schema_version（消息格式版本）和该分支所需事实。', tag: '委派', tone: 'muted' },
          { title: '顺序回放两个分支', detail: '真实并发时可同时执行；本课 for 循环依次回放。两个 Worker 都只读事实、写各自草稿。', tag: '模拟边界', tone: 'green' },
          { title: 'Supervisor 校验后提交', detail: '检查状态、证据和 expected_version，拒绝无效或冲突提交；Worker 不直接写共享产物。', tag: '仲裁', tone: 'orange' },
          { title: '汇总并设置总状态', detail: '关键证据齐全才已完成（completed）；否则部分成功（partial），并明确缺口。', tag: '最终负责', tone: 'green' },
        ],
        footnote: '消息协议解决“谁在对谁说什么”，隔离解决“未完成工作不会污染他人”，仲裁解决“同一状态谁能写”。三者缺一不可。',
      },
      commands: [
        {
          title: '顺序回放 Supervisor 委派两个 Worker 的消息 trace',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import json

clock = 0
trace = []
def emit(ms, sender, event, **fields):
    global clock
    clock += ms
    trace.append((clock, sender, event, fields))

facts = {"plan": "team", "seats": 8, "refund_days": 7}
task = {"task_id": "task-42", "goal": "summarize team plan", "schema": 1}
emit(1, "supervisor", "task.created", **task)

for worker in ("researcher", "checker"):
    mid = "msg-" + str(len(trace) + 1)
    emit(1, "supervisor", "delegated", task_id=task["task_id"], message_id=mid,
         receiver=worker, schema=1, input_facts=sorted(facts))
    emit(1, worker, "started", task_id=task["task_id"], message_id=mid,
         context="private", tools=["read_facts"])
    if worker == "researcher":
        result = {"status": "succeeded", "answer": "team plan supports 8 seats",
                  "evidence": ["facts.seats", "facts.plan"], "draft_version": 1}
    else:
        result = {"status": "succeeded", "answer": "7-day refund meets minimum",
                  "evidence": ["facts.refund_days"], "draft_version": 1}
    emit(2, worker, "result", task_id=task["task_id"], message_id=mid, **result)
    valid = result["status"] == "succeeded" and all(
        e.split(".")[1] in facts for e in result["evidence"]
    )
    emit(1, "supervisor", "validated" if valid else "rejected",
         task_id=task["task_id"], message_id=mid, valid=valid)

emit(1, "supervisor", "committed", task_id=task["task_id"],
     artifact="draft-v1", expected_version=0)
# 没有真实模型调用；这些数值只演示按角色归因的 token 记账。
token_by_role = {"researcher": 160, "checker": 130, "supervisor": 90}
emit(1, "supervisor", "completed", task_id=task["task_id"],
     workers=2, evidence_count=3, tool_calls=2,
     token_by_role=token_by_role, total_tokens=sum(token_by_role.values()),
     elapsed_ms=clock + 1)

for ms, sender, event, fields in trace:
    print(f"{ms:06.3f} {sender:11} {event:11} {json.dumps(fields, sort_keys=True)}")
PY`,
          output: `01.000 supervisor  task.created {"goal": "summarize team plan", "schema": 1, "task_id": "task-42"}
02.000 supervisor  delegated   {"input_facts": ["plan", "refund_days", "seats"], "message_id": "msg-2", "receiver": "researcher", "schema": 1, "task_id": "task-42"}
03.000 researcher  started     {"context": "private", "message_id": "msg-2", "task_id": "task-42", "tools": ["read_facts"]}
05.000 researcher  result      {"answer": "team plan supports 8 seats", "draft_version": 1, "evidence": ["facts.seats", "facts.plan"], "message_id": "msg-2", "status": "succeeded", "task_id": "task-42"}
06.000 supervisor  validated   {"message_id": "msg-2", "task_id": "task-42", "valid": true}
07.000 supervisor  delegated   {"input_facts": ["plan", "refund_days", "seats"], "message_id": "msg-6", "receiver": "checker", "schema": 1, "task_id": "task-42"}
08.000 checker     started     {"context": "private", "message_id": "msg-6", "task_id": "task-42", "tools": ["read_facts"]}
10.000 checker     result      {"answer": "7-day refund meets minimum", "draft_version": 1, "evidence": ["facts.refund_days"], "message_id": "msg-6", "status": "succeeded", "task_id": "task-42"}
11.000 supervisor  validated   {"message_id": "msg-6", "task_id": "task-42", "valid": true}
12.000 supervisor  committed   {"artifact": "draft-v1", "expected_version": 0, "task_id": "task-42"}
13.000 supervisor  completed   {"elapsed_ms": 13, "evidence_count": 3, "task_id": "task-42", "token_by_role": {"checker": 130, "researcher": 160, "supervisor": 90}, "tool_calls": 2, "total_tokens": 380, "workers": 2}`,
          expect: '两个子任务都校验通过，总任务显示完成；总用量、分角色用量和工具调用次数都有记录。',
          note: 'for 循环让 researcher 完整结束后才轮到 checker，所以这是顺序回放，不是真并行。两个 Worker 都只收到最小事实快照，回执带 task_id 与证据；token 数值是虚构记账，completed 是 Supervisor 校验后的总状态。输出中 valid=true 表示校验通过；workers、evidence_count、tool_calls 分别是 Worker 数、证据数和工具调用次数，elapsed_ms 是模拟耗时毫秒。',
        },
        {
          title: '顺序回放并发写冲突，并用版本检查阻止静默覆盖',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import json

state = {"version": 0, "owner": None, "quota": 0}
conflicts = []

def commit(reply):
    if reply["base"] != state["version"]:
        conflicts.append({"worker": reply["worker"], "base": reply["base"],
                          "actual": state["version"], "decision": "rebase"})
        return "conflict"
    state.update(version=state["version"] + 1, owner=reply["worker"], quota=reply["quota"])
    return "committed"

first = {"worker": "researcher", "base": 0, "quota": 12}
second = {"worker": "checker", "base": 0, "quota": 20}
print("researcher base=0 ->", commit(first), state)
print("checker base=0 ->", commit(second), state)

reviewed = {"worker": "checker", "base": state["version"], "quota": 20}
print("reviewed checker base=1 ->", commit(reviewed), state)
print("conflict_log", json.dumps(conflicts, sort_keys=True))
PY`,
          output: `researcher base=0 -> committed {'version': 1, 'owner': 'researcher', 'quota': 12}
checker base=0 -> conflict {'version': 1, 'owner': 'researcher', 'quota': 12}
reviewed checker base=1 -> committed {'version': 2, 'owner': 'checker', 'quota': 20}
conflict_log [{"actual": 1, "base": 0, "decision": "rebase", "worker": "checker"}]`,
          expect: '第一次提交成功，第二次因版本冲突失败；总协调者复核后重新提交成功，最终版本为 2。',
          note: '两个 Worker 都从 version=0 起草。脚本依次调用 commit，属于“顺序回放并发冲突”：它模拟两人同时拿到旧版本后依次提交，并非真实并行。第二个提交不会覆盖第一个；Supervisor 复核后基于新版本重提，conflict 表示版本冲突，conflict_log 中 decision=rebase 表示按新版本重新起草。真实系统应把版本检查放在同一事务（要么一起成功、要么一起失败的操作）或条件写入中。',
        },
      ],
      checkpoints: ['每条消息都有 task_id（任务编号）、message_id（消息编号）、sender / receiver（发送者 / 接收者）与 schema（消息格式）版本', 'Worker 只收到分支所需上下文，中间状态留在私有草稿', '多角色可读事实，但只有 Supervisor 校验回执、证据与输出结构后才提交', '并发修改使用版本检查，冲突不会被静默覆盖；本课只是顺序回放', '能解释为什么子任务成功仍不保证总任务 completed（已完成）', '能从 trace（消息轨迹）读取总 token、按角色归因的 token 与工具调用次数'],
      safety: '示例完全在内存中运行。接入真实多 Agent 前，应为每个 Worker 配置最小工具权限，禁止把凭据（账号密钥等登录秘密）、聊天历史或高权限工具无差别复制给所有角色。',
    },
    boundaries: {
      blocks: ['不同职责共享同一上下文造成的污染', '子任务并行执行缺少关联与追踪', 'Worker 直接改写共享状态', '只凭自然语言交接导致责任不清'],
      notBlocks: ['错误的任务分解', '模型幻觉与提示注入（用恶意文字诱导模型）', '跨进程消息丢失', '同一业务数据被同时修改', '无限增长的协作成本'],
    },
  },
  // 评估与观测：把轨迹、跨度、质量样本和线上指标关联起来，区分“系统运行了”与“任务结果可靠”。
  {
    id: 'evaluation-observability',
    track: 'agent',
    title: 'Agent 评估与可观测性',
    english: 'EVALUATION / TRACE / SPAN',
    summary: '记录每步，用固定旧题查新版是否变差。可观测性（记录系统每一步实际做了什么）回答“发生了什么”，评估（按固定规则判断结果是否达标）回答“做得怎样”；这些旧题组成离线回归集（可重复使用的固定测试样本），达标检查叫回归门禁（不达标就阻止发布）。在线反馈（真实用户使用后留下的赞踩、投诉等信号）补充真实请求情况，但三者都不能单独证明生产可靠。',
    icon: 'chart',
    group: '治理与运维',
    dependencies: ['agent-loop', 'tool-calling', 'workflow-state'],
    dependents: [],
    philosophy: {
      problem: 'Agent（按目标调用工具、看到结果后再决定下一步的程序）的输出可能变化，工具会改变环境，失败可能跨越多个步骤。团队需要知道一次请求经过了什么、为什么失败、换版本后是否退步，并把这些问题变成可重复的指标（用数字概括表现的测量值）与样本。',
      rejects: '可观测性不等于可评估：日志能记录错误，却不能定义什么答案正确。评估通过也不等于生产可靠：固定小样本无法覆盖真实流量、依赖故障、提示注入（用恶意文字诱导模型）和成本尖峰。',
      counter: '一条漂亮轨迹（trace，按时间保存的一次请求过程记录）只能证明“过程被记录下来”，不能证明“任务做对了”。反过来，离线分数很高也可能只是测试集太容易；可靠性必须同时看质量、权限、成本、延迟与故障恢复。',
    },
    design: {
      abstractions: [
        { name: '调用轨迹（Trace）', role: '一次从输入到最终结果的完整请求按时间排列的过程清单，串联模型调用、工具、检索、重试与最终状态，用于看清先后和影响关系。' },
        { name: '工作步骤记录（Span）', role: 'trace 中的一个有起止时间的工作单元，记录输入摘要、输出摘要、错误与父子关系。' },
        { name: '事件（Event）', role: '系统中某个时刻发生的事实，例如工具开始、权限拒绝、恢复点（checkpoint）保存；事件是观测原料，不自动等于指标。' },
        { name: '评估样本', role: '输入、上下文、允许工具、预期结果或评分规则组成的可重放（用同样输入与环境再次执行）测试单元。' },
        { name: '评分器（Grader）', role: '按明确规则给结果打分的确定性程序（规则固定、同样输入得到同样输出）、人工评审或模型评审；例如保存评分器编号（grader_id）、分数（score）、理由（reason）三个字段。' },
        { name: '版本基线', role: '模型、提示、工具、检索与评分器版本共同构成的对照快照，用于判断变化来自哪里。' },
      ],
      principles: [
        '先定义成功再采集（把数据记录下来）：没有验收规则，trace 只是更昂贵的日志；任务成功、答案质量、工具正确性与用户体验要分开计分。',
        '一条 trace 一个关联编号（ID）：模型、检索和工具 span 都要能回到同一次任务，否则无法还原前后影响关系与成本。',
        '离线评估（不接真实流量，用固定输入与环境重复检查）要可重放：冻结输入、工具环境、随机性策略和版本；否则两次分数不可比。',
        '指标必须伴随失败样本（能复现问题的完整案例）：聚合值（把多条样本汇总成的数字）用于看趋势，具体样本用于理解原因，二者缺一不可。',
        '模型评审（LLM-as-judge，让另一个模型按评分规则判断答案）需要校准（用人工判断检查评分是否可靠）：记录评分模型（judge_model）、评分规则版本（rubric_version）、分数（score）、理由（reason）等字段，并检查位置、长度、风格与自身偏见，不能把模型分数直接当标准答案。',
        '在线反馈是选择样本：赞 / 踩、改写、投诉和人工接管可用于发现新失败，但不能直接当作不带选择偏差的标准答案。',
      ],
      history: [
        { when: '2010s', what: '分布式追踪形成 trace / span 数据模型', why: '跨服务请求需要统一因果链，才能定位延迟与错误的传播路径。' },
        { when: '持续集成时代', what: '测试集、基准与回归门禁成为发布习惯', why: '软件变更必须用可重复证据与历史基线比较，而不是依赖发布者感觉。' },
        { when: '2020s 初', what: 'Agent 轨迹评估从最终答案扩展到过程', why: '工具调用顺序、状态转换和恢复行为会决定最终结果，只看答案会漏掉风险。' },
        { when: '2023 年后', what: 'LLM-as-judge 被广泛用于规模化评分', why: '人工评分成本高，但模型评审的偏差、方差与可复现性也随之成为研究对象。' },
      ],
    },
    capabilities: [
      { name: '轨迹追踪', sentence: '用调用轨迹、工作步骤记录与事件还原一次请求的控制流和工具副作用（外部可见的改变）。' },
      { name: '任务评估', sentence: '按冻结样本对应的既有结果计算任务成功率（达标任务占比）、答案质量、工具正确率（工具操作正确占比）与成本；若没有现成记录，才需要先运行 Agent 生成记录。' },
      { name: '失败归因', sentence: '把失败分类为检索、推理、工具、权限、状态或预算问题。' },
      { name: '回归比较', sentence: '在相同旧题与评分器下，给候选版本和基线的既有结果评分，阻止静默退步。' },
      { name: '评审校准', sentence: '用人工标注检验模型评审的偏差与一致性。' },
      { name: '反馈闭环', sentence: '从线上失败、投诉和人工接管中产生新的回归样本。' },
    ],
    path: {
      intent: '评估一个“查询团队套餐并回答退款政策”的 Agent，并决定新版本能否替换旧版本。',
      environment: '本地 Python 标准库；六条固定样本已经带有应有事实（expected）、实际事实（actual）、工具结果（tools）、毫秒耗时（latency）与人工判断（human）。本课直接给这些既有结果评分，不重新运行 Agent；评分器不调用任何模型。',
      steps: [
        { title: '把业务目标写成评分规则', description: '先明确什么是任务成功：答案必须包含指定事实，工具不能失败，关键步骤不能超过时限。不同维度分开记录，避免用一个模糊总分掩盖工具错误或超时。', terms: [{ name: '任务成功率', definition: '满足全部必要条件或预先定义评分阈值的样本占比。' }, { name: '评分说明（Rubric）', definition: '把主观目标转成可执行检查项与通过条件的评分说明。' }], state: '样本、必要条件与版本基线已定义。' },
        { title: '埋点并生成统一 trace', description: '埋点（在程序关键位置自动写入记录）为请求生成请求关联编号（trace_id），模型调用、检索和工具各创建工作步骤记录（span），记录开始、结束、错误、重试次数与 token（模型处理文字的小单位，也是用量计量单位）。结构化事件（字段固定、机器可读的记录）通过工作步骤编号（span_id）与 trace_id 关联。', terms: [{ name: '请求关联编号（Trace ID）', definition: '一次端到端请求的唯一标识，用于串联所有步骤；字段例：trace_id="t-42"。' }, { name: '工作步骤上下文（Span context）', definition: '当前工作步骤的编号、请求编号与父子关系；字段例：span_id="s-7"、parent_span_id="s-1"、trace_id="t-42"。' }, { name: '结构化事件字段例', definition: '例如 event="tool.end"、trace_id="t-42"、span_id="s-7"、start_ms=100、end_ms=180、status="ok"、token=24；没有固定字段就难以自动汇总。' }], state: '每条样本产生可查询的调用轨迹与工具记录。' },
        { title: '给离线集的既有结果评分', description: '完整离线评估会先固定模型、提示、工具返回、检索快照和评分器版本，再运行 Agent；本课脚本从已有记录开始，只比较 expected 与 actual、检查工具和延迟，不重跑 Agent。随机性无法完全消除时，完整评估应多次运行并报告均值与波动，而不是挑选最好的一次。', terms: [{ name: '离线评估', definition: '不接真实流量，用固定输入、环境与评分规则重复检查；本课只演示其中“给既有结果评分”的一段。' }, { name: '冻结快照', definition: '评估期间不变化的输入、知识、工具响应与配置版本。' }], state: '得到与版本绑定的样本评分，尚未聚合解释。' },
        { title: '分维度计算指标', description: '分别计算任务成功、工具调用成功、事实覆盖、延迟和成本；p95 能暴露少数慢请求，平均值不能。样本量很小时，同时报告通过数与总数，避免把 1/1 误读为 100% 的可靠保证。', terms: [{ name: '第 95 百分位延迟（p95 latency）', definition: '至少 95% 请求不超过的耗时；小样本常用取排序后对应位置（nearest-rank）的方法估计。' }, { name: '事实覆盖', definition: '答案实际包含的必需事实数除以预期必需事实总数。' }], state: '指标表与样本明细同时生成。' },
        { title: '检查失败样本并校准评审', description: '对每个失败保留输入、预期、实际、trace 摘要与分类。模型评审还要和人工标签（人逐条给出的对错判断）对照，检查是否偏好长答案、肯定语气或某个位置，而不是假定它的判断天然正确。', terms: [{ name: '失败样本', definition: '可用于复现和定位问题的完整案例，而非只有一句错误日志。' }, { name: '评审偏差', definition: '评分器因长度、位置、风格或自身倾向而系统性偏离目标标准。' }], state: '聚合指标可追溯到具体失败与人工分歧。' },
        { title: '比较版本并执行回归门禁', description: '候选版本与基线必须使用同一回归集、同一评分器和相同门槛。本课直接给两次版本的既有记录评分；若没有记录，才需要先按冻结环境生成。任何关键维度退步都需要解释；通过后保存版本清单与报告，再把线上反馈加入下一轮测试集。', terms: [{ name: '回归集', definition: '覆盖历史失败、关键能力与风险场景的固定样本集合，也就是反复检查新版是否变差的旧题。' }, { name: '版本清单', definition: '模型、提示、工具数据格式（schema）、检索索引、评分器与配置的不可变版本记录。' }], state: '形成通过（pass）/ 阻止发布（block）决策与可审计的比较报告。' },
      ],
      stateTable: {
        columns: ['阶段', '观测数据', '评估动作', '可观察证据', '决策状态'],
        rows: [
          ['定义', '尚无运行', '写成功规则与样本', '评分说明（rubric）、预期事实、版本清单', '已准备（ready）'],
          ['采集', 'trace / span / event', '关联模型与工具调用', 'trace_id、父子 span、token', '已记录（observed）'],
          ['评分', '既有 expected / actual、工具与延迟记录', '按同一规则给既有结果评分', '通过项、缺失事实、工具失败、慢请求', '已评分（evaluated）'],
          ['聚合', '样本级结果', '算成功率、p95、成本', '通过数 / 总数、快慢分布、失败率', '已测量（measured）'],
          ['归因', '失败 trace', '分类并抽检', '失败样本与证据缺口', '已解释（explained）'],
          ['校准', '人工标签与 judge 分数', '计算一致性', '分歧样本、偏差类型', '已校准（calibrated）'],
          ['门禁', '版本对比报告', '应用阈值', '通过（pass）/ 阻止发布（block）与原因', '发布决策（release decision）'],
          ['反馈', '线上失败与投诉', '加入回归集', '新版本测试集与责任人', '闭环完成（loop closed）'],
        ],
      },
      summary: '可观测性提供“发生了什么”的证据，评估提供“是否达到目标”的判断，版本基线让变化可比较；生产可靠性还需要恢复、安全、成本与真实流量验证。',
    },
    costs: [
      { choice: '完整 trace', cost: '定位能力强，但取值很多的标签、长输入与工具输出会增加存储、隐私和查询成本。', misread: '“记录越多越好，日志里什么都要保存。”' },
      { choice: '离线回归集', cost: '可重复、可门禁，但覆盖有限，真实问题种类变化后可能产生虚假的安全感。', misread: '“回归集全绿就说明线上不会失败。”' },
      { choice: 'LLM-as-judge', cost: '规模化评分便宜且快速，但存在风格偏见、打分波动和难以审计的评分理由。', misread: '“另一个模型打分就是客观真值。”' },
      { choice: '在线反馈', cost: '能发现真实问题，却受用户选择、沉默多数与投诉偏差影响。', misread: '“没有投诉就等于用户满意。”' },
      { choice: '细分指标（按不同方面分别统计的数字）', cost: '能揭示质量、工具和延迟的不同问题，但也会增加埋点与维护成本。', misread: '“一个综合分足够指导所有改进。”' },
    ],
    example: {
      title: '给六条既有结果评分，并打印失败样本与评审偏差',
      intent: '第一段给六条已有记录按明确规则计算任务成功率、工具成功率、事实覆盖、平均与 p95 延迟，并输出失败和人工分歧；第二段用确定性规则模拟“只看长度”与“核对事实”两种评分方式，观察偏差。两段都不运行 Agent。',
      setup: '读者在本机终端运行两段 Python 标准库脚本：输入是六条既有业务样本和四条评分样本，输出是指标、失败明细与人工分歧。本段使用一个“查询团队套餐并回答退款政策”的 Agent 的虚构既有记录，六条样本已经包含预期事实、实际事实、工具结果、延迟和人工判断。脚本从“记录”阶段开始评分，不重新运行 Agent；样本、答案与评分均为教学虚构，不调用真实模型或线上流量。',
      terms: [
        { name: '评估集 / tasks / samples', definition: '评估集是一批可重复测试的固定样本；tasks 保存六条业务案例，samples 保存四条评分案例，用来比较规则。' },
        { name: '样本字段 tasks', definition: 'expected 是“应该出现的事实”，actual 是“实际答案中的事实”；tools 列表中 True 表示该次工具成功、False 表示失败；latency 是毫秒耗时；human=True 表示人工判定通过，human=False 表示人工判定不通过。' },
        { name: '评分者 judge / computed_pass', definition: 'judge 是按规则给结果评分的人或程序；computed_pass 是规则算出的通过与否，需与 human 人工标签对照。本课 judge 只是 if 判断，不是另一个模型。' },
        { name: '第 95 百分位延迟 p95 / p95_latency_ms', definition: 'p95 是排序后第 95% 位置的延迟，表示至少 95% 请求不超过该耗时；它能暴露平均值掩盖的慢请求。' },
        { name: '成功率 / task_success', definition: '成功率是达标任务数除以总任务数；task_success=5/6 表示六条通过五条，必须结合样本数理解。' },
        { name: '评审偏差 / judge_disagreement', definition: '评审偏差是评分因长度、风格或位置而系统性偏离标准；judge_disagreement 列出规则与人工不一致的样本。' },
      ],
      diagram: {
        kind: 'flow',
        title: '输入 → Agent → 记录 → 评分：本课从记录处开始',
        caption: '完整评估先运行 Agent 再评分；本课六条 expected / actual 等记录已经存在，所以只演示右侧两步。',
        items: [
          { title: '输入', detail: '固定旧题、上下文、允许工具与预期事实；输入相同，版本之间才可比。', tag: '评估条件', tone: 'blue' },
          { title: 'Agent 运行', detail: 'Agent 根据输入调用模型与工具，产生实际答案、工具结果和耗时；本课不执行这一段。', tag: '本课略过', tone: 'muted' },
          { title: '记录', detail: '保存 expected、actual、tools、latency、human，以及 trace / span / event 等过程字段。', tag: '本课起点', tone: 'green' },
          { title: '评分', detail: '按固定规则比较记录，计算成功率、事实覆盖、工具成功率、延迟与人工分歧；不重跑 Agent。', tag: '本课操作', tone: 'orange' },
        ],
        footnote: '记录是评分的输入，不是评分本身。离线门禁通过后，仍需灰度发布（canary release，先让少量真实请求试用新版本）、监控与恢复机制验证生产行为。',
      },
      commands: [
        {
          title: '给六条既有结果评分并计算指标',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import math

tasks = [
    {"id": "E01", "expected": ["refund_7d"], "actual": ["refund_7d"], "tools": [True, True], "latency": 800, "human": True},
    {"id": "E02", "expected": ["sso"], "actual": ["sso"], "tools": [True, True], "latency": 1200, "human": True},
    {"id": "E03", "expected": ["export_csv"], "actual": ["refund_7d"], "tools": [True, False], "latency": 2500, "human": False},
    {"id": "E04", "expected": ["retention"], "actual": ["retention"], "tools": [True], "latency": 600, "human": True},
    {"id": "E05", "expected": ["price"], "actual": ["price"], "tools": [True], "latency": 1800, "human": False},
    {"id": "E06", "expected": ["seats"], "actual": ["seats"], "tools": [True], "latency": 900, "human": True},
]

def evaluate(task):
    missing = sorted(set(task["expected"]) - set(task["actual"]))
    tool_errors = task["tools"].count(False)
    slow = task["latency"] > 2000
    return not missing and tool_errors == 0 and not slow, missing, tool_errors, slow

results = []
for task in tasks:
    passed, missing, tool_errors, slow = evaluate(task)
    results.append((task, passed, missing, tool_errors, slow))

successes = sum(passed for _, passed, _, _, _ in results)
tool_ok = sum(sum(task["tools"]) for task, _, _, _, _ in results)
tool_total = sum(len(task["tools"]) for task, _, _, _, _ in results)
expected_total = sum(len(task["expected"]) for task in tasks)
covered = sum(len(set(task["expected"]) & set(task["actual"])) for task in tasks)
latencies = sorted(task["latency"] for task in tasks)
p95 = latencies[math.ceil(0.95 * len(latencies)) - 1]
agreement = sum(passed == task["human"] for task, passed, _, _, _ in results)

print(f"task_success={successes}/{len(tasks)} ({successes / len(tasks):.1%})")
print(f"tool_success={tool_ok}/{tool_total} ({tool_ok / tool_total:.1%})")
print(f"fact_coverage={covered}/{expected_total} ({covered / expected_total:.1%})")
print(f"mean_latency_ms={round(sum(latencies) / len(latencies))} p95_latency_ms={p95}")
print(f"human_agreement={agreement}/{len(tasks)} ({agreement / len(tasks):.1%})")
for task, passed, missing, tool_errors, slow in results:
    if not passed:
        print(f"failure {task['id']} missing={missing} tool_errors={tool_errors} slow={slow} latency_ms={task['latency']}")
for task, passed, _, _, _ in results:
    if passed != task["human"]:
        print(f"judge_disagreement {task['id']} computed_pass={passed} human_pass={task['human']}")
PY`,
          output: `task_success=5/6 (83.3%)
tool_success=8/9 (88.9%)
fact_coverage=5/6 (83.3%)
mean_latency_ms=1300 p95_latency_ms=2500
human_agreement=5/6 (83.3%)
failure E03 missing=['export_csv'] tool_errors=1 slow=True latency_ms=2500
judge_disagreement E05 computed_pass=True human_pass=False`,
          expect: '六条任务通过五条，九次工具调用成功八次；结果列出 E03 失败和 E05 人工分歧。',
          note: '脚本直接读取 tasks 中已有的 expected / actual 等字段，没有运行 Agent。E03 同时暴露事实缺失、工具失败和超时；E05 则说明“规则检查通过”仍可能与人工判断不同。小样本的百分比必须和分子分母一起阅读。',
        },
        {
          title: '用两种固定规则模拟长度偏好',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
samples = [
    {"id": "J01", "required": "refund", "facts": {"refund": True}, "answer": "7 days.", "human": True},
    {"id": "J02", "required": "export", "facts": {"export": False}, "answer": "Yes, the product can export every row to a CSV file for your team.", "human": False},
    {"id": "J03", "required": "sso", "facts": {"sso": True}, "answer": "Enterprise SSO is available on the team plan.", "human": True},
    {"id": "J04", "required": "retention", "facts": {"retention": False}, "answer": "All records are retained forever without any limits or restrictions.", "human": False},
]

length_ok = fact_ok = 0
for sample in samples:
    length_score = len(sample["answer"]) >= 18
    fact_score = sample["facts"].get(sample["required"], False)
    length_ok += length_score == sample["human"]
    fact_ok += fact_score == sample["human"]
    print(f"sample {sample['id']} required={sample['required']} length_only={length_score} fact_check={fact_score} human={sample['human']}")
print(f"accuracy length_only={length_ok}/{len(samples)} ({length_ok / len(samples):.1%})")
print(f"accuracy fact_check={fact_ok}/{len(samples)} ({fact_ok / len(samples):.1%})")
PY`,
          output: `sample J01 required=refund length_only=False fact_check=True human=True
sample J02 required=export length_only=True fact_check=False human=False
sample J03 required=sso length_only=True fact_check=True human=True
sample J04 required=retention length_only=True fact_check=False human=False
accuracy length_only=1/4 (25.0%)
accuracy fact_check=4/4 (100.0%)`,
          expect: '只看长度的规则只通过 1/4，核对事实的规则通过 4/4；J02、J04 显示长度偏见。',
          note: '这里没有真实模型或 Agent 运行：长度规则模拟一种常见偏差，即把长答案误认为更完整；事实规则只在标注可靠时表现好。真实模型评审必须用独立人工样本定期校准，并保存分歧。',
        },
      ],
      checkpoints: ['能区分事件、工作步骤记录（span）与调用轨迹（trace）', '能说明输入 → Agent → 记录 → 评分，并认出本课从既有记录开始评分', '能从失败样本定位到具体工具或证据缺口', '成功率同时报告分子分母与样本规模', 'p95 与平均延迟表达不同问题', '能解释模型评审（LLM-as-judge）为什么需要人工校准', '回归比较固定输入、环境、评分器与版本清单'],
      safety: 'trace 可能包含用户输入、凭据、工具参数与业务数据。生产采集应做字段白名单、脱敏、访问控制和保留期限，不能为了排障把完整隐私写入日志。',
    },
    boundaries: {
      blocks: ['只有最终输出、无法还原调用链', '凭感觉判断版本好坏', '历史失败反复出现而没有回归用例', '聚合指标掩盖具体失败'],
      notBlocks: ['评估集覆盖不足', '模型评审偏差', '线上分布漂移', '工具真实副作用', '权限漏洞与基础设施故障'],
    },
  },
  // 可靠性与恢复：围绕超时、重试、幂等、检查点和降级设计故障路径，并保留部分成功与外部副作用账本。
  {
    id: 'reliability-recovery',
    track: 'agent',
    title: '可靠性：超时、重试、幂等与恢复',
    english: 'RELIABILITY / RETRY / IDEMPOTENCY',
    summary: '幂等（同一个操作重复发送，也只产生一次外部效果）能防止重复扣款。工具与网络会失败，超时也不代表没有执行；可靠系统用失败分类、截止时间、幂等键、恢复点（checkpoint，保存已完成进度）、补偿（用相反动作抵消已完成步骤）与预算，把“可能重复”的运行变成可解释、可恢复的状态。',
    icon: 'reset',
    group: '治理与运维',
    dependencies: ['workflow-state', 'tool-calling', 'evaluation-observability'],
    dependents: [],
    philosophy: {
      problem: 'Agent（按目标调用工具、看到结果后再决定下一步的程序）的一个决定可能触发付款、写文件、发消息或修改数据，这些外部可见改变叫副作用。请求会超时，进程会崩溃，重试会与第一次执行重叠；系统必须在不知道接收方结果时仍避免重复副作用，并保留可恢复的进度。',
      rejects: '重试不是可靠性的同义词，超时也不是取消。对没有幂等保证的扣款操作盲目重试，会把暂时故障扩大成重复扣款或状态损坏。',
      counter: '先分清三个说法：至少一次投递（at-least-once delivery）指允许重复，所以至少要送到一次；恰好一次效果（exactly-once effect）指同一业务操作只生效一次，即使请求重复；对账（reconciliation）指事后逐笔核对双方记录，找出漏做、重做和结果不明。分布式环境不能只靠网络承诺恰好一次，必须靠幂等键、去重存储、事务（一组要么一起成功、要么一起失败的操作）或对账。超时后的第一问题应是“服务端是否已经扣款”，不是“再试一次看看”。',
    },
    design: {
      abstractions: [
        { name: '失败分类', role: '把输入错误、权限拒绝、限流、临时网络错误、超时和业务冲突映射为不同处置策略。' },
        { name: '截止时间（Deadline）', role: '一次任务可承受的总时间上限；重试必须使用剩余预算，不能每轮都重新获得完整超时。' },
        { name: '重试策略', role: '规定哪些错误可重试、最多几次、退避（失败后等待逐次延长但设上限）多久、是否加抖动以及何时升级。' },
        { name: '幂等与幂等键（Idempotency / idempotency key）', role: '调用方（发起请求的程序）把稳定的操作身份持久化（保存到进程重启后仍存在的地方）；对端（接收请求的服务）按这个键识别重复请求，返回首次结果而不重复扣款。' },
        { name: '恢复点（Checkpoint）', role: '已完成步骤、输入版本、外部回执与恢复位置的持久化快照，用于崩溃后继续而非从头盲跑。' },
        { name: '补偿（Compensate）', role: '当后续步骤失败时，用语义相反或可撤销的动作恢复一致性；它不是时间倒流，也可能失败。' },
      ],
      principles: [
        '先分类再重试：参数错误、权限不足和业务冲突通常不应原样重试；限流与临时故障才适合有界退避（等待逐次延长但设上限）。',
        '截止时间覆盖整个任务：模型、工具与重试共享剩余时间，避免局部超时叠加成用户无法接受的等待。',
        '幂等键在副作用边界生效：只放在客户端内存不够，进程重启、并发请求和响应丢失后仍需识别同一操作。',
        '确认未执行才可直接重试：如果服务端明确返回“本次未扣款”，可按策略重试；如果结果未知，调用方必须用同一幂等键查询或重放，不能把“没收到响应”解释为“没有执行”。',
        'checkpoint 记录已完成事实：只有在外层事务、回执或可验证状态保存后才能推进；否则恢复会跳过必要步骤。',
        '部分成功必须显式：失败后要么继续可独立完成的分支，要么补偿、标记 needs_reconciliation（需要对账）或人工接管，不能静默报成功。',
      ],
      history: [
        { when: '1970s', what: '数据库事务与恢复日志成熟', why: '系统需要在进程崩溃后重做已提交工作、撤销未提交工作，并保持一致性。' },
        { when: '1987', what: 'Saga 模式（把跨服务步骤拆成本地事务并逐项补偿）被系统化提出', why: '长事务跨多个服务时，难以使用单一数据库锁，只能把一串本地事务与补偿动作组合起来。' },
        { when: '2000s—2010s', what: '至少一次消息与幂等消费者成为分布式系统常识', why: '网络和队列会重复投递，业务必须用去重键与状态机吸收重复。' },
        { when: '2020s', what: 'Agent 工具执行把这些老问题带入模型循环', why: '模型会自主发起写操作，重试与恢复不能只依赖人工编写的固定流程。' },
      ],
    },
    capabilities: [
      { name: '故障注入', sentence: '用可控的临时错误、响应丢失和进程中断验证恢复路径。' },
      { name: '安全重试', sentence: '只对可重试错误使用有界退避，并遵守任务截止时间与预算。' },
      { name: '副作用去重', sentence: '通过幂等键和结果缓存避免重复扣款、重复写入或重复通知。' },
      { name: '断点恢复', sentence: '从持久化 checkpoint 继续未完成任务，而不是重新执行已完成副作用。' },
      { name: '补偿与对账', sentence: '撤销可逆步骤，并把结果不确定的操作标记为需要核对。' },
      { name: '预算终止', sentence: '在时间、token（模型处理文字的小单位，也是用量计量单位）、金钱或尝试次数耗尽时停止自动循环并保留现场。' },
    ],
    path: {
      intent: '执行一个“锁定库存 → 扣款 → 发送确认”的工作流，并在工具超时、响应丢失或预算耗尽时安全恢复。',
      environment: '确定性内存工具与故障注入；幂等记录、恢复点和副作用日志都在脚本中模拟，不连接库存、支付、邮件或数据库。',
      steps: [
        { title: '先画副作用与可逆性', description: '在调用工具前标注每个动作是否可重放、是否可撤销、需要什么幂等键，以及失败后如何检测。只读查询通常安全，扣款等写操作必须逐个分析。', terms: [{ name: '副作用', definition: '改变外部可见状态的动作，如扣款、修改余额或发送消息。' }, { name: '可逆性', definition: '一个动作能否用明确的补偿操作撤销；删除、发送等动作往往不可逆。' }], state: '操作清单与恢复策略已确定，尚未调用工具。' },
        { title: '保存幂等键与初始 checkpoint', description: '为每个逻辑扣款操作生成稳定 key，并在执行前持久化任务状态。key 应由业务操作决定，而不是每次网络重试重新随机生成，否则去重失效。', terms: [{ name: '幂等键', definition: '同一逻辑操作跨重试保持不变的身份，对端用它识别重复请求；本课统一使用扣款，不混入创建订单。' }, { name: '持久化', definition: '把状态写到进程重启后仍存在的位置；内存字典只能用于本课模拟。' }], state: '任务处于 running（执行中），key 与 pending（等待执行）步骤已记录。' },
        { title: '在剩余 deadline 内调用工具', description: '每次调用设置不超过任务剩余时间的超时，并记录 attempt（尝试次数）、开始时间与关联工作步骤。超时发生时，结果属于 unknown（结果未知），而不是简单的“确认未执行”。', terms: [{ name: '截止时间（Deadline）', definition: '整个任务的最迟完成时刻；局部超时必须受它约束。' }, { name: '未知结果', definition: '对端可能已扣款但响应未到达，必须先查询或用同一编号重放；它与“确认未执行，可重试”不同。' }], state: '调用处于 in_flight（调用进行中）；超时后进入 unknown。' },
        { title: '分类错误并计算退避', description: '只有明确确认未产生扣款效果的临时错误，才按指数退避加抖动重试；限流尊重服务端返回的 Retry-After（建议等待时间）。参数、权限和业务冲突进入终止或人工处理。退避延迟使用剩余 deadline 裁剪，不能无限增长。', terms: [{ name: '指数退避（exponential backoff）', definition: '每次失败后等待逐次延长但设上限，降低同步重试造成的压力。' }, { name: '抖动（jitter）', definition: '在退避时间上加入随机扰动，避免大量客户端同时重试。' }], state: '可重试错误进入 backoff（等待重试）；不可重试错误进入 blocked（已阻止）。' },
        { title: '用同一 key 重放并去重', description: '确认未执行的临时故障使用原幂等键重试；结果未知时先查询，查询不可用也可用同一幂等键重放。服务端若已扣款，返回首次回执；若尚未扣款，才继续处理。副作用日志与结果缓存证明只发生一次。', terms: [{ name: '去重存储', definition: '服务端保存 key 与处理结果的结构，是幂等语义的落地位置。' }, { name: '回执', definition: '工具执行结果及其唯一标识，可用于恢复、查询与对账。' }], state: 'attempt 增加，但扣款效果仍只有一条。' },
        { title: '保存完成步骤并在失败处恢复', description: '收到可验证回执后保存 checkpoint（恢复点），再推进下一步。崩溃恢复时读取最后完成点；未完成步骤使用相同 key 继续，已完成步骤不重复执行。', terms: [{ name: '恢复点（Checkpoint）', definition: '包含已完成步骤、输入版本和外部回执的恢复快照。' }, { name: '重做', definition: '从已提交日志重新执行未完成工作，同时依靠幂等或事务避免重复效果。' }], state: 'checkpoint 与真实外部状态一致。' },
        { title: '补偿、对账或预算终止', description: '关键步骤失败时执行可逆补偿；效果不确定则进入 needs_reconciliation（需要对账），不能直接再扣一次款。时间、token、金额或尝试次数耗尽时停止自动重试，保留 checkpoint、错误分类与已产生副作用，交给降级或人工。', terms: [{ name: '补偿', definition: '用相反业务动作抵消已完成的副作用，例如释放库存或退款；它不等于时间倒流。' }, { name: '预算终止', definition: '达到预设资源上限后主动停止，而不是继续消耗直到外部系统强制失败。' }], state: 'completed（已完成）、compensated（已补偿）、needs_reconciliation 或 budget_exhausted（预算耗尽）。' },
      ],
      stateTable: {
        columns: ['阶段 / 故障', '任务状态', '工具尝试', '幂等效果', 'Checkpoint', '下一步'],
        rows: [
          ['准备', 'pending（等待执行）', '0', '无', '操作清单与 key', '开始锁定库存'],
          ['库存锁定成功', 'running（执行中）', '1', '锁定（hold）1 条', '已锁定（reserved）+ 回执', '扣款'],
          ['确认未执行的临时错误', 'backoff（等待重试）', '1', '确认未扣款', '保留最后完成点', '等待逐次延长但设上限，再重试'],
          ['响应丢失', 'unknown（结果未知）', '1', '可能已扣款', '记录 attempt', '先查询；查询不可用则同 key 重放'],
          ['安全重试成功', 'running', '2', '仍只有 1 条扣款记录', '推进到新完成点', '发送确认'],
          ['不可重试权限错误', 'blocked（已阻止）', '1', '按工具结果而定', '保存错误分类', '修复权限或人工接管'],
          ['后续步骤失败', 'partial（部分成功）', 'N 次', '已有步骤保留', '记录未完成步骤', '补偿或对账'],
          ['预算耗尽', 'budget_exhausted（预算耗尽）', '达到上限', '不新增自动效果', '冻结现场', '降级 / 人工'],
          ['补偿完成', 'compensated（已补偿）', '补偿次数', '副作用已抵消', '已回退（rolled_back）', '结束并通知调用方'],
        ],
      },
      summary: '可靠性来自一组相互配合的约束：错误分类决定能否重试，deadline 与预算限制重试，幂等键吸收重复，checkpoint 保留进度，补偿与对账处理部分成功。',
    },
    costs: [
      { choice: '自动重试', cost: '能恢复瞬时故障，但会放大流量、延迟和重复副作用，必须设置上限与退避。', misread: '“失败后一直重试，总能成功。”' },
      { choice: '幂等键', cost: '需要持久化 key、处理并发相同请求并定义结果保留期，是业务与服务端的共同协议。', misread: '“客户端生成一个随机唯一标识（UUID）就不会重复。”' },
      { choice: 'Checkpoint', cost: '支持断点恢复，但快照与外部状态之间可能出现间隙，必须保存回执并处理恢复竞态。', misread: '“保存了本地状态，外部工具就一定也完成了。”' },
      { choice: '补偿事务', cost: '避免把长流程锁成一个巨大事务，但补偿本身会失败，且有些动作无法真正撤销。', misread: '“补偿等于撤销，一定能把世界恢复原样。”' },
      { choice: '严格预算', cost: '防止成本与等待失控，却可能在成功边缘主动停止，需要明确降级和人工出口。', misread: '“预算用完也必须继续重试，否则就是之前都浪费了。”' },
    ],
    example: {
      title: '故障注入：安全重试、响应丢失去重与预算终止',
      intent: '三段脚本都使用内存工具：第一段在明确确认未扣款后退避重试；第二段模拟“已扣款但响应丢失”，证明同 key 重放不重复扣款；第三段在预算耗尽时停止并补偿已成功的库存锁定。',
      setup: '读者在本机终端运行三段 Python 标准库脚本：输入是固定故障、扣款编号与 token 预算，输出是尝试次数、扣款效果和补偿结果。本段模拟一个电商 Agent 执行“锁定库存 → 扣款 → 发送确认”，并依次注入“确认未执行的临时故障”、扣款后响应丢失和预算耗尽。脚本用内存字典代替库存、支付与邮件服务，所有扣款编号、金额、回执和故障均为虚构；不创建订单。',
      terms: [
        { name: '重试 / attempt / backoff_ms', definition: '重试是失败后再次调用同一操作；attempt 记录次数，backoff_ms 是重试前计算的等待时间，次数必须有上限。' },
        { name: '幂等编号 key / key', definition: '幂等 key 是同一逻辑扣款操作的身份标识；重试复用 charge-42，服务端才能认出这是同一笔扣款。' },
        { name: '去重 / ledger / results', definition: '去重是按 key 只执行一次副作用；ledger 与 results 保存处理记录，让重复调用返回首次回执而非再次扣款。' },
        { name: '预算 / token_budget', definition: '预算是任务可消耗的资源上限；token_budget=1000 限定 token 总量，越过上限后不再自动重试。' },
        { name: '补偿 / release_inventory', definition: '补偿是用相反动作抵消已完成的副作用；这里释放先前锁定的库存，使扣款流程失败后不继续占用资源。' },
      ],
      diagram: {
        kind: 'flow',
        title: '一次写操作的可靠状态机',
        caption: '执行前保存 key 与 checkpoint；超时进入 unknown；同 key 重放由服务端去重；只有收到回执才推进，失败后补偿或对账。',
        items: [
          { title: '准备', detail: '持久化逻辑操作编号（ID）、幂等键、截止时间与最后完成点。', tag: 'pending', tone: 'blue' },
          { title: '执行', detail: '带剩余时间调用工具；服务端先查 key，再决定是否产生副作用。', tag: 'in_flight', tone: 'muted' },
          { title: '临时错误 / 超时', detail: '临时错误进入 backoff；超时进入 unknown，不能假定没有执行。', tag: '需要判断', tone: 'orange' },
          { title: '同 key 重放', detail: '已执行则返回缓存回执，未执行才继续；attempt 增加，效果不增加。', tag: '去重', tone: 'green' },
          { title: '推进或补偿', detail: '回执写入 checkpoint；关键失败则补偿，未知结果则对账。', tag: '恢复', tone: 'green' },
        ],
        footnote: '重试策略、幂等存储和恢复点必须一起设计；只给发起请求的程序加重试，不能保证扣款业务流程安全。',
      },
      commands: [
        {
          title: '注入临时故障并执行有界退避重试',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
attempts = 0
effects = []
results = {}

def charge_once(key, amount):
    global attempts
    attempts += 1
    if attempts == 1:
        # 服务端明确确认：本次失败发生在扣款之前，没有外部效果。
        return {"status": "temporary_error", "effect_committed": False}
    if key in results:
        return results[key]
    effects.append({"key": key, "amount": amount})
    results[key] = {"status": "committed", "receipt": "R-1"}
    return results[key]

key = "charge-42"
for attempt in range(1, 4):
    result = charge_once(key, 20)
    print(f"attempt={attempt} status={result['status']}", end="")
    if result["status"] == "committed":
        print(f" receipt={result['receipt']} duplicate=False")
        break
    delay_ms = min(1000, 100 * (2 ** (attempt - 1)))
    print(f" effect_committed={result['effect_committed']} backoff_ms={delay_ms}")
print(f"attempts={attempts} effects={len(effects)} cache_entries={len(results)}")
PY`,
          output: `attempt=1 status=temporary_error effect_committed=False backoff_ms=100
attempt=2 status=committed receipt=R-1 duplicate=False
attempts=2 effects=1 cache_entries=1`,
          expect: '第一次临时失败且确认未扣款，第二次成功；最终只有一条扣款效果。',
          note: '这里只计算并打印退避值，不真实等待。第一次错误明确确认未扣款，因此可以直接重试；这与第二段“已扣款但响应丢失”的结果未知不同。生产实现应使用带抖动的退避，并用任务截止时间裁剪延迟；参数或权限错误不应进入这个循环。',
        },
        {
          title: '模拟已执行但响应丢失，再用同一幂等键重放',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
calls = 0
ledger = {}
effects = []

def remote_charge(key):
    global calls
    calls += 1
    if key not in ledger:
        ledger[key] = "receipt-42"
        effects.append({"key": key, "amount": 20})
    if calls == 1:
        return None  # 模拟副作用已提交，但响应在网络上丢失
    return ledger[key]

key = "charge-42"
first = remote_charge(key)
print(f"first_response={first} classification={'unknown' if first is None else 'known'}")
second = remote_charge(key)
print(f"retry_key={key} response={second}")
print(f"remote_calls={calls} side_effects={len(effects)}")
PY`,
          output: `first_response=None classification=unknown
retry_key=charge-42 response=receipt-42
remote_calls=2 side_effects=1`,
          expect: '第一次结果显示“结果未知”；用同一编号重放后拿到回执，两次调用仍只有一条扣款效果。',
          note: '超时后发起方看到的是 None，但 effects 已有一条，所以不能断定未扣款。应先查询；本例模拟查询不可用，于是用同一编号 charge-42 重放。若生成新 key，remote_calls=2 时会出现两条副作用。',
        },
        {
          title: '在预算耗尽时停止，并补偿已经成功的步骤',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
token_budget = 1000
tokens_used = 0
checkpoint = "started"
effects = []

def spend(amount):
    global tokens_used
    tokens_used += amount
    return tokens_used <= token_budget

if spend(300):
    effects.append("hold_inventory")
    checkpoint = "reserved"
    print(f"reserve=success checkpoint={checkpoint} tokens={tokens_used}/{token_budget}")

within_budget = spend(900)
# 模拟服务端确认扣款未生效的临时错误；预算越界后不再自动重试。
print(f"charge=transient_error effect_committed=False tokens={tokens_used}/{token_budget} action=stop_no_retry")
if not within_budget:
    effects.append("release_inventory")
    checkpoint = "rolled_back"
    print(f"compensate={effects[-1]} checkpoint={checkpoint}")
print(f"final=compensated effects={effects} tokens={tokens_used}/{token_budget}")
PY`,
          output: `reserve=success checkpoint=reserved tokens=300/1000
charge=transient_error effect_committed=False tokens=1200/1000 action=stop_no_retry
compensate=release_inventory checkpoint=rolled_back
final=compensated effects=['hold_inventory', 'release_inventory'] tokens=1200/1000`,
          expect: '确认未扣款后仍因预算越界停止重试，并释放库存；不会继续扣款。',
          note: '临时错误确认未扣款，本来可重试，但模型 token 预算已经越过上限，因此自动循环必须停止。补偿动作仍被允许执行，因为它用于恢复一致性；真实系统应把补偿状态持久化，并为补偿失败准备对账或人工出口。',
        },
      ],
      checkpoints: ['能区分可重试错误、不可重试错误与未知结果', '明确“确认未执行，可重试”不同于“结果未知，先查询或同编号重放”', '重试次数、退避（等待逐次延长但设上限）与 deadline（截止时间）都有上限', '同一次扣款操作的重试复用同一幂等键', '响应丢失示例中两次调用只有一条副作用', 'checkpoint 只记录收到可验证回执的完成步骤', '预算耗尽会停止自动重试并触发补偿或对账'],
      safety: '示例不会调用真实支付或消息服务。接入真实写工具前，先在沙箱验证幂等键、去重保留期、并发行为和补偿接口；不可逆操作需要人工确认。',
    },
    boundaries: {
      blocks: ['暂时故障导致任务直接失败', '重试造成重复副作用', '进程崩溃后从头盲跑', '预算耗尽仍无限循环'],
      notBlocks: ['服务端未实现幂等', '补偿失败或动作不可逆', 'checkpoint 与外部状态不一致', '错误的业务重试策略', '跨系统对账缺失'],
    },
  },
  // 生产运营：把版本、容量、成本、发布、回滚、隐私与事件响应纳入 Agent 生命周期，明确生产边界而非承诺完全自治。
  {
    id: 'production-ops',
    track: 'agent',
    title: '生产运维：成本、延迟、版本与回滚',
    english: 'PRODUCTION OPS / SLO / ROLLBACK',
    summary: '生产中的 Agent（按目标调用工具、看到结果后再决定下一步的程序）是一组会变化的模型、提示、工具与检索版本，加上真实流量、预算和隐私约束。运维要把完整发布内容做成制品（artifact，可保存、可部署、可回滚的版本包），用灰度发布（canary release，先让少量真实请求试用新版本）与服务级别目标（SLO，明确成功率和延迟要达标多少）验证；退化时回滚（rollback，切回上一完整版本），而不是只看离线评估分数。',
    icon: 'agent',
    group: '治理与运维',
    dependencies: ['reliability-recovery', 'evaluation-observability', 'security-permissions', 'mcp-protocol'],
    dependents: [],
    philosophy: {
      problem: '模型行为会随版本变化，提示和工具 schema（参数与返回值的格式约定）也会变化；线上请求有不同用户、数据与尾延迟（最慢的一批请求的耗时）。团队需要安全发布、控制 token（模型处理文字的小单位，也是用量与计费计量单位）成本、保护隐私，并在质量或可靠性退化时快速回到已知版本。',
      rejects: '部署成功不等于服务可靠，评估通过不等于生产可靠。平均成本低不代表没有高成本异常，平均延迟正常也不代表第 95 百分位延迟（p95 latency，95% 请求不超过的耗时）可接受；缓存命中率（重复请求直接复用已存答案的比例）更不能以泄露跨用户数据为代价。',
      counter: '“更便宜的模型”可能因为更多重试、更长输出和更低成功率而更贵。真正需要优化的是每个成功任务的成本与尾延迟；任何版本变更都必须能回答“用什么证据发布，用什么信号回滚”。',
    },
    design: {
      abstractions: [
        { name: '发布清单', role: '把模型、系统提示、工具 schema（参数与返回值的格式约定）、检索索引、依赖版本与配置冻结成可追溯、可回滚的制品。' },
        { name: '灰度发布', role: '让少量真实请求先进入候选版本，比较质量、成本、延迟与错误后再逐步扩大。' },
        { name: '预算计量器', role: '在请求与任务两层计量输入、缓存、输出 token（模型处理文字的小单位）和费用，并在越界前停止或降级。' },
        { name: '缓存命名空间', role: '缓存命名空间是把缓存隔开的分区；租户（独立客户或团队）、权限、模型、提示、工具和检索版本共同决定边界，保证结果不会跨版本或跨权限复用。' },
        { name: '服务级别目标（SLO）与错误预算', role: 'SLO 是明确目标，例如 30 天内成功率至少 99%；错误预算（error budget）就是这段时期允许失败的额度，例如 30 天 100 万次请求最多允许 1 万次失败。' },
        { name: '降级与回滚', role: '在依赖过载、预算不足或质量退化时切换备用模型、缓存答案或确定性流程，必要时恢复上一发布版本。' },
      ],
      principles: [
        '版本化完整行为链：只记录模型名称不够，提示、工具 schema（数据格式）、检索快照和评分器变化都必须进入发布清单。',
        '先离线门禁，再小流量灰度：离线集覆盖已知能力与历史失败，灰度验证真实分布、依赖和尾延迟。',
        '按成功任务核算成本：同时统计原始 token 花费与每个成功任务成本（cost per success），避免用低单价掩盖低成功率。',
        '缓存键（用来查找缓存答案的编号）包含正确性边界：租户、权限、模型、提示、工具和检索版本缺一不可；命中只能来自相同语义与相同数据版本。',
        '用 SLO 和错误预算约束发布：成功率、p95 延迟、过载拒绝与隐私事件都要有停止条件和明确责任人。',
        '回滚必须是可执行路径：保存上一版本的制品、配置与路由开关，定期演练；数据 schema 不兼容时还要准备向前兼容或恢复方案。',
      ],
      history: [
        { when: '1990s—2000s', what: '持续集成与制品版本管理普及', why: '软件发布开始依赖可重复构建、测试和可追溯版本，而不是手工修改服务器。' },
        { when: '2000s—2010s', what: '蓝绿部署与金丝雀发布（canary release，先让少量真实请求试用）成为常用策略', why: '先让少量流量验证新版本，再扩大或回滚，降低变更影响面。' },
        { when: '2010s', what: '站点可靠性工程（Site Reliability Engineering，SRE）将 SLO 与错误预算引入运维', why: '可靠性被表达为可度量目标和发布决策，而不是追求永不失败。' },
        { when: '2020s', what: '大模型运维（LLMOps）把提示、模型与检索纳入发布生命周期', why: '模型输出会变化，让配置、评估、灰度和回滚成为生产系统的核心能力。' },
      ],
    },
    capabilities: [
      { name: '版本化发布', sentence: '把模型、提示、工具、检索和配置作为不可变版本一起管理。' },
      { name: '灰度与回滚', sentence: '按真实流量比例逐步放量，并在质量、成本或 SLO 退化时切回旧版本；本课脚本只用给定指标模拟决策。' },
      { name: '成本治理', sentence: '计算 token 费用、缓存抵扣、单任务成本与每个成功任务的成本。' },
      { name: '延迟与容量治理', sentence: '观察第 95 / 99 百分位延迟（p95 / p99 latency，95% / 99% 请求不超过的耗时）、并发槽（同时允许多少请求进入下游）、排队和限流（限制单位时间请求数量），避免平均值掩盖尾延迟。' },
      { name: '隐私与权限边界', sentence: '控制调用轨迹（trace，逐步保存的过程记录）字段、缓存键、保留期限和跨租户复用，防止运维数据成为泄露通道。' },
      { name: '降级运行', sentence: '在模型或工具不可用时切换备用路径，并明确降级后的能力损失。' },
    ],
    path: {
      intent: '把候选 Agent 版本 v2 从离线门禁推进到 5% 灰度，在成本与延迟退化时回滚到 v1。',
      environment: 'Python 标准库与虚构用量（usage）记录；价格、SLO 和版本指标都是教学数据，不访问真实模型、账单或流量路由系统。状态表描述真实生产流程；脚本中的灰度比例与并发槽只用预写值做决策，不发送请求、不路由真实流量，也不启动并发。',
      steps: [
        { title: '冻结完整发布清单', description: '为候选版本固定模型编号（ID）、系统提示摘要、工具 schema（数据格式）、检索索引、依赖与路由配置。任何一项变化都会产生新版本，不能在生产中悄悄修改“同一个版本”的行为。', terms: [{ name: '发布清单', definition: '描述一次部署全部行为输入与配置版本的不可变记录。' }, { name: '制品内容摘要（artifact digest）', definition: '提示、配置或代码内容的摘要，用于确认部署的是被评估过的同一份内容。' }], state: 'v2 制品可追溯，上一版 v1 仍可用。' },
        { title: '执行离线质量与安全门禁', description: '在固定回归集上比较 v1 与 v2，同时检查权限、隐私和工具契约。关键能力不能退步；离线通过只代表已知测试条件，不代表真实流量安全。', terms: [{ name: '回归门禁', definition: '候选版本必须达到的质量、安全与成本阈值集合；本课教学门槛为成功率至少 99%、p95 不超过 800 毫秒。' }, { name: '工具契约', definition: '工具名称、参数、返回值与错误语义的稳定约定。' }], state: '离线门禁 pass（通过），候选有资格进入灰度。' },
        { title: '按用户与请求稳定分桶灰度', description: '真实系统先把 5% 流量路由到 v2，使用稳定分桶保证同一会话不来回切换版本，并按租户、任务类型和模型版本切分指标。本课脚本只接收预先写好的 5% / 25% 指标做决策，不做真实路由。高风险写操作需要更严格权限和人工策略。', terms: [{ name: '稳定分桶', definition: '根据用户或请求编号的哈希（把文字转换成固定编号的算法）把同一对象持续映射到同一版本。' }, { name: '灰度发布', definition: '先让少量真实请求试用新版本，再依据证据扩大或撤回；这是真实生产动作，不是本课脚本的路由模拟。' }], state: '真实生产应为 95% 流量在 v1、5% 在 v2；本课只打印给定指标的决策。' },
        { title: '计量 token、成本与尾延迟', description: '输入 token 区分缓存命中与未命中，输出单独计价；按版本计算总成本、每成功任务成本、平均延迟与 p95。并发放大成本与尾延迟，平均值不能代替分布。', terms: [{ name: '每个成功任务成本（cost per success）', definition: '总花费除以成功任务数，把模型价格、重试和失败浪费放在同一指标里。' }, { name: 'p95 / p99', definition: '95% / 99% 请求不超过的延迟，用于发现少数用户的严重变慢。' }], state: '版本级 usage 与延迟分布可用于 SLO 判断。' },
        { title: '检查缓存、隐私与资源边界', description: '缓存键必须包含租户、权限、模型、提示、工具与检索版本；trace 与 usage 日志按字段白名单采集。并发槽、队列与限流保护下游，预算在请求和任务两层生效。', terms: [{ name: '缓存命名空间', definition: '决定哪些请求可以共享缓存的版本与权限边界。' }, { name: '并发槽', definition: '同时允许进入下游的请求数量，用于控制连接、线程与工具压力。' }], state: '缓存不跨租户 / 版本误用，过载被显式拒绝。' },
        { title: '依据 SLO 扩大或回滚', description: '灰度指标达到成功率、p95、成本和错误预算门槛才扩大流量。本课 SLO 示例与代码门槛统一为成功率至少 99%、p95 不超过 800 毫秒。若候选退化，先停止放量，再切回 v1 的完整制品与配置；不能只换模型而保留不兼容的新提示或工具。', terms: [{ name: '服务级别目标（SLO）', definition: '明确要守住的服务指标，例如 30 天成功率至少 99%；本课额外要求 p95 不超过 800 毫秒。' }, { name: '错误预算（error budget）', definition: '目标允许范围内的失败额度。例如 30 天 100 万次请求、成功率目标 99%，最多允许 1 万次失败；预算用尽时优先稳定。' }], state: 'expand（扩大）、hold（暂停观察）或 rollback（回滚），并保留决策证据。' },
        { title: '降级、复盘与更新回归集', description: '模型不可用时切换备用模型、缓存常见问题（FAQ）或确定性检索；能力损失要明确告知。事故结束后把失败 trace 加入回归集，修正预算、告警与发布清单，形成下一轮验证。', terms: [{ name: '降级', definition: '在依赖不足时提供能力较弱但可预测的服务，而不是继续不可控地重试。' }, { name: '复盘', definition: '重建时间线、影响与根因，并产生可执行的预防与检测改进。' }], state: '服务稳定在明确版本，经验进入测试与运维流程。' },
      ],
      stateTable: {
        columns: ['阶段', '流量版本', '质量 / 安全', '成本与延迟', '运维决策'],
        rows: [
          ['制品冻结', '无线上变更', '离线门禁待运行', '记录评估预算', '保留 v1 回滚路径'],
          ['离线通过', '0% v2', '回归集 pass', '评估成本可接受', '允许 5% 灰度'],
          ['5% 灰度', '95% v1 / 5% v2', '指标分桶观察', 'p95 与单成功成本正常', '继续观察'],
          ['25% 灰度', '75% v1 / 25% v2', '真实任务失败暴露', 'p95 越过阈值', '停止放量'],
          ['回滚', '100% v1', '候选不可达', '成本与延迟恢复', '保存事故证据'],
          ['依赖过载', '当前版本', '功能可能减少', '队列 / 并发槽受限', '限流或降级'],
          ['缓存查询', '版本不变', '同租户同版本才命中', '降低重复调用', '禁止跨权限复用'],
          ['预算不足', '当前或降级版本', '明确能力损失', '停止高成本路径', '缓存 FAQ / 人工'],
          ['复盘完成', '稳定版本', '新失败进入回归集', '调整告警与预算', '准备下一候选'],
        ],
      },
      summary: '生产运维把 Agent 当作持续变化的服务：版本化完整行为链，离线门禁后小流量灰度，用成本、尾延迟、SLO 和隐私证据决定放量、降级或回滚。',
    },
    costs: [
      { choice: '完整版本化', cost: '提示、工具和检索组合很多，版本管理与兼容测试更复杂，但回滚才有依据。', misread: '“只记录模型名称就能复现一次发布。”' },
      { choice: '灰度发布', cost: '降低影响面，却需要稳定分桶、版本化指标和足够流量，短期实验时间更长。', misread: '“灰度流量少，所以不需要监控。”' },
      { choice: '成本预算', cost: '防止账单与重试失控，但错误阈值会拒绝本可成功的复杂任务，需要产品化降级。', misread: '“模型单价最低，所以总成本一定最低。”' },
      { choice: '缓存', cost: '降低延迟与费用，但缓存键错误会导致陈旧答案或跨租户泄露，命中率不是唯一目标。', misread: '“问题文本相同就能跨用户共享答案。”' },
      { choice: '严格 SLO', cost: '提供明确发布约束，却需要可靠埋点、容量规划和错误预算治理。', misread: '“平均延迟正常就代表 SLO 达标。”' },
      { choice: '自动回滚与降级', cost: '缩短故障时间，但备用路径能力更弱，错误切换也可能把质量问题变成可用性问题。', misread: '“回滚只是把模型指针改回去。”' },
    ],
    example: {
      title: '用虚构 usage 计算成本、延迟与发布决策',
      intent: '第一段按输入、缓存输入和输出 token 计算 v1 / v2 的费用与尾延迟；第二段把给定指标交给规则，模拟离线门禁与灰度回滚决策；第三段顺序检查缓存隔离、槽位限制与隐私日志。',
      setup: '读者在本机终端运行三段 Python 标准库脚本：输入是虚构 usage 记录、给定灰度指标、缓存请求与槽位计数，输出是成本、发布决策和隔离结果。本段模拟把 Agent 候选版本 v2 从离线检查推进到 5% 灰度，再扩大到 25% 并依据给定成本与延迟指标做决策；随后验证缓存隔离和槽位规则。版本、usage 记录、价格、流量比例及隐私日志均为教学虚构，不连接真实模型或账单。第二段不发送请求、不路由真实流量；第三段顺序检查四个预写请求，不启动真实并发。',
      terms: [
        { name: '用量记录 usage', definition: 'usage 每行记录 version（版本）、input_tokens（总输入 token）、cached_input_tokens（其中已缓存的输入 token）、output_tokens（输出 token）、latency_ms（毫秒耗时）、success（是否成功）。' },
        { name: '缓存 / cache_hit', definition: '缓存保存可复用的调用结果，cache_hit 表示是否命中；这里只有租户、权限、模型、提示、工具与检索版本都相同才复用答案。' },
        { name: '尾延迟 / p95', definition: '尾延迟关注最慢的一批请求；p95 表示 95% 请求不超过的耗时，给定的 25% 灰度指标中它越界就做出回滚决策。' },
        { name: '发布门禁（gate）/ 灰度决策（canary）/ 回滚（rollback）', definition: '门禁用阈值决定能否发布；灰度按给定比例指标决定继续或停止；回滚是切回完整旧版本的决策。本课不执行真实路由。' },
        { name: '并发槽 / concurrency_slots', definition: '并发槽 concurrency_slots 限制同时进入下游的请求数；槽满后新请求被 reject（拒绝）。本课只顺序检查槽位计数。' },
        { name: '错误预算与燃烧率', definition: '错误预算是允许失败的额度；燃烧率（burn rate）＝实际消耗速度 ÷ 允许速度。例如允许 30 天消耗完 1 万次失败额度，15 天就用完时燃烧率为 2，表示消耗速度快一倍。' },
      ],
      diagram: {
        kind: 'compare',
        title: '离线通过、灰度正常与灰度失败是三个不同判断',
        caption: '候选 v2 可以在回归集上更好、更便宜，却仍可能在真实灰度中因尾延迟越界而回滚；本课脚本只把预写的 5% / 25% 指标交给规则做决策。',
        items: [
          { title: '离线门禁', detail: '固定回归集验证已知能力、安全与版本契约。', tag: '已知分布', tone: 'blue' },
          { title: '5% 给定指标', detail: '成功率、p95 与每成功任务成本都过线，规则决定继续；没有真实流量进入。', tag: '模拟继续', tone: 'green' },
          { title: '25% 给定指标', detail: 'p95 越界，即使成本仍达标也停止放量；指标是预写值，不是并发压测结果。', tag: '触发停止', tone: 'orange' },
          { title: '回滚决策到 v1', detail: '决策要求恢复模型、提示、工具与检索的完整旧版本；脚本只打印 active_version=v1。', tag: '模拟结果', tone: 'green' },
        ],
        footnote: '评估通过不等于生产可靠；灰度正常也不代表可以跳过持续 SLO、预算、隐私和回滚演练。',
      },
      commands: [
        {
          title: '从虚构 usage 记录计算成本、延迟与缓存抵扣',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import math

pricing = {"input": 2.0, "cached_input": 0.5, "output": 8.0}  # 美元 / 百万 token
# 每行都有列名，避免只靠元组位置猜字段。
usage = [
    {"version": "v1", "input_tokens": 1000, "cached_input_tokens": 200, "output_tokens": 200, "latency_ms": 700, "success": True},
    {"version": "v1", "input_tokens": 1200, "cached_input_tokens": 400, "output_tokens": 300, "latency_ms": 900, "success": True},
    {"version": "v1", "input_tokens": 900, "cached_input_tokens": 100, "output_tokens": 250, "latency_ms": 800, "success": True},
    {"version": "v1", "input_tokens": 1100, "cached_input_tokens": 300, "output_tokens": 280, "latency_ms": 1000, "success": False},
    {"version": "v2", "input_tokens": 1000, "cached_input_tokens": 800, "output_tokens": 180, "latency_ms": 500, "success": True},
    {"version": "v2", "input_tokens": 1200, "cached_input_tokens": 1000, "output_tokens": 220, "latency_ms": 600, "success": True},
    {"version": "v2", "input_tokens": 900, "cached_input_tokens": 700, "output_tokens": 230, "latency_ms": 650, "success": True},
    {"version": "v2", "input_tokens": 1100, "cached_input_tokens": 900, "output_tokens": 240, "latency_ms": 750, "success": True},
]

def summarize(version):
    rows = [row for row in usage if row["version"] == version]
    total_cost = 0.0
    input_total = cached_total = successes = 0
    latencies = []
    for row in rows:
        input_tokens = row["input_tokens"]
        cached = row["cached_input_tokens"]
        output_tokens = row["output_tokens"]
        uncached = input_tokens - cached
        total_cost += (uncached * pricing["input"] + cached * pricing["cached_input"] + output_tokens * pricing["output"]) / 1_000_000
        input_total += input_tokens
        cached_total += cached
        successes += row["success"]
        latencies.append(row["latency_ms"])
    latencies.sort()
    p95 = latencies[math.ceil(0.95 * len(latencies)) - 1]
    return rows, total_cost, input_total, cached_total, successes, p95

for version in ("v1", "v2"):
    rows, cost, input_total, cached, successes, p95 = summarize(version)
    mean_latency = sum(row["latency_ms"] for row in rows) / len(rows)
    cost_per_success = cost / successes
    print(f"{version} n={len(rows)} success={successes}/{len(rows)} ({successes / len(rows):.1%}) cost_usd={cost:.6f} mean_latency_ms={round(mean_latency)} p95={p95} cost_per_success_usd={cost_per_success:.6f} cache_hit={cached / input_total:.1%}")
PY`,
          output: `v1 n=4 success=3/4 (75.0%) cost_usd=0.015140 mean_latency_ms=850 p95=1000 cost_per_success_usd=0.005047 cache_hit=23.8%
v2 n=4 success=4/4 (100.0%) cost_usd=0.010260 mean_latency_ms=625 p95=750 cost_per_success_usd=0.002565 cache_hit=81.0%`,
          expect: 'v1、v2 各四条记录；v2 四次全成功，且每个成功任务的成本低于 v1。',
          note: '价格按每百万 token 计算，cached_input_tokens 是 input_tokens 中已命中的部分，因此未缓存输入为 input-cached。v2 同时提高成功率与缓存命中，才让每个成功任务的成本显著下降；真实账单还需包含工具、检索与基础设施费用。',
        },
        {
          title: '用给定指标模拟回归门禁、灰度决策与回滚',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
baseline = {"success": 0.75, "p95": 1000, "cost_per_success": 0.005047}
candidate = {"success": 1.00, "p95": 750, "cost_per_success": 0.002565}

def gate(metrics):
    checks = {
        "success": metrics["success"] >= 0.99,
        "p95": metrics["p95"] <= 800,
        "cost": metrics["cost_per_success"] <= 0.004,
    }
    return all(checks.values()), checks

passed, checks = gate(candidate)
print("offline_gate", "PASS" if passed else "BLOCK", checks)

# 这些是预先给定的灰度指标，不是真实路由、并发或压测产生的结果。
canary = [
    ("5%", 0.996, 780, 0.0027),
    ("25%", 0.995, 860, 0.0028),
]
active = "v1"
for share, success, p95, cost in canary:
    decision = "continue" if success >= 0.99 and p95 <= 800 and cost <= 0.004 else "rollback"
    print(f"canary_{share} success={success:.3f} p95={p95} cost_per_success_usd={cost:.4f} decision={decision}")
    if decision == "rollback":
        active = "v1"
        break
    active = "v2"
print(f"active_version={active}")
PY`,
          output: `offline_gate PASS {'success': True, 'p95': True, 'cost': True}
canary_5% success=0.996 p95=780 cost_per_success_usd=0.0027 decision=continue
canary_25% success=0.995 p95=860 cost_per_success_usd=0.0028 decision=rollback
active_version=v1`,
          expect: '离线门禁通过；5% 指标决定继续，25% 指标因慢请求超限决定回滚，最终版本决策为 v1。',
          note: '代码门槛与 SLO 示例统一为成功率至少 99%、p95 不超过 800 毫秒；v1 只作基线对照，不参加本课门禁。25% 给定指标的质量与成本仍达标，但 p95=860 越界，所以做出回滚决策；脚本没有切换真实流量。真实门禁还应包含隐私、安全、工具错误率和燃烧率（实际消耗速度 ÷ 允许速度），并为低流量指标设置置信区间或更长观察窗。',
        },
        {
          title: '顺序模拟缓存隔离、并发槽与隐私日志',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import hashlib
import json

release = {"model": "m2", "permissions": "standard", "prompt": "p7", "tools": "t3", "corpus": "r4"}
cache = {}
logs = []

def request(tenant, query):
    material = {"tenant": tenant, "query": query, **release}
    key = hashlib.sha256(json.dumps(material, sort_keys=True).encode()).hexdigest()[:12]
    hit = key in cache
    if not hit:
        cache[key] = "answer:" + query
    logs.append({"prompt_version": release["prompt"], "retrieval_version": release["corpus"], "cache_hit": hit})
    return key, "HIT" if hit else "MISS"

print("request1", request("acme", "refund"))
print("request2", request("acme", "refund"))
print("request3", request("other", "refund"))
release["corpus"] = "r3"
print("request4", request("acme", "refund"))
print(f"cache_entries={len(cache)} tenant_isolated=True version_isolated=True")

slots = 2
outcomes = []
# 顺序检查四个预写请求的槽位规则；这里没有线程、定时器或真实并发。
for _ in range(4):
    if slots > 0:
        outcomes.append("admit")
        slots -= 1
    else:
        outcomes.append("reject")
print("concurrency_slots", outcomes)
print("privacy_log", json.dumps(logs[0], sort_keys=True))
PY`,
          output: `request1 ('31c34fe63efb', 'MISS')
request2 ('31c34fe63efb', 'HIT')
request3 ('1771ab552a74', 'MISS')
request4 ('dc12bd49ccd1', 'MISS')
cache_entries=3 tenant_isolated=True version_isolated=True
concurrency_slots ['admit', 'admit', 'reject', 'reject']
privacy_log {"cache_hit": false, "prompt_version": "p7", "retrieval_version": "r4"}`,
          expect: '同一租户重复请求命中缓存，换租户或资料版本后不命中；并发槽只放行前两个请求，隐私日志不含问题和租户名。',
          note: '相同租户、问题、权限、模型、提示、工具和检索版本才命中；换租户或检索版本都会得到新缓存编号。这里只打印脱敏后的版本与命中字段，不记录原始问题、租户名或答案。四个请求被顺序检查，只演示槽位计数，不表示真实并发；真实系统还需队列、超时与限流。',
        },
      ],
      checkpoints: ['能从 usage 的列名计算未缓存输入、缓存输入、输出和总费用', '能解释每个成功任务成本（cost per success）比模型单价更贴近业务成本', '离线门禁通过后，真实生产仍需小流量灰度；本课只用给定指标做决策', 'p95 越界会触发停止放量与回滚决策', '回滚恢复完整发布清单，不只更换模型', '缓存编号隔离租户、权限与版本，trace 日志不保存原始隐私', '能区分限流、并发槽、SLO 与降级的作用'],
      safety: '示例全部使用虚构数据。生产 usage 与 trace 可能包含租户、输入和工具参数；应最小化采集、脱敏、加密、限制访问并设置保留期限。回滚与流量切换先在预发布环境演练。',
    },
    boundaries: {
      blocks: ['模型或提示静默变化', '新版本直接全量上线', '只看平均成本与平均延迟', '缓存跨租户或跨版本误用', '故障时没有明确降级路径'],
      notBlocks: ['评估集未覆盖的真实失败', '服务端工具不幂等', '隐私配置错误', '容量规划不足', '数据 schema 不兼容', '模型或供应商的突然行为变化'],
    },
  },
]
