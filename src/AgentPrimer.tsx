import { Icon } from './Icons'

const primerItems = [
  {
    name: '模型',
    plain: '一个根据输入文字，预测下一段文字的程序。它很像“超级自动补全”，不是保证正确的数据库。',
    example: '你问“怎样退票”，它生成一段回答，但回答仍可能编造。',
  },
  {
    name: '提示词',
    plain: '这次交给模型的任务说明，例如目标、规则和输出要求。它是输入的一部分，不是控制模型的程序。',
    example: '“只根据附件回答，找不到就说明不知道。”',
  },
  {
    name: '上下文',
    plain: '模型这一次实际能看到的全部内容，包括提示词、聊天记录、查到的资料和工具返回。没放进去的内容，它就不知道。',
    example: '像学生考试时摊在桌上的那几张资料页。',
  },
  {
    name: '工具',
    plain: '模型之外的一段程序或服务，能完成具体事情，例如搜索文档、查天气或创建工单。模型只能提出调用建议，真正运行工具的是其他程序。',
    example: '“搜索文档”是一个工具，“创建工单”也是一个工具。',
  },
  {
    name: '宿主程序',
    plain: '负责管住整个 Agent 的软件。它保存进度、检查模型建议、运行工具、记录结果，并决定任务能否继续。',
    example: '像一个项目经理：听建议、查权限、派任务、留记录。',
  },
  {
    name: 'Agent',
    plain: '把模型放进一个反复运转的流程：给模型看信息，让它提出下一步，由宿主检查并执行，再把结果交给模型。直到完成、失败或被叫停。',
    example: '不是聊天一次就结束，而是“提出—行动—观察”的循环。',
  },
  {
    name: '程序与代码',
    plain: '程序是按步骤执行的一组指令，代码是把这些指令写下来的文字。学习 Agent 机制不要求你先会编程，只要知道“谁执行了什么”。',
    example: '搜索工具是一段程序；运行它时，程序按写好的步骤工作。',
  },
  {
    name: '命令与终端',
    plain: '命令是交给电脑执行的一句固定指令，终端是输入命令、查看输出的窗口。开头的 $ 只是“可以输入了”的提示符，不需要输入它。',
    example: '输入命令后，下面几行就是电脑返回的结果。',
  },
  {
    name: '副作用',
    plain: '一个动作让外部世界发生了改变，例如创建工单、发消息或修改文件。只查询、不改变数据的动作通常没有副作用。',
    example: '“建议创建工单”没有副作用；“真的创建了工单”才有。',
  },
  {
    name: '轨迹与审计',
    plain: '轨迹是按顺序保存的任务过程，例如谁提出了什么、执行后返回什么；审计更强调记录谁在何时做了哪个决定，方便事后追责。',
    example: '模型说过什么，不等于系统实际做过什么，要分别记录。',
  },
]

/** 所有 Agent 深潜页共享的最小前置说明，避免直接进入深层模块时默认读者已经懂行。 */
export function AgentPrimer() {
  return (
    <details className="agent-primer" open>
      <summary className="agent-primer-head">
        <span><Icon name="play" size={17} /></span>
        <div>
          <strong>完全没基础？先用两分钟认识这 10 个词</strong>
          <small>后面还会结合具体场景反复解释，这里不用背；已经了解可收起</small>
        </div>
        <Icon name="chevron" size={15} className="agent-primer-chevron" />
      </summary>
      <div className="agent-primer-grid">
        {primerItems.map((item, index) => (
          <article key={item.name}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h3>{item.name}</h3>
            <p>{item.plain}</p>
            <small><Icon name="arrow" size={12} />{item.example}</small>
          </article>
        ))}
      </div>
      <p className="agent-primer-note"><Icon name="spark" size={14} />阅读本页时只需反复确认：这句话是<strong>模型建议的</strong>、<strong>宿主真正执行的</strong>，还是<strong>系统记录下来的</strong>。</p>
    </details>
  )
}
