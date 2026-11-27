import { useEffect, useMemo, useState } from 'react'
import { Icon } from './Icons'

/** 一个可点击的教学场景；资料、分数和答案都固定，避免把模拟结果误认为真实模型输出。 */
type RagScenario = {
  id: string
  label: string
  query: string
  documents: { id: string; title: string; text: string; keyword: number; vector: number; rerank: number }[]
  selected: string[]
  answer: string
}

/** 三个场景覆盖正常回答、资料不足和需要补充证据，帮助学生观察检索质量如何改变答案。 */
const scenarios: RagScenario[] = [
  {
    id: 'refund',
    label: '退款到账',
    query: '退款审核已经通过，钱什么时候到账？',
    documents: [
      { id: 'D1', title: '退款规则', text: '退款审核通过后沿原支付路径退回，通常需要 1—3 个工作日。', keyword: 0.76, vector: 0.91, rerank: 0.96 },
      { id: 'D2', title: '退款进度', text: '可在订单详情中查看退款进度；超过 3 个工作日可联系人工客服。', keyword: 0.71, vector: 0.83, rerank: 0.89 },
      { id: 'D3', title: '支付失败排查', text: '银行卡已扣款但订单未支付时，先核对支付流水与订单状态。', keyword: 0.48, vector: 0.58, rerank: 0.42 },
      { id: 'D4', title: '发票抬头', text: '发票抬头可在支付前修改，支付后需要提交客服申请。', keyword: 0.12, vector: 0.21, rerank: 0.08 },
      { id: 'D5', title: '账号安全', text: '修改绑定手机号需要完成身份验证。', keyword: 0.05, vector: 0.11, rerank: 0.03 },
    ],
    selected: ['D1', 'D2'],
    answer: '审核通过后，退款通常沿原支付路径在 1—3 个工作日内到账。[1] 如果超过 3 个工作日，可在订单详情查看进度并联系人工客服。[2]',
  },
  {
    id: 'invoice',
    label: '发票抬头',
    query: '支付完成后还能修改发票抬头吗？',
    documents: [
      { id: 'D1', title: '退款规则', text: '退款审核通过后沿原支付路径退回，通常需要 1—3 个工作日。', keyword: 0.08, vector: 0.14, rerank: 0.02 },
      { id: 'D2', title: '发票管理', text: '支付前可直接修改发票抬头；支付后需提交客服申请，审核通过后重新开具。', keyword: 0.93, vector: 0.94, rerank: 0.98 },
      { id: 'D3', title: '退款进度', text: '可在订单详情中查看退款进度；超过 3 个工作日可联系人工客服。', keyword: 0.16, vector: 0.24, rerank: 0.06 },
      { id: 'D4', title: '企业认证', text: '企业用户认证后可设置默认发票抬头。', keyword: 0.52, vector: 0.61, rerank: 0.37 },
      { id: 'D5', title: '账号安全', text: '修改绑定手机号需要完成身份验证。', keyword: 0.04, vector: 0.09, rerank: 0.01 },
    ],
    selected: ['D2'],
    answer: '支付前可以直接修改发票抬头；支付后需要提交客服申请，审核通过后重新开具。[1]',
  },
  {
    id: 'unknown',
    label: '资料不足',
    query: '企业版支持私有化部署的最低设备配置是什么？',
    documents: [
      { id: 'D1', title: '退款规则', text: '退款审核通过后沿原支付路径退回，通常需要 1—3 个工作日。', keyword: 0.06, vector: 0.12, rerank: 0.01 },
      { id: 'D2', title: '发票管理', text: '支付前可直接修改发票抬头；支付后需提交客服申请，审核通过后重新开具。', keyword: 0.03, vector: 0.08, rerank: 0.01 },
      { id: 'D3', title: '企业版介绍', text: '企业版提供权限管理和专属支持，可在销售咨询页面提交需求。', keyword: 0.57, vector: 0.66, rerank: 0.39 },
      { id: 'D4', title: '账号安全', text: '修改绑定手机号需要完成身份验证。', keyword: 0.02, vector: 0.07, rerank: 0.00 },
      { id: 'D5', title: '公开路线图', text: '未来版本计划增强审计能力，具体时间以正式公告为准。', keyword: 0.18, vector: 0.27, rerank: 0.04 },
    ],
    selected: [],
    answer: '现有资料没有说明私有化部署的最低设备配置，因此不能给出确定答案。建议提交企业版销售咨询，并保留“资料不足”的状态，而不是猜测配置。',
  },
]

/** 六步流程与页面同步；步骤只改变展示重点，不伪装成真实网络请求。 */
const steps = [
  { id: 'query', label: '提出问题', title: '先把问题原样保留', text: '系统先记录用户问题，不急着让模型回答。后续检索、上下文和答案都围绕这个问题展开。' },
  { id: 'chunk', label: '准备资料', title: '长文档被切成可检索片段', text: '每个片段保留标题、来源和版本。片段太小会丢上下文，太大则会把无关内容一起交给模型。' },
  { id: 'retrieve', label: '初步检索', title: '关键词与向量各自找出候选', text: '关键词擅长精确词，向量擅长意思相近的表达。候选阶段追求找得全，不要求每个候选都正确。' },
  { id: 'rerank', label: '重新排序', title: '只留下最能回答问题的片段', text: '重排逐条比较问题与候选内容。分数不是事实概率，只是教学场景中的相对排序信号。' },
  { id: 'context', label: '装配上下文', title: '资料进入模型本轮可见范围', text: '系统去重、截断并保留来源编号。没有进入上下文的资料，不会成为本次回答的依据。' },
  { id: 'answer', label: '生成与核对', title: '结论必须能回到具体片段', text: '资料充分时给出带引用的答案；资料不足时明确拒绝猜测。引用存在也不代表资料本身一定正确。' },
] as const

/**
 * RAG 代表路径实验室。
 * 通过固定场景展示“问题 → 片段 → 候选 → 重排 → 上下文 → 回答”的完整数据变化，
 * 所有分数均为教学用确定性数据，不连接真实模型、向量库或外部文档服务。
 */
export function RagPipelineLab() {
  const [scenarioId, setScenarioId] = useState(scenarios[0].id)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0]

  const candidates = useMemo(() => scenario.documents
    .map((document) => ({ ...document, score: Number(((document.keyword + document.vector) / 2).toFixed(2)) }))
    .sort((a, b) => b.score - a.score), [scenario])

  const reranked = useMemo(() => [...candidates].sort((a, b) => b.rerank - a.rerank), [candidates])

  useEffect(() => {
    setStep(0)
    setPlaying(false)
  }, [scenarioId])

  useEffect(() => {
    if (!playing) return
    if (step >= steps.length - 1) {
      setPlaying(false)
      return
    }
    const timer = setTimeout(() => setStep((value) => value + 1), 1600)
    return () => clearTimeout(timer)
  }, [playing, step])

  const current = steps[step]

  return (
    <div className="rag-lab">
      <div className="rag-lab-toolbar">
        <div><span className="eyebrow">教学模拟 · 确定性轨迹</span><strong>观察资料怎样变成有依据的回答</strong></div>
        <div className="rag-scenario-tabs" role="tablist" aria-label="RAG 示例场景">
          {scenarios.map((item) => <button key={item.id} role="tab" aria-selected={scenarioId === item.id} className={scenarioId === item.id ? 'is-active' : ''} onClick={() => setScenarioId(item.id)}>{item.label}</button>)}
        </div>
      </div>

      <div className="rag-query-card"><span><Icon name="target" size={18} /></span><div><small>用户问题</small><strong>{scenario.query}</strong></div></div>

      <div className="rag-stepper" aria-label="RAG 处理步骤">
        {steps.map((item, index) => <button key={item.id} className={`${index === step ? 'is-active' : ''}${index < step ? ' is-past' : ''}`} onClick={() => { setStep(index); setPlaying(false) }} aria-current={index === step ? 'step' : undefined}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.label}</strong></button>)}
      </div>

      <div className="rag-stage" key={`${scenarioId}-${current.id}`} aria-live="polite">
        <div className="rag-stage-copy"><span className="eyebrow">第 {step + 1} 步 · {current.label}</span><h3>{current.title}</h3><p>{current.text}</p></div>

        {step === 0 && <div className="rag-query-flow"><div><small>输入</small><strong>用户问题</strong></div><Icon name="arrow" size={20} /><div><small>保持原样</small><strong>不提前猜答案</strong></div><Icon name="arrow" size={20} /><div><small>输出</small><strong>检索任务</strong></div></div>}

        {step === 1 && <div className="rag-document-stack">{scenario.documents.slice(0, 3).map((document, index) => <article key={document.id}><span>{document.id}</span><div><strong>{document.title}</strong><p>{document.text}</p><small>来源：帮助中心 / {document.title} · 版本 2026-11</small></div><b>片段 {index + 1}</b></article>)}</div>}

        {step === 2 && <div className="rag-candidate-list">{candidates.map((document, index) => <div key={document.id} className={index < 3 ? 'is-candidate' : ''}><span>{index + 1}</span><div><strong>{document.title}</strong><p>{document.text}</p></div><div className="rag-score"><small>关键词 {document.keyword.toFixed(2)} · 向量 {document.vector.toFixed(2)}</small><i><b style={{ width: `${document.score * 100}%` }} /></i></div><code>{document.score.toFixed(2)}</code></div>)}</div>}

        {step === 3 && <div className={`rag-rerank-result${scenario.selected.length ? '' : ' is-insufficient'}`}><div className="rag-rerank-head"><Icon name={scenario.selected.length ? 'check' : 'shield'} size={20} /><strong>{scenario.selected.length ? '重排后保留的内容' : '没有足够相关的资料'}</strong><small>{scenario.selected.length ? `保留 ${scenario.selected.length} 条，其余候选不进入上下文` : '最高分仍低于教学阈值 0.60'}</small></div>{scenario.selected.length ? reranked.filter((document) => scenario.selected.includes(document.id)).map((document, index) => <article key={document.id}><span>[{index + 1}]</span><div><strong>{document.title}</strong><p>{document.text}</p></div><code>{document.rerank.toFixed(2)}</code></article>) : <p>系统进入“资料不足”分支，要求答案说明限制或转人工，而不是用模型记忆补齐。</p>}</div>}

        {step === 4 && <div className="rag-context-window"><div className="rag-context-head"><span>模型本轮可见上下文</span><small>{scenario.selected.length ? `${scenario.selected.length} 条资料 · 去重后装配` : '0 条可靠资料 · 触发拒答规则'}</small></div><pre>{scenario.selected.length ? scenario.selected.map((id, index) => `[${index + 1}] ${scenario.documents.find((document) => document.id === id)?.text}`).join('\n\n') : '规则：资料不足时不得猜测；说明缺失信息并建议下一步。'}</pre><div className="rag-context-budget"><span><i style={{ width: scenario.selected.length ? '42%' : '8%' }} /></span><small>已用 {scenario.selected.length ? 42 : 8}% · 其余空间留给规则、问题与输出</small></div></div>}

        {step === 5 && <div className="rag-answer-card"><div className="rag-answer-label"><Icon name="brain" size={19} /><strong>{scenario.selected.length ? '带依据的回答' : '明确说明资料不足'}</strong><span>{scenario.selected.length ? '可核对' : '不猜测'}</span></div><p>{scenario.answer}</p><div className="rag-citations">{scenario.selected.length ? scenario.selected.map((id, index) => <span key={id}>[{index + 1}] {scenario.documents.find((document) => document.id === id)?.title}</span>) : <span>缺失信息：最低设备配置</span>}</div></div>}
      </div>

      <div className="rag-lab-footer">
        <button className="rag-play" onClick={() => { if (step === steps.length - 1) setStep(0); setPlaying((value) => !value) }}><Icon name={playing ? 'close' : 'play'} size={15} />{playing ? '暂停播放' : step === steps.length - 1 ? '重新播放' : '自动播放'}</button>
        <p><Icon name="spark" size={14} />分数只用于演示相对排序；真实系统还要检查权限、版本、引用和答案是否被资料支持。</p>
        <div><button disabled={step === 0} onClick={() => { setStep((value) => value - 1); setPlaying(false) }}><Icon name="arrow" size={13} className="rotate-180" />上一步</button><button disabled={step === steps.length - 1} onClick={() => { setStep((value) => value + 1); setPlaying(false) }}>下一步<Icon name="arrow" size={13} /></button></div>
      </div>
    </div>
  )
}
