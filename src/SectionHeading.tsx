/**
 * 课程章节的统一标题组件。
 * 输入两位章节序号、标题与可选导语，输出带语义层级的 header；序号同时用于视觉定位和标题朗读。
 */
export function SectionHeading({ number, title, lead }: { number: number; title: string; lead?: string }) {
  return (
    <header className="section-heading">
      {/* 视觉序号补零保持章节节奏，标题中的原始序号则保留自然读法，避免把“01”读成额外内容。 */}
      <div className="section-title-line"><span>{String(number).padStart(2, '0')}</span><h2><b>{number}.</b> {title}</h2></div>
      {lead && <p>{lead}</p>}
    </header>
  )
}
