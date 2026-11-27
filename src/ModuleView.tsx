/**
 * 通用深潜模块渲染器。
 * 所有技术轨道都通过同一 KnowledgeModule 契约进入七节页面，只有少数依赖内部状态的机制使用专用实验室。
 */
import { useEffect, useState } from 'react'
import { AgentPrimer } from './AgentPrimer'
import { AgentLoopLab } from './AgentLoopLab'
import { CgroupLab } from './CgroupLab'
import { ContextBudgetLab } from './ContextBudgetLab'
import { ImageLayerAnatomy } from './ImageLayerAnatomy'
import { KubernetesReconcileLab } from './KubernetesReconcileLab'
import { LinuxRuntimeLab } from './LinuxRuntimeLab'
import { moduleMap, topicMap } from './knowledge'
import type { KnowledgeModule, ModuleId, TrackId } from './knowledgeTypes'
import { Icon } from './Icons'
import { LearningPathNavigator } from './LearningPath'
import { MechanismDiagram } from './MechanismDiagram'
import { NetworkPacketLab } from './NetworkPacketLab'
import { RagPipelineLab } from './RagPipelineLab'
import { SectionHeading } from './SectionHeading'
import { LinuxPrimer, NetworkPrimer, RagPrimer } from './TopicPrimer'

/**
 * 代表路径播放器。
 * step 是唯一播放进度来源；timeline、当前说明和状态表高亮都从同一个索引派生。
 */
function ModulePlayer({ module }: { module: KnowledgeModule }) {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const current = module.path.steps[step]

  // 切换模块时重置播放器，防止上一个模块的 step 越界或自动播放状态泄漏。
  useEffect(() => {
    setStep(0)
    setPlaying(false)
  }, [module.id])

  // 每步停留 5 秒，给零基础读者留出阅读说明和术语卡的时间；到末尾立即停止。
  useEffect(() => {
    if (!playing) return
    if (step >= module.path.steps.length - 1) {
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(() => setStep((value) => value + 1), 5000)
    return () => window.clearTimeout(timer)
  }, [playing, step, module.path.steps.length])

  const jump = (next: number) => {
    setPlaying(false)
    setStep(Math.max(0, Math.min(module.path.steps.length - 1, next)))
  }

  return (
    <div className="module-player">
      <div className="module-player-top"><div><span className="live-dot" /><strong>机制播放器</strong><small>{module.path.environment}</small></div><div className="transport"><button className="icon-button" onClick={() => jump(0)} aria-label="重置模块路径"><Icon name="reset" size={16} /></button><button className="play-button" onClick={() => { if (!playing && step === module.path.steps.length - 1) setStep(0); setPlaying((value) => !value) }}><Icon name={playing ? 'pause' : 'play'} size={15} />{playing ? '暂停' : step === module.path.steps.length - 1 ? '重新播放' : '播放机制'}</button></div></div>
      <div className="module-timeline">{module.path.steps.map((item, index) => <button key={item.title} className={index === step ? 'is-current' : index < step ? 'is-past' : ''} onClick={() => jump(index)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.title}</strong></button>)}</div>
      <div className="module-step" key={step}>
        <div className="module-step-number">{String(step + 1).padStart(2, '0')}</div>
        <div className="module-step-copy"><span className="eyebrow">当前发生了什么</span><h3>{current.title}</h3><p>{current.description}</p><div className="change-line"><Icon name="arrow" size={15} />{current.state}</div></div>
        <div className="term-stack">{current.terms.map((term) => <div className="term-card" key={term.name}><strong>{term.name}</strong><p>{term.definition}</p></div>)}</div>
      </div>
      <div className="module-state-table">
        <div className="state-table-title"><Icon name="layers" size={17} /><strong>完整状态表</strong><span>先看高亮行，再用列名核对每一步的变化；不需要一次记住所有字段</span></div>
        <div className="table-scroll"><table className="state-table"><thead><tr>{module.path.stateTable.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{module.path.stateTable.rows.map((row, index) => <tr key={`${row[0]}-${index}`} className={index === step ? 'is-current' : ''}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>
      </div>
    </div>
  )
}

/** 命令复制按钮；复制失败时回退到 execCommand，兼容非安全上下文。 */
function CopyCommandButton({ command }: { command: string }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopyState('copied')
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = command
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const copied = document.execCommand('copy')
      textarea.remove()
      setCopyState(copied ? 'copied' : 'failed')
    }
    window.setTimeout(() => setCopyState('idle'), 1600)
  }
  return <button type="button" onClick={copy}><Icon name={copyState === 'copied' ? 'check' : 'code'} size={14} />{copyState === 'copied' ? '已复制' : copyState === 'failed' ? '复制失败' : '复制命令'}</button>
}

/** 从输出中提取短摘要，让读者先知道成功迹象，完整日志仍按需展开。 */
function summarizeOutput(output: string) {
  const lines = output.split('\n').map((line) => line.trim()).filter(Boolean)
  if (!lines.length) return '命令正常结束；展开完整输出可核对详细状态。'
  return lines.slice(0, 3).join(' / ')
}

/** 示例开场先交代场景、角色与自定义名字，避免读者在第一个命令里才遇到陌生标识符。 */
function ExampleBriefing({ example }: { example: KnowledgeModule['example'] }) {
  if (!example.setup && !example.terms?.length) return null
  return (
    <div className="example-briefing">
      <div className="example-briefing-title"><span><Icon name="play" size={17} /></span><div><strong>开始前，先认识这个场景</strong><small>遇到陌生名字不用先背，先看它在本例中代表什么</small></div></div>
      {example.setup && <p>{example.setup}</p>}
      {!!example.terms?.length && <dl>{example.terms.map((term) => <div key={term.name}><dt>{term.name}</dt><dd>{term.definition}</dd></div>)}</dl>}
    </div>
  )
}

/**
 * 渐进式示例：一次只呈现一个操作步骤。
 * 目标、原因和成功迹象始终可见，命令与完整输出默认折叠，避免零基础读者先被代码墙挡住。
 */
function GuidedExample({ example, checkpointId }: { example: KnowledgeModule['example']; checkpointId: string }) {
  const [activeStep, setActiveStep] = useState(0)
  const [completed, setCompleted] = useState<Set<number>>(() => new Set())
  if (!example.commands.length) return null

  const current = example.commands[activeStep]
  const isLast = activeStep === example.commands.length - 1
  const goToStep = (index: number) => setActiveStep(Math.max(0, Math.min(example.commands.length - 1, index)))
  const completeAndContinue = () => {
    setCompleted((previous) => new Set(previous).add(activeStep))
    if (isLast) {
      document.getElementById(checkpointId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    goToStep(activeStep + 1)
  }

  return (
    <div className="guided-example" aria-label="分步操作示例">
      <div className="guided-example-head">
        <div><span className="eyebrow">分步示例</span><strong>不用先读懂代码，也能一步步完成</strong></div>
        <span className={completed.size === example.commands.length ? 'is-complete' : ''}>{completed.size} / {example.commands.length} 步已完成</span>
      </div>
      <div className="guided-howto"><span><b>1</b>先看本步目标</span><Icon name="arrow" size={13} /><span><b>2</b>需要实操时展开命令</span><Icon name="arrow" size={13} /><span><b>3</b>对照结果再继续</span></div>
      <details className="guided-code-help"><summary><Icon name="spark" size={14} />完全不会用终端？先看运行说明</summary><ol><li><strong>先不用读代码。</strong>代码是写给电脑执行的固定步骤，本页先靠场景、机制图和中文输出帮助你理解。</li><li><strong>在示例指定的环境里打开终端。</strong>终端是输入命令、显示结果的窗口；复制整段命令时不要输入开头的 <code>$</code>。</li><li><strong>一次只运行当前步骤。</strong>先看“怎样算成功”，再展开命令和完整输出；缺少 Python 等工具时，先按示例说明准备环境，不要运行来源不明的命令。</li></ol></details>
      <div className="guided-step-tabs" role="tablist" aria-label="示例操作步骤">
        {example.commands.map((item, index) => (
          <button key={`${item.title}-${index}`} role="tab" aria-selected={index === activeStep} className={`${index === activeStep ? 'is-current' : ''} ${completed.has(index) ? 'is-complete' : ''}`} onClick={() => goToStep(index)}>
            <span>{completed.has(index) ? <Icon name="check" size={12} /> : String(index + 1).padStart(2, '0')}</span><strong>{item.title}</strong>
          </button>
        ))}
      </div>
      <article className="guided-step-card" key={activeStep} role="tabpanel">
        <div className="guided-step-goal">
          <span className="guided-step-number">STEP {String(activeStep + 1).padStart(2, '0')}</span>
          <h4>{current.title}</h4>
          <p>{current.note ?? `先明确「${current.title}」要验证的状态，再决定是否亲手执行。`}</p>
        </div>
        <div className="guided-expect"><span className="guided-expect-icon"><Icon name="target" size={19} /></span><div><strong>怎样算这一步成功</strong><p>{current.expect ?? summarizeOutput(current.output)}</p></div></div>
        <details className="guided-disclosure command-disclosure">
          <summary><Icon name="code" size={17} /><span><strong>展开命令</strong><small>只有亲手操作时才需要；可以一键复制</small></span><Icon name="chevron" size={15} /></summary>
          <div className="guided-terminal"><div className="guided-terminal-head"><span>终端 · 按示例环境说明执行</span><CopyCommandButton command={current.command} /></div><pre><code>{current.command}</code></pre></div>
        </details>
        <details className="guided-disclosure output-disclosure">
          <summary><Icon name="terminal" size={17} /><span><strong>展开完整预期输出</strong><small>执行后逐层对照，不要求第一次就记住格式</small></span><Icon name="chevron" size={15} /></summary>
          <div className="guided-terminal output-terminal"><pre><code>{current.output}</code></pre></div>
        </details>
        <div className="guided-step-actions">
          <button type="button" className="guided-previous" disabled={activeStep === 0} onClick={() => goToStep(activeStep - 1)}><Icon name="arrow" size={14} className="rotate-180" />上一步</button>
          <span>{completed.has(activeStep) ? '本步已完成，可继续下一步' : '先在示例环境操作，再对照结果理解这一步'}</span>
          <button type="button" className="guided-next" onClick={completeAndContinue}>{isLast ? '完成并查看验收点' : '我完成了，下一步'}<Icon name={isLast ? 'check' : 'arrow'} size={14} /></button>
        </div>
      </article>
    </div>
  )
}

/**
 * 单个模块的七节视图。
 * 章节 ID 带模块前缀，因此同一页面切换模块时不会出现重复 DOM ID，侧边栏也能准确滚动。
 */
export function ModuleView({ module, onOpenModule, onBack }: { module: KnowledgeModule; onOpenModule: (id: ModuleId) => void; onBack: () => void }) {
  const prefix = `module-${module.id}`
  const track: TrackId = module.track ?? 'docker'
  const trackName = topicMap[track].title

  return (
    <div className="module-view">
      <section className="module-hero">
        <button className="back-button" onClick={onBack}><Icon name="arrow" size={15} className="rotate-180" /> 返回 {trackName} 知识地图</button>
        <div className="module-hero-kicker"><span>深入学习</span><i />{module.group}<i />完整模块</div>
        <div className="module-hero-main"><div><h1>{module.title}</h1>{track !== 'agent' && track !== 'rag' && track !== 'linux' && track !== 'network' && <span className="module-english">{module.english}</span>}<p>{module.summary}</p></div><div className="module-hero-icon"><Icon name={module.icon} size={54} /></div></div>
        <div className="module-breadcrumb"><span>{module.dependencies.length ? '建议先了解' : '开始要求'}</span>{module.dependencies.length ? module.dependencies.map((id) => <button key={id} onClick={() => onOpenModule(id)}>{moduleMap[id].title}<Icon name="chevron" size={12} /></button>) : <small>无需前置模块；本页会用具体场景解释每个新词</small>}</div>
        <div className="learning-loop" aria-label="学习闭环">
          <span className="learning-loop-label">学完标准</span>
          <div><b>01</b><span><strong>解释设计</strong><small>它为什么存在</small></span></div>
          <div><b>02</b><span><strong>看懂状态</strong><small>内部如何变化</small></span></div>
          <div><b>03</b><span><strong>预判证据</strong><small>命令会返回什么</small></span></div>
          <div><b>04</b><span><strong>只剩实操</strong><small>自己验证与排障</small></span></div>
        </div>
      </section>

      {track === 'agent' && <AgentPrimer />}
      {track === 'rag' && <RagPrimer />}
      {track === 'linux' && <LinuxPrimer />}
      {track === 'network' && <NetworkPrimer />}

      <LearningPathNavigator track={track} currentModule={module.id} onOpenModule={onOpenModule} />

      <section id={`${prefix}-philosophy`} data-section="1" className="learning-section">
        <SectionHeading number={1} title="理念" lead="它要解决什么，又明确拒绝什么。" />
        <div className="module-philosophy-grid">
          <article className="idea-card positive"><span className="card-label"><Icon name="check" size={16} /> 它要解决</span><h3>{module.philosophy.problem}</h3></article>
          <article className="idea-card negative"><span className="card-label"><Icon name="close" size={16} /> 它拒绝</span><h3>{module.philosophy.rejects}</h3></article>
        </div>
        <div className="counterintuitive"><div className="counter-icon"><Icon name="spark" size={21} /></div><div><strong>反直觉，但必须记住</strong><p>{module.philosophy.counter}</p></div><button onClick={() => document.getElementById(`${prefix}-design`)?.scrollIntoView({ behavior: 'smooth' })}>进入机制 <Icon name="arrow" size={15} /></button></div>
      </section>

      <section id={`${prefix}-design`} data-section="2" className="learning-section">
        <SectionHeading number={2} title="设计" lead="核心概念、必须守住的规则、诞生原因与关键取舍。" />
        <div className="module-abstractions">{module.design.abstractions.map((item, index) => <article key={item.name}><span>{String(index + 1).padStart(2, '0')}</span><h3>{item.name}</h3><p>{item.role}</p></article>)}</div>
        <div className="module-principles"><div className="invariant-title"><Icon name="shield" size={20} /><strong>必须守住的规则</strong><span>换一种实现也不能丢掉的约束</span></div><ol>{module.design.principles.map((principle, index) => <li key={principle}><span>{String(index + 1).padStart(2, '0')}</span><p>{principle}</p></li>)}</ol></div>
        <div className="history-panel"><div className="subsection-heading"><span>它怎样诞生</span><small>历史不是年表，而是每一次设计被什么问题推动</small></div><div className="history-timeline">{module.design.history.map((item) => <article key={`${item.when}-${item.what}`}><span>{item.when}</span><div><h3>{item.what}</h3><p>{item.why}</p></div></article>)}</div></div>
        {(module.id === 'image-build' || module.id === 'filesystem') && <ImageLayerAnatomy />}
      </section>

      <section id={`${prefix}-capabilities`} data-section="3" className="learning-section">
        <SectionHeading number={3} title="能力地图" lead="这项技术能做什么，每项一句，不展开参数。" />
        <div className="module-capability-grid">{module.capabilities.map((capability) => <article key={capability.name}><span className="capability-check"><Icon name="check" size={14} /></span><h3>{capability.name}</h3><p>{capability.sentence}</p></article>)}</div>
      </section>

      <section id={`${prefix}-path`} data-section="4" className="learning-section path-section">
        <SectionHeading number={4} title="一条代表路径" />
        <div className="path-intent"><span>意图</span><p>{module.path.intent}</p></div>
        <p className="environment-note">{module.path.environment}</p>
        <ModulePlayer module={module} />
        {module.id === 'agent-loop' && <div className="agent-lab-wrapper"><div className="subsection-heading"><span>切换场景，观察循环的真实状态</span><small>重点对照模型提案、宿主执行与审计事实</small></div><AgentLoopLab /></div>}
        {(module.id === 'context-window' || module.id === 'context-memory') && <div className="agent-lab-wrapper"><div className="subsection-heading"><span>亲手改变上下文预算</span><small>观察窗口、输出预留与裁剪顺序</small></div><ContextBudgetLab /></div>}
        {module.id === 'cgroup-v2' && <div className="cgroup-lab-wrapper"><div className="subsection-heading"><span>亲手改变限制，观察内核状态</span><small>选择负载、拖动上限、逐步执行</small></div><CgroupLab /></div>}
        {(module.id === 'kubernetes-architecture' || module.id === 'api-objects' || module.id === 'deployments-rollouts') && <div className="kubernetes-lab-wrapper"><div className="subsection-heading"><span>亲手推进控制循环</span><small>切换副本纠偏、镜像失败与滚动发布场景</small></div><KubernetesReconcileLab onOpenModule={onOpenModule} /></div>}
        {module.id === 'rag-intent' && <div className="agent-lab-wrapper"><div className="subsection-heading"><span>亲手走完一次 RAG</span><small>切换正常回答与资料不足场景，观察证据如何改变结论</small></div><RagPipelineLab /></div>}
        {(module.id === 'linux-mental-model' || module.id === 'linux-process-model') && <div className="agent-lab-wrapper"><div className="subsection-heading"><span>亲手观察 Linux 状态</span><small>切换进程生命周期与文件权限，预判下一步结果</small></div><LinuxRuntimeLab /></div>}
        {(module.id === 'network-mental-model' || module.id === 'network-layering') && <div className="agent-lab-wrapper"><div className="subsection-heading"><span>亲手观察数据包路径</span><small>切换跨网访问、局域网传输与 DNS 失败，对照每一层证据</small></div><NetworkPacketLab /></div>}
        <div className="path-summary"><Icon name="arrow" size={17} /><p><strong>一句话机制：</strong>{module.path.summary}</p></div>
      </section>

      <section id={`${prefix}-cost`} data-section="5" className="learning-section">
        <SectionHeading number={5} title="代价" lead="为什么这样设计，用在这里的代价，以及最容易看错的地方。" />
        <div className="module-cost-grid">{module.costs.map((cost, index) => <article key={cost.choice}><span className="cost-index">{String(index + 1).padStart(2, '0')}</span><h3>{cost.choice}</h3><p className="cost-because">换来特定能力，同时付出以下成本。</p><p>{cost.cost}</p><div className="misread-inline"><span>常见看错</span><p>{cost.misread}</p></div></article>)}</div>
      </section>

      <section id={`${prefix}-example`} data-section="6" className="learning-section">
        <SectionHeading number={6} title="示例" lead={module.example.intent} />
        <div className="module-example-head"><div><span className="eyebrow">完整示例</span><h3>{module.example.title}</h3></div>{module.example.safety && <span className="safety-badge"><Icon name="shield" size={14} />{module.example.safety}</span>}</div>
        <div className="example-reading-order"><span>先看机制图</span><Icon name="arrow" size={13} /><span>一次只做一个步骤</span><Icon name="arrow" size={13} /><span>按需展开命令与输出</span><Icon name="arrow" size={13} /><span>用验收点排障</span></div>
        <ExampleBriefing example={module.example} />
        <MechanismDiagram diagram={module.example.diagram} />
        <GuidedExample key={module.id} example={module.example} checkpointId={`${prefix}-example-checkpoints`} />
        <div className="checkpoint-panel" id={`${prefix}-example-checkpoints`}><div><Icon name="check" size={18} /><strong>完整演示的验收点</strong><small>输出不符时，从这里反向定位机制</small></div><ul>{module.example.checkpoints.map((checkpoint) => <li key={checkpoint}><span><Icon name="check" size={12} /></span>{checkpoint}</li>)}</ul></div>
      </section>

      <section id={`${prefix}-boundary`} data-section="7" className="learning-section">
        <SectionHeading number={7} title="边界" lead="知道它挡住了什么，才知道什么时候必须换另一层设计。" />
        <div className="boundary-grid"><article className="boundary-yes"><span className="card-label"><Icon name="check" size={16} /> 这条设计挡住了</span><ul>{module.boundaries.blocks.map((item) => <li key={item}>{item}</li>)}</ul></article><article className="boundary-no"><span className="card-label"><Icon name="close" size={16} /> 这条设计没挡住</span><ul>{module.boundaries.notBlocks.map((item) => <li key={item}>{item}</li>)}</ul></article></div>
      </section>
    </div>
  )
}
