/**
 * 上下文预算交互实验：用可拖动的历史与检索 token 数演示输入预留、顺序裁剪和溢出分支。
 * 这是教学模型，不调用 tokenizer，也不修改真实请求；所有数值仅用于表达预算分配因果关系。
 */
import { useState } from 'react'
import { Icon } from './Icons'

/** 固定区块按系统规则、目标、工具与稳定偏好的优先级排列；裁剪时不能因超预算静默跳过这些约束。 */
const fixed = [
  { id: 'system', name: '系统规则', tokens: 420, role: '不可被检索结果覆盖' },
  { id: 'user', name: '用户目标', tokens: 120, role: '当前任务意图' },
  { id: 'tools', name: '工具 schema', tokens: 300, role: '模型可选择的动作' },
  { id: 'memory', name: '稳定偏好', tokens: 500, role: '跨轮保留的少量事实' },
]

/** 模型总窗口与输出预留共同定义输入上限；预留必须在选取上下文之前扣除，不能等溢出后再补。 */
const windowSize = 4096
const outputReserve = 512
const inputBudget = windowSize - outputReserve

/**
 * 上下文预算实验的无状态输入、有状态展示组件。
 * 输入来自两个范围滑杆，输出预算条、各区块保留/截断数量和溢出处置提示；不对外回调或持久化数据。
 */
export function ContextBudgetLab() {
  const [history, setHistory] = useState(1400)
  const [retrieved, setRetrieved] = useState(800)
  // 动态区块的状态直接取滑杆数值，确保拖动、预设按钮和结果视图始终共享同一份输入。
  const dynamic = [
    { id: 'history', name: '会话历史', tokens: history, role: '越新越重要，可摘要' },
    { id: 'retrieved', name: '检索证据', tokens: retrieved, role: '与当前问题相关，可裁剪' },
  ]
  const blocks = [...fixed, ...dynamic]
  const total = blocks.reduce((sum, block) => sum + block.tokens, 0)
  const overflow = Math.max(0, total - inputBudget)
  // 按 blocks 顺序贪心保留，remaining 是跨条目共享的剩余额度；固定约束因此优先于可压缩内容。
  let remaining = inputBudget
  const visible = blocks.map((block) => {
    const kept = Math.max(0, Math.min(block.tokens, remaining))
    remaining -= kept
    return { ...block, kept, dropped: block.tokens - kept }
  })
  const status = overflow ? '需要裁剪' : '预算充足'

  return (
    <div className="context-budget-lab">
      <div className="context-lab-head"><div><span className="eyebrow">可动手的上下文实验</span><h3>上下文窗口不是无限聊天记录</h3><p>拖动历史与检索证据，观察哪些内容进入模型请求，哪些被截断。</p></div><div className={`budget-status ${overflow ? 'is-over' : ''}`}><strong>{status}</strong><span>{total.toLocaleString()} / {windowSize.toLocaleString()} token</span></div></div>
      <div className="context-lab-primer"><p><strong>token</strong> 是模型处理文字的小单位，可粗略理解为“字词碎片”；这里只比较占用比例，不代表某个真实模型的精确计数。</p><p><strong>输出预留</strong> 是先给模型回答留下的空间；<strong>工具 schema</strong> 是告诉模型有哪些工具、要填哪些参数的说明。</p></div>
      {/* 填充宽度封顶 100%，防止超预算时溢出容器；输入上限标记仍按总窗口比例定位，区分窗口与可输入额度。 */}
      <div className="budget-meter"><div className="budget-meter-fill" style={{ width: `${Math.min(100, total / windowSize * 100)}%` }} /><span style={{ left: `${inputBudget / windowSize * 100}%` }}>输入上限 {inputBudget}</span></div>
      <div className="budget-columns">
        {/* 每个滑杆都提供显式 aria-label，确保辅助技术用 token 单位称呼控件，而不是只读出相邻说明。 */}
        <div className="budget-controls">
          <label><span><strong>会话历史</strong><small>可摘要，不能无限追加</small></span><output>{history} token</output><input aria-label="会话历史 token" type="range" min="0" max="2400" step="100" value={history} onChange={(event) => setHistory(Number(event.target.value))} /></label>
          <label><span><strong>检索证据</strong><small>相关不等于都应塞入</small></span><output>{retrieved} token</output><input aria-label="检索证据 token" type="range" min="0" max="2200" step="100" value={retrieved} onChange={(event) => setRetrieved(Number(event.target.value))} /></label>
          <div className="budget-presets"><button onClick={() => { setHistory(600); setRetrieved(900) }}>紧凑上下文</button><button onClick={() => { setHistory(1400); setRetrieved(800) }}>接近上限</button><button onClick={() => { setHistory(2400); setRetrieved(2200) }}>制造溢出</button></div>
          <p><Icon name="shield" size={14} />为输出预留 {outputReserve} token；超限时优先压缩历史和证据，而不是静默删除系统规则。</p>
        </div>
        <div className="context-stack">
          {/* 0 token 区块没有可截断内容，条宽按 100% 展示且不显示“截断”提示，避免 0/0 误导。 */}
          {visible.map((block) => <div className={`context-block ${block.dropped ? 'is-truncated' : ''}`} key={block.id}><div><span>{block.name}</span><code>{block.kept} / {block.tokens}</code></div><p>{block.role}</p><div className="context-block-bar"><i style={{ width: `${block.tokens ? block.kept / block.tokens * 100 : 100}%` }} /></div>{block.dropped > 0 && <small>截断 {block.dropped} token</small>}</div>)}
          <div className="context-output-reserve"><span>输出预留</span><strong>{outputReserve} token</strong></div>
        </div>
      </div>
      <div className="context-lab-result"><Icon name={overflow ? 'close' : 'check'} size={17} /><p>{overflow ? <>超出输入预算 <strong>{overflow} token</strong>。宿主必须选择摘要、检索裁剪或拒绝请求；模型不会自己发现“已经装不下”。</> : <>所有内容均在输入预算内，但仍需检查相关性、信息新鲜度与权限；token 没超并不代表上下文质量高。</>}</p></div>
    </div>
  )
}
