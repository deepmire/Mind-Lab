/**
 * 镜像分层重点剖析：分别展示构建期、仓库与本地、运行期三个阶段，并解释四种文件操作在 overlayfs 中的结果。
 * 面板由本地选中状态切换，不构建镜像、不访问仓库，也不操作真实文件系统。
 */
import { useState } from 'react'
import { Icon } from './Icons'

/** 三个教学阶段对应“制品如何产生、如何分发、如何运行”的不同生命周期边界。 */
type Stage = 'build' | 'distribution' | 'runtime'
/** 运行期可对比的文件操作；映射表必须为每种操作给出 lower、upper、merged 与规则。 */
type Operation = 'read' | 'write' | 'delete' | 'create'

/** Dockerfile 指令到构建结果的对照；effect 仅用于视觉分类，不参与构建逻辑。 */
const buildRows = [
  { instruction: 'FROM python:3.12-slim', result: '引入基础镜像已有的层', effect: 'base' },
  { instruction: 'WORKDIR /app', result: '写入 config 的 WorkingDir', effect: 'metadata' },
  { instruction: 'COPY requirements.txt .', result: '新增 /app/requirements.txt', effect: 'layer' },
  { instruction: 'RUN pip wheel ...', result: '新增 /wheels 下的 wheel 文件', effect: 'layer' },
  { instruction: 'COPY app.py .', result: '新增 /app/app.py', effect: 'layer' },
  { instruction: 'USER 10001 / CMD ...', result: '写入启动元数据', effect: 'metadata' },
]

/** 四种操作的完整解释表；三列文件系统视图是不变量，rule 用一句话澄清 copy-up 或 whiteout 等易误解机制。 */
const operationCopy: Record<Operation, { title: string; lower: string; upper: string; merged: string; rule: string }> = {
  read: {
    title: '读一个下层文件',
    lower: '/etc/hostname 存在',
    upper: '没有对应文件',
    merged: '/etc/hostname ← lower',
    rule: '只读访问直接穿透到 lower，不发生 copy-up。',
  },
  write: {
    title: '修改一个下层文件',
    lower: '/etc/hostname 保持原样',
    upper: '/etc/hostname 完整复制后修改',
    merged: '/etc/hostname ← upper',
    rule: '首次修改触发 copy-up；upper 保存的是文件新版本，不是“补丁字节”。',
  },
  delete: {
    title: '删除一个下层文件',
    lower: '/etc/hostname 仍然存在',
    upper: '创建 whiteout 隐藏标记',
    merged: '/etc/hostname 不可见',
    rule: '删除不会真的删掉 lower；上层用 whiteout 在合并视图中隐藏它。',
  },
  create: {
    title: '新建一个文件',
    lower: '没有这个文件',
    upper: '/data/log.txt 直接写入',
    merged: '/data/log.txt ← upper',
    rule: '新文件直接进入 upper，不需要先从 lower 复制。',
  },
}

/**
 * 镜像层剖析组件，无外部输入。
 * stage 控制三个阶段面板，operation 只影响运行期内容；输出构建指令映射、分发摘要或文件操作对照。
 */
export function ImageLayerAnatomy() {
  const [stage, setStage] = useState<Stage>('build')
  const [operation, setOperation] = useState<Operation>('read')
  const current = operationCopy[operation]

  return (
    <section className="layer-anatomy" aria-label="镜像分层重点剖析">
      <div className="layer-anatomy-head">
        <div><span className="anatomy-badge"><Icon name="layers" size={14} /> 重点剖析</span><h3>镜像里的“只读层”到底是什么？</h3><p>它不是一份完整文件系统，而是相对父层的一组文件变化；运行时的可写层又是另一回事。</p></div>
        <div className="anatomy-tabs" role="tablist" aria-label="镜像层阶段">
          <button role="tab" aria-selected={stage === 'build'} className={stage === 'build' ? 'is-active' : ''} onClick={() => setStage('build')}>构建期</button>
          <button role="tab" aria-selected={stage === 'distribution'} className={stage === 'distribution' ? 'is-active' : ''} onClick={() => setStage('distribution')}>仓库与本地</button>
          <button role="tab" aria-selected={stage === 'runtime'} className={stage === 'runtime' ? 'is-active' : ''} onClick={() => setStage('runtime')}>运行期</button>
        </div>
      </div>

      {/* 三阶段互斥渲染，确保同一时刻只解释一个生命周期问题；选中状态保留在 stage 中。 */}
      {stage === 'build' && (
        <div className="anatomy-panel build-anatomy">
          <div className="instruction-map">
            <span className="panel-label">DOCKERFILE 指令 → 构建结果</span>
            {buildRows.map((row) => (
              <div className={`instruction-row ${row.effect === 'layer' ? 'creates-layer' : row.effect === 'metadata' ? 'metadata-only' : 'base-reference'}`} key={row.instruction}>
                <code>{row.instruction}</code>
                <span>{row.effect === 'layer' ? '生成 diff 层' : row.effect === 'metadata' ? '只改元数据' : '引用已有层'}</span>
                <p>{row.result}</p>
              </div>
            ))}
          </div>
          {/* 视觉栈自顶向下对应镜像层顺序；config 独立于文件层，元数据指令不会额外生成 stack-layer。 */}
          <div className="layer-stack-view">
            <span className="panel-label">最终镜像的结构</span>
            <div className="config-slab"><code>image config blob</code><span>JSON：CMD / ENV / USER / WorkingDir / rootfs.diff_ids</span></div>
            <div className="stack-layer"><strong>Layer 5</strong><code>+ /app/app.py</code></div>
            <div className="stack-layer"><strong>Layer 4</strong><code>+ /wheels/*.whl</code></div>
            <div className="stack-layer"><strong>Layer 3</strong><code>+ /app/requirements.txt</code></div>
            <div className="stack-layer base-layer"><strong>Base layers</strong><code>Python + Debian 文件变化</code></div>
            <div className="layer-truth"><Icon name="spark" size={15} /><p><strong>准确说法：</strong>COPY 与 RUN 通常产生文件系统 diff；WORKDIR、ENV、USER、CMD 通常只写 config，不产生新层。层内常以 tar 流表达新增、修改与删除，Docker 常见压缩格式是 gzip。</p></div>
          </div>
        </div>
      )}

      {/* 分发阶段将“仓库压缩内容”和“本地展开内容”分开，解释摘要为何不能混用。 */}
      {stage === 'distribution' && (
        <div className="anatomy-panel distribution-anatomy">
          <div className="manifest-map">
            <div className="manifest-node"><span>manifest index</span><strong>选择 linux/amd64</strong></div>
            <Icon name="arrow" size={20} />
            <div className="manifest-node"><span>platform manifest</span><strong>config digest + layer digests</strong></div>
            <Icon name="arrow" size={20} />
            <div className="blob-group"><div><code>config blob</code><small>启动元数据</small></div><div><code>layer blob 1</code><small>压缩内容</small></div><div><code>layer blob 2</code><small>压缩内容</small></div></div>
          </div>
          {/* 两类摘要分别描述压缩 blob 与解压 tar，故意并排展示以防止把 RepoDigest 当作 DiffID。 */}
          <div className="digest-compare">
            <article><span>仓库里的摘要</span><code>RepoDigest / manifest digest</code><p>常指压缩后的 manifest 或 blob 内容，用于仓库寻址与完整性校验。</p></article>
            <article><span>本地 RootFS.Layers</span><code>DiffID</code><p>对解压后的层 tar 内容计算，运行时用它核对层内容与顺序。</p></article>
          </div>
          <div className="layer-truth"><Icon name="spark" size={15} /><p><strong>为什么有两套摘要：</strong>同一层在仓库里是压缩 blob，在本地展开后是 tar 流；压缩前后内容不同，所以摘要自然不同。Tag 可以移动，digest 才精确指向内容。</p></div>
        </div>
      )}

      {/* 运行期面板保留上次选择的操作，只改变对照内容；切回构建或分发不会重置 operation。 */}
      {stage === 'runtime' && (
        <div className="anatomy-panel runtime-anatomy">
          <div className="operation-tabs" role="tablist" aria-label="文件操作">
            {(Object.keys(operationCopy) as Operation[]).map((key) => <button key={key} role="tab" aria-selected={operation === key} className={operation === key ? 'is-active' : ''} onClick={() => setOperation(key)}>{operationCopy[key].title}</button>)}
          </div>
          {/* lower/upper/merged 是同一文件路径的三种视图，三列内容全部来自当前 operation，不能单独修改。 */}
          <div className="runtime-layers">
            <article className="runtime-lower"><span>LOWER · 共享只读</span><strong>镜像层</strong><code>{current.lower}</code></article>
            <article className="runtime-upper"><span>UPPER · 容器私有</span><strong>可写层</strong><code>{current.upper}</code></article>
            <article className="runtime-merged"><span>MERGED · 应用可见</span><strong>统一视图</strong><code>{current.merged}</code></article>
          </div>
          <div className="operation-rule"><span>当前操作</span><strong>{current.title}</strong><p>{current.rule}</p></div>
        </div>
      )}
    </section>
  )
}
