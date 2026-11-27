import { useEffect, useMemo, useState } from 'react'
import { Icon } from './Icons'
import type { ModuleId } from './knowledgeTypes'

type ScenarioId = 'reconcile' | 'image-failure' | 'rollout'

type ScenarioStep = {
  title: string
  actor: string
  detail: string
  state: string
  evidence: string
  ready: number
}

type Scenario = {
  id: ScenarioId
  label: string
  intent: string
  invariant: string
  steps: ScenarioStep[]
}

/**
 * 三个教学场景共享同一播放器，但分别展示：
 * 1. 控制器不断缩小实际状态与期望状态的差距；
 * 2. 镜像失败时控制器不会伪造 Ready；
 * 3. 滚动发布先增加新副本，再逐个替换旧副本。
 */
const baseScenarios: Record<ScenarioId, Omit<Scenario, 'steps'>> = {
  reconcile: {
    id: 'reconcile',
    label: '副本纠偏',
    intent: '声明 Deployment/web 需要 3 个就绪副本；人为删除一个 Pod，观察系统如何重新达到期望状态。',
    invariant: '控制器不是“执行一次创建命令”，而是持续比较 desired 与 observed，并推动系统逼近 desired。',
  },
  'image-failure': {
    id: 'image-failure',
    label: '镜像失败分支',
    intent: '声明 2 个副本，但新 Pod 的镜像标签不存在，观察失败如何停留在可诊断状态而不是被当成 Ready。',
    invariant: '创建 Pod 不等于工作负载可用；只有容器通过 readiness 且进入 EndpointSlice，Service 才会把流量交给它。',
  },
  rollout: {
    id: 'rollout',
    label: '滚动发布',
    intent: '把 web 从 v1 滚动更新到 v2，使用 maxSurge=1、maxUnavailable=0，保持旧副本持续服务。',
    invariant: '滚动更新不是原地替换进程，而是创建新 ReplicaSet、等待新 Pod Ready，再逐步收缩旧 ReplicaSet。',
  },
}

/**
 * 根据场景和期望副本数生成确定性步骤。
 * 这些状态是教学模型，不是对某个 Kubernetes 版本的内部代码复刻。
 */
function buildSteps(scenario: ScenarioId, desiredReplicas: number): ScenarioStep[] {
  if (scenario === 'reconcile') {
    const observed = Math.max(0, desiredReplicas - 1)
    return [
      { title: '读取期望状态', actor: 'Deployment Controller', detail: `从 API 读取 Deployment/web：spec.replicas=${desiredReplicas}。`, state: `desired=${desiredReplicas}`, evidence: 'GET /apis/apps/v1/namespaces/demo/deployments/web', ready: observed },
      { title: '比较实际副本', actor: 'ReplicaSet Controller', detail: `观察到就绪 Pod 只有 ${observed} 个，与实际 ${desiredReplicas} 个的差距为 1。`, state: `observed=${observed} delta=-1`, evidence: 'List Pods by ownerReferences', ready: observed },
      { title: '创建替代 Pod', actor: 'ReplicaSet Controller', detail: '创建一个带有 ownerReference 的新 Pod；此时它还没有节点，也没有 Ready。', state: 'pending pod created', evidence: 'CREATE Pod/web-7d9f-new', ready: observed },
      { title: '绑定节点', actor: 'kube-scheduler', detail: '调度器执行 Filter 与 Score，选择 node-b，并把 spec.nodeName 写入 Pod。', state: 'pending → scheduled', evidence: 'PATCH Pod/web-7d9f-new spec.nodeName=node-b', ready: observed },
      { title: '拉取镜像并启动', actor: 'kubelet', detail: 'node-b 通过 CRI 拉取镜像、创建容器，并把状态写回 API Server。', state: 'scheduled → running', evidence: 'ContainerStatus state.running', ready: observed },
      { title: '通过就绪检查', actor: 'kubelet', detail: 'readinessProbe 成功后，Pod 的 Ready condition 变为 True。', state: 'running → ready', evidence: 'PodReady=True', ready: desiredReplicas },
      { title: '更新服务端点', actor: 'EndpointSlice Controller', detail: '新 Pod IP 被加入 EndpointSlice，Service 的数据面可以把请求转发给它。', state: 'endpoints updated', evidence: 'EndpointSlice addresses += 10.244.2.18', ready: desiredReplicas },
    ]
  }

  if (scenario === 'image-failure') {
    return [
      { title: '控制器发起补齐', actor: 'ReplicaSet Controller', detail: 'desired=2，当前只有 1 个 Ready，因此创建一个替代 Pod。', state: 'desired=2 observed=1', evidence: 'CREATE Pod/web-6c4-new', ready: 1 },
      { title: '调度成功但无法启动', actor: 'kubelet', detail: 'Pod 已绑定 node-a，但镜像 registry.demo/web:missing 不存在。', state: 'scheduled → waiting', evidence: 'reason=ImagePullBackOff', ready: 1 },
      { title: '记录失败事件', actor: 'API Server', detail: '事件说明镜像拉取失败；Deployment 的 availableReplicas 仍然是 1。', state: 'ready=1 available=1', evidence: 'Warning Failed image pull', ready: 1 },
      { title: '控制器退避重试', actor: 'kubelet / Controller', detail: 'kubelet 按退避策略重试镜像拉取，控制器不会把 Waiting Pod 当作成功副本。', state: 'waiting; retry backoff', evidence: 'Ready=False; restartCount 不变', ready: 1 },
      { title: '修复镜像标签', actor: 'Operator', detail: '把镜像改为存在的 web:v2；下一次拉取成功后容器进入 Running。', state: 'pulling → running', evidence: 'image=registry.demo/web:v2', ready: 1 },
      { title: '就绪并加入流量', actor: 'kubelet / EndpointSlice', detail: 'readinessProbe 成功后 Ready=True，随后 EndpointSlice 加入新 Pod。', state: 'ready=2 available=2', evidence: 'PodReady=True; endpoint added', ready: 2 },
    ]
  }

  return [
    { title: '保存旧版本期望', actor: 'Deployment Controller', detail: 'v1 的 ReplicaSet 维持 3 个 Ready 副本，Service 仍指向 v1 端点。', state: 'old=3 new=0', evidence: 'ReplicaSet/web-v1 replicas=3', ready: 3 },
    { title: '创建新版 ReplicaSet', actor: 'Deployment Controller', detail: '模板变为 v2，控制器新建 ReplicaSet/web-v2，并允许额外启动 1 个 Pod。', state: 'old=3 new=1 pending', evidence: 'maxSurge=1; maxUnavailable=0', ready: 3 },
    { title: '等待新 Pod Ready', actor: 'kubelet', detail: 'web-v2 Pod 启动并通过 readinessProbe；旧副本仍然全部可用。', state: 'old=3 new=1 ready', evidence: 'availableReplicas=3; readyReplicas=4', ready: 4 },
    { title: '收缩一个旧副本', actor: 'ReplicaSet Controller', detail: '新副本可用后，控制器把 v1 收缩到 2，并等待终止完成。', state: 'old=2 new=1 ready', evidence: 'web-v1 replicas=2', ready: 3 },
    { title: '继续替换旧副本', actor: 'Deployment Controller', detail: '重复“等待新版就绪 → 收缩旧版”，始终保留至少 3 个可用副本。', state: 'old=1 new=2 ready', evidence: 'Service endpoints 混合 v1/v2', ready: 3 },
    { title: '完成并保留历史', actor: 'Deployment Controller', detail: 'v2 达到 3 个 Ready，v1 收缩到 0；旧 ReplicaSet 按 revisionHistoryLimit 保留。', state: 'old=0 new=3 complete', evidence: 'Deployment condition Progressing=True', ready: 3 },
  ]
}

/**
 * Kubernetes 控制循环实验室。
 * 播放器只维护当前步骤索引，所有状态都由步骤数据派生，避免 UI 与模拟状态出现两份真相。
 */
export function KubernetesReconcileLab({ onOpenModule }: { onOpenModule: (id: ModuleId) => void }) {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('reconcile')
  const [desiredReplicas, setDesiredReplicas] = useState(3)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  const steps = useMemo(() => buildSteps(scenarioId, desiredReplicas), [scenarioId, desiredReplicas])
  const scenario = baseScenarios[scenarioId]
  const current = steps[step]
  const visibleReplicas = scenarioId === 'image-failure' ? 2 : scenarioId === 'rollout' ? Math.max(3, current.ready) : desiredReplicas

  useEffect(() => {
    setStep(0)
    setPlaying(false)
  }, [scenarioId, desiredReplicas])

  useEffect(() => {
    if (!playing) return
    if (step >= steps.length - 1) {
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(() => setStep((value) => value + 1), 2200)
    return () => window.clearTimeout(timer)
  }, [playing, step, steps.length])

  const selectScenario = (next: ScenarioId) => {
    setScenarioId(next)
  }

  return (
    <div className="kubernetes-lab">
      <div className="kubernetes-lab-head">
        <div>
          <span className="eyebrow">CONTROL LOOP PLAYGROUND</span>
          <h3>让期望状态与真实状态逐步对齐</h3>
          <p>{scenario.intent}</p>
        </div>
        <div className="scenario-switch" role="tablist" aria-label="Kubernetes 教学场景">
          {(Object.keys(baseScenarios) as ScenarioId[]).map((id) => (
            <button key={id} role="tab" aria-selected={scenarioId === id} className={scenarioId === id ? 'is-active' : ''} onClick={() => selectScenario(id)}>
              {baseScenarios[id].label}
            </button>
          ))}
        </div>
      </div>

      <div className="kubernetes-lab-intent">
        <span>DESIRED STATE</span>
        {scenarioId === 'reconcile' ? (
          <label>
            Deployment/web replicas
            <input aria-label="期望副本数" type="range" min="1" max="5" value={desiredReplicas} onChange={(event) => setDesiredReplicas(Number(event.target.value))} />
            <output>{desiredReplicas}</output>
          </label>
        ) : (
          <strong>{scenarioId === 'image-failure' ? 'replicas=2 · image=web:missing' : 'web:v1 → web:v2 · surge=1 · unavailable=0'}</strong>
        )}
      </div>

      <div className="kubernetes-step-tabs" role="tablist" aria-label="控制循环步骤">
        {steps.map((item, index) => (
          <button key={item.title} role="tab" aria-selected={index === step} className={index === step ? 'is-current' : index < step ? 'is-past' : ''} onClick={() => { setPlaying(false); setStep(index) }}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{item.title}</strong>
          </button>
        ))}
      </div>

      <div className="kubernetes-loop-stage" key={`${scenarioId}-${step}`}>
        <div className="kubernetes-loop-copy">
          <span className="agent-state-pill">{current.state}</span>
          <h4>{current.title}</h4>
          <p>{current.detail}</p>
          <div className="agent-decision"><Icon name="workflow" size={15} /><div><strong>当前执行者 · {current.actor}</strong>{scenario.invariant}</div></div>
        </div>
        <div className="kubernetes-cluster-view" aria-label={`当前 ${current.ready} 个就绪副本`}>
          <div className="kubernetes-api-node"><Icon name="database" size={19} /><div><strong>API Server + etcd</strong><small>保存期望状态与 resourceVersion</small></div></div>
          <div className="kubernetes-loop-line"><span /><Icon name="arrow" size={17} /><span /></div>
          <div className="kubernetes-pod-row">
            {Array.from({ length: visibleReplicas }).map((_, index) => {
              const isReady = index < current.ready
              const isFailed = scenarioId === 'image-failure' && index === 1 && step >= 1 && step <= 3
              return (
                <div className={`kubernetes-pod ${isReady ? 'is-ready' : isFailed ? 'is-failed' : 'is-pending'}`} key={index}>
                  <Icon name="box" size={19} />
                  <strong>web-{index + 1}</strong>
                  <small>{isReady ? 'Ready' : isFailed ? 'ImagePullBackOff' : 'Pending'}</small>
                </div>
              )
            })}
          </div>
          <div className="kubernetes-endpoint"><span className={current.ready > 0 ? 'result-dot' : 'result-dot is-off'} /><p><strong>Service/web</strong><small>EndpointSlice ready={current.ready}</small></p></div>
        </div>
      </div>

      <div className="kubernetes-event-strip">
        <span>EVENT / EVIDENCE</span>
        <code>{current.evidence}</code>
      </div>

      <div className="kubernetes-lab-controls">
        <div>
          <button className="icon-button" onClick={() => { setPlaying(false); setStep(0) }} aria-label="重置控制循环"><Icon name="reset" size={16} /></button>
          <button className="play-button" onClick={() => { if (!playing && step === steps.length - 1) setStep(0); setPlaying((value) => !value) }}><Icon name={playing ? 'pause' : 'play'} size={15} />{playing ? '暂停' : step === steps.length - 1 ? '重新播放' : '播放控制循环'}</button>
          <span>{step + 1} / {steps.length}</span>
        </div>
        <button onClick={() => onOpenModule(scenarioId === 'rollout' ? 'deployments-rollouts' : scenarioId === 'image-failure' ? 'probes-lifecycle' : 'kubernetes-architecture')}>进入对应深潜模块<Icon name="arrow" size={14} /></button>
      </div>
    </div>
  )
}
