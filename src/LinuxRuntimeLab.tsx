import { useEffect, useMemo, useState } from 'react'
import { Icon } from './Icons'

/** 进程教学轨迹中的固定阶段；状态名与说明来自 Linux 进程模型，不对应真实系统进程。 */
const processSteps = [
  { id: 'shell', label: 'Shell 启动命令', state: '父进程运行中', detail: 'Shell 解析输入后创建子进程。此时子进程先复制父进程的程序状态，还没有变成目标命令。', pid: '101', ppid: '100', command: 'bash', stateCode: 'R' },
  { id: 'fork', label: '创建子进程', state: '子进程已创建', detail: 'fork 让内核创建一个新进程，分配新的进程编号。子进程和父进程此时运行的是同一个程序，但后续执行路径可以分开。', pid: '202', ppid: '101', command: 'bash（子进程）', stateCode: 'R' },
  { id: 'exec', label: '替换为目标程序', state: '子进程开始运行 worker', detail: 'exec 用 worker 程序替换子进程当前的程序内容，进程编号保持不变。程序换了，不代表创建了一个新进程。', pid: '202', ppid: '101', command: 'worker', stateCode: 'S' },
  { id: 'term', label: '收到终止信号', state: 'worker 正在退出', detail: 'TERM 是默认终止信号。程序可以捕获它，先保存进度、关闭连接，再退出；它不是强制断电。', pid: '202', ppid: '101', command: 'worker', stateCode: 'S' },
  { id: 'zombie', label: '进程已退出', state: '等待父进程回收', detail: '进程已经结束，但父进程还没有读取退出状态，内核保留一条僵尸记录。这时它不再执行代码，却仍占一个进程表项。', pid: '202', ppid: '101', command: 'worker [已退出]', stateCode: 'Z' },
  { id: 'wait', label: '父进程回收', state: '进程记录被释放', detail: '父进程调用 wait 读取退出状态后，内核删除僵尸记录。只杀进程不等于清理已经结束的子进程。', pid: '—', ppid: '—', command: '无残留进程', stateCode: '—' },
] as const

/** 权限实验中的三类用户；角色只决定所属组，不直接绕过文件权限。 */
const users = [
  { id: 'alice', name: 'Alice', role: '文件所有者', group: 'owner' },
  { id: 'bob', name: 'Bob', role: '同组成员', group: 'group' },
  { id: 'carol', name: 'Carol', role: '其他用户', group: 'other' },
] as const

type PermissionClass = 'owner' | 'group' | 'other'
type PermissionAction = 'read' | 'write' | 'execute'

/** 初始权限 -rw-r-----：所有者可读写，组内可读，其他用户无权访问。 */
const initialPermissions: Record<PermissionClass, Record<PermissionAction, boolean>> = {
  owner: { read: true, write: true, execute: false },
  group: { read: true, write: false, execute: false },
  other: { read: false, write: false, execute: false },
}

/** 把三类权限转换成传统 rwx 字符串，帮助读者把图形状态与 chmod 数字联系起来。 */
function modeString(permissions: Record<PermissionClass, Record<PermissionAction, boolean>>) {
  const convert = (value: PermissionClass) => ['read', 'write', 'execute'].map((action) => permissions[value][action as PermissionAction] ? ({ read: 'r', write: 'w', execute: 'x' } as Record<string, string>)[action] : '-').join('')
  return `-${convert('owner')}${convert('group')}${convert('other')}`
}

/**
 * Linux 运行时实验室。
 * “进程”页播放 fork/exec/信号/回收的完整状态；“权限”页让读者切换 rwx 并预判三个用户的访问结果。
 * 所有数据都是本地教学模拟，不创建或终止真实进程，也不修改真实文件权限。
 */
export function LinuxRuntimeLab() {
  const [tab, setTab] = useState<'process' | 'permissions'>('process')
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [permissions, setPermissions] = useState(initialPermissions)
  const current = processSteps[step]

  const outcomes = useMemo(() => users.map((user) => {
    const granted = permissions[user.group]
    return { ...user, read: granted.read, write: granted.write, execute: granted.execute }
  }), [permissions])

  const advance = () => {
    setPlaying(false)
    setStep((value) => Math.min(processSteps.length - 1, value + 1))
  }

  const toggle = (permissionClass: PermissionClass, action: PermissionAction) => {
    setPermissions((previous) => ({ ...previous, [permissionClass]: { ...previous[permissionClass], [action]: !previous[permissionClass][action] } }))
  }

  return (
    <div className="linux-lab">
      <div className="rag-lab-toolbar">
        <div><span className="eyebrow">教学模拟 · 不操作真实系统</span><strong>把进程状态和文件权限变成可见证据</strong></div>
        <div className="rag-scenario-tabs" role="tablist" aria-label="Linux 实验">
          <button role="tab" aria-selected={tab === 'process'} className={tab === 'process' ? 'is-active' : ''} onClick={() => { setTab('process'); setPlaying(false) }}>进程生命周期</button>
          <button role="tab" aria-selected={tab === 'permissions'} className={tab === 'permissions' ? 'is-active' : ''} onClick={() => { setTab('permissions'); setPlaying(false) }}>文件权限</button>
        </div>
      </div>

      {tab === 'process' ? (
        <>
          <div className="linux-process-canvas">
            <div className="linux-process-tree">
              <div className="linux-process-root"><span>PID 100</span><strong>系统初始化进程</strong><small>PPID 0</small></div>
              <i />
              <div className={`linux-process-node${current.pid === '101' ? ' is-active' : ''}`}><span>PID 101</span><strong>bash</strong><small>父 Shell · R</small></div>
              <i />
              <div className={`linux-process-node${current.pid === '202' ? ' is-active' : ''}${current.stateCode === 'Z' ? ' is-zombie' : ''}`}><span>{current.pid === '—' ? 'PID —' : 'PID 202'}</span><strong>{current.command}</strong><small>{current.pid === '—' ? '已回收' : `PPID 101 · ${current.stateCode}`}</small></div>
            </div>
            <div className="linux-process-fact"><span className="eyebrow">当前状态 · {current.label}</span><h3>{current.state}</h3><p>{current.detail}</p><div><span>PID<strong>{current.pid}</strong></span><span>PPID<strong>{current.ppid}</strong></span><span>状态码<strong>{current.stateCode}</strong></span></div></div>
          </div>
          <div className="linux-process-steps">{processSteps.map((item, index) => <button key={item.id} className={`${index === step ? 'is-active' : ''}${index < step ? ' is-past' : ''}`} onClick={() => { setStep(index); setPlaying(false) }}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.label}</strong></button>)}</div>
          <div className="rag-lab-footer"><button className="rag-play" onClick={() => { if (step === processSteps.length - 1) setStep(0); setPlaying((value) => !value) }}><Icon name={playing ? 'pause' : 'play'} size={15} />{playing ? '暂停播放' : step === processSteps.length - 1 ? '重新播放' : '播放状态变化'}</button><p><Icon name="spark" size={14} />重点：fork 创建进程，exec 替换程序，wait 回收已退出的子进程。</p><div><button disabled={step === 0} onClick={() => { setStep((value) => value - 1); setPlaying(false) }}><Icon name="arrow" size={13} className="rotate-180" />上一步</button><button disabled={step === processSteps.length - 1} onClick={advance}>下一步<Icon name="arrow" size={13} /></button></div></div>
          {playing && <LinuxAutoAdvance step={step} last={processSteps.length - 1} onAdvance={() => setStep((value) => value + 1)} onStop={() => setPlaying(false)} />}
        </>
      ) : (
        <div className="linux-permission-lab">
          <div className="linux-file-card"><Icon name="folder" size={25} /><div><small>所有者为 Alice，所属组为 ops</small><strong>report.txt</strong><code>{modeString(permissions)}</code></div></div>
          <div className="linux-permission-editor">
            {(['owner', 'group', 'other'] as PermissionClass[]).map((permissionClass) => <div key={permissionClass}><strong>{permissionClass === 'owner' ? '所有者' : permissionClass === 'group' ? '同组用户' : '其他用户'}</strong><span>{(['read', 'write', 'execute'] as PermissionAction[]).map((action) => <label key={action}><input type="checkbox" checked={permissions[permissionClass][action]} onChange={() => toggle(permissionClass, action)} />{action === 'read' ? '读 r' : action === 'write' ? '写 w' : '执行 x'}</label>)}</span></div>)}
          </div>
          <div className="linux-access-table"><div><span>用户</span><span>身份</span><span>读</span><span>写</span><span>执行</span></div>{outcomes.map((outcome) => <article key={outcome.id}><strong>{outcome.name}</strong><span>{outcome.role}</span>{[outcome.read, outcome.write, outcome.execute].map((allowed, index) => <span key={index} className={allowed ? 'is-allowed' : 'is-denied'}>{allowed ? '允许' : '拒绝'}</span>)}</article>)}</div>
          <p className="linux-permission-note"><Icon name="shield" size={15} />系统按“所有者 → 同组 → 其他”选择第一类匹配身份生效，不是把三组权限相加。目录的执行权限表示能否进入该目录，而不是运行目录。</p>
        </div>
      )}
    </div>
  )
}

/** 自动播放只负责推进步骤，到末尾停止；单独拆出可避免主组件定时器与手动操作互相覆盖。 */
function LinuxAutoAdvance({ step, last, onAdvance, onStop }: { step: number; last: number; onAdvance: () => void; onStop: () => void }) {
  useEffect(() => {
    if (step >= last) {
      onStop()
      return
    }
    const timer = window.setTimeout(onAdvance, 1800)
    return () => window.clearTimeout(timer)
  }, [step, last, onAdvance, onStop])
  return null
}
