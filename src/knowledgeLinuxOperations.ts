/**
 * Linux 运维基础课程：把软件包、服务、信号、网络、存储、观测、隔离与启动串成可验证的操作路径。
 * 每个模块按“哲学—设计—能力—机制—成本—示例—边界”组织；命令输出均为明确环境下的教学示例。
 */
import type { KnowledgeModule } from './knowledgeTypes'

/**
 * 导出 Linux 运维模块数组，顺序固定为安装、服务、信号、网络、存储、观测、隔离、启动。
 * 无函数输入；输出为 KnowledgeModule[]。dependents 统一留空，由全站聚合器依据 dependencies 重算。
 * 不变量：Python 示例仅模拟内部状态且输出确定；Linux 命令只读或仅终止示例自身创建的 sleep 进程。
 */
export const linuxOperationsModules: KnowledgeModule[] = [
  // 软件包：从仓库元数据、依赖图到包数据库，说明安装为什么不是简单复制文件。
  {
    id: 'linux-packages',
    track: 'linux',
    title: '软件包、仓库与依赖解析',
    english: 'PACKAGES / REPOSITORIES / DEPENDENCIES',
    summary: '软件包把程序、配置与安装规则打包；包管理器依据仓库元数据解析依赖，再改变系统文件与包数据库。',
    icon: 'box',
    group: '服务与网络',
    dependencies: ['linux-mental-model', 'linux-filesystem-vfs'],
    dependents: [],
    philosophy: {
      problem: '同一个程序可能依赖多个库；逐个下载很难知道版本是否兼容、文件归谁管理，以及升级会影响哪些软件。',
      rejects: '安装成功不等于服务可用；包管理器也不替你判断业务配置、安全补丁优先级或第三方来源是否可信。',
      counter: '仓库里的一条版本记录，只是“可获得什么”的声明；真正安装时，管理器还要结合已装包、版本约束与系统架构做解析。',
    },
    design: {
      abstractions: [
        { name: '软件包（package）', role: '把可执行文件、库、配置和安装元数据装进一个可管理单元；它通常不是完整应用。' },
        { name: '仓库（repository）', role: '集中发布软件包及其描述信息的来源；本地缓存让管理器不必每次联网查询。' },
        { name: '依赖（dependency）', role: '一个包要求另一个包满足的名称、版本或功能关系，是安装决策的边。' },
        { name: '包数据库（package database）', role: '记录本机已安装版本、文件归属与维护脚本的账本，不等同于仓库目录。' },
      ],
      principles: [
        '先解析、后执行：管理器从候选版本中选出一组相容结果，再按依赖顺序安装或升级，避免半路才发现冲突。',
        '仓库元数据与本机账本分工不同：前者描述可获得的版本，后者描述当前实际安装状态，二者不一致就会产生误判。',
        '依赖声明是下限或关系，不是质量保证：能装上只说明约束被满足，仍需验证版本兼容、配置与运行结果。',
      ],
      history: [
        { when: '1990 年代', what: 'Debian 的 dpkg 与 RPM 等包格式发展', why: '用统一格式记录文件、版本和安装维护动作。' },
        { when: '1990 年代后期起', what: 'APT 等上层工具加入依赖解析', why: '在底层包格式之上自动计算安装与升级集合。' },
        { when: '2010 年代后', what: '发行版普遍提供签名仓库与自动安全更新', why: '降低手工下载风险，并缩短补丁部署时间。' },
      ],
    },
    capabilities: [
        { name: '统一安装', sentence: '按包记录部署程序与配置，减少手工复制文件。' },
        { name: '依赖解析', sentence: '根据版本关系计算相容的安装、升级或移除集合。' },
        { name: '文件归属查询', sentence: '通过包数据库追溯一个系统文件由哪个包提供。' },
        { name: '来源校验', sentence: '利用仓库签名验证元数据与软件包是否被篡改。' },
    ],
    path: {
      intent: '安装一个依赖库再依赖系统基础库的 Web 包，观察“候选—解析—安装—登记”的状态变化。',
      environment: 'Debian 12 风格 APT 环境；路径中的 web、lib、openssl 是教学名称，不是要求实际存在的软件包。',
      steps: [
        { title: '读取仓库索引', description: '包管理器读取仓库索引，即每个包的名称、版本、架构与依赖描述。索引是远端或本地缓存中的目录，还没有修改目标程序。', terms: [{ name: '索引（index）', definition: '仓库中可获得的软件包元数据集合，供解析器查询候选版本。' }], state: '候选版本可见，本机尚未改变。' },
        { title: '收集依赖与约束', description: '从 web 的依赖找到 lib，再从 lib 找到 openssl；版本约束决定哪些候选可以被选择。循环依赖或冲突会使解析失败。', terms: [{ name: '版本约束', definition: '依赖声明中允许的版本范围或相等关系，例如不低于某个版本。' }], state: '形成可检查的依赖图。' },
        { title: '选出相容集合', description: '解析器为每个包选一个版本，并检查所有依赖能否同时满足；不会因为仓库里有新版本就无条件全部升级。', terms: [{ name: '解析（resolution）', definition: '从候选版本中找出一组相互兼容的包与版本。' }], state: '得到确定的安装顺序。' },
        { title: '执行维护脚本并写入文件', description: '下载并校验后，管理器按包内清单展开文件，必要时运行声明过的维护脚本。这里已越过只读查询阶段，应先在测试环境预演。', terms: [{ name: '维护脚本（maintainer script）', definition: '包在安装、升级或移除前后执行的发行版定义动作。' }], state: '文件落盘，包数据库同步更新。' },
      ],
      stateTable: {
        columns: ['阶段', '仓库索引', '依赖图', '目标文件', '包数据库'],
        rows: [
          ['初始', '可读取', '未知', '未改变', '记录旧状态'],
          ['读取候选', '已载入', '待展开', '未改变', '不变'],
          ['收集约束', '按名称版本查询', 'web → lib → openssl', '未改变', '不变'],
          ['解析成功', '选定候选', '约束同时满足', '未改变', '不变'],
          ['解析冲突', '存在候选', '无相容组合', '未改变', '不变'],
          ['安装完成', '仍独立存在', '保持关系', '新增或替换', '登记新版本与文件归属'],
        ],
      },
      summary: '包管理是“用仓库描述可获得版本，用依赖解析选出相容集合，再用包数据库记录本机结果”的过程。',
    },
    costs: [
      { choice: '自动依赖解析', cost: '省去手工追踪，但解析器可能选择用户未预期的升级集合，正式变更前应预演。', misread: '“只指定安装一个包，就绝不会改动其他包。”' },
      { choice: '发行版仓库', cost: '版本相容性与签名体系较完善，但新功能进入可能慢于上游。', misread: '“仓库里没有某版本，就说明项目不支持它。”' },
      { choice: '第三方仓库', cost: '提供额外版本，同时扩大供应链信任面，需要审查来源、签名与升级策略。', misread: '“能下载并安装，就代表来源可信。”' },
    ],
    example: {
      title: '查看依赖声明，并模拟可重复的安装顺序',
      intent: '把 apt-cache 的只读元数据与 Python 的依赖遍历对应起来，而不是执行真实安装。',
      setup: 'Linux 命令在已执行 apt update、已配置 Debian 12 软件源的虚拟机中运行；Python 命令只需标准库，可在 Git Bash 或 Linux 运行。',
      terms: [
        { name: 'Depends', definition: 'APT 元数据中表示必须依赖的字段；显示它不代表依赖已经安装。' },
        { name: '拓扑顺序', definition: '让每个节点出现在依赖它的节点之前的排列，本示例按先依赖后消费者输出。' },
      ],
      diagram: {
        kind: 'flow',
        title: '仓库声明如何变成安装集合',
        caption: '查询只看到候选与关系；解析选出相容版本后，安装动作才改变文件与账本。',
        items: [
          { title: '① 仓库元数据', detail: 'web 1.4 声明依赖 lib；lib 2.1 声明依赖 openssl。这些是描述，不是本机状态。', tag: '可获得', tone: 'blue' },
          { title: '② 解析候选', detail: '检查版本约束并去重；openssl 必须先于 lib，lib 必须先于 web。', tag: '计算', tone: 'orange' },
          { title: '③ 安装与登记', detail: '按顺序展开文件、执行维护脚本，并把版本与文件归属写入包数据库。', tag: '改变系统', tone: 'green' },
        ],
        footnote: 'apt-cache depends 只展示依赖声明；真正的 APT 安装还会结合本机包数据库与仓库签名。',
      },
      commands: [
        {
          title: '只读查看 nginx 的依赖声明',
          command: 'apt-cache depends nginx',
          output: 'nginx\n  Depends: libc6\n  Depends: libcrypt1\n  Depends: libpcre2-8-0\n  Depends: libssl3\n  Depends: zlib1g\n  Conflicts: nginx-common\n  Breaks: nginx-core\n  Replaces: nginx-core',
          expect: '看到 nginx 及其依赖、冲突关系，但终端没有安装或升级任何软件包。',
          note: 'Linux 专用；输出为 Debian 12 已更新索引时的真实风格示例，具体字段随仓库版本变化。',
        },
        {
          title: '模拟依赖先去、消费者后到的展开顺序',
          command: `python - <<'PY'
# Dependency-first traversal makes installation order deterministic.
catalog = {
    'web': ('1.4', ('lib',)),
    'lib': ('2.1', ('openssl',)),
    'openssl': ('3.0', ()),
}
order = []
seen = set()

def visit(package):
    if package in seen:
        return
    seen.add(package)
    for dependency in catalog[package][1]:
        visit(dependency)
    order.append(package)

visit('web')
print('install order: ' + ', '.join(f'{name}={catalog[name][0]}' for name in order))
print('dependency chain: web -> lib -> openssl')
print('expanded once: ' + str(len(order)) + ' packages')
PY`,
          output: 'install order: openssl=3.0, lib=2.1, web=1.4\ndependency chain: web -> lib -> openssl\nexpanded once: 3 packages',
          expect: 'openssl 排在 lib 前，lib 排在 web 前，并且每个包只展开一次。',
          note: '已在 Git Bash 中用 Python 标准库实际运行；只遍历内存中的字典，不访问软件源。',
        },
      ],
      checkpoints: ['能区分仓库候选与本机已装状态', '能沿 web → lib → openssl 解释依赖方向', '知道 apt-cache depends 是只读查询', '不会把解析成功误当成运行验证成功'],
      safety: '真实安装或升级前先查看将改变的包集合并备份配置；不要混用来源不明或架构不匹配的仓库。',
    },
    boundaries: {
      blocks: ['逐文件手工复制造成版本混乱', '无法追溯系统文件归属', '依赖关系全靠记忆'],
      notBlocks: ['应用配置正确', '供应链投毒', '业务兼容性', '服务健康与补丁优先级判断'],
    },
  },
  // systemd：用单元、服务进程与日志解释“启动一个长期服务”而不把命令当守护进程。
  {
    id: 'linux-systemd-services',
    track: 'linux',
    title: 'systemd 单元、服务与日志',
    english: 'SYSTEMD / UNITS / SERVICES / JOURNAL',
    summary: 'systemd 用单元描述系统对象，按依赖关系启动服务进程，并通过状态与日志提供可查询的运行证据。',
    icon: 'workflow',
    group: '服务与网络',
    dependencies: ['linux-process-model', 'linux-filesystem-vfs'],
    dependents: [],
    philosophy: {
      problem: '服务需要开机启动、失败重启、正确权限与集中日志；手工在终端运行命令无法持续管理这些生命周期。',
      rejects: 'systemctl start 返回成功只表示启动请求被接受；active (running) 也不证明端口监听、业务就绪或配置正确。',
      counter: '单元文件是“如何管理”的声明，服务进程是实际执行者，日志是运行证据；三者必须分开检查。',
    },
    design: {
      abstractions: [
        { name: '单元（unit）', role: 'systemd 管理对象的统一描述，后缀可表示服务、定时任务、挂载或目标分组。' },
        { name: '服务（service）', role: '由单元文件描述启动、停止、重启与进程类型的一组管理规则。' },
        { name: '主进程 ID（main PID）', role: 'systemd 跟踪的服务主进程编号；不等于所有子进程或线程的编号。' },
        { name: '日志（journal）', role: '由 systemd-journald 收集的结构化运行记录，可按单元、优先级与时间查询。' },
      ],
      principles: [
        '声明与执行分离：单元文件定义期望动作，systemd 创建进程并持续检查状态，应用仍负责处理真实请求。',
        '状态是分层的：已加载、已启用、正在运行、健康就绪不是同义词，启用通常只表示加入启动图。',
        '日志要带上下文：单元名、时间、进程标识与消息一起看，才能判断一条错误属于哪次启动。',
      ],
      history: [
        { when: '2010 年', what: 'Lennart Poettering 提出 systemd', why: '以并行启动与统一服务管理替代分散的初始化脚本。' },
        { when: '2011 年起', what: 'Fedora、openSUSE 等陆续采用', why: '推动 socket 激活、依赖单元与日志整合。' },
        { when: '2012 年起', what: 'Debian、Ubuntu 等迁移到 systemd', why: '服务、挂载与启动目标逐步收敛到同一管理体系。' },
      ],
    },
    capabilities: [
        { name: '生命周期控制', sentence: '用统一命令启动、停止、重载或重启服务。' },
        { name: '开机启用', sentence: '把服务加入启动依赖图，而不是依赖用户登录后手工执行。' },
        { name: '失败恢复', sentence: '按重启策略与退避节奏重新拉起进程。' },
        { name: '日志查询', sentence: '按服务单元、时间与优先级定位启动和运行消息。' },
    ],
    path: {
      intent: '启动一个演示服务，追踪 systemd 从读取单元到创建主进程、记录状态的完整路径。',
      environment: '使用 systemd 的 Linux 虚拟机；demo.service 仅作教学名，示例命令只查询真实的 ssh.service。',
      steps: [
        { title: '读取并校验单元', description: 'systemd 读取服务的配置文件，理解 Description、ExecStart、Restart 等字段。配置只说明意图，此时还没有新服务进程。', terms: [{ name: 'ExecStart', definition: '服务单元中声明的主启动命令；systemd 据此创建进程。' }, { name: 'Restart', definition: '服务退出后是否以及何时重新启动的策略。' }], state: '单元已加载，服务尚未运行。' },
        { title: '计算依赖并创建进程', description: '管理器按 After、Wants、Requires 等关系安排启动；After 只规定顺序，不等于要求依赖成功。启动命令通过 fork/exec 机制变成进程。', terms: [{ name: 'After', definition: '单元启动顺序约束，只表示先后，不自动表达成功依赖。' }], state: '主进程被创建，systemd 记录 main PID。' },
        { title: '按服务类型判断就绪', description: 'Type=simple 在进程创建后视为启动；Type=notify 等服务可发送就绪通知；Type=oneshot 等待命令结束。它们描述管理器如何观察，不是业务健康协议。', terms: [{ name: 'Type=notify', definition: '服务通过约定的就绪通知告诉 systemd 初始化完成，而不是仅凭进程存在判断。' }], state: 'active 状态按类型更新。' },
        { title: '输出进入日志', description: '服务的标准输出与标准错误通常交给日志系统；应用也可主动写结构化消息。查询日志时先对齐单元名和启动时间。', terms: [{ name: '标准错误（stderr）', definition: '程序输出错误与诊断信息的通道，可被日志系统收集。' }], state: '启动与运行过程留下证据。' },
        { title: '停止时发送信号并等待', description: 'systemd 按单元配置向进程组发送终止信号，并等待超时；应用可利用这段时间完成清理，超时后管理器可能强制结束。', terms: [{ name: '进程组', definition: '共享同一进程组标识的一组进程，便于一次性发送信号。' }], state: '服务转为 inactive，或进入失败状态。' },
      ],
      stateTable: {
        columns: ['阶段', '单元文件', '主进程', 'Active 状态', '日志'],
        rows: [
          ['尚未启动', '存在', '无', 'inactive', '可能只有历史记录'],
          ['请求启动', '已读取', '创建中', 'activating', '出现启动消息'],
          ['简单服务运行', '不变', '存在', 'active', '持续追加'],
          ['应用未就绪', '不变', '存在', '可能仍 active', '可能有端口或连接错误'],
          ['进程异常退出', '不变', '无', 'failed 或 activating', '记录退出与重启'],
          ['正常停止', '不变', '无', 'inactive', '记录停止动作'],
        ],
      },
      summary: 'systemd 管理的是单元与进程生命周期；active 是管理器视角，业务可用仍要由监听、健康检查与真实请求证明。',
    },
    costs: [
      { choice: '统一单元模型', cost: '服务、挂载与定时任务可一致管理，但单元类型、依赖与状态语义增加学习成本。', misread: '“所有 .service 的启动方式都一样。”' },
      { choice: '自动重启', cost: '能掩盖短暂故障，也会反复重启并放大日志与下游压力，需要限制频率。', misread: '“Restart=always 能修复程序缺陷。”' },
      { choice: '集中日志', cost: '查询方便，但日志仍会占用磁盘并可能包含敏感信息，需要轮转与访问控制。', misread: '“journalctl 没有报错就代表服务健康。”' },
    ],
    example: {
      title: '读取服务状态，再把状态与日志证据对齐',
      intent: '分别观察 systemd 认为服务处于什么状态，以及服务实际输出了什么消息。',
      setup: 'Linux 专用：Debian 12 虚拟机，ssh.service 已安装并运行；日期、进程号与主机名均为真实风格的固定示意值。',
      terms: [
        { name: 'UnitFileState', definition: '单元文件的启用策略状态；enabled 表示已加入启动图，不代表此刻正在运行。' },
        { name: 'ActiveState / SubState', definition: 'systemd 对当前运行状态与子状态的分类，是管理器视角而非业务探针。' },
        { name: 'SIGHUP', definition: '编号为 1 的挂起信号；许多守护进程用它请求重新读取配置，但具体行为由程序定义。' },
      ],
      diagram: {
        kind: 'flow',
        title: '服务管理的三个证据层',
        caption: '配置文件描述规则，systemd 状态描述管理结果，日志记录实际执行过程。',
        items: [
          { title: '① 单元声明', detail: 'ExecStart 决定启动什么，Restart 决定失败后怎么办，After 只约束启动顺序。', tag: '规则', tone: 'blue' },
          { title: '② systemd 状态', detail: 'LoadState、UnitFileState、ActiveState 与 ExecMainPID 回答管理器当前掌握的事实。', tag: '管理视角', tone: 'orange' },
          { title: '③ 服务日志', detail: '监听地址、重载消息与错误输出说明进程实际做了什么；需结合时间和主进程判断。', tag: '运行证据', tone: 'green' },
        ],
        footnote: 'enabled、active、healthy、ready 分属不同层次，不能互相替代。',
      },
      commands: [
        {
          title: '查询服务加载、启用与运行状态',
          command: "systemctl show ssh.service -p LoadState -p UnitFileState -p ActiveState -p SubState -p ExecMainPID",
          output: 'LoadState=loaded\nUnitFileState=enabled\nActiveState=active\nSubState=running\nExecMainPID=812',
          expect: '服务已加载、已启用且正在运行，主进程号为 812；这些字段仍不直接证明 SSH 登录业务可用。',
          note: 'Linux 专用；进程号为示意。systemctl show 只读，不会启动或重启服务。',
        },
        {
          title: '查看该服务最近的日志',
          command: 'journalctl -u ssh.service -n 3 --no-pager',
          output: 'Nov 10 08:30:01 lab sshd[812]: Server listening on 0.0.0.0 port 22.\nNov 10 08:30:01 lab sshd[812]: Server listening on :: port 22.\nNov 10 08:30:02 lab sshd[812]: Received SIGHUP; restarting.',
          expect: '能看到服务开始监听与收到重新加载信号；监听消息比单独的 active 状态更接近网络证据。',
          note: 'Linux 专用；主机名、进程号、日期和消息为固定示意，实际输出取决于发行版、sshd 版本与日志级别。',
        },
      ],
      checkpoints: ['能区分 enabled 与 active', '知道 ExecMainPID 只标识 systemd 跟踪的主进程', '会用单元名和时间对齐 journalctl 日志', '会继续检查监听端口与真实业务请求'],
      safety: '不要在共享生产机上任意 stop、restart 或 mask 服务；先用 show、status 与日志确认影响范围。',
    },
    boundaries: {
      blocks: ['依赖用户登录才启动服务', '启动命令散落且难追踪', '服务输出难以按单元检索'],
      notBlocks: ['应用逻辑错误', '业务就绪判断', '配置泄露', '主机宕机与存储故障'],
    },
  },
  // 信号与作业：区分 shell 作业、进程、信号和退出状态，并演示优雅关闭。
  {
    id: 'linux-signals-jobs',
    track: 'linux',
    title: '信号、后台作业与优雅关闭',
    english: 'SIGNALS / JOBS / GRACEFUL SHUTDOWN',
    summary: '信号是内核或进程发送的异步通知，shell 作业管理前台后台任务；优雅关闭让程序先停止接收再完成已有工作。',
    icon: 'pause',
    group: '服务与网络',
    dependencies: ['linux-process-model', 'linux-shell-essentials'],
    dependents: [],
    philosophy: {
      problem: '服务升级、终端关闭或用户取消都会要求进程退出；粗暴终止可能丢失数据、留下锁或中断正在处理的请求。',
      rejects: '信号不是普通函数调用，也不保证程序立即退出；退出码 143 只说明常见终止语义，不能单独证明根因。',
      counter: '“让进程停”与“让请求完整结束”是两个阶段；好的关闭流程会停止接新工作、等待在途工作，再主动退出。',
    },
    design: {
      abstractions: [
        { name: '信号（signal）', role: '发送给进程的编号化异步通知，可触发默认动作、被程序捕获、忽略或阻塞。' },
        { name: '作业（job）', role: 'shell 对一条流水线或后台任务的管理对象，可用 jobs 查看，不等于一个进程。' },
        { name: '进程组（process group）', role: '共享组标识的一组进程，shell 可用它把终端信号发给整组任务。' },
        { name: '退出状态（exit status）', role: '进程结束时供父进程读取的数值；0 通常表示成功，非零表示失败或被信号终止。' },
      ],
      principles: [
        '先理解默认动作再发信号：SIGTERM 通常请求终止，SIGKILL 不能被捕获，SIGSTOP 只暂停执行；程序可覆盖可捕获信号的默认行为。',
        '优雅关闭是状态机：停止接收新请求、等待在途工作、释放资源、限时退出；服务管理器超时后再强制结束。',
        '作业号只属于当前 shell：%1 是该 shell 的作业引用，跨脚本、跨终端应使用明确的进程标识并先确认归属。',
      ],
      history: [
        { when: '1970 年代 Unix', what: '信号与进程组机制形成', why: '支持终端中断、父子进程通知与作业控制。' },
        { when: '1980 年代', what: '交互式 shell 普遍支持前后台作业', why: '用户可在同一终端暂停、恢复与切换任务。' },
        { when: '服务管理时代', what: '超时停止与优雅关闭成为部署契约', why: '滚动升级需要避免请求中断与状态损坏。' },
      ],
    },
    capabilities: [
        { name: '前台后台切换', sentence: '用 shell 作业控制暂停或恢复当前任务。' },
        { name: '定向通知', sentence: '向明确进程发送终止、重载或暂停信号。' },
        { name: '优雅关闭', sentence: '让应用在退出前完成在途工作与资源清理。' },
        { name: '退出诊断', sentence: '结合退出状态、日志与资源事件判断退出原因。' },
    ],
    path: {
      intent: '终止一个正在处理两个请求的 worker，观察它如何从接收状态进入排空状态并正常退出。',
      environment: '概念路径；实际示例只向当前 shell 刚创建的 sleep 进程发送 SIGTERM。',
      steps: [
        { title: '创建 worker 进程', description: '程序建立监听并开始处理请求。此时进程有明确的进程标识，shell 或服务管理器记录如何跟踪它。', terms: [{ name: 'worker', definition: '持续执行任务或处理请求的工作进程，不是 Linux 特有的进程类型。' }], state: 'worker 接收新请求。' },
        { title: '把命令放到后台', description: 'shell 启动后台作业并显示作业号与进程号；命令后的 & 只改变 shell 的等待方式，不会自动让程序变成系统服务。', terms: [{ name: '后台运行', definition: 'shell 不等待该作业结束就继续接受下一条命令，任务仍在同一会话中。' }], state: 'shell 可继续执行其他命令。' },
        { title: '发送终止请求', description: 'kill 默认向指定进程发送 SIGTERM；程序捕获后进入关闭流程。若程序没有处理，默认动作通常是终止。', terms: [{ name: 'SIGTERM', definition: '编号为 15 的终止信号，通常给程序机会执行清理，但可以被捕获或忽略。' }], state: 'worker 停止接收新请求。' },
        { title: '排空在途工作', description: 'worker 等待当前请求完成，并设置总超时。超时是保护边界，避免无限等待导致发布卡住。', terms: [{ name: '排空（draining）', definition: '停止接新工作但继续完成已有工作的过渡状态。' }], state: '在途请求数逐步降为零。' },
        { title: '退出并回收状态', description: 'worker 关闭连接、刷新必要状态并以 0 退出；父进程或 shell 通过 wait 读取退出状态。没有回收的僵尸进程仍占一项进程表记录。', terms: [{ name: '回收（reap）', definition: '父进程读取子进程退出状态并释放对应进程表项的操作。' }], state: '进程结束，退出状态可读取。' },
      ],
      stateTable: {
        columns: ['阶段', '接收新请求', '在途请求', '信号处理', '退出状态'],
        rows: [
          ['运行', '是', '可能大于零', '等待事件', '尚未产生'],
          ['转入后台', '是', '不变', '不变', 'shell 不等待'],
          ['收到 SIGTERM', '否', '暂不变', '设置关闭标志', '尚未产生'],
          ['排空', '否', '递减', '等待并监控超时', '尚未产生'],
          ['清理完成', '否', '零', '释放资源', '以 0 退出'],
          ['超时强杀', '否', '可能非零', 'SIGKILL 不可捕获', '常见 137'],
        ],
      },
      summary: '信号只是通知，优雅关闭由程序实现；后台作业、服务进程与退出状态需要分别观察。',
    },
    costs: [
      { choice: '捕获 SIGTERM', cost: '可以排空请求，但处理函数必须短小且可重入，复杂清理应交给主循环。', misread: '“注册了信号处理函数，关闭逻辑就一定正确。”' },
      { choice: '关闭超时', cost: '避免无限等待，但过短会中断长请求，过长会拖慢升级。', misread: '“等待越久越安全，不需要超时。”' },
      { choice: 'SIGKILL 强制结束', cost: '立即终止且不可捕获，适合兜底，却不能给应用保存状态的机会。', misread: '“kill -9 是正常关闭的第一步。”' },
    ],
    example: {
      title: '终止自建后台任务，并模拟优雅关闭状态',
      intent: '先安全地观察 shell 作业与退出状态，再用确定性状态机理解排空，而不向陌生进程发信号。',
      setup: 'shell 命令在 Git Bash 中运行，只创建并终止自己的 sleep 进程；Python 命令仅使用标准库。',
      terms: [
        { name: '$!', definition: 'shell 中最近一个后台进程的进程标识变量，适合捕获刚启动任务的 PID。' },
        { name: 'wait', definition: 'shell 内建命令，等待指定后台作业并返回其退出状态。' },
        { name: '在途请求（inflight）', definition: '已经进入处理但尚未结束的请求数量。' },
      ],
      diagram: {
        kind: 'flow',
        title: 'SIGTERM 到达后的优雅关闭状态机',
        caption: '通知只触发状态变化；程序负责停止接单、排空、清理和退出。',
        items: [
          { title: '① running', detail: '持续接收请求，在途请求可能增加。', tag: '接收', tone: 'green' },
          { title: '② draining', detail: '收到 SIGTERM 后不再接收，等待在途请求完成并监控总超时。', tag: '过渡', tone: 'orange' },
          { title: '③ exited', detail: '在途请求归零，释放资源并以 0 退出；超时则由管理器强制结束。', tag: '结束', tone: 'blue' },
        ],
        footnote: 'SIGKILL 会跳过 draining，直接终止；这正是它不能替代优雅关闭的原因。',
      },
      commands: [
        {
          title: '启动并终止自己的 sleep 后台作业',
          command: `sleep 30 &
pid=$!
jobs -l
kill -TERM "$pid"
wait "$pid"
status=$?
printf 'wait status=%s\\n' "$status"
kill -0 "$pid" 2>/dev/null || printf 'process is gone\\n'`,
          output: '[1]+  4590 Running                    sleep 30 &\nwait status=143\nprocess is gone',
          expect: '作业显示 Running；终止后 wait 返回 143，最后确认该进程已不存在。',
          note: '已在 Git Bash 实际运行，进程号为当次示意；143 是 128+SIGTERM(15) 的常见 shell 表示。',
        },
        {
          title: '用状态机模拟两个在途请求的排空',
          command: `python - <<'PY'
# Discrete states model graceful SIGTERM handling without signalling a real process.
state = {'accepting': True, 'inflight': 2, 'exited': False}
print(f"initial: accepting={state['accepting']} inflight={state['inflight']}")
print('SIGTERM -> stop accepting')
state['accepting'] = False
print(f"closing: accepting={state['accepting']} inflight={state['inflight']}")
while state['inflight']:
    state['inflight'] -= 1
    print(f"request finished -> inflight={state['inflight']}")
state['exited'] = True
print(f"final: accepting={state['accepting']} inflight={state['inflight']} exit=0")
PY`,
          output: 'initial: accepting=True inflight=2\nSIGTERM -> stop accepting\nclosing: accepting=False inflight=2\nrequest finished -> inflight=1\nrequest finished -> inflight=0\nfinal: accepting=False inflight=0 exit=0',
          expect: '收到信号后 accepting 先变 False，但 inflight 保持 2；两个请求完成后才以 0 退出。',
          note: '已在 Git Bash 中实际运行；这是内存状态模拟，没有创建或终止真实服务。',
        },
      ],
      checkpoints: ['知道后台运行不会自动获得 systemd 管理', '能解释 143 与 SIGTERM 的常见关系', '能按 running → draining → exited 描述关闭', '知道强制终止前应先给合理排空时间'],
      safety: 'kill 前必须确认进程标识与归属；不要用通配 PID 或向不熟悉的进程组广播信号。',
    },
    boundaries: {
      blocks: ['终端关闭导致前台任务丢失', '升级时无条件立即中断请求', '无法观察后台作业状态'],
      notBlocks: ['应用保存状态逻辑错误', '无限等待', '数据一致性', '服务管理器故障'],
    },
  },
  // 网络：把接口、地址、路由、端口与名称解析拆成可分层验证的证据。
  {
    id: 'linux-networking',
    track: 'linux',
    title: '接口、地址、路由、端口与 DNS',
    english: 'INTERFACES / ROUTES / SOCKETS / DNS',
    summary: '网络连通由接口与地址、路由选择、应用监听和名称解析共同决定；每一层都能单独失败。',
    icon: 'network',
    group: '存储与排障',
    dependencies: ['linux-kernel-user-space', 'linux-process-model'],
    dependents: [],
    philosophy: {
      problem: '应用使用名字和端口通信，内核却要处理接口、地址、路由与数据包；只看一个 ping 或一条配置无法覆盖整条路径。',
      rejects: '有 IP 地址不等于有默认路由，有监听端口不等于防火墙放行，DNS 能解析也不代表目标服务接受连接。',
      counter: '排障应按“名称 → 地址 → 路由 → 接口 → 监听 → 应用响应”的方向收集证据，而不是先重启网络。',
    },
    design: {
      abstractions: [
        { name: '网络接口（interface）', role: '内核收发数据包的入口，例如回环接口 lo 或虚拟网卡 eth0。' },
        { name: 'IP 地址与路由', role: '地址标识接口，路由表按目的地址与前缀长度选择下一跳或直连路径。' },
        { name: '套接字与端口', role: '套接字是进程通信端点，端口区分同一地址上的不同服务；监听表示等待连接。' },
        { name: '域名系统（DNS）', role: '把人类可读名称映射为 IP 地址的分布式查询系统，解析结果可被缓存。' },
      ],
      principles: [
        '地址属于接口，路由属于命名空间：同一地址在不同网络空间可独立存在，路径必须结合具体接口判断。',
        '最长前缀匹配优先：目的地址匹配多个路由时，前缀越长越具体；默认路由只覆盖没有更具体匹配的流量。',
        '监听与连通是两层证据：ss 显示内核套接字状态，应用响应才证明完整业务路径；防火墙可在中间任何一层拒绝。',
      ],
      history: [
        { when: '1974 年', what: 'TCP/IP 参考模型与相关论文形成', why: '为异构网络互联提供共同协议框架。' },
        { when: '1983 年', what: 'ARPANET 切换到 TCP/IP', why: '分组交换网络开始使用统一的互联网协议族。' },
        { when: '1980 年代起', what: 'DNS 取代集中主机名文件', why: '支持不断增长、分布式维护的名称到地址映射。' },
      ],
    },
    capabilities: [
        { name: '接口诊断', sentence: '查看接口状态、地址与收发错误计数。' },
        { name: '路由追踪', sentence: '确认目的地址匹配哪条路由以及下一跳是什么。' },
        { name: '监听检查', sentence: '识别本机哪些地址与端口正在等待 TCP 连接。' },
        { name: '名称解析', sentence: '把 DNS 查询结果与目标地址、路由及服务响应分开验证。' },
    ],
    path: {
      intent: '让应用访问 demo.example，逐层定位名称、地址、路由、接口与监听是否成立。',
      environment: 'Linux 网络命名空间；示例输出来自使用 192.0.2.0/24 文档地址段的虚拟机，不涉及真实外网。',
      steps: [
        { title: '把名称解析为地址', description: '应用先请求 DNS 把 demo.example 转成 IP；若使用 hosts 文件或缓存，甚至可能没有发出网络 DNS 查询。解析失败与连接失败是两类问题。', terms: [{ name: 'DNS 缓存', definition: '解析器或系统保存的查询结果，可在有效期内直接复用而不访问上游。' }], state: '获得一个候选目标地址。' },
        { title: '在路由表中选择路径', description: '内核用目标地址匹配路由前缀，选择最长匹配。default 是最后兜底，via 指定下一跳；下一跳为 0.0.0.0 的条目通常表示直连。', terms: [{ name: '下一跳（next hop）', definition: '数据包下一步应交付的路由器地址；直连网络不需要网关。' }], state: '确定出口接口或网关。' },
        { title: '由接口与邻居缓存发送', description: '若目的在直连网络，内核通过地址解析协议（ARP）把 IPv4 地址映射到链路层地址；已有缓存则直接封装发送。接口 down 或链路错误会在这里暴露。', terms: [{ name: '地址解析协议（ARP）', definition: '在 IPv4 本地链路上查询 IP 地址对应硬件地址的协议。' }], state: '数据帧交给接口发出。' },
        { title: '目标套接字接受连接', description: '请求到达目标 IP 与 TCP 端口后，内核查表交给监听套接字。没有进程监听时通常拒绝连接；有监听但应用未就绪时可能接受后返回错误。', terms: [{ name: 'TCP', definition: '提供面向连接、有序字节流的传输层协议，端口用于区分服务。' }], state: '监听套接字存在或连接被拒绝。' },
        { title: '应用返回业务响应', description: '应用处理请求并生成响应；HTTP 200、401、500 都说明网络路径已到达应用，但业务含义不同。防火墙拒绝则可能在应用日志中完全不留下记录。', terms: [{ name: 'HTTP 状态码', definition: '应用或服务器对请求结果的数字回应，例如 200 表示成功、401 表示需要身份认证。' }], state: '获得可解释的业务结果。' },
      ],
      stateTable: {
        columns: ['层次', '关键对象', '检查方法', '成功证据', '典型失败'],
        rows: [
          ['名称', 'DNS 记录 / hosts', 'getent hosts', '返回预期地址', '名称不存在或返回旧地址'],
          ['路由', '路由表', 'ip route get', '选中正确出口与下一跳', '无路由或选错接口'],
          ['接口', 'eth0 / lo', 'ip -brief address', 'UP 且地址正确', 'down、地址缺失、计数增长'],
          ['监听', 'TCP 套接字', 'ss -ltn', '目标地址与端口 LISTEN', '进程未监听或只绑定回环'],
          ['应用', 'HTTP / 数据库协议', '实际客户端请求', '得到预期响应', '连接超时、认证或业务错误'],
          ['路径策略', '防火墙 / 安全组', '规则与抓包', '请求和响应均通过', '静默丢弃或主动拒绝'],
        ],
      },
      summary: '网络排障不是找一个“通没通”的开关，而是逐层证明名称、地址、路由、接口、监听和应用都符合预期。',
    },
    costs: [
      { choice: 'DNS 名称', cost: '便于迁移与读配置，但增加缓存、租约与解析依赖，地址变化不会立即对所有客户端可见。', misread: '“解析到新 IP，所有连接就会自动切到新服务。”' },
      { choice: '默认路由', cost: '简化非本地流量出口，但路由错误会把全部流量送到错误网关，影响范围大。', misread: '“能访问默认网关，就说明外网一定可用。”' },
      { choice: '绑定监听地址', cost: '绑定 127.0.0.1 可限制本机访问，绑定 0.0.0.0 则扩大入口；两者没有绝对优劣。', misread: '“服务在本机启动了，其他机器就一定能访问。”' },
    ],
    example: {
      title: '核对接口地址与 TCP 监听，而不是只测 ping',
      intent: '确认本机地址属于哪个接口，并区分本机监听与外部可达性。',
      setup: 'Linux 专用：Debian 12 虚拟机，eth0 使用文档地址 192.0.2.20/24，默认网关为 192.0.2.1；ss 输出为固定示意。',
      terms: [
        { name: 'CIDR', definition: '用地址加前缀长度表示网络的方式，例如 192.0.2.20/24 表示前 24 位为网络部分。' },
        { name: 'LISTEN', definition: 'TCP 套接字等待连接的状态；不代表应用一定已经就绪。' },
        { name: '0.0.0.0', definition: '在监听地址中通常表示接受所有本机 IPv4 接口上的连接，不是远端服务器的占位地址。' },
      ],
      diagram: {
        kind: 'flow',
        title: '一次名称访问的五层证据',
        caption: '每一层只证明自己的职责，必须串起来才得到完整结论。',
        items: [
          { title: '① DNS → 地址', detail: 'demo.example 解析为预期 IP；若走缓存，结果可能尚未刷新。', tag: '名称', tone: 'blue' },
          { title: '② 路由 → 出口', detail: '最长前缀选中 eth0 或默认网关，避免把流量送错方向。', tag: '路径', tone: 'orange' },
          { title: '③ 接口 → 链路', detail: '接口 UP、地址正确、错误计数没有持续增长。', tag: '本地', tone: 'orange' },
          { title: '④ 监听 → 套接字', detail: '目标地址和端口处于 LISTEN；只绑定回环时外部无法直接到达。', tag: '内核', tone: 'green' },
          { title: '⑤ 应用 → 响应', detail: '真实请求返回预期状态码与内容，排除认证、业务和防火墙问题。', tag: '业务', tone: 'green' },
        ],
        footnote: 'ping 主要验证部分网络路径与 ICMP，不验证 TCP 端口或应用协议。',
      },
      commands: [
        {
          title: '查看接口状态与地址',
          command: 'ip -brief address show',
          output: 'lo               UNKNOWN        127.0.0.1/8 ::1/128\neth0             UP             192.0.2.20/24',
          expect: 'lo 有回环地址，eth0 为 UP 且地址是 192.0.2.20/24；这只证明接口配置，不证明外网路由。',
          note: 'Linux 专用；接口名、地址与状态为固定示意，容器内接口名可能是 eth0，云虚拟机可能使用可预测名称。',
        },
        {
          title: '查看 TCP 监听地址与端口',
          command: 'ss -ltn',
          output: 'State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process\nLISTEN 0      4096   127.0.0.11:46569      0.0.0.0:*\nLISTEN 0      128    0.0.0.0:22           0.0.0.0:*\nLISTEN 0      4096   127.0.0.1:631        0.0.0.0:*',
          expect: '22 端口监听所有 IPv4 接口，631 只监听回环；因此其他主机不能仅靠 631 端口直接访问该服务。',
          note: 'Linux 专用；地址、端口和队列长度为真实风格示例。Process 列可能需要额外权限才显示进程信息。',
        },
      ],
      checkpoints: ['能区分接口 UP 与路由可用', '能解释 /24 前缀与回环地址', '能区分 0.0.0.0 监听与 127.0.0.1 监听', '会继续用实际应用请求验证业务层'],
      safety: '排障不要直接清空路由、防火墙或连接跟踪表；先保存当前配置并确认变更窗口。',
    },
    boundaries: {
      blocks: ['接口地址与路由不透明', '端口监听无法快速确认', '把 DNS 与连通性混为一谈'],
      notBlocks: ['TLS 证书与身份认证', '云安全组错误', 'DNS 污染', '应用协议兼容性'],
    },
  },
  // 存储：区分物理块设备、分区、文件系统与挂载点，并用 df 和 du 回答不同问题。
  {
    id: 'linux-storage-disks',
    track: 'linux',
    title: '块设备、分区、文件系统与挂载',
    english: 'BLOCK DEVICES / FILESYSTEMS / MOUNTS',
    summary: '块设备提供字节存储，分区划分寻址空间，文件系统组织数据，挂载把文件系统接入目录树；容量与目录占用要分开测量。',
    icon: 'database',
    group: '存储与排障',
    dependencies: ['linux-filesystem-vfs'],
    dependents: [],
    philosophy: {
      problem: '应用只看到路径，但路径背后可能是不同磁盘、分区或文件系统；空间不足、挂载缺失和 inode 耗尽需要不同处理。',
      rejects: '目录里有很多文件不等于文件系统容量耗尽；删除文件后空间未立即释放，也不一定意味着删除失败。',
      counter: 'df 回答文件系统还剩多少空间，du 回答某些路径占了多少；两者口径不同，不能用一个证明另一个错误。',
    },
    design: {
      abstractions: [
        { name: '块设备（block device）', role: '以固定大小块寻址的存储设备，可被分区或直接创建文件系统。' },
        { name: '分区（partition）', role: '块设备上由分区表描述的一段连续地址空间，通常还需要文件系统才能存文件。' },
        { name: '文件系统（filesystem）', role: '把块组织成目录、文件与元数据的管理结构，例如 ext4、XFS。' },
        { name: '挂载点（mount point）', role: '文件系统接入现有目录树的位置；挂载后原路径内容被遮蔽而非自动合并。' },
      ],
      principles: [
        '容量按层核算：磁盘容量不等于单个文件系统可用空间，分区、元数据、保留块与快照都会影响可见结果。',
        '路径不等于设备：同一目录树可挂载多个文件系统，df 的文件系统来源与 du 的目录范围必须对齐。',
        '删除先断开引用：进程仍打开已删除文件时，空间要等最后引用关闭才释放，因此 df 可能暂时不下降。',
      ],
      history: [
        { when: '1950—1960 年代', what: '磁盘与直接存取存储普及', why: '随机访问块设备推动操作系统文件系统发展。' },
        { when: '1980 年代', what: 'Unix 文件系统与目录树模型成熟', why: '把物理设备细节隐藏在统一路径接口之后。' },
        { when: '1990 年代起', what: 'MBR、GPT 与日志文件系统演进', why: '改善大磁盘寻址、分区标识与崩溃恢复能力。' },
      ],
    },
    capabilities: [
        { name: '设备识别', sentence: '查看块设备、分区、容量与文件系统类型。' },
        { name: '挂载核对', sentence: '确认目标路径实际来自哪个设备或文件系统。' },
        { name: '容量分析', sentence: '用文件系统视图与目录占用视图定位空间问题。' },
        { name: 'inode 监控', sentence: '检查文件数量上限耗尽而非字节容量耗尽。' },
    ],
    path: {
      intent: '把一块新数据盘接入 /mnt/data，并解释为什么 df 与 du 会给出不同的数字。',
      environment: 'Linux 虚拟机；教学路径以只读查询为主，不执行 mkfs、分区或 mount 写操作。',
      steps: [
        { title: '识别块设备与分区', description: '内核从设备发现分区表，lsblk 展示 sda、sda1 等层次。设备文件名可能随接口或枚举顺序变化，生产定位还应结合稳定标识与序列号。', terms: [{ name: '分区表', definition: '记录分区起止位置、类型与标识的元数据，常见格式有 MBR 和 GPT。' }], state: '设备与分区可见。' },
        { title: '在分区上创建文件系统', description: '文件系统把块组织成超级块、分配位图、inode 与数据区。创建文件系统会写入设备，属于高风险操作，必须确认设备与数据归属。', terms: [{ name: 'inode', definition: '文件系统中记录文件元数据与数据块位置的对象，每个文件通常占用一个。' }], state: '分区具备文件管理结构。' },
        { title: '挂载到目录树', description: 'mount 把文件系统根接到 /mnt/data；该目录原内容被遮蔽。挂载成功后，应用通过路径访问新文件系统，不直接操作设备名。', terms: [{ name: '超级块（superblock）', definition: '文件系统描述自身布局与状态的关键元数据区域。' }], state: '/mnt/data 显示新文件系统内容。' },
        { title: '写入文件并分配空间', description: '文件系统按块分配数据，目录树记录名称与 inode 关系。df 的已用空间包含文件数据与元数据，du 只统计指定路径下的文件占用。', terms: [{ name: '分配块', definition: '文件系统为保存文件数据而分配给文件的存储块。' }], state: '目录占用与文件系统用量增长。' },
        { title: '删除文件并观察释放', description: '目录项消失后，文件数据块通常变为空闲；若进程仍持有打开句柄，空间会延迟释放。只读查询可用 lsof +L1 查找已删除但仍打开的文件。', terms: [{ name: '打开句柄', definition: '进程访问文件时由内核维护的引用，文件删除后引用仍可延迟空间回收。' }], state: '引用归零后容量归还文件系统。' },
      ],
      stateTable: {
        columns: ['阶段', '块设备', '分区', '文件系统', '目录 /mnt/data'],
        rows: [
          ['磁盘接入', '已发现', '可能无', '无', '仍是原目录'],
          ['分区完成', '已发现', '有起止范围', '无', '未改变'],
          ['创建文件系统', '已发现', '已格式化', '可识别', '未挂载'],
          ['挂载完成', '不变', '不变', '已挂载', '显示新文件系统根'],
          ['写入文件', '数据块写入', '不变', '分配块与 inode', '出现文件路径'],
          ['删除仍打开文件', '数据暂未释放', '不变', '块仍被引用', '路径可能已消失'],
        ],
      },
      summary: '存储排障要先确定“哪个设备、哪种文件系统、挂载到哪里”，再区分容量、inode 与延迟释放。',
    },
    costs: [
      { choice: '独立分区 / 文件系统', cost: '隔离容量与故障影响，但空间不能自动跨边界共享，规划不当会一边满一边空。', misread: '“磁盘还有空间，每个分区就一定能用。”' },
      { choice: '统一根文件系统', cost: '分配灵活，但单个目录可能占满根分区并影响系统运行。', misread: '“/var/log 只是普通目录，不会影响整台机器。”' },
      { choice: '延迟释放', cost: '保留已删除文件的数据直到引用关闭，符合进程语义，但会让 df 暂时不反映删除量。', misread: '“rm 之后 df 没降，说明文件还在目录里。”' },
    ],
    example: {
      title: '用 lsblk、df 与 du 对齐设备、挂载和占用',
      intent: '先确认 / 与 /mnt/data 来自不同分区，再比较整文件系统容量和日志目录占用。',
      setup: 'Linux 专用：Debian 12 虚拟机，sda2 为根文件系统，sdb1 挂载 /mnt/data；容量和日志大小为固定示意。',
      terms: [
        { name: 'FSTYPE', definition: '文件系统类型字段；空值通常表示该层只是设备或分区容器。' },
        { name: 'MOUNTPOINTS', definition: '分区或设备当前挂载到的目录；新版本 lsblk 可用该字段显示多个挂载点。' },
        { name: '使用率', definition: 'df 中已用容量占可用容量的比例，包含保留空间口径，可能与简单除法略有差异。' },
      ],
      diagram: {
        kind: 'flow',
        title: '从磁盘到应用路径的四层映射',
        caption: '应用写路径，文件系统分配块，块设备持久化字节；每层回答不同问题。',
        items: [
          { title: '① sda / sdb', detail: '两个物理块设备提供总容量，本身不决定应用看到哪个目录。', tag: '设备', tone: 'blue' },
          { title: '② sda2 / sdb1', detail: '分区表划出独立地址范围，可分别创建不同文件系统。', tag: '分区', tone: 'orange' },
          { title: '③ ext4', detail: '文件系统管理 inode、目录、数据块与空闲空间。', tag: '结构', tone: 'orange' },
          { title: '④ / 与 /mnt/data', detail: '挂载把两个文件系统接入同一目录树，应用只感知路径。', tag: '视图', tone: 'green' },
        ],
        footnote: 'df 看挂载点对应的文件系统；du 沿目录树累加文件占用，跨文件系统时还会受参数影响。',
      },
      commands: [
        {
          title: '查看设备、分区与挂载关系',
          command: 'lsblk -o NAME,TYPE,SIZE,FSTYPE,MOUNTPOINTS',
          output: 'NAME   TYPE  SIZE FSTYPE MOUNTPOINTS\nsda    disk   20G\n├─sda1 part    1M\n└─sda2 part   20G ext4   /\nsdb    disk    8G\n└─sdb1 part    8G ext4   /mnt/data',
          expect: 'sda2 是挂载 / 的 ext4 分区，sdb1 是挂载 /mnt/data 的 ext4 分区，两者容量相互独立。',
          note: 'Linux 专用；设备名、树形字符和容量为固定示意。某些旧版 lsblk 使用 MOUNTPOINT 而非 MOUNTPOINTS。',
        },
        {
          title: '比较根文件系统剩余空间与日志目录占用',
          command: 'df -h / && du -xsh /var/log',
          output: 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda2        20G   12G  6.9G  60% /\n16M\t/var/log',
          expect: '根文件系统使用率为 60%，/var/log 目录只占 16M；目录小并不能证明整个文件系统没有其他占用。',
          note: 'Linux 专用；df 的数字为固定示意。du 的 -x 避免跨到其他文件系统，-s 只输出汇总，-h 使用易读单位。',
        },
      ],
      checkpoints: ['能沿块设备 → 分区 → 文件系统 → 挂载点解释路径', '知道 df 与 du 的统计对象不同', '知道 rm 后空间可能因打开句柄延迟释放', '会同时检查容量与 inode'],
      safety: 'mkfs、分区、mount 与卸载都会改变系统状态；生产操作前必须确认设备标识、挂载关系与备份，不在课程中执行格式化。',
    },
    boundaries: {
      blocks: ['设备与目录关系不透明', '挂载点误判导致容量分析错误', '只检查目录而忽略整文件系统'],
      notBlocks: ['磁盘硬件故障', 'RAID 与快照一致性', '数据备份', '文件系统损坏修复'],
    },
  },
  // 观测：把日志、资源指标和延迟分布转成可证伪的故障假设。
  {
    id: 'linux-observability-performance',
    track: 'linux',
    title: '日志、资源指标与延迟证据',
    english: 'LOGS / METRICS / LATENCY',
    summary: '性能排障需要把日志、CPU、内存、输入输出与延迟放在同一时间线上；单个高数值或单条错误都不自动等于根因。',
    icon: 'chart',
    group: '存储与排障',
    dependencies: ['linux-process-model', 'linux-streams-text'],
    dependents: [],
    philosophy: {
      problem: '“机器慢”可能来自 CPU 排队、内存回收、磁盘等待或网络与应用排队；没有统一时间与对象标识，证据会互相矛盾。',
      rejects: 'CPU 高不一定是应用计算多，内存占用高不一定是泄漏，平均延迟正常也不代表没有慢请求。',
      counter: '先明确症状与时间窗口，再验证资源饱和、延迟分布和日志错误是否指向同一组件，才能形成可解释结论。',
    },
    design: {
      abstractions: [
        { name: '日志（log）', role: '按时间追加的事件文本，适合保留错误、状态变化与诊断上下文。' },
        { name: '资源指标（metric）', role: '可重复采集的数值，如 CPU 使用率、内存、输入输出吞吐与请求计数。' },
        { name: '饱和度（saturation）', role: '资源需求超过服务能力的程度，例如运行队列变长或设备等待增加。' },
        { name: '延迟分位数（percentile）', role: '把请求耗时排序后描述尾部位置的统计量，p95 表示约 95% 请求不超过该值。' },
      ],
      principles: [
        '先对齐再关联：同一主机、服务实例、请求标识与时间窗口，是跨日志和指标比较的前提。',
        '利用率不等于饱和度：CPU 忙碌可能仍能及时响应，低平均利用率也可能隐藏短时排队与长尾。',
        '用多证据验证假设：日志说明发生了什么，资源指标说明压力在哪里，延迟分布说明用户实际感受。',
      ],
      history: [
        { when: '1970—1980 年代', what: 'Unix 逐步提供 ps、vmstat、iostat 等工具', why: '让管理员观察进程与系统资源状态。' },
        { when: '2000 年代', what: '系统日志守护进程与集中检索普及', why: '把多机文本日志变成可查询的运维证据。' },
        { when: '2010 年代起', what: '指标、日志、链路追踪形成可观测性体系', why: '将单机快照扩展为跨服务的时间序列与关联分析。' },
      ],
    },
    capabilities: [
        { name: '日志过滤', sentence: '按时间、单元、优先级与关键词缩小诊断范围。' },
        { name: 'CPU 分析', sentence: '区分用户计算、系统开销、运行队列与限流。' },
        { name: '内存分析', sentence: '观察匿名内存、页缓存、回收与内存限制事件。' },
        { name: 'IO 与延迟分析', sentence: '关联设备吞吐、等待、应用耗时与错误日志。' },
    ],
    path: {
      intent: '排查接口延迟升高，从请求时间线收敛到 CPU、内存或块设备等待，而不是凭一次 top 下结论。',
      environment: 'Linux 虚拟机；dmesg 与 journalctl 为只读查询，Python 使用固定延迟样本。',
      steps: [
        { title: '固定症状与时间窗口', description: '记录哪个接口变慢、开始时间、影响范围与请求标识。没有窗口，历史峰值、当前快照与无关错误很容易被混在一起。', terms: [{ name: '时间窗口', definition: '为一次故障分析选定的起止时间范围，用于对齐不同来源证据。' }], state: '形成可检验的问题定义。' },
        { title: '读取应用与系统日志', description: '先看应用错误与超时，再用 journalctl -k 或 dmesg 查看内核消息。内核输入输出错误、内存不足 kill 与普通应用异常属于不同证据层。', terms: [{ name: '内核日志', definition: '内核运行时输出的诊断消息，可经 dmesg 或 journalctl -k 读取。' }], state: '获得事件文本与准确时间。' },
        { title: '观察 CPU 与内存压力', description: 'top 可交互查看进程，vmstat 可观察运行队列与换页；持续高运行队列说明 CPU 饱和，频繁换页可能说明内存压力，但都要结合工作负载判断。', terms: [{ name: '换页（paging）', definition: '内核在内存与交换区或文件缓存之间移动页面的机制，频繁发生可能增加延迟。' }], state: '记录资源利用率与饱和迹象。' },
        { title: '关联块设备与网络等待', description: 'iostat 的 await 表示设备请求平均等待时间，util 表示设备忙碌比例；网络重传与接口丢弃也会造成应用超时。数值升高仍需与业务时间对齐。', terms: [{ name: 'IOPS', definition: '每秒输入输出操作数，用于描述存储或设备的操作吞吐。' }, { name: 'await', definition: 'iostat 中块设备请求从进入队列到完成的平均等待时间。' }], state: '判断是否存在存储或网络瓶颈。' },
        { title: '用延迟分布验证用户影响', description: '平均值可能被少量快请求稀释；p50 表示中位水平，p95、p99 暴露慢尾部。若慢请求集中在同一时间段，再回到资源与日志证据。', terms: [{ name: 'p50', definition: '第 50 百分位，即中位延迟；一半请求快于它，一半慢于它。' }, { name: 'p99', definition: '第 99 百分位，只关注最慢的约 1% 请求，对尾部问题更敏感。' }], state: '把技术指标与用户体验连接起来。' },
      ],
      stateTable: {
        columns: ['证据层', '典型指标 / 消息', '回答的问题', '不能单独证明'],
        rows: [
          ['应用日志', '超时、连接拒绝、错误堆栈', '应用看到了什么', '一定是资源瓶颈'],
          ['CPU', '用户态、系统态、运行队列', '计算是否饱和', '请求为何全部变慢'],
          ['内存', '可用量、匿名页、回收、OOM', '是否内存不足', '一定发生内存泄漏'],
          ['块设备', '吞吐、IOPS、await、util', '存储是否排队', '应用逻辑正确'],
          ['延迟', 'p50、p95、p99', '用户体验分布', '具体根因在哪一层'],
          ['内核消息', 'IO 错误、OOM kill', '内核采取了什么动作', '影响范围与业务根因'],
        ],
      },
      summary: '有效排障是“症状—时间—资源—日志—延迟”的证据链，任何单层数据都只是线索。',
    },
    costs: [
      { choice: '高频采集', cost: '更容易捕获短峰值，但采集本身消耗资源并增加存储与传输成本。', misread: '“采样频率越高越好，不影响被测系统。”' },
      { choice: '保留完整日志', cost: '上下文丰富，但磁盘、查询与敏感信息治理成本同步增长。', misread: '“日志越多，根因就越容易被找到。”' },
      { choice: '分位数指标', cost: '能表达尾部体验，但需要足够样本且受异常值与采样方式影响。', misread: '“p95 正常就代表没有慢请求。”' },
    ],
    example: {
      title: '从内核 IO 证据到 p95 延迟，建立一条可验证时间线',
      intent: '展示内核消息与固定延迟样本各自能证明什么，不把示意错误当作真实主机故障。',
      setup: 'Linux 命令在 Debian 12 虚拟机运行，输出为固定教学样本；Python 命令只使用标准库，可在 Git Bash 运行。',
      terms: [
        { name: 'dmesg', definition: '读取内核环形缓冲区消息的命令，内容来自启动与运行期间的内核诊断。' },
        { name: '平均等待时间', definition: '所有被采样请求耗时的平均值，会被少数慢请求拉动。' },
        { name: '最近秩 p95', definition: '把升序样本第 95% 位置的取值作为分位数，本示例使用这一确定算法。' },
      ],
      diagram: {
        kind: 'flow',
        title: '平均值与分位数描述不同的用户感受',
        caption: '同一组样本既可以用一个平均数概括，也可以展示中位与慢尾部。',
        items: [
          { title: '平均 34.1 ms', detail: '九个固定样本的算术平均，计算简单，但看不出慢请求有多慢。', tag: '集中趋势', tone: 'blue' },
          { title: 'p50 22 ms', detail: '中位请求耗时为 22 ms，说明一半请求不超过这个水平。', tag: '典型体验', tone: 'green' },
          { title: 'p95 120 ms', detail: '最慢样本为 120 ms，按最近秩算法成为 p95，暴露平均值掩盖的尾部。', tag: '慢尾部', tone: 'orange' },
        ],
        footnote: '九个样本只适合演示算法；生产 p95 需要足够请求量、明确时间窗口与一致采样口径。',
      },
      commands: [
        {
          title: '读取内核警告与错误消息',
          command: 'dmesg --level=err,warn -T',
          output: '[Tue Nov 10 08:30:01 2026] EXT4-fs warning (device sda2): ext4_end_bio:348: I/O error -5 writing data in block #12345\n[Tue Nov 10 08:30:01 2026] Buffer I/O error on dev sda2, logical block 12345, lost async page write\n[Tue Nov 10 08:30:01 2026] Aborting journal on device sda2-8.\n[Tue Nov 10 08:30:01 2026] JBD2: I/O error detected when updating journal superblock for sda2-8.',
          expect: '看到 sda2 在 08:30:01 出现写入错误与日志中止；它支持“存储路径异常”的假设，但仍需关联同时段延迟。',
          note: 'Linux 专用；设备、块号与消息为真实风格的教学示例，不表示当前 Windows 主机存在该故障。权限不足时 dmesg 可能被限制。',
        },
        {
          title: '计算固定样本的平均值与 p95',
          command: `python - <<'PY'
# Fixed samples use nearest-rank p95 to expose tail latency.
samples_ms = [12, 15, 18, 20, 22, 25, 30, 45, 120]
ordered = sorted(samples_ms)
p95 = ordered[__import__('math').ceil(0.95 * len(ordered)) - 1]
print('samples ms: ' + ', '.join(map(str, samples_ms)))
print(f'mean ms: {sum(samples_ms) / len(samples_ms):.1f}')
print(f'p50 ms: {ordered[len(ordered)//2]}')
print(f'p95 ms: {p95}')
print('mean hides the slow tail; p95 makes it visible')
PY`,
          output: 'samples ms: 12, 15, 18, 20, 22, 25, 30, 45, 120\nmean ms: 34.1\np50 ms: 22\np95 ms: 120\nmean hides the slow tail; p95 makes it visible',
          expect: '平均值为 34.1 ms，p50 为 22 ms，p95 为 120 ms；慢尾部没有被平均值完全表达。',
          note: '已在 Git Bash 实际运行；固定数组保证每次输出相同，未访问网络、文件系统或真实主机指标。',
        },
      ],
      checkpoints: ['能把内核 IO 消息与应用超时按时间对齐', '知道平均值与 p95 回答不同问题', '不会仅凭高 CPU 或高内存认定根因', '会继续检查请求量、排队与资源上限'],
      safety: '不要为制造故障对生产磁盘写入错误或耗尽资源；性能实验应使用隔离测试机并设置资源上限。',
    },
    boundaries: {
      blocks: ['只能凭感觉判断机器慢', '日志与资源数据完全割裂', '平均值掩盖慢请求'],
      notBlocks: ['所有性能根因自动定位', '日志数据安全', '指标成本控制', '分布式追踪覆盖'],
    },
  },
  // 隔离：解释 namespace、cgroup、capability 与 seccomp 的不同职责和共同盲区。
  {
    id: 'linux-isolation-boundaries',
    track: 'linux',
    title: 'Namespace、Cgroup、Capability 与 Seccomp',
    english: 'NAMESPACES / CGROUPS / CAPABILITIES / SECCOMP',
    summary: '命名空间收窄进程看到的资源视图，控制组限制资源用量，能力拆分特权操作，系统调用过滤约束内核入口；它们共享内核而非独立虚拟机。',
    icon: 'shield',
    group: '存储与排障',
    dependencies: ['linux-process-model', 'linux-kernel-user-space', 'linux-permissions-identity'],
    dependents: [],
    philosophy: {
      problem: '多个应用共享一台 Linux 主机，既要让它们像独立系统一样工作，又要限制互相看见、占用与越权。',
      rejects: '隔离不是单靠一个参数完成；命名空间不限制 CPU 或内存，控制组也不隐藏文件与进程视图。',
      counter: '“看不到”与“用不了”是不同边界：前者是视图隔离，后者是资源或权限约束，组合使用才能缩小影响范围。',
    },
    design: {
      abstractions: [
        { name: '命名空间（namespace）', role: '让进程看到特定系统资源的独立视图，例如 PID、挂载点与网络接口视图。' },
        { name: '控制组（cgroup）', role: '把进程组织成层级组，对 CPU、内存、进程数与输入输出实施限制和统计。' },
        { name: '能力（capability）', role: '把传统 root 大权限拆成可单独授予的系统操作，例如绑定低端口。' },
        { name: '系统调用过滤（seccomp）', role: '按系统调用及参数决定允许、返回错误或终止，限制程序进入内核的入口。' },
      ],
      principles: [
        '视图与限额正交：两个命名空间可以各有私有 PID 视图，却仍共享同一个 CPU 和内存，需要控制组另设上限。',
        '身份不等于能力：进程即使 UID 为 0，能力集合也可为空；非 root 进程也可能按文件能力获得特定权限。',
        '纵深防御且保留盲区：多层机制降低风险，但共享内核漏洞、宿主机配置错误与过宽挂载仍可击穿边界。',
      ],
      history: [
        { when: 'Linux 2.4 起', what: 'capability 机制逐步引入', why: '以细粒度系统能力替代 root 的全有或全无。' },
        { when: '2002—2008 年', what: 'mount、PID、network 等命名空间陆续合入', why: '为资源视图隔离提供内核基础设施。' },
        { when: '2008 年起', what: 'cgroup 与 seccomp 相继进入主线', why: '分别补足资源治理与系统调用行为约束。' },
      ],
    },
    capabilities: [
        { name: '视图隔离', sentence: '为进程提供独立的进程、文件系统挂载或网络视图。' },
        { name: '资源治理', sentence: '对进程组设置 CPU、内存、PID 与 IO 限制并统计用量。' },
        { name: '权限最小化', sentence: '裁剪系统能力，避免默认获得无关特权。' },
        { name: '调用过滤', sentence: '用 seccomp 策略限制危险或不必要的系统调用。' },
    ],
    path: {
      intent: '启动一个有两个进程的受限容器，逐层加入视图、资源、权限与调用过滤。',
      environment: '支持命名空间、cgroup 与 seccomp 的 Linux；示例不执行特权创建，只读取当前 shell 状态。',
      steps: [
        { title: '创建进程与命名空间视图', description: 'runtime 为新进程创建命名空间，使其看到独立的 PID、挂载与网络视图。视图内的 1 号进程不等于宿主机 1 号进程。', terms: [{ name: 'PID 命名空间', definition: '让一组进程拥有独立进程编号视图的机制，可把容器内主进程显示为 1。' }], state: '新进程只能看到所属视图。' },
        { title: '挂载私有根并限制可见路径', description: '挂载命名空间决定进程看到哪些挂载。根文件系统、/proc 与设备路径应按最小需要组合，避免把宿主机敏感目录直接暴露。', terms: [{ name: '挂载命名空间', definition: '隔离挂载点列表的内核机制，同一路径可在不同命名空间指向不同内容。' }], state: '文件系统视图受限。' },
        { title: '把进程加入控制组', description: '进程被放入 cgroup 层级，管理器写入 CPU 配额、内存上限与 PID 上限。达到限制时，内核会限流、回收或按策略拒绝，而不是简单“隔离”。', terms: [{ name: 'CPU 配额', definition: '控制组在一个周期内允许使用的 CPU 时间上限。' }], state: '资源用量受硬约束。' },
        { title: '裁剪能力并禁止提权', description: '启动配置移除不需要的 capability，并可设置 no-new-privileges，阻止通过 setuid 或文件能力获得新权限。权限判断仍发生在具体系统调用路径上。', terms: [{ name: 'no-new-privileges', definition: '禁止进程通过 setuid 程序或文件能力获得新增权限的进程标志。' }], state: '可执行的特权操作减少。' },
        { title: '加载系统调用过滤', description: 'seccomp 使用伯克利数据包过滤器程序检查系统调用号和参数，匹配后允许、返回错误或终止。策略过严会导致正常程序失败，过宽则失去保护。', terms: [{ name: '伯克利数据包过滤器（BPF）', definition: '内核执行的小型指令程序，seccomp 借用其表达式表达能力检查系统调用。' }], state: '进入内核的调用受到策略约束。' },
      ],
      stateTable: {
        columns: ['层次', '控制对象', '主要动作', '能隔离什么', '不能单独解决'],
        rows: [
          ['命名空间', '资源视图', '建立独立视图', 'PID、挂载、网络等可见性', 'CPU 与内存额度'],
          ['控制组', '进程组', '限额、限流、统计', '资源消耗上限', '文件与进程视图隔离'],
          ['Capability', '特权操作', '授予或移除能力', '特定系统操作权限', '所有系统调用行为'],
          ['Seccomp', '内核调用入口', '允许、报错、终止', '系统调用与参数组合', '资源用量和文件权限'],
          ['组合策略', '整个工作负载', '多层约束', '缩小可见面与影响面', '共享内核全部漏洞'],
        ],
      },
      summary: '隔离边界由“看见什么、能用多少、有何权限、能调用什么”四个问题共同组成，任何单层都不是完整安全沙箱。',
    },
    costs: [
      { choice: '命名空间隔离', cost: '提供独立视图，但共享内核与配置错误仍可能让一个视图影响其他视图。', misread: '“容器有独立 PID 命名空间，所以完全独立于宿主机。”' },
      { choice: '严格资源限制', cost: '防止资源耗尽，但过低上限会限流、内存回收或杀死进程，需要按负载校准。', misread: '“限制越小越安全，不需要测试。”' },
      { choice: '严格 seccomp 策略', cost: '缩小系统调用面，但应用升级、动态加载或新功能可能需要放行新调用。', misread: '“过滤得越多越好，不需要兼容性测试。”' },
    ],
    example: {
      title: '读取当前命名空间与过滤状态，再模拟受限容器视图',
      intent: '先观察真实只读状态，再用确定性状态表理解隔离，不创建需要提权的命名空间。',
      setup: 'Linux 命令在 Debian 12 虚拟机运行；Python 命令只使用标准库。命名空间编号和权限位会随主机变化。',
      terms: [
        { name: '/proc/self/ns', definition: '当前进程可读取的命名空间符号链接目录，self 指执行读取命令的进程。' },
        { name: 'CapEff', definition: '进程当前有效能力集合的十六进制位图，每一位对应一种能力。' },
        { name: 'Seccomp 模式 2', definition: '进程处于系统调用过滤模式的常见状态值，不代表具体策略是否足够严格。' },
      ],
      diagram: {
        kind: 'flow',
        title: '同一进程要同时穿过四类边界',
        caption: '命名空间改变视图，cgroup 限制资源，能力限制特权，seccomp 限制内核入口。',
        items: [
          { title: '① Namespace', detail: '决定进程看到哪些 PID、挂载与网络对象。', tag: '看见什么', tone: 'blue' },
          { title: '② Cgroup', detail: '决定进程组能用多少 CPU、内存与进程数。', tag: '用多少', tone: 'orange' },
          { title: '③ Capability', detail: '决定是否能执行绑定低端口等特权操作。', tag: '有何权限', tone: 'orange' },
          { title: '④ Seccomp', detail: '决定哪些系统调用与参数组合能进入内核。', tag: '能调用什么', tone: 'green' },
        ],
        footnote: '共享内核仍是共同基础；更强隔离需求可能需要虚拟机或独立内核。',
      },
      commands: [
        {
          title: '读取当前进程的命名空间、能力与过滤状态',
          command: `readlink /proc/self/ns/pid
readlink /proc/self/ns/mnt
grep -E '^(CapEff|NoNewPrivs|Seccomp):' /proc/self/status`,
          output: 'pid:[4026531836]\nmnt:[4026531840]\nCapEff:\t00000000a80425fb\nNoNewPrivs:\t0\nSeccomp:\t2',
          expect: '能看到 PID 与挂载命名空间编号、有效能力位图，以及 Seccomp=2；这些是当前 shell 进程状态，不是容器配置。',
          note: 'Linux 专用；编号和权限位为固定示意，实际值取决于宿主机与启动环境。命令只读，不修改隔离状态。',
        },
        {
          title: '模拟两个容器的视图、PID 上限与调用结果',
          command: `python - <<'PY'
# State rows model views and limits; no real namespace or cgroup is created.
containers = {
    'a': {'pid_view': [1, 2], 'pids': 2, 'mount_views': 1, 'syscall': 'openat'},
    'b': {'pid_view': [1, 3], 'pids': 2, 'mount_views': 1, 'syscall': 'bpf'},
}
policy = {'openat': 'allow', 'bpf': 'errno'}
for name in ('a', 'b'):
    item = containers[name]
    print(f"{name}: pid_view={item['pid_view']} mount_views={item['mount_views']} pids={item['pids']}/4")
print('openat -> ' + policy['openat'])
print('bpf -> ' + policy['bpf'])
print('pid views differ; both still use the same host kernel')
PY`,
          output: 'a: pid_view=[1, 2] mount_views=1 pids=2/4\nb: pid_view=[1, 3] mount_views=1 pids=2/4\nopenat -> allow\nbpf -> errno\npid views differ; both still use the same host kernel',
          expect: 'a 与 b 的 PID 视图不同，但各有 4 个 PID 上限；openat 被允许，bpf 返回错误。',
          note: '已在 Git Bash 实际运行；只操作内存字典，未创建真实 namespace、cgroup 或 seccomp 过滤器。',
        },
      ],
      checkpoints: ['能分别说出四类边界控制什么', '知道命名空间不提供资源上限', '知道非 root 不等于无能力、有过滤不等于策略严格', '理解共享内核仍构成共同风险'],
      safety: '不要用 --privileged、挂载宿主机根目录或放宽 seccomp 来“快速修好”生产问题；先定位具体缺失边界。',
    },
    boundaries: {
      blocks: ['资源视图互相干扰', '单进程耗尽全部资源', '默认获得无关特权', '无约束调用内核'],
      notBlocks: ['共享内核漏洞', '宿主机配置错误', '供应链投毒', '全部侧信道与越权风险'],
    },
  },
  // 启动：把固件、引导加载器、初始内存文件系统与 systemd 启动图按时间顺序串起来。
  {
    id: 'linux-boot-startup',
    track: 'linux',
    title: '固件、引导加载器、Initramfs 与启动图',
    english: 'FIRMWARE / BOOTLOADER / INITRAMFS / STARTUP',
    summary: '开机从固件初始化硬件开始，经引导加载器选择内核，再由初始内存文件系统准备根设备，最后进入 systemd 的依赖启动图。',
    icon: 'reset',
    group: '存储与排障',
    dependencies: ['linux-kernel-user-space', 'linux-systemd-services', 'linux-storage-disks'],
    dependents: [],
    philosophy: {
      problem: '内核必须从某种存储布局中加载，还要在根文件系统可用前处理驱动、加密与网络启动；登录后看到的服务只是最后一段。',
      rejects: '服务无法启动不一定是 unit 文件错误；根设备未就绪、initramfs 缺少驱动或引导项错误都会更早失败。',
      counter: '启动是一条逐层交接的证据链：每一层为下一层提供最小能力，排障要沿时间顺序找到第一处失败。',
    },
    design: {
      abstractions: [
        { name: '固件（firmware）', role: '固化在主板上的初始软件，负责硬件初始化、启动设备选择与引导交接。' },
        { name: '引导加载器（bootloader）', role: '定位并加载操作系统内核与初始内存文件系统，例如 GRUB。' },
        { name: '初始内存文件系统（initramfs）', role: '内核启动初期使用的临时根环境，用于加载驱动、解锁或挂载真实根。' },
        { name: 'systemd 目标（target）', role: '把一组单元组织成启动阶段的同步分组点，不是必然存在的服务进程。' },
      ],
      principles: [
        '能力逐层交接：固件提供启动设备，引导加载器提供内核，initramfs 提供真实根切换前的最小环境。',
        '启动顺序不等于全部成功依赖：After 规定先后，Wants 表达弱依赖，Requires 表达强依赖，失败语义不同。',
        '先定位最早失败层：内核 panic、initramfs 紧急 shell 与 systemd failed 单元对应不同修复位置。',
      ],
      history: [
        { when: '1970—1980 年代', what: 'BIOS 与主引导记录流行', why: '在极简固件与操作系统之间建立标准引导流程。' },
        { when: '2000 年代起', what: 'GRUB 等引导加载器普及', why: '支持多系统选择、模块化加载与更灵活的内核参数。' },
        { when: '2010 年代起', what: 'UEFI 与统一启动图成为常见部署方式', why: '固件接口与 systemd 启动目标逐步标准化。' },
      ],
    },
    capabilities: [
        { name: '启动阶段识别', sentence: '判断故障发生在固件、引导、内核、initramfs 还是服务阶段。' },
        { name: '启动图分析', sentence: '沿 target 与 service 依赖定位阻塞启动的单元。' },
        { name: '根设备诊断', sentence: '把挂载失败与驱动、设备标识和文件系统参数关联。' },
        { name: '默认目标管理', sentence: '理解图形或命令行登录目标如何决定启动哪些服务。' },
    ],
    path: {
      intent: '从加电到 SSH 服务启动，按交接顺序追踪每一层提供的能力与失败证据。',
      environment: '使用 UEFI、GRUB、initramfs 与 systemd 的 Linux 虚拟机；示例不修改引导项。',
      steps: [
        { title: '固件选择启动设备', description: '统一可扩展固件接口（UEFI）或传统 BIOS 完成基础硬件初始化，按启动顺序寻找引导程序。启动项缺失通常还没进入 Linux 内核。', terms: [{ name: 'UEFI', definition: '统一可扩展固件接口，提供比传统 BIOS 更现代的启动服务与接口。' }], state: 'CPU 开始执行固件与引导程序。' },
        { title: '引导加载器装入内核', description: 'GRUB 读取引导配置，加载 Linux 内核映像与 initramfs，并传递根设备、控制台等启动参数。配置错误可能导致找不到内核或根。', terms: [{ name: '内核命令行', definition: '引导加载器传给内核的参数文本，用于指定根设备、控制台与运行选项。' }], state: '内核映像与初始环境进入内存。' },
        { title: '内核初始化并运行 initramfs', description: '内核初始化核心子系统后执行 initramfs 中的 init。临时环境加载存储驱动、处理逻辑卷或解锁加密根，再切换真实根文件系统。', terms: [{ name: '切换根（switch root）', definition: '从临时 initramfs 环境切换到真实根文件系统并继续启动的交接动作。' }], state: '真实根可访问，临时环境准备退出。' },
        { title: 'systemd 建立基础目标', description: 'systemd 作为首个用户空间进程管理系统，按单元依赖并行启动本地文件系统、设备、日志与网络等基础能力。target 用于分组和同步。', terms: [{ name: 'basic.target', definition: 'systemd 的基础同步目标，表示一组基础启动步骤已组织完成，不是所有服务都已就绪。' }], state: '基础系统能力逐步可用。' },
        { title: '进入默认目标并启动服务', description: 'multi-user.target 通常对应多用户命令行环境，graphical.target 再加入图形界面。SSH 等服务按依赖启动；失败单元可通过日志定位。', terms: [{ name: '默认目标（default target）', definition: 'systemd 启动时进入的目标，决定系统趋向多用户还是图形环境。' }], state: '登录入口与常规服务可用。' },
      ],
      stateTable: {
        columns: ['阶段', '执行主体', '关键输入', '产出能力', '典型失败证据'],
        rows: [
          ['加电固件', 'BIOS / UEFI', '启动顺序', '执行引导程序', '无启动项、硬件自检失败'],
          ['引导加载', 'GRUB', '内核、initramfs、参数', '内核在内存中运行', '找不到文件、命令行错误'],
          ['内核初始化', 'Linux 内核', '驱动与启动参数', '基础设备与进程机制', 'panic、驱动报错'],
          ['临时根', 'initramfs', '存储驱动、密钥、设备', '真实根已挂载', '紧急 shell、解锁失败'],
          ['基础目标', 'systemd', 'unit 依赖图', '文件系统、日志、设备就绪', 'local-fs 或 sysinit 失败'],
          ['默认目标', 'systemd 服务', '目标与服务单元', 'SSH、登录与业务服务', '单元 failed、应用日志错误'],
        ],
      },
      summary: '启动是固件、引导加载器、内核、initramfs 与 systemd 的逐层交接；越早的失败越不能靠重启服务修复。',
    },
    costs: [
      { choice: '通用 initramfs', cost: '适配更多硬件与根布局，但体积和启动时间增加，驱动问题更隐蔽。', misread: '“内核已加载，真实根就一定能挂载。”' },
      { choice: 'systemd 并行启动', cost: '缩短启动时间，但依赖配置错误会以超时或竞态形式出现。', misread: '“After 写全就一定不会启动失败。”' },
      { choice: '加密根与逻辑卷', cost: '提升数据保护与布局灵活性，但增加密钥、设备发现和恢复复杂度。', misread: '“启动失败只改服务单元就能解决。”' },
    ],
    example: {
      title: '观察 systemd 关键启动链，并模拟依赖先行的启动图',
      intent: '把用户空间服务依赖与更早的固件、内核阶段区分开，避免把启动图当作完整引导过程。',
      setup: 'Linux 命令在 Debian 12 虚拟机运行，输出为固定示意；Python 命令只使用标准库，可在 Git Bash 运行。',
      terms: [
        { name: 'critical-chain', definition: 'systemd-analyze 显示指定单元关键依赖链与耗时的输出模式。' },
        { name: '@ 时间', definition: 'systemd 启动分析中单元完成的相对时间，不是墙钟时间。' },
        { name: '同步点', definition: '需要等待一组前置步骤完成的节点，target 常承担这种角色。' },
      ],
      diagram: {
        kind: 'flow',
        title: '从加电到 SSH 的完整交接链',
        caption: 'systemd 只覆盖用户空间启动图；更早的固件、引导与 initramfs 需要其他证据。',
        items: [
          { title: '① 固件 → GRUB', detail: '固件选择启动设备，GRUB 装载内核、initramfs 与启动参数。', tag: '内核之前', tone: 'blue' },
          { title: '② 内核 → initramfs', detail: '内核初始化后由临时根加载驱动并准备真实根。', tag: '准备根', tone: 'orange' },
          { title: '③ systemd → 基础目标', detail: '本地文件系统、设备与日志等单元按依赖并行启动。', tag: '基础能力', tone: 'orange' },
          { title: '④ 默认目标 → SSH', detail: '多用户或图形目标继续启动网络与登录服务。', tag: '用户空间', tone: 'green' },
        ],
        footnote: 'critical-chain 展示的 @ 时间是本次启动的相对完成时间，不包含固件和引导加载器阶段。',
      },
      commands: [
        {
          title: '查看 SSH 服务的关键 systemd 启动链',
          command: 'systemd-analyze critical-chain ssh.service',
          output: 'ssh.service @1.923s +35ms\n└─network.target @1.811s\n  └─NetworkManager.service @1.502s +309ms\n    └─dbus.service @1.345s\n      └─basic.target @1.120s\n        └─sockets.target @1.118s\n          └─dbus.socket @1.117s\n            └─sysinit.target @1.080s\n              └─systemd-udevd.service @1.020s +60ms',
          expect: 'SSH 的关键链经过 network.target、NetworkManager、dbus 与 basic.target；这能解释启动顺序，但不能诊断固件或 initramfs。',
          note: 'Linux 专用；服务名、时间与依赖链为 Debian 12 风格示意，NetworkManager 可能被 ifupdown 或其他网络服务替代。',
        },
        {
          title: '模拟 target 依赖先行的启动顺序',
          command: `python - <<'PY'
# Topological order models unit dependencies, not firmware or real systemd.
units = {
    'basic.target': ('static', ()),
    'local-fs.target': ('static', ('basic.target',)),
    'network.target': ('static', ('basic.target',)),
    'demo.service': ('enabled', ('network.target', 'local-fs.target')),
}
done = set()

def start(unit):
    if unit in done:
        return
    for dependency in units[unit][1]:
        start(dependency)
    done.add(unit)
    print('start: ' + unit)

start('demo.service')
print('unique started units: ' + str(len(done)))
print('a target is a synchronization point, not always a service process')
PY`,
          output: 'start: basic.target\nstart: network.target\nstart: local-fs.target\nstart: demo.service\nunique started units: 4\na target is a synchronization point, not always a service process',
          expect: 'basic.target 先于两个上层 target，demo.service 最后；四个单元各启动一次，没有重复入队。',
          note: '已在 Git Bash 实际运行；只遍历内存依赖图，不读取或修改真实启动配置。',
        },
      ],
      checkpoints: ['能按固件 → 引导 → 内核 → initramfs → systemd 排序', '知道 critical-chain 不包含固件与引导加载器', '能解释 target 是同步分组而非必然进程', '会把挂载失败与服务失败分层定位'],
      safety: '不要修改默认启动目标、内核参数或 GRUB 配置来试错；生产引导变更应有控制台、救援介质与可回滚方案。',
    },
    boundaries: {
      blocks: ['无法判断服务失败发生在哪一启动层', '启动依赖全靠手工顺序', '把根设备问题误判为服务问题'],
      notBlocks: ['固件兼容性', '磁盘损坏', '引导配置备份', '加密密钥恢复'],
    },
  },
]
