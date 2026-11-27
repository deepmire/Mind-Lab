/**
 * 根据知识模块提供的 ExampleDiagram 数据渲染通用机制图。
 * 组件只负责流程、分层和对比三种视觉布局，不推导教学结论，也不修改传入的数据。
 */
import type { ExampleDiagram } from './knowledgeTypes'
import { Icon } from './Icons'

/**
 * 输入一份完整机制图数据，输出带标题、说明、条目与脚注的 figure。
 * @param diagram.kind 决定是否在条目间显示流程箭头；items 的顺序即教学阅读顺序。
 * @remarks 图形标题通过 aria-label 暴露；条目色调仅增强语义，正文仍完整保留信息。
 */
export function MechanismDiagram({ diagram }: { diagram: ExampleDiagram }) {
  // figure 的可访问名称与可见标题保持一致；kind 只切换布局类，内容作者无需关心 CSS。
  return (
    <figure className={`mechanism-diagram diagram-${diagram.kind}`} aria-label={diagram.title}>
      <div className="diagram-heading">
        <div><span className="eyebrow">MECHANISM MAP</span><h3>{diagram.title}</h3></div>
        <Icon name="network" size={22} />
      </div>
      <p className="diagram-caption">{diagram.caption}</p>
      <div className="diagram-items">
        {diagram.items.map((item, index) => (
          <div className="diagram-item-wrap" key={`${item.title}-${index}`}>
            <article className={`diagram-item tone-${item.tone ?? 'green'}`}>
              {item.tag && <span className="diagram-tag">{item.tag}</span>}
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
            {/* 只有流程布局需要连接箭头，且最后一项之后不渲染，避免暗示不存在的下一状态。 */}
            {diagram.kind === 'flow' && index < diagram.items.length - 1 && (
              <span className="diagram-arrow" aria-hidden="true"><Icon name="arrow" size={18} /></span>
            )}
          </div>
        ))}
      </div>
      {diagram.footnote && <figcaption><Icon name="spark" size={14} />{diagram.footnote}</figcaption>}
    </figure>
  )
}
