/**
 * cgroup v2 交互实验台：把委派控制器、创建节点、写入上限、迁入进程与内核记账串成可播放状态。
 * 所有文件、进程号和资源读数均为本地模拟，不读取或修改真实 /sys/fs/cgroup。
 */
import { useEffect, useState } from 'react'
import { Icon } from './Icons'

/** 工作负载类型只切换模拟读数；三种场景共享同一套 cgroup 生命周期阶段。 */
type Scenario = 'memory' | 'cpu' | 'pids'

/**
 * 生命周期阶段的唯一事实来源，依次对应 0—6。
 * 阶段顺序是不变量：先配置与创建，再迁入进程，最后在进程退出后清理；资源限制写入不等于立即产生用量。
 */
const stages = [
  { title: '检查统一层级', file: 'cgroup.controllers', event: '确认 cpu / memory / pids 可用' },
  { title: '父节点委派控制器', file: 'cgroup.subtree_control', event: '写入 +cpu +memory +pids' },
  { title: '创建 demo cgroup', file: 'mkdir demo', event: '内核自动生成控制文件' },
  { title: '写入资源上限', file: '*.max', event: '限制已配置，但尚无资源使用' },
  { title: '迁入工作进程', file: 'cgroup.procs', event: '整个线程组进入 demo' },
  { title: '内核记账与执行', file: 'current / stat', event: '资源开始计入，限制参与决策' },
  { title: '读取事件并清理', file: '*.events', event: 'populated 归零后删除目录' },
]

/** 场景键到可见标签的映射；Record 约束确保新增 Scenario 时必须补齐页签文案。 */
const scenarioLabels: Record<Scenario, string> = {
  memory: '内存增长',
  cpu: 'CPU 繁忙',
  pids: '进程增殖',
}

/**
 * cgroup 生命周期模拟器，无外部输入。
 * 内部维护阶段、播放状态、场景与三类资源上限，输出阶段树、资源仪表和事件日志；重置只恢复阶段，不改变滑杆配置。
 */
export function CgroupLab() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [scenario, setScenario] = useState<Scenario>('memory')
  const [cpuQuota, setCpuQuota] = useState(50)
  const [memoryMax, setMemoryMax] = useState(64)
  const [pidsMax, setPidsMax] = useState(16)

  // 播放采用“当前阶段等待一个 timeout”的递归调度；暂停或跳转会清理旧 timer，避免多个回调同时推进 step。
  useEffect(() => {
    if (!playing) return
    // 到达终态后必须停止播放，而不是继续创建永远不推进状态的定时器。
    if (step === stages.length - 1) {
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(() => setStep((value) => value + 1), 900)
    return () => window.clearTimeout(timer)
  }, [playing, step])

  // 手动跳转同时暂停自动播放，并把越界索引夹到首尾阶段，保证任何按钮组合都不会产生 undefined 阶段。
  const jump = (next: number) => {
    setPlaying(false)
    setStep(Math.max(0, Math.min(stages.length - 1, next)))
  }

  // 阶段阈值是视图语义：active 才产生用量，enforced 才展示限制参与决策，finished 才展示退出后的清理结果。
  const active = step >= 4
  const enforced = step >= 5
  const finished = step === 6
  // 模拟负载先尝试增长到 72 MiB，再由 memory.max 截断实际用量；演示中达到该需求且上限不超过它时展示 OOM。
  const memoryUsed = !active ? 0 : scenario === 'memory' ? Math.min(memoryMax, [0, 0, 0, 0, 8, 48, 72][step]) : 12
  const memoryOom = finished && scenario === 'memory' && memoryMax <= 72
  const cpuThrottled = finished && scenario === 'cpu' && cpuQuota < 100
  // pids.current 只展示成功进入 cgroup 的任务，超限的 fork 体现为拒绝事件而非继续增加 current。
  const pidsTarget = scenario === 'pids' ? [0, 0, 0, 0, 3, 12, 20][step] : 1
  const pidsUsed = !active ? 0 : Math.min(pidsMax, pidsTarget)
  const pidsRejected = finished && scenario === 'pids' && pidsTarget > pidsMax
  // CPU 场景用 quota + 24 表示可运行需求，再夹到 120% 便于展示节流；仪表宽度另有限幅，不改变该读数。
  const cpuPercent = !active ? 0 : scenario === 'cpu' ? Math.min(cpuQuota + 24, 120) : 8

  const reset = () => {
    setPlaying(false)
    setStep(0)
  }

  // 区域名称帮助辅助技术定位实验台；内部图标按钮和场景页签另有独立标签与选中状态。
  return (
    <div className="cgroup-lab" aria-label="cgroup v2 交互实验台">
      <div className="lab-heading">
        <div><span className="live-dot" /><strong>cgroup v2 状态实验台</strong><small>只模拟内核状态，不修改你的宿主机</small></div>
        <div className="transport">
          <button className="icon-button" onClick={reset} aria-label="重置 cgroup 实验"><Icon name="reset" size={16} /></button>
          {/* 终态再次播放时先回到阶段 0，再切换 playing；否则终态停止逻辑会立即使播放失败。 */}
          <button className="play-button" onClick={() => { if (step === 6) setStep(0); setPlaying((value) => !value) }}><Icon name={playing ? 'pause' : 'play'} size={15} />{playing ? '暂停' : step === 6 ? '重新运行' : '运行实验'}</button>
        </div>
      </div>

      <div className="lab-controls">
        <div className="scenario-tabs" role="tablist" aria-label="工作负载类型">
          {(Object.keys(scenarioLabels) as Scenario[]).map((key) => <button key={key} role="tab" aria-selected={scenario === key} className={scenario === key ? 'is-active' : ''} onClick={() => { setScenario(key); reset() }}>{scenarioLabels[key]}</button>)}
        </div>
        <label><span>CPU 配额 <strong>{cpuQuota}%</strong></span><input type="range" min="10" max="100" step="10" value={cpuQuota} onChange={(event) => setCpuQuota(Number(event.target.value))} /></label>
        <label><span>内存上限 <strong>{memoryMax} MiB</strong></span><input type="range" min="16" max="128" step="16" value={memoryMax} onChange={(event) => setMemoryMax(Number(event.target.value))} /></label>
        <label><span>进程上限 <strong>{pidsMax}</strong></span><input type="range" min="4" max="64" step="4" value={pidsMax} onChange={(event) => setPidsMax(Number(event.target.value))} /></label>
      </div>

      <div className="lab-stage">
        <div className="cgroup-tree">
          <div className="tree-label">统一 hierarchy</div>
          <div className="tree-root"><Icon name="shield" size={16} /><div><strong>/sys/fs/cgroup</strong><small>cgroup2fs</small></div></div>
          <div className={`tree-branch ${step >= 1 ? 'is-active' : ''}`}><span>subtree_control</span><strong>+cpu +memory +pids</strong></div>
          <div className={`tree-child ${step >= 2 ? 'is-created' : ''}`}><div className="tree-child-head"><Icon name="box" size={16} /><strong>docker-lab-demo</strong><span>{step >= 6 ? 'removed' : step >= 2 ? 'exists' : 'waiting'}</span></div>
            <div className="tree-files">
              <div className={step >= 3 ? 'is-written' : ''}><code>cpu.max</code><span>{step >= 3 ? `${cpuQuota * 1000} 100000` : '—'}</span></div>
              <div className={step >= 3 ? 'is-written' : ''}><code>memory.max</code><span>{step >= 3 ? `${memoryMax * 1024 * 1024}` : '—'}</span></div>
              <div className={step >= 3 ? 'is-written' : ''}><code>pids.max</code><span>{step >= 3 ? `${pidsMax}` : '—'}</span></div>
              <div className={active ? 'is-written' : ''}><code>cgroup.procs</code><span>{active ? 'PID 4217 + threads' : 'empty'}</span></div>
            </div>
          </div>
        </div>

        <div className="kernel-accounting">
          <div className="accounting-title"><span>内核实时视图</span><small>{enforced ? 'enforcing' : active ? 'accounting' : 'idle'}</small></div>
          <div className="resource-meter"><div><span>CPU</span><strong>{cpuPercent}%</strong></div><div className="meter-track"><i style={{ width: `${Math.min(cpuPercent, 100)}%` }} className={cpuThrottled ? 'is-warning' : ''} /></div><small>{cpuThrottled ? `nr_throttled=12 · throttled_usec=840000` : enforced ? 'quota 生效，等待调度周期' : '尚未迁入进程'}</small></div>
          <div className="resource-meter"><div><span>Memory</span><strong>{memoryUsed} / {memoryMax} MiB</strong></div><div className="meter-track"><i style={{ width: `${Math.min(100, memoryUsed / memoryMax * 100)}%` }} className={memoryOom ? 'is-warning' : ''} /></div><small>{memoryOom ? 'max=1 · oom=1 · oom_kill=1' : enforced ? 'memory.current 持续更新' : 'current=0'}</small></div>
          <div className="resource-meter"><div><span>PIDs</span><strong>{pidsUsed} / {pidsMax}</strong></div><div className="meter-track"><i style={{ width: `${Math.min(100, pidsUsed / pidsMax * 100)}%` }} className={pidsRejected ? 'is-warning' : ''} /></div><small>{pidsRejected ? 'pids.events max=3 · fork 被拒绝' : enforced ? '任务数受 pids.max 约束' : 'current=0'}</small></div>
          <div className="populated-card"><span>cgroup.events</span><code>populated {active && step < 6 ? 1 : 0}</code><small>{step === 6 ? '进程已退出，可以删除空 cgroup' : '非空 cgroup 不能强拆'}</small></div>
        </div>
      </div>

      <div className="lab-timeline">
        {stages.map((stage, index) => <button key={stage.title} className={index === step ? 'is-current' : index < step ? 'is-past' : ''} onClick={() => jump(index)}><span>{index + 1}</span><strong>{stage.title}</strong></button>)}
      </div>
      {/* step 作为 key 让阶段切换时重新挂载说明区，从而复用现有入场动效而不引入额外动画状态。 */}
      <div className="lab-step-detail" key={step}>
        <div><span className="eyebrow">STATE {String(step + 1).padStart(2, '0')}</span><h3>{stages[step].title}</h3></div>
        <code>{stages[step].file}</code>
        <p>{stages[step].event}</p>
        <div className="lab-event-log">
          {stages.slice(0, step + 1).map((item, index) => <span key={item.title} className={index === step ? 'is-current' : ''}><i />{item.event}</span>)}
        </div>
      </div>
    </div>
  )
}
