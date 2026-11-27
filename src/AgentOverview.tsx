/**
 * Agent 学习总览页，用于把“模型输出”展开为可理解、可观察的受约束行动循环。
 * 页面依次呈现理念、职责边界、架构观察图、能力地图、代表运行路径、代价与安全边界，
 * 并通过统一回调把知识点连接到深潜模块。
 */
import { useState } from 'react'
import { AgentPrimer } from './AgentPrimer'
import { AgentLoopLab } from './AgentLoopLab'
import { ContextBudgetLab } from './ContextBudgetLab'
import { KnowledgeMap } from './KnowledgeMap'
import { LearningPath } from './LearningPath'
import { agentModules } from './knowledge'
import type { ModuleId } from './knowledgeTypes'
import { Icon, type IconName } from './Icons'
import { MechanismDiagram } from './MechanismDiagram'
import { SectionHeading } from './SectionHeading'

/**
 * 能力地图的展示数据：每项能力同时提供标题、机制解释、图标和对应深潜模块。
 * 数组顺序即页面卡片顺序；点击卡片时只通过 module 字段通知父组件打开模块。
 */
const capabilities: { name: string; sentence: string; icon: IconName; module: ModuleId }[] = [
  // 推理与上下文：说明模型如何利用本轮可见信息形成决策。
  { name: '模型推理', sentence: '把模型这次看到的内容，变成下一段文字或工具调用建议。', icon: 'brain', module: 'llm-inference' },
  { name: '上下文装配', sentence: '在有限空间里安排规则、目标、聊天记录、查到的资料和工具结果。', icon: 'layers', module: 'context-window' },
  // 行动与证据：连接模型提案、宿主执行和外部知识来源。
  { name: '工具行动', sentence: '模型提出要做什么，由宿主检查权限并真正执行。', icon: 'workflow', module: 'tool-calling' },
  { name: '知识检索', sentence: '从资料库找相关内容，并说明答案依据来自哪里。', icon: 'database', module: 'retrieval-rag' },
  // 运行与治理：覆盖任务推进、状态恢复、质量验证和权限控制。
  { name: '规划与重规划', sentence: '把大目标拆成可检查的小步骤，看到新结果后调整。', icon: 'target', module: 'planning' },
  { name: '状态与恢复', sentence: '记住做到哪一步，暂停或出错后接着做，不重复产生效果。', icon: 'reset', module: 'workflow-state' },
  { name: '评估与观测', sentence: '记录完整过程，用固定题目比较新旧版本，定位失败。', icon: 'chart', module: 'evaluation-observability' },
  { name: '权限与人工把关', sentence: '限制能做和能看什么，高风险操作等人批准再执行。', icon: 'shield', module: 'security-permissions' },
]

/**
 * 架构图的三个观察层文案，对象键同时用作 Focus 类型、标签页 key 和画布焦点类名。
 * 每个观察层共享同一张架构图，只切换解释标题与正文，不改变图中的运行链路。
 */
const focusCopy = {
  // 循环视角：强调模型、宿主、工具和终止规则之间的职责分工。
  loop: {
    label: '循环',
    title: 'Agent 不只是一段回答，而是一套会循环、会停下的程序',
    text: '模型负责提出下一步，宿主负责保存进度、检查动作并执行工具。一次任务记录（run）是继续、停止还是等待批准，由程序规则决定。',
  },
  // 上下文视角：强调未装配、被截断或无权限的信息不会自动进入模型视野。
  context: {
    label: '上下文',
    title: '模型只看见本轮装配进去的内容',
    text: '文档、记忆、历史和工具结果都要先变成上下文消息。没被检索、被截断或没有权限的内容，对模型等于不存在。',
  },
  // 权限视角：强调提案、授权与实际副作用是三个必须分别记录的事实。
  boundary: {
    label: '权限',
    title: '提案不等于执行，模型不等于安全边界',
    text: '模型可以建议删除文件或发送请求，但真正改变世界的是宿主进程。策略、审批、参数校验与审计必须位于工具执行之前。',
  },
}

type Focus = keyof typeof focusCopy

/**
 * Agent 运行时架构示意图，负责把抽象职责转成一条可阅读的执行链路。
 * 组件自身不保存状态：focus 由父组件控制，onFocus 负责把标签页选择回传父组件。
 * 关键交互是切换循环、上下文或权限观察层；aria-selected 与焦点类名同步反映选择，
 * 解释区通过 key 在切换时重新触发淡入，而主链路和反馈回路保持固定。
 */
function AgentArchitecture({ focus, onFocus }: { focus: Focus; onFocus: (value: Focus) => void }) {
  return (
    <div className="architecture-panel agent-architecture">
      {/* 标签页只改变观察重点，对应文案始终取自 focusCopy，避免图示与解释脱节。 */}
      <div className="focus-tabs" role="tablist" aria-label="Agent 设计观察层">
        {(Object.keys(focusCopy) as Focus[]).map((key) => <button key={key} role="tab" aria-selected={focus === key} className={focus === key ? 'is-active' : ''} onClick={() => onFocus(key)}>{focusCopy[key].label}</button>)}
      </div>
      {/* 主链路从目标与边界出发，经上下文、模型、策略审批到宿主执行；观察结果再回到上下文。 */}
      <div className={`agent-architecture-canvas focus-${focus}`}>
        <div className="agent-arch-input"><Icon name="target" size={18} /><div><strong>目标 + 边界</strong><small>完成条件、预算、权限</small></div></div>
        <span className="arch-arrow"><Icon name="arrow" size={18} /></span>
        <div className="agent-arch-context"><Icon name="layers" size={18} /><div><strong>上下文装配</strong><small>规则 / 历史 / 记忆 / 证据</small></div></div>
        <span className="arch-arrow"><Icon name="arrow" size={18} /></span>
        <div className="agent-arch-model"><Icon name="brain" size={18} /><div><strong>模型决策</strong><small>答案或结构化动作</small></div></div>
        <span className="arch-arrow"><Icon name="arrow" size={18} /></span>
        <div className="agent-arch-gate"><Icon name="shield" size={18} /><div><strong>策略与审批</strong><small>校验 / 授权 / 暂停</small></div></div>
        <span className="arch-arrow"><Icon name="arrow" size={18} /></span>
        <div className="agent-arch-tool"><Icon name="workflow" size={18} /><div><strong>宿主执行</strong><small>调用工具、接口或文件操作</small></div></div>
        <div className="agent-feedback-loop"><Icon name="reset" size={15} /><span>工具返回的结果会作为新信息交给模型</span></div>
        <div className="agent-arch-result"><span className="result-dot" /><strong>完成、失败、等待批准或达到停止条件</strong><small>每一种结束都进入过程记录</small></div>
      </div>
      {/* key 随 focus 变化，使每次切换都获得一次短暂的入场反馈。 */}
      <div className="focus-explanation" key={focus}><span className="eyebrow">观察重点 · {focusCopy[focus].label}</span><h3>{focusCopy[focus].title}</h3><p>{focusCopy[focus].text}</p></div>
    </div>
  )
}

/**
 * Agent 学习总览的页面级组件，负责组织七个学习章节、交互实验室与页脚导航。
 * 本地状态仅有 focus，用于驱动 AgentArchitecture 的观察层，默认从“循环”开始。
 * 关键交互包括：首屏按钮平滑滚动到理念或学习路径、标签页切换观察重点、
 * 能力卡片与深潜入口调用 onOpenModule，底部汇总当前主题的模块覆盖情况；
 * 运行轨迹和上下文预算由各自嵌入的实验室组件管理，页面只负责组合与导航。
 */
export function AgentOverview({ onOpenModule }: { onOpenModule: (id: ModuleId) => void }) {
  const [focus, setFocus] = useState<Focus>('loop')

  return (
    <>
      {/* 首屏先建立“受约束行动循环”的总概念，并提供理念与学习路径两个滚动入口。 */}
      <section className="hero agent-hero" aria-labelledby="agent-hero-title">
        <div className="hero-kicker"><span>ROUND 02</span><i />机制优先学习法</div>
        <h1 id="agent-hero-title">Agent：不是更聪明的聊天框，<br /><em>而是一个受约束的行动循环。</em></h1>
        <p className="hero-lead">从一次模型调用开始，逐步看清上下文怎样装配、模型怎样提出动作、宿主怎样校验和执行，以及系统怎样在失败、越权与不确定时停住。</p>
        <div className="hero-meta"><span><Icon name="play" size={14} /> 可切换运行时轨迹</span><span><Icon name="layers" size={14} /> 6 个状态切片</span><span><Icon name="terminal" size={14} /> 命令与输出对照</span><span><Icon name="network" size={14} /> {agentModules.length} 个深潜模块</span></div>
        <div className="hero-actions"><button className="hero-cta" onClick={() => document.getElementById('philosophy')?.scrollIntoView({ behavior: 'smooth' })}>从理念开始 <Icon name="arrow" size={17} /></button><button className="hero-path-cta" onClick={() => document.getElementById('agent-learning-path')?.scrollIntoView({ behavior: 'smooth' })}>查看最佳学习路径 <Icon name="network" size={16} /></button></div>
        <div className="hero-aside" aria-label="阅读顺序"><span className="aside-label">READING ORDER</span>{[['01', '模型', '它只能提出什么'], ['02', '运行时', '谁真正执行'], ['03', '边界', '何时必须停下']].map(([number, title, text]) => <div key={number}><span>{number}</span><p><strong>{title}</strong><small>{text}</small></p></div>)}</div>
        <div className="hero-watermark agent-watermark" aria-hidden="true"><Icon name="agent" size={230} /></div>
      </section>

      <div className="overview-primer"><AgentPrimer /></div>

      {/* 理念章节用“要解决 / 拒绝”的对照，澄清模型提案并不等于宿主已经执行。 */}
      <section id="philosophy" data-section="1" className="learning-section">
        <SectionHeading number={1} title="理念" lead="先把“会调用工具”与“能可靠行动”分开。" />
        <div className="thesis-card"><span className="thesis-mark">“</span><p>Agent 把模型的一次输出，放进一套会<strong>保存进度、调用工具、检查权限、到条件就停下</strong>的循环程序。</p></div>
        <div className="two-column philosophy-grid">
          <article className="idea-card positive"><span className="card-label"><Icon name="check" size={16} /> 它要解决</span><h3>让系统能根据观察选择下一步，而不是只返回一段文本。</h3><p>真实任务需要查资料、调用业务系统、处理失败并反复修正。Agent 运行时把“目标—决策—行动—观察”连接起来，让模型输出可以驱动受控行动。</p><div className="idea-result"><span>输入</span><strong>目标</strong><Icon name="arrow" size={15} /><span>产出</span><strong>结果 + 轨迹</strong></div></article>
          <article className="idea-card negative"><span className="card-label"><Icon name="close" size={16} /> 它拒绝</span><h3>不承诺“给模型更多工具，它就会正确、安全地完成任务”。</h3><p>模型不知道隐藏的系统状态，不能自行检查权限，也不能保证同一动作重复执行时只生效一次。它说“看起来合理”也不等于事实；循环、评估与权限检查不是可选的装饰。</p><div className="idea-result muted"><span>不是</span><strong>永久记忆</strong><span>不是</span><strong>自主授权</strong></div></article>
        </div>
        <div className="counterintuitive"><div className="counter-icon"><Icon name="spark" size={21} /></div><div><strong>先记住一个反直觉事实</strong><p>模型说出“我要调用工具”，并不代表工具已经执行。真正调用接口、写文件或发请求的是宿主程序；完整过程记录（trace）必须分别写清“建议过”和“真的做了”。</p></div><button onClick={() => document.getElementById('path')?.scrollIntoView({ behavior: 'smooth' })}>循环与执行：第 4 节展开 <Icon name="arrow" size={15} /></button></div>
      </section>

      {/* 设计章节拆分模型、上下文、运行时和工具职责，并接入架构图、知识地图、学习路径与上下文实验。 */}
      <section id="design" data-section="2" className="learning-section">
        <SectionHeading number={2} title="设计" lead="核心不是提示词技巧，而是模型与运行时之间的职责边界。" />
        <div className="abstraction-grid agent-abstraction-grid">
          <article><span className="abstraction-number">A</span><Icon name="brain" size={23} /><h3>模型</h3><p>根据这次看到的内容，生成下一段文字或工具调用建议。</p><small>回答“下一步建议是什么”</small></article>
          <article><span className="abstraction-number">B</span><Icon name="layers" size={23} /><h3>上下文</h3><p>本轮真正交给模型的文字，包括任务、聊天记录、资料和工具结果。</p><small>回答“模型现在能看到什么”</small></article>
          <article><span className="abstraction-number">C</span><Icon name="agent" size={23} /><h3>运行程序</h3><p>保存进度、推进循环、检查权限，并在合适的时候停下。</p><small>回答“谁负责让事情发生”</small></article>
          <article><span className="abstraction-number">D</span><Icon name="workflow" size={23} /><h3>工具</h3><p>模型之外的软件能力，例如搜索文档、查天气或创建工单。</p><small>回答“怎样改变外部世界”</small></article>
        </div>
        <div className="subsection-heading"><span>核心设计图</span><small>点击标签观察循环、上下文与权限三条机制线</small></div>
        {/* 父组件持有 focus，并通过 setFocus 接收架构图标签页的选择。 */}
        <AgentArchitecture focus={focus} onFocus={setFocus} />
        <div className="subsection-heading knowledge-map-heading"><span>按需要选择要深入的知识</span><small>从模型推理一直深入到生产运维</small></div>
        <KnowledgeMap track="agent" onOpenModule={onOpenModule} />
        <LearningPath track="agent" onOpenModule={onOpenModule} />
        <div className="agent-lab-wrapper"><div className="subsection-heading"><span>先体验一个关键约束</span><small>上下文窗口决定模型这一轮到底能看见什么</small></div><ContextBudgetLab /></div>
        <div className="invariant-panel">
          <div className="invariant-title"><Icon name="shield" size={20} /><strong>不变量</strong><span>理解 Agent 时不能丢掉的约束</span></div>
          <ol><li><span>01</span><p><strong>模型只提出动作，宿主承担执行。</strong>提案、授权与副作用是三个不同事实。</p></li><li><span>02</span><p><strong>上下文是装配出来的，不是自动拥有的。</strong>未被放入、被截断或无权限的信息，模型无法可靠使用。</p></li><li><span>03</span><p><strong>每次运行都必须可终止、可观测、可追责。</strong>步数、预算、审批、超时和审计决定系统边界。</p></li></ol>
        </div>
      </section>

      {/* 能力地图把 capabilities 渲染为可点击卡片，点击后进入该能力对应的知识模块。 */}
      <section id="capabilities" data-section="3" className="learning-section">
        <SectionHeading number={3} title="能力地图" lead="先知道有哪些能力，每项都可进入对应深潜模块。" />
        <div className="capability-grid">{capabilities.map((capability) => <button key={capability.name} className="capability-card is-on-path" onClick={() => onOpenModule(capability.module)}><div className="capability-top"><span className="capability-icon"><Icon name={capability.icon} size={20} /></span><span className="capability-state path">可深潜</span></div><h3>{capability.name}</h3><p>{capability.sentence}</p><span className="capability-action">进入这一节<Icon name="arrow" size={14} /></span></button>)}</div>
        <p className="map-note"><Icon name="network" size={14} />能力不是功能清单的终点；每项能力都继续连接到模型、上下文、执行与治理的原理。</p>
      </section>

      {/* 代表路径使用确定性教学轨迹串联检索、工具调用、审批和观测，不访问真实外部服务。 */}
      <section id="path" data-section="4" className="learning-section path-section">
        <SectionHeading number={4} title="一条代表路径" />
        <div className="path-intent"><span>意图</span><p>根据内部排障文档回答“如何回滚 Agent 版本”，给出引用；随后尝试把结论写入生产工单，观察权限如何改变路径。</p></div>
        <p className="environment-note">以下为教学模拟的确定性轨迹，不调用真实模型或外部服务；它展示的是运行时机制，而不是某个厂商的内部实现。</p>
        {/* AgentLoopLab 自己管理轨迹播放状态，不重复展示学习路径中的模块入口。 */}
        <AgentLoopLab />
        <div className="path-summary"><Icon name="arrow" size={17} /><p><strong>一句话机制：</strong>模型根据装配后的上下文提出下一步，运行时校验并执行动作，再把观察写回上下文，直到满足完成条件或触发边界。</p></div>
      </section>

      {/* 代价章节从概率决策、上下文、动态循环和多 Agent 四个方向说明能力扩张带来的成本。 */}
      <section id="cost" data-section="5" className="learning-section">
        <SectionHeading number={5} title="代价" lead="行动能力越强，状态、权限与验证的成本越高。" />
        <div className="cost-grid">
          <article><span className="cost-index">01</span><h3>每次建议都可能不同</h3><p className="cost-because">换来处理开放式任务的能力。</p><p>同样的输入可能得到不同建议；工具参数、完成判断和证据引用都要由程序检查，不能把模型输出直接当成事实。</p></article>
          <article><span className="cost-index">02</span><h3>一次能看的内容有限</h3><p className="cost-because">换来可控的单次处理成本。</p><p>聊天记录、查到的资料和工具结果要竞争同一块空间。摘要和截断会丢信息，扩大窗口也不能自动解决资料是否相关、是否有权限的问题。</p></article>
          <article><span className="cost-index">03</span><h3>步骤越多，成本越高</h3><p className="cost-because">换取看到新结果后调整行动的能力。</p><p>调用次数、等待时间和出错机会都会随步骤增加。没有次数、费用和停止条件，程序可能在错误目标上一直行动。</p></article>
          <article><span className="cost-index">04</span><h3>多个 Agent 不会自动更好</h3><p className="cost-because">换取外部行动与分工能力。</p><p>工具、消息、同时执行和信任关系会变复杂。增加角色可能只是重复传递信息、增加费用并放大错误。</p></article>
        </div>
        <div className="misread-panel"><div className="misread-heading"><Icon name="spark" size={20} /><strong>常见看错</strong><span>容易被混为一谈的概念，在这里分清</span></div><div className="misread-list"><div><span>一次模型调用</span><Icon name="chevron" size={14} /><span>Agent</span><p>一次模型调用只产生输出；Agent 程序把多轮建议、工具执行、进度保存和停止条件组织成完整系统。</p></div><div><span>提示词</span><Icon name="chevron" size={14} /><span>权限</span><p>提示词可以引导模型，但不能代替程序检查身份、限制参数、等待批准和隔离运行。</p></div><div><span>RAG（先查资料再回答）</span><Icon name="chevron" size={14} /><span>长期记忆</span><p>RAG 是回答时从外部资料取回证据；长期记忆是跨多次对话保存并重新取用少量信息。查到内容也不等于内容正确或当前有效。</p></div><div><span>固定步骤流程</span><Icon name="chevron" size={14} /><span>多个 Agent 分工</span><p>固定步骤流程控制明确的节点和进度；多个 Agent 分工控制任务委派与结果汇总。二者可以组合，但不能互相替代。</p></div></div></div>
      </section>

      {/* 示例章节把一次工具调用拆成提案、宿主决策、工具观察和运行状态，避免把日志误当成副作用证据。 */}
      <section id="example" data-section="6" className="learning-section">
        <SectionHeading number={6} title="示例" lead="只拆这条路径里最关键、也最容易看错的一步：工具观察如何回到上下文。" />
        {/* 四类事实按“模型提案 → 宿主决策 → 工具观察 → 运行状态”展示，用于解释 trace 的证据边界。 */}
        <MechanismDiagram diagram={{ kind: 'flow', title: '一次工具调用产生的四类事实', caption: '把模型消息、宿主决策、工具结果与运行状态分开记录，才能判断系统到底做了什么。', items: [
          { title: '模型提案', detail: '模型建议“下一步做什么”。本例中，search_docs 是我们给“搜索内部文档”这个只读工具起的名字；create_ticket 则是“创建工单”这个写工具的名字。提案不等于已经执行。', tag: 'assistant', tone: 'blue' },
          { title: '宿主决策', detail: '宿主先检查参数格式、权限、是否需要人工批准、预算是否够用，再决定是否执行。schema 在这里指工具的参数格式说明。', tag: 'policy', tone: 'orange' },
          { title: '工具观察', detail: '工具真正返回的结果、错误或超时，会作为一条 tool（工具返回）消息进入下一轮上下文。', tag: 'observation', tone: 'green' },
          { title: '运行状态', detail: '状态记录任务此刻处于 running（运行中）、waiting_approval（等待批准）、succeeded（成功）还是 failed（失败）；trace 是完整过程记录。', tag: 'runtime', tone: 'muted' },
        ], footnote: '只看最终回答无法判断工具是否执行；只看模型日志会把提案误判为副作用。' }} />
        <div className="example-panel agent-trace-example">
          <div className="agent-trace-plain">
            <div className="agent-trace-plain-head"><span><Icon name="target" size={17} /></span><div><strong>先看结论：提议发生了，写入没有发生</strong><small>以下是一次教学模拟，不连接真实工单系统</small></div></div>
            <div className="agent-trace-facts">
              <div><span>模型建议</span><strong>在生产环境创建工单</strong><small>只是建议，尚未执行</small></div>
              <div><span>宿主检查</span><strong>发现这是写操作，暂停等待批准</strong><small>模型不能自己批准</small></div>
              <div><span>审批结果</span><strong>人工拒绝本次操作</strong><small>拒绝原因会进入审计记录</small></div>
              <div><span>实际结果</span><strong>工单数量没有变化</strong><small>任务失败，但没有产生外部副作用</small></div>
            </div>
            <details className="agent-overview-record"><summary><Icon name="code" size={15} /><span><strong>需要核对字段时，再展开原始记录</strong><small>agent-trace 是示例中的查看命令；run_02 是这次任务的编号</small></span><Icon name="chevron" size={14} /></summary><div className="example-terminal"><div className="terminal-top"><span /><span /><span /><small>agent-runtime · trace view</small></div><div className="terminal-body"><p><span>$</span> agent-trace show run_02</p><p className="terminal-output">proposed: create_ticket(queue=production)</p><p className="terminal-output">decision: waiting_approval</p><p className="terminal-output">executed: false</p><p className="terminal-output">side_effects: 0</p><p className="terminal-muted">executed 表示是否执行；side_effects 表示外部系统被改变的次数。</p></div></div></details>
          </div>
          <div className="packet-trace"><div className="trace-head"><span>可观察证据</span><small>教学模拟输出</small></div>{[['01', 'assistant.message', 'tool_call', '模型提出结构化动作'], ['02', 'policy.decision', 'pause', '策略在执行前拦截'], ['03', 'approval.result', 'rejected', '人工拒绝本次动作'], ['04', 'runtime.status', 'failed', '无副作用，审计完整']].map(([number, title, code, text], index) => <div className="trace-step" key={number}><span className="trace-number">{number}</span><div><strong>{title}</strong><p>{text}</p></div><code>{code}</code>{index < 3 && <i className="trace-connector" />}</div>)}</div>
        </div>
        <div className="example-note"><Icon name="shield" size={18} /><p><strong>完成判断与执行记录必须分开。</strong>Agent 说“已完成”不是完成证据；宿主要检查目标、工具结果、权限与预算，再决定终态。</p></div>
      </section>

      {/* 边界章节列出设计能挡住与不能挡住的问题，最后汇总当前主题的模块覆盖情况。 */}
      <section id="boundary" data-section="7" className="learning-section">
        <SectionHeading number={7} title="边界" lead="知道它挡住了什么，才知道什么时候不能继续交给模型。" />
        <div className="boundary-grid"><article className="boundary-yes"><span className="card-label"><Icon name="check" size={16} /> 这条设计挡住了</span><ul><li>一次模型调用无法处理多步骤外部依赖</li><li>工具结果与后续建议之间缺少信息连接</li><li>运行过程不可见、无法判断是否真的执行</li><li>高风险动作绕过宿主权限直接发生</li></ul></article><article className="boundary-no"><span className="card-label"><Icon name="close" size={16} /> 这条设计没挡住</span><ul><li>模型一本正经地编造错误内容</li><li>资料或工具返回里藏着的恶意指令</li><li>没有防重复设计的操作在重试后执行多次</li><li>资料泄露、费用失控与多个 Agent 一起放大错误</li><li>缺少固定测试题时无法证明质量提升</li></ul></article></div>
        <div className="stop-card"><div className="stop-top"><span><Icon name="check" size={17} /> Agent 全景已展开</span><small>{agentModules.length} 个依赖模块 · 完整状态与示例</small></div><h3>不止学会“让模型调用工具”，而是看懂怎样让行动可控、可验证、可恢复。</h3><p>每个模块都包含理念、设计、诞生动机、核心抽象、完整执行状态、可复现示例、代价与边界。</p><div className="stop-footer"><span>Agent 依赖图</span><strong>{agentModules.length} / {agentModules.length} 模块可用</strong><span>六条技术轨道均可独立深潜</span></div></div>
      </section>

      {/* 页脚只保留品牌、学习主张和当前轨道标识，不承载额外交互。 */}
      <footer className="page-footer"><div><Icon name="agent" size={22} /><span>心智实验室</span></div><p>不是让模型说得更像人，而是让系统行动得更可靠。</p><span>ROUND 02 / AGENT</span></footer>
    </>
  )
}
