import { useState } from 'react'
import { KnowledgeMap } from './KnowledgeMap'
import { LearningPath } from './LearningPath'
import { ragModules } from './knowledge'
import type { ModuleId } from './knowledgeTypes'
import { Icon, type IconName } from './Icons'
import { MechanismDiagram } from './MechanismDiagram'
import { RagPipelineLab } from './RagPipelineLab'
import { SectionHeading } from './SectionHeading'
import { RagPrimer } from './TopicPrimer'

/** RAG 总览能力地图；每项只讲一句作用，并连接到独立深潜模块。 */
const capabilities: { name: string; sentence: string; icon: IconName; module: ModuleId }[] = [
  { name: '资料准备', sentence: '把文档解析成干净、带来源和权限信息的可检索片段。', icon: 'folder', module: 'rag-ingestion' },
  { name: '语义检索', sentence: '用向量找到措辞不同但意思相近的内容。', icon: 'database', module: 'rag-embeddings' },
  { name: '混合检索', sentence: '同时利用精确关键词和语义相似度，减少漏召回。', icon: 'network', module: 'rag-hybrid-retrieval' },
  { name: '问题改写', sentence: '把模糊或依赖对话的问题补成能独立检索的问法。', icon: 'workflow', module: 'rag-query-rewriting' },
  { name: '候选重排', sentence: '把初步找到的内容再次比较，让最相关的证据排在前面。', icon: 'chart', module: 'rag-reranking' },
  { name: '依据生成', sentence: '只根据本轮资料回答，并让关键结论对应到引用。', icon: 'brain', module: 'rag-grounded-generation' },
  { name: '质量评估', sentence: '分别检查有没有找到、找到是否准确、答案是否有依据。', icon: 'target', module: 'rag-evaluation' },
  { name: '安全与运维', sentence: '在检索和生成前限制权限，并持续监控延迟、质量与更新。', icon: 'shield', module: 'rag-security' },
]

/** 三种观察重点共用一张流水线，只改变解释，不把检索、生成和安全混成一个黑盒。 */
const focusCopy = {
  data: { label: '资料', title: 'RAG 的第一步不是接模型，而是把资料准备好', text: '文档要先解析、切分、标注来源和权限。资料错误、过期或缺少权限信息，会在后面每一步被放大。' },
  retrieval: { label: '检索', title: '检索的目标是找全候选，不是直接生成答案', text: '关键词与向量各自擅长不同问题；召回阶段尽量找全，重排阶段再提高精度，最后只把少量证据放进上下文。' },
  evidence: { label: '证据', title: '回答必须能回到资料，资料不足时必须停住', text: '模型只看见本轮装配进去的内容。引用让答案可核对，但引用不能证明资料正确，也不能替代权限过滤和人工审核。' },
}

type Focus = keyof typeof focusCopy

/** RAG 运行时架构图；标签切换用于比较资料、检索和证据三条机制线。 */
function RagArchitecture({ focus, onFocus }: { focus: Focus; onFocus: (value: Focus) => void }) {
  return (
    <div className="architecture-panel rag-architecture">
      <div className="focus-tabs" role="tablist" aria-label="RAG 设计观察层">{(Object.keys(focusCopy) as Focus[]).map((key) => <button key={key} role="tab" aria-selected={focus === key} className={focus === key ? 'is-active' : ''} onClick={() => onFocus(key)}>{focusCopy[key].label}</button>)}</div>
      <div className={`rag-architecture-canvas focus-${focus}`}>
        <div className="rag-arch-node"><Icon name="folder" size={18} /><div><strong>资料准备</strong><small>解析 / 切分 / 元数据</small></div></div><Icon name="arrow" size={18} />
        <div className="rag-arch-node"><Icon name="database" size={18} /><div><strong>索引与检索</strong><small>关键词 / 向量 / 过滤</small></div></div><Icon name="arrow" size={18} />
        <div className="rag-arch-node"><Icon name="chart" size={18} /><div><strong>重排与装配</strong><small>候选 / 去重 / 预算</small></div></div><Icon name="arrow" size={18} />
        <div className="rag-arch-node"><Icon name="brain" size={18} /><div><strong>依据生成</strong><small>回答 / 引用 / 拒答</small></div></div>
        <div className="rag-arch-guard"><Icon name="shield" size={16} /><span>权限、版本与注入防护贯穿检索和生成，不是最后补一道检查</span></div>
        <div className="rag-arch-result"><span className="result-dot" /><strong>答案 + 引用 + 检索记录</strong><small>分别回答“找到了什么”和“据此说了什么”</small></div>
      </div>
      <div className="focus-explanation" key={focus}><span className="eyebrow">观察重点 · {focusCopy[focus].label}</span><h3>{focusCopy[focus].title}</h3><p>{focusCopy[focus].text}</p></div>
    </div>
  )
}

/** RAG 七章节总览；只组合导航、机制图和实验室，具体状态由各深潜模块展开。 */
export function RagOverview({ onOpenModule }: { onOpenModule: (id: ModuleId) => void }) {
  const [focus, setFocus] = useState<Focus>('data')
  return (
    <>
      <section className="hero agent-hero rag-hero" aria-labelledby="rag-hero-title">
        <div className="hero-kicker"><span>ROUND 04</span><i />机制优先学习法</div>
        <h1 id="rag-hero-title">RAG：不是让模型背下所有资料，<br /><em>而是让它在回答前查到可核对的证据。</em></h1>
        <p className="hero-lead">从一份真实文档开始，看清资料怎样被切分、检索、排序并放进上下文；再学习怎样让答案带上依据，在资料不足时拒绝猜测，并用评估和权限控制保证系统可靠。</p>
        <div className="hero-meta"><span><Icon name="play" size={14} /> 可切换检索轨迹</span><span><Icon name="layers" size={14} /> 6 个处理状态</span><span><Icon name="terminal" size={14} /> 命令与输出对照</span><span><Icon name="network" size={14} /> {ragModules.length} 个深潜模块</span></div>
        <div className="hero-actions"><button className="hero-cta" onClick={() => document.getElementById('philosophy')?.scrollIntoView({ behavior: 'smooth' })}>从理念开始 <Icon name="arrow" size={17} /></button><button className="hero-path-cta" onClick={() => document.getElementById('rag-learning-path')?.scrollIntoView({ behavior: 'smooth' })}>查看最佳学习路径 <Icon name="network" size={16} /></button></div>
        <div className="hero-aside" aria-label="阅读顺序"><span className="aside-label">READING ORDER</span>{[['01', '资料', '模型能查到什么'], ['02', '检索', '谁进入上下文'], ['03', '证据', '答案怎样被核对']].map(([number, title, text]) => <div key={number}><span>{number}</span><p><strong>{title}</strong><small>{text}</small></p></div>)}</div>
        <div className="hero-watermark agent-watermark" aria-hidden="true"><Icon name="database" size={230} /></div>
      </section>

      <div className="overview-primer"><RagPrimer /></div>

      <section id="philosophy" data-section="1" className="learning-section">
        <SectionHeading number={1} title="理念" lead="先分清模型记忆、实时资料和最终答案，才能判断 RAG 解决了什么。" />
        <div className="thesis-card"><span className="thesis-mark">“</span><p>RAG 把模型回答前的“找资料”变成一条<strong>可检索、可过滤、可引用、可评估</strong>的流水线。</p></div>
        <div className="two-column philosophy-grid">
          <article className="idea-card positive"><span className="card-label"><Icon name="check" size={16} /> 它要解决</span><h3>让模型使用最新、专属且能说明出处的资料。</h3><p>模型参数中的知识可能过时，也不知道企业内部制度。RAG 在每次回答前查询外部资料，把相关证据放入上下文，使答案可以随资料更新而变化。</p><div className="idea-result"><span>输入</span><strong>问题 + 资料库</strong><Icon name="arrow" size={15} /><span>产出</span><strong>答案 + 依据</strong></div></article>
          <article className="idea-card negative"><span className="card-label"><Icon name="close" size={16} /> 它拒绝</span><h3>不承诺“接上向量库，模型就会说真话”。</h3><p>检索可能漏掉关键资料，资料本身可能错误，模型也可能无视证据。权限、切分、排序、引用核验和评估缺一不可；RAG 不是重新训练模型，也不是永久记忆。</p><div className="idea-result muted"><span>不是</span><strong>自动正确</strong><span>不是</span><strong>一次配置永久有效</strong></div></article>
        </div>
        <div className="counterintuitive"><div className="counter-icon"><Icon name="spark" size={21} /></div><div><strong>先记住一个反直觉事实</strong><p>检索到了资料，不代表资料已经进入模型上下文；进入了上下文，也不代表模型一定按照资料回答。找到、装配、使用和核对是四个不同事实。</p></div><button onClick={() => document.getElementById('path')?.scrollIntoView({ behavior: 'smooth' })}>第 4 节看完整路径 <Icon name="arrow" size={15} /></button></div>
      </section>

      <section id="design" data-section="2" className="learning-section">
        <SectionHeading number={2} title="设计" lead="核心不是某一个向量库，而是资料、检索、上下文与证据之间的职责边界。" />
        <div className="abstraction-grid agent-abstraction-grid">
          <article><span className="abstraction-number">A</span><Icon name="folder" size={23} /><h3>资料与片段</h3><p>原始文档经过解析和切分，保留来源、版本与权限。</p><small>回答“依据从哪里来”</small></article>
          <article><span className="abstraction-number">B</span><Icon name="database" size={23} /><h3>索引与检索</h3><p>把资料变成可查询的结构，并为问题找出候选证据。</p><small>回答“哪些内容可能有用”</small></article>
          <article><span className="abstraction-number">C</span><Icon name="layers" size={23} /><h3>上下文</h3><p>在有限空间里放入规则、问题、去重后的证据和引用编号。</p><small>回答“模型这次能看到什么”</small></article>
          <article><span className="abstraction-number">D</span><Icon name="brain" size={23} /><h3>依据生成</h3><p>模型根据可见证据回答，系统检查引用、覆盖和拒答条件。</p><small>回答“结论怎样被支持”</small></article>
        </div>
        <div className="subsection-heading"><span>核心设计图</span><small>点击标签观察资料、检索与证据三条机制线</small></div>
        <RagArchitecture focus={focus} onFocus={setFocus} />
        <div className="subsection-heading knowledge-map-heading"><span>按需要选择要深入的知识</span><small>从资料准备一直深入到质量、安全与上线维护</small></div>
        <KnowledgeMap track="rag" onOpenModule={onOpenModule} />
        <LearningPath track="rag" onOpenModule={onOpenModule} />
        <div className="invariant-panel"><div className="invariant-title"><Icon name="shield" size={20} /><strong>不变量</strong><span>理解 RAG 时不能丢掉的约束</span></div><ol><li><span>01</span><p><strong>检索先于生成。</strong>没有进入上下文的证据，不能成为本次回答的可靠依据。</p></li><li><span>02</span><p><strong>权限先于返回。</strong>不能先把无权资料交给模型，再依靠提示词要求它保密。</p></li><li><span>03</span><p><strong>质量必须分层评估。</strong>没找到、排错、没使用和表达错误，需要不同证据定位。</p></li></ol></div>
      </section>

      <section id="capabilities" data-section="3" className="learning-section">
        <SectionHeading number={3} title="能力地图" lead="先知道完整流水线有哪些能力，每项都可进入对应深潜模块。" />
        <div className="capability-grid">{capabilities.map((capability) => <button key={capability.name} className="capability-card is-on-path" onClick={() => onOpenModule(capability.module)}><div className="capability-top"><span className="capability-icon"><Icon name={capability.icon} size={20} /></span><span className="capability-state path">可深潜</span></div><h3>{capability.name}</h3><p>{capability.sentence}</p><span className="capability-action">进入这一节<Icon name="arrow" size={14} /></span></button>)}</div>
        <p className="map-note"><Icon name="network" size={14} />能力地图不是产品功能清单；每项能力都继续连接到资料质量、状态变化和可观察证据。</p>
      </section>

      <section id="path" data-section="4" className="learning-section path-section">
        <SectionHeading number={4} title="一条代表路径" />
        <div className="path-intent"><span>意图</span><p>用户询问“退款审核通过后钱什么时候到账”。系统从帮助中心检索资料，观察它如何从五个候选中选出两条证据，再生成带引用的答案；切换到“资料不足”场景，观察系统如何拒绝猜测。</p></div>
        <p className="environment-note">以下为教学模拟的确定性轨迹，不调用真实模型、向量库或外部服务；分数只表示相对排序。</p>
        <RagPipelineLab />
        <div className="path-summary"><Icon name="arrow" size={17} /><p><strong>一句话机制：</strong>先把资料变成可检索片段，再找出、排序并装配少量证据，最后让模型依据证据回答；任何一步缺少权限或覆盖，都应进入可观察的失败分支。</p></div>
      </section>

      <section id="cost" data-section="5" className="learning-section">
        <SectionHeading number={5} title="代价" lead="每增加一层准确性，也会增加延迟、维护成本和新的失败方式。" />
        <div className="cost-grid">
          <article><span className="cost-index">01</span><h3>资料需要持续维护</h3><p className="cost-because">换来随资料更新的回答能力。</p><p>文档会过期、重复、缺失权限或写错。检索系统只能基于收到的资料工作，因此版本、删除同步和来源追踪变成长期成本。</p></article>
          <article><span className="cost-index">02</span><h3>检索与重排都要花时间</h3><p className="cost-because">换来更完整、更精准的证据。</p><p>候选越多，初检越慢；重排越强，计算成本越高。系统必须在找得全、排得准和响应速度之间选择。</p></article>
          <article><span className="cost-index">03</span><h3>上下文空间始终有限</h3><p className="cost-because">换来单次模型调用的成本可控。</p><p>证据太多会引入噪声，也会挤占规则、问题和输出空间。去重、截断和排序不是优化细节，而是正确性的一部分。</p></article>
          <article><span className="cost-index">04</span><h3>评估比演示复杂</h3><p className="cost-because">换来能证明质量提升的证据。</p><p>一个问题可能有多个正确答案；检索、引用和权限需要分别评估。没有固定测试集，就无法判断改动到底变好还是变差。</p></article>
        </div>
        <div className="misread-panel"><div className="misread-heading"><Icon name="spark" size={20} /><strong>常见看错</strong><span>容易混为一谈的概念，在这里分清</span></div><div className="misread-list"><div><span>RAG</span><Icon name="chevron" size={14} /><span>微调</span><p>RAG 在回答前临时查资料；微调通过训练改变模型参数。前者适合更新知识和引用来源，后者适合稳定行为或风格。</p></div><div><span>向量检索</span><Icon name="chevron" size={14} /><span>关键词检索</span><p>向量擅长语义近似，关键词擅长精确词和编号。真实系统常把两者结合，而不是假定一种方式覆盖所有问题。</p></div><div><span>有引用</span><Icon name="chevron" size={14} /><span>答案正确</span><p>引用说明结论指向哪里，不保证资料正确，也不保证模型没有曲解资料。还需要核对引用是否支持结论。</p></div></div></div>
      </section>

      <section id="example" data-section="6" className="learning-section">
        <SectionHeading number={6} title="示例" lead="只拆最容易看错的一步：模型提出答案后，系统怎样判断它是否被证据支持。" />
        <MechanismDiagram diagram={{ kind: 'flow', title: '从候选证据到可核对结论', caption: '把检索记录、上下文和答案检查分开，才能定位是没找到、排错了，还是生成时偏离了证据。', items: [
          { title: '候选证据', detail: '初检和重排分别记录找到了什么、分数是多少。没有候选时，不应让模型凭空补齐。', tag: 'retrieval', tone: 'blue' },
          { title: '上下文装配', detail: '系统按预算去重、截断并加入引用编号。进入上下文的内容才是模型本轮真正能使用的证据。', tag: 'context', tone: 'orange' },
          { title: '答案与引用', detail: '模型给出结论和引用位置。系统检查每个关键结论是否有对应片段，而不是只看文字是否流畅。', tag: 'answer', tone: 'green' },
          { title: '判定与留痕', detail: '结果分为有依据、部分依据、资料不足和证据冲突；不同结果进入不同处理路径并保留记录。', tag: 'decision', tone: 'muted' },
        ], footnote: '“回答得很像真的”不是成功证据；必须同时核对检索、权限、引用和结论覆盖。' }} />
        <div className="example-panel agent-trace-example"><div className="agent-trace-plain"><div className="agent-trace-plain-head"><span><Icon name="target" size={17} /></span><div><strong>先看结论：答案可以生成，但必须绑定具体证据</strong><small>以下为教学模拟，不连接真实模型或文档服务</small></div></div><div className="agent-trace-facts"><div><span>检索结果</span><strong>找到退款规则与进度说明</strong><small>两条证据均通过权限过滤</small></div><div><span>上下文</span><strong>只保留两条相关片段</strong><small>其他候选不进入模型视野</small></div><div><span>答案检查</span><strong>到账时间有引用支持</strong><small>引用 [1] 对应退款规则</small></div><div><span>最终状态</span><strong>有依据，可返回</strong><small>检索与答案记录分别保存</small></div></div></div><div className="packet-trace"><div className="trace-head"><span>可观察证据</span><small>教学模拟输出</small></div>{[['01', 'retrieval.candidates', '5', '初检得到五个候选'], ['02', 'rerank.selected', '2', '重排后保留两条证据'], ['03', 'context.assembled', '2', '两条证据进入上下文'], ['04', 'answer.grounded', 'true', '关键结论均有引用支持']].map(([number, title, code, text], index) => <div className="trace-step" key={number}><span className="trace-number">{number}</span><div><strong>{title}</strong><p>{text}</p></div><code>{code}</code>{index < 3 && <i className="trace-connector" />}</div>)}</div></div>
        <div className="example-note"><Icon name="shield" size={18} /><p><strong>资料不足不是系统失败，而是需要诚实表达的状态。</strong>如果证据没有覆盖问题，正确输出可能是“无法确定”或转人工，而不是更长的答案。</p></div>
      </section>

      <section id="boundary" data-section="7" className="learning-section">
        <SectionHeading number={7} title="边界" lead="知道它挡住了什么，才知道什么时候需要换资料、换检索或换人工流程。" />
        <div className="boundary-grid"><article className="boundary-yes"><span className="card-label"><Icon name="check" size={16} /> 这条设计挡住了</span><ul><li>完全依赖模型旧知识回答快速变化的业务问题</li><li>答案无法说明依据、难以核对和追责</li><li>把整份无关文档全部塞进上下文</li><li>通过检索记录定位漏召回与排序问题</li></ul></article><article className="boundary-no"><span className="card-label"><Icon name="close" size={16} /> 这条设计没挡住</span><ul><li>资料本身错误、过期或带有恶意指令</li><li>权限过滤遗漏导致越权资料进入上下文</li><li>检索不到未被采集或无法解析的资料</li><li>模型编造引用或曲解证据内容</li><li>没有评估集时无法证明回答质量提升</li></ul></article></div>
        <div className="stop-card"><div className="stop-top"><span><Icon name="check" size={17} /> RAG 全景已展开</span><small>{ragModules.length} 个依赖模块 · 完整状态与示例</small></div><h3>不止学会“接一个向量库”，而是看懂资料怎样变成可检索、可过滤、可引用的证据。</h3><p>每个模块都包含理念、设计、诞生动机、核心抽象、完整执行状态、可复现示例、代价与边界。</p><div className="stop-footer"><span>RAG 依赖图</span><strong>{ragModules.length} / {ragModules.length} 模块可用</strong><span>六条技术轨道均可独立深潜</span></div></div>
      </section>
      <footer className="page-footer"><div><Icon name="database" size={22} /><span>心智实验室</span></div><p>不是让模型记住更多，而是让每个结论都能回到证据。</p><span>ROUND 04 / RAG</span></footer>
    </>
  )
}
