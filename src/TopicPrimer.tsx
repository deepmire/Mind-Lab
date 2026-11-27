/** 零基础导读的一项内容：先给中文直白含义，再说明它为什么会影响后面的判断。 */
export type PrimerItem = {
  term: string
  english?: string
  meaning: string
  why: string
}

/** 新主题共用的零基础导读；默认展开，读者也可折叠，避免术语表抢占模块正文。 */
export function TopicPrimer({ title, intro, items }: { title: string; intro: string; items: PrimerItem[] }) {
  return (
    <details className="topic-primer" open>
      <summary>
        <span className="topic-primer-mark">∑</span>
        <span><strong>{title}</strong><small>{intro}</small></span>
        <span className="topic-primer-hint">零基础先读 · 可折叠</span>
      </summary>
      <div className="topic-primer-grid">
        {items.map((item, index) => (
          <article key={item.term}>
            <span className="topic-primer-index">{String(index + 1).padStart(2, '0')}</span>
            <h4>{item.term}{item.english && <small>{item.english}</small>}</h4>
            <p>{item.meaning}</p>
            <div><strong>为什么重要</strong><span>{item.why}</span></div>
          </article>
        ))}
      </div>
    </details>
  )
}

/** RAG 主题的共享前置概念；不要求读者先学 Agent，模型与资料库都从本页重新解释。 */
export function RagPrimer() {
  return (
    <TopicPrimer
      title="RAG 零基础导读"
      intro="先分清“模型本来会什么”和“这次临时查到了什么”，后面的检索、排序与引用才连得起来。"
      items={[
        { term: '模型', english: 'Model', meaning: '一个根据输入文字预测下一段文字的程序。它从训练资料中学到的知识叫参数知识，不一定最新，也不保证准确。', why: 'RAG 不是把模型变聪明，而是在模型回答前把可靠资料放进它的可见上下文。' },
        { term: '资料库', english: 'Corpus', meaning: '准备让系统查询的一组文档，例如产品手册、内部制度或帮助中心文章。', why: '答案质量首先取决于资料是否完整、正确、有权限且保持更新。' },
        { term: '检索', english: 'Retrieval', meaning: '根据用户问题，从资料库里找出少量最相关的内容。', why: '检索决定模型能看到什么；漏掉关键资料，再好的生成步骤也补不回来。' },
        { term: '片段', english: 'Chunk', meaning: '把长文档切成适合单独检索的小段，例如一个标题下的几段文字。', why: '切得太大噪声多，切得太小会丢失上下文，影响答案完整性。' },
        { term: '向量', english: 'Embedding', meaning: '把文字语义变成一串数字，让意思相近的内容在数字空间中更接近。', why: '它帮助系统找到“措辞不同但意思相近”的资料，但数字接近不等于事实正确。' },
        { term: '候选', english: 'Candidates', meaning: '初步检索出来、还没有最后排序的一组资料片段。', why: '候选数量决定召回范围；最终只把少量高相关内容交给模型，控制噪声和成本。' },
        { term: '重排', english: 'Reranking', meaning: '对候选内容再次精细比较，把真正最能回答问题的片段排到前面。', why: '初检追求找得全，重排追求排得准；两者解决的问题不同。' },
        { term: '上下文', english: 'Context', meaning: '模型这一次实际看到的全部文字，包括规则、问题、资料和对话历史。', why: '没有放进上下文的资料，对模型等于不存在；窗口大小也限制能放入多少内容。' },
        { term: '依据', english: 'Grounding', meaning: '让答案中的关键结论能对应到检索到的具体资料，而不是只靠模型记忆。', why: '有依据才能核对、追责和发现资料本身的问题。' },
        { term: '评估', english: 'Evaluation', meaning: '用固定问题、标准答案和检查指标，判断系统是否真的变好。', why: '“看起来回答得更顺”不是证据；检索、回答、权限和延迟要分别测量。' },
      ]}
    />
  )
}

/** Linux 主题的共享前置概念；从“操作系统负责什么”开始，不假设读者用过终端。 */
export function LinuxPrimer() {
  return (
    <TopicPrimer
      title="Linux 零基础导读"
      intro="先把操作系统、内核、终端和程序分开，再观察它们怎样共同完成一次命令。"
      items={[
        { term: '操作系统', english: 'Operating System', meaning: '管理电脑硬件并为程序提供统一能力的软件，例如同时运行多个程序、保存文件和连接网络。', why: '应用程序通常不直接操作硬件，而是请求操作系统代为完成。' },
        { term: '内核', english: 'Kernel', meaning: '操作系统最核心的部分，直接管理处理器时间、内存、文件、设备和安全边界。', why: '很多看似神奇的 Linux 机制，最终都是内核规则与系统调用共同作用的结果。' },
        { term: '发行版', english: 'Distribution', meaning: '把 Linux 内核、系统工具、软件包和默认配置组合成可安装系统的一套成品，例如 Ubuntu 或 Debian。', why: '命令和路径可能因发行版不同而变化，但内核与进程模型基本一致。' },
        { term: '终端', english: 'Terminal', meaning: '输入命令、查看文字输出的窗口。它本身通常不执行命令，而是把输入交给命令解释器。', why: '分清终端与 Shell，才能理解提示符、退出码和后台任务从哪里来。' },
        { term: '命令解释器', english: 'Shell', meaning: '读取你输入的命令，展开路径和变量，启动程序，并连接输入输出的程序，常见的是 Bash。', why: '管道、重定向和通配符往往由 Shell 处理，不是每个命令自己实现。' },
        { term: '进程', english: 'Process', meaning: '一个正在运行的程序实例，拥有编号、内存空间、打开的文件和当前状态。', why: '服务卡住、端口占用和权限问题，最终都要落到具体进程上排查。' },
        { term: '文件路径', english: 'Path', meaning: '用文字说明文件或目录在哪里。以 / 开头的是绝对路径，否则通常相对当前目录。', why: '路径解析、权限检查和挂载点共同决定一次文件访问能否成功。' },
        { term: '权限', english: 'Permissions', meaning: '系统根据用户、用户组和文件规则，决定谁能读、写或执行某个对象。', why: '“文件存在”不代表当前用户能读；“命令找不到”也不一定是程序没安装。' },
        { term: '服务', english: 'Service', meaning: '由系统在后台持续管理、通常开机自动启动的程序，例如 Web 服务或日志服务。', why: '服务状态、启动失败原因和日志位置，是 Linux 运维最常检查的证据。' },
        { term: '日志', english: 'Log', meaning: '程序或系统按时间记录的事件文字，用来回答“发生了什么、何时发生、影响了谁”。', why: '日志是状态证据，但必须结合退出码、进程状态和配置一起判断。' },
      ]}
    />
  )
}

/** 计算机网络主题的共享前置概念；从“数据怎样到另一台机器”开始，不假设读者懂代码或网络。 */
export function NetworkPrimer() {
  return (
    <TopicPrimer
      title="计算机网络零基础导读"
      intro="先把主机、数据包、地址和协议分开，再看一次网页访问怎样经过每一层。"
      items={[
        { term: '网络', english: 'Network', meaning: '多台设备通过链路和共同规则交换数据的系统。小到两台电脑，大到连接全球服务器的互联网。', why: '网络不是一根虚拟网线，而是许多设备、链路和规则协作的结果。' },
        { term: '主机', english: 'Host', meaning: '网络中发送或接收数据的设备，例如电脑、手机、打印机和服务器。', why: '主机、交换机和路由器职责不同，排障时必须知道数据当前在哪类设备上。' },
        { term: '数据包', english: 'Packet', meaning: '数据在网络上传输时被切成的一段带有控制信息的内容，就像贴有地址和编号的信封。', why: '大数据会被拆成多个包，它们可能走不同路径、乱序到达或丢失。' },
        { term: '协议', english: 'Protocol', meaning: '通信双方共同遵守的规则，规定怎样描述数据、何时发送、出错怎么办。', why: '设备能连接不代表能通信；双方还必须使用相容的协议。' },
        { term: '地址', english: 'Address', meaning: '用来标识设备或程序的一组数字与规则，例如 MAC 地址、IP 地址和端口。', why: '不同地址在不同层工作，把“找到网卡”“找到主机”和“找到程序”混为一谈会误判故障。' },
        { term: '端口', english: 'Port', meaning: '主机内部用于区分不同网络服务的编号，例如 80 常用于 HTTP、443 常用于 HTTPS。', why: 'IP 地址找到机器，端口帮助机器把数据交给正确的程序。' },
        { term: '路由', english: 'Routing', meaning: '根据目的地址选择下一跳设备的过程，逐跳把数据包送向目标网络。', why: '上网不是两台电脑直连，而是每个路由器只决定下一步。' },
        { term: 'DNS', english: 'Domain Name System', meaning: '把人类容易记住的名称转换成 IP 地址的分布式系统。', why: '名称解析失败时，后续连接根本不会开始，但它与网络不通是不同故障。' },
        { term: 'TCP 与 UDP', english: 'Transport Protocols', meaning: '两种常见传输协议。TCP 提供有序、可靠的字节流，UDP 发送独立数据报但不保证到达和顺序。', why: '网页文件通常重视可靠，实时音视频往往更重视及时；选择取决于应用愿意承担什么。' },
        { term: '抓包', english: 'Packet Capture', meaning: '在特定位置记录网络数据包的工具或行为，用来观察协议实际交换了什么。', why: '抓包把“我猜网络有问题”变成可核对的证据，但只能看到捕获点当时经过的数据。' },
      ]}
    />
  )
}
