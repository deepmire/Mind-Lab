/**
 * Agent 运行时轨迹实验：并排演示只读检索与高风险写入两条循环。
 * 模型消息、宿主决策、审批和审计都是预置教学数据；组件不调用模型或工具，只播放状态与消息轨迹。
 */
import { useEffect, useState } from 'react'
import { Icon } from './Icons'

/** lookup 展示正常观察回流；write 展示策略暂停与拒绝，两者的终态语义故意不同。 */
type ScenarioId = 'lookup' | 'write'
type TraceMessage = { role: 'system' | 'user' | 'assistant' | 'tool'; text: string }
/**
 * 单步轨迹契约：state 是宿主状态，decision/evidence 解释控制与审计，messages 只列本步新增消息。
 * 空 messages 是合法边界状态（例如等待审批或仅更新审计），不代表运行时没有上下文。
 */
type LoopStep = {
  title: string
  state: string
  description: string
  decision: string
  evidence: string
  messages: TraceMessage[]
}

type ScenarioBriefing = {
  setting: string
  tools: { name: string; meaning: string }[]
}

const scenarioBriefings: Record<ScenarioId, ScenarioBriefing> = {
  lookup: {
    setting: '假设公司有一个内部文档库，用户想查询“如何回滚 Agent 版本”。开发者给 Agent 配了一个叫 search_docs 的工具；这个名字是我们为示例起的，作用是搜索文档，不能修改任何内容。后面出现的 D-17、D-23 是文档编号，只用于说明答案来自哪里。',
    tools: [{ name: 'search_docs', meaning: '按关键词搜索内部文档，只读；最多返回几条结果由参数 top_k 决定。' }],
  },
  write: {
    setting: '沿用同一个文档库，但用户这次要求把排障步骤写入公司的工单系统。create_ticket 同样是我们为示例起的工具名，意思是“创建工单”；它会改变外部系统，所以必须先获得人工批准。例子里的 production 表示真实业务使用的生产环境，不是练习环境。',
    tools: [
      { name: 'search_docs', meaning: '搜索内部文档，只读。' },
      { name: 'create_ticket', meaning: '在工单系统中创建记录，属于写操作；本场景要求人工批准。' },
    ],
  },
}

const stateLabels: Record<string, string> = {
  'run.created': '任务已创建',
  'context.ready': '上下文已准备好',
  'action.proposed': '模型已提出动作',
  'tool.running → succeeded': '工具检查通过并执行成功',
  'observation.appended': '工具结果已加入上下文',
  'run.succeeded': '任务成功结束',
  'waiting_approval': '等待人工批准',
  'action.rejected → run.failed': '动作被拒绝，任务失败',
  'audit.complete': '审计记录已完成',
  'run.closed': '任务已关闭',
}

const roleLabels: Record<TraceMessage['role'], string> = {
  system: '系统规则',
  user: '用户',
  assistant: '模型',
  tool: '工具返回',
}

/**
 * 两条场景轨迹的唯一内容源；每个 LoopStep 都同时提供状态、决策、证据与本轮新增消息。
 * messages 表示“新增到轨迹的内容”，展示时按步骤展开累积，避免把每条消息误认为完整上下文快照。
 */
const scenarios: Record<ScenarioId, { label: string; intent: string; steps: LoopStep[] }> = {
  // 只读检索场景：重点展示提案、宿主校验、工具观察和带引用完成，不产生外部写入。
  lookup: {
    label: '只读检索',
    intent: '根据内部文档回答“如何回滚 Agent 版本”，并给出引用。',
    steps: [
      {
        title: '目标进入运行时',
        state: 'run.created',
        description: '宿主创建 run，也就是本次任务的一份运行记录，写入目标、允许动作、最大步数和完成条件。模型此时还没有行动。',
        decision: '开放 search_docs（搜索内部文档，只读）；禁止修改数据；最多循环 4 轮。',
        evidence: 'run_id=run_01 · status=created · budget.steps=4',
        messages: [
          { role: 'system', text: '你是排障助手。只依据检索证据回答；无法确认时说明未知。' },
          { role: 'user', text: '如何回滚 Agent 版本？请给出来源。' },
        ],
      },
      {
        title: '装配本轮上下文',
        state: 'context.ready',
        description: '宿主把系统规则、用户目标、工具 schema 与已有历史拼成请求。schema 是“这个工具叫什么、需要填什么”的说明；上下文不是模型的永久记忆。',
        decision: '注入 1 个只读工具；当前窗口占用 286 / 4096 token。token 可以理解为模型处理文字的小单位，这里只是教学计数。',
        evidence: 'context.messages=2 · tools=1 · truncated=false',
        messages: [
          { role: 'system', text: '只依据检索证据回答；每个结论附来源。' },
          { role: 'user', text: '如何回滚 Agent 版本？请给出来源。' },
        ],
      },
      {
        title: '模型选择下一步',
        state: 'action.proposed',
        description: '模型根据上下文输出结构化动作，也就是按固定格式写出一条建议，这种格式常见叫法叫 JSON。此时它没有搜索文档，也没有直接访问数据库。',
        decision: '模型建议调用 search_docs：搜索“Agent 版本回滚”，最多取 2 条结果。注意：此时只是建议，还没有真正搜索。',
        evidence: 'finish_reason=tool_calls · proposed_actions=1',
        messages: [
          { role: 'assistant', text: '{"tool":"search_docs","arguments":{"query":"Agent 版本回滚","top_k":2}}' },
        ],
      },
      {
        title: '宿主校验并执行',
        state: 'tool.running → succeeded',
        description: '宿主解析 JSON、校验参数与权限，再调用检索器，也就是负责搜索文档的程序。工具返回的证据成为新的观察。',
        decision: '宿主确认这是允许的只读搜索，才调用 search_docs；2 秒内没有返回就按超时处理。',
        evidence: 'span=tool.search_docs · latency_ms=41 · results=2',
        messages: [
          { role: 'tool', text: '[D-17] 回滚需同时固定 model、prompt、tools、retriever 版本；先灰度，再观察质量与成本。' },
          { role: 'tool', text: '[D-23] 回滚后保留旧 run 轨迹，用于对比失败样本。' },
        ],
      },
      {
        title: '观察进入下一轮',
        state: 'observation.appended',
        description: '工具结果以 tool 消息追加到上下文，模型重新读取全部可见信息。它可能继续调用工具，也可能给出最终答案。',
        decision: '证据覆盖回滚对象与验证方法，可以结束循环。',
        evidence: 'context.messages=5 · next_action=final_answer',
        messages: [],
      },
      {
        title: '完成并保存轨迹',
        state: 'run.succeeded',
        description: '模型给出带引用的答案；宿主验证完成条件，把消息、工具跨度、用量与版本写入 trace，也就是完整过程记录。',
        decision: '模型给出最终回答，并引用 D-17、D-23 两份文档。',
        evidence: 'status=succeeded · steps=4 · citations=2 · trace_id=tr_01',
        messages: [
          { role: 'assistant', text: '固定 model、prompt、tools、retriever 版本后回滚 [D-17]；保留旧轨迹对比质量与成本 [D-23]。' },
        ],
      },
    ],
  },
  // 高风险写入场景：步骤更少但状态不同，审批拒绝必须在执行前发生，并用 proposed/executed 分离审计事实。
  write: {
    label: '高风险写入',
    intent: '把检索到的排障步骤直接写入生产工单系统。',
    steps: [
      {
        title: '目标进入运行时',
        state: 'run.created',
        description: '同样是 Agent 循环，但动作会改变外部系统，因此运行时必须额外保存审批策略与操作人。',
        decision: '允许 search_docs 搜索文档；create_ticket 会创建工单，必须人工批准后才能执行。',
        evidence: 'run_id=run_02 · approval_policy=required',
        messages: [
          { role: 'system', text: '可以检索文档；写工单前必须请求批准。' },
          { role: 'user', text: '把排障步骤写入生产工单。' },
        ],
      },
      {
        title: '模型提出写操作',
        state: 'action.proposed',
        description: '模型输出 create_ticket 调用意图。参数完整不代表动作已被授权。',
        decision: '模型建议调用 create_ticket，在 production 队列创建工单。参数完整也不代表已经获得权限。',
        evidence: 'risk=high · target=production',
        messages: [
          { role: 'assistant', text: '{"tool":"create_ticket","arguments":{"queue":"production"}}' },
        ],
      },
      {
        title: '策略拦截并暂停',
        state: 'waiting_approval',
        description: '宿主在真正执行前检查权限。高风险动作不会因为模型说“继续”就自动通过。',
        decision: '宿主发现这是外部写操作，暂停执行并请求人工批准；模型说“继续”也不能绕过。',
        evidence: 'approval_id=apr_02 · executed=false',
        messages: [],
      },
      {
        title: '拒绝后回到受控状态',
        state: 'action.rejected → run.failed',
        description: '审批被拒绝，宿主记录原因并终止本次 run；不能悄悄换工具或绕过审批。',
        decision: '审批人拒绝后，宿主记录原因并结束任务；不会换一个工具偷偷执行。',
        evidence: 'status=failed · side_effects=0 · audit=saved',
        messages: [],
      },
      {
        title: '拒绝与执行是两种事实',
        state: 'audit.complete',
        description: 'trace 同时记录“模型提出过什么”和“系统实际做了什么”。只看模型消息会误判生产状态。',
        decision: '记录两件不同的事：模型提出过写工单；系统没有执行这次写入。',
        evidence: 'audit.proposed_action=create_ticket · audit.side_effect=none',
        messages: [
          { role: 'assistant', text: '操作未执行。已保留提议、审批与拒绝原因。' },
        ],
      },
      {
        title: '从边界回到设计',
        state: 'run.closed',
        description: '可靠 Agent 的标志不是总能完成任务，而是不能在权限外完成任务。',
        decision: '任务因策略拒绝而结束；若以后要恢复，必须重新获得批准。',
        evidence: 'closed=true · resume_requires_new_approval',
        messages: [],
      },
    ],
  },
}

/**
 * 播放 Agent 场景轨迹的无外部数据输入组件。
 * 内部维护场景、步骤与播放状态，输出消息累积流、策略提示和状态条。
 */
export function AgentLoopLab() {
  const [scenario, setScenario] = useState<ScenarioId>('lookup')
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const data = scenarios[scenario]
  const briefing = scenarioBriefings[scenario]
  const current = data.steps[step]

  // 切换场景会改变轨迹长度与终态，因此回到首步并停播，避免旧 step 索引或 timer 污染新场景。
  useEffect(() => {
    setStep(0)
    setPlaying(false)
  }, [scenario])

  // 以当前场景的最后一步为硬边界；清理函数防止快速切场景时旧 timer 继续推进。
  useEffect(() => {
    if (!playing) return
    if (step >= data.steps.length - 1) {
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(() => setStep((value) => value + 1), 4500)
    return () => window.clearTimeout(timer)
  }, [playing, step, data.steps.length])

  // 索引夹取依赖当前场景步数，避免两条长度不同的轨迹共用越界索引。
  const jump = (next: number) => {
    setPlaying(false)
    setStep(Math.max(0, Math.min(data.steps.length - 1, next)))
  }

  return (
    <div className="agent-loop-lab">
      <div className="agent-lab-head">
        <div><span className="eyebrow">可播放的任务记录</span><h3>让循环跑一次，观察谁真正改变了世界</h3><p>切换只读检索与高风险写入，对照“模型提出动作”和“宿主实际执行”的区别。</p></div>
        <div className="scenario-switch" role="tablist" aria-label="Agent 场景">
          {(Object.keys(scenarios) as ScenarioId[]).map((id) => <button key={id} role="tab" aria-selected={scenario === id} className={scenario === id ? 'is-active' : ''} onClick={() => setScenario(id)}>{scenarios[id].label}</button>)}
        </div>
      </div>
      <div className="agent-scenario-briefing">
        <div className="agent-scenario-briefing-head"><span><Icon name="play" size={16} /></span><div><strong>先认识本例中的名字</strong><small>不是内置功能，也不需要先背下来</small></div></div>
        <p>{briefing.setting}</p>
        <div className="agent-scenario-tools">{briefing.tools.map((tool) => <div key={tool.name}><code>{tool.name}</code><span>{tool.meaning}</span></div>)}</div>
      </div>
      <div className="agent-run-intent"><span>用户目标</span><p>{data.intent}</p></div>
      <div className="agent-transport">
        <button className="icon-button" onClick={() => jump(0)} aria-label="重置 Agent 循环"><Icon name="reset" size={16} /></button>
        <button className="play-button" onClick={() => { if (!playing && step === data.steps.length - 1) setStep(0); setPlaying((value) => !value) }}><Icon name={playing ? 'pause' : 'play'} size={15} />{playing ? '暂停' : step === data.steps.length - 1 ? '重新播放' : '播放循环'}</button>
        <span>STEP {String(step + 1).padStart(2, '0')} / {String(data.steps.length).padStart(2, '0')}</span>
      </div>
      <div className="agent-step-tabs">{data.steps.map((item, index) => <button key={item.title} className={index === step ? 'is-current' : index < step ? 'is-past' : ''} onClick={() => jump(index)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.title}</strong></button>)}</div>
      {/* 场景与步骤共同组成 key，确保切换时重挂载面板并清除上一轨迹的瞬时视觉状态。 */}
      <div className="agent-step-panel" key={`${scenario}-${step}`}>
        <div className="agent-step-copy">
          <span className="agent-state-pill"><strong>{stateLabels[current.state] ?? current.state}</strong><small>{current.state}</small></span>
          <h4>{current.title}</h4><p>{current.description}</p>
          <div className="agent-decision"><Icon name="target" size={16} /><span><strong>本轮决策</strong>{current.decision}</span></div>
          <details className="agent-evidence"><summary>查看系统记录 <small>字段名了解即可，先看中文发生了什么事</small></summary><code>{current.evidence}</code></details>
        </div>
        <div className="agent-message-stream">
          <div className="message-stream-title"><span>本轮可见信息</span><small>系统规则、用户问题、模型回复与工具返回</small></div>
          {/* 只展开到当前步骤，制造运行时逐步接收消息的效果；键含步骤序号，防止跨场景复用错误节点。 */}
          {data.steps.slice(0, step + 1).flatMap((item, stepIndex) => item.messages.map((message, index) => <div className={`agent-message role-${message.role}`} key={`${stepIndex}-${message.role}-${index}`}><span>{roleLabels[message.role]}<small>{message.role}</small></span><p>{message.text}</p></div>))}
          {/* 审批暂停步骤额外强调“尚未执行”，因为空消息流本身不足以让读者判断是否已发生写入。 */}
          {scenario === 'write' && step === 2 && <div className="agent-policy-note"><Icon name="lock" size={15} />工具尚未执行；提案不等于副作用。</div>}
        </div>
      </div>
      <div className="agent-state-strip">{data.steps.map((item, index) => <button key={item.state} className={index === step ? 'is-current' : ''} onClick={() => jump(index)} title={item.state}><i /><span>{stateLabels[item.state] ?? item.state}</span></button>)}</div>
    </div>
  )
}
