/**
 * Linux 基础课程：从内核与用户空间开始，逐层解释进程、文件、权限和命令行文本流。
 * 每个模块保留统一的七章结构；Python 示例仅模拟内部状态，Linux 命令输出明确标注运行环境。
 */
import type { KnowledgeModule } from './knowledgeTypes'

export const linuxFoundationModules: KnowledgeModule[] = [
  {
    id: 'linux-mental-model',
    track: 'linux',
    title: 'Linux 心智模型：谁在管理这台机器',
    english: 'LINUX / KERNEL / DISTRIBUTION',
    summary: '从硬件、内核、用户程序到发行版，先分清各层职责，再把命令看成跨越边界的协作。',
    icon: 'layers',
    group: '系统与内核',
    dependencies: [],
    dependents: [],
    philosophy: {
      problem: '初学者看到终端、命令和桌面，容易把它们都叫“Linux”；但排查故障时必须知道每一层具体负责什么。',
      rejects: 'Linux 不是一套桌面软件，命令提示符也不是操作系统本身；发行版提供的是组合与工具，不取代内核。',
      counter: '同一个发行版可以运行在不同内核上，同一套容器也能共享同一个宿主机内核；名称相同不代表边界相同。',
    },
    design: {
      abstractions: [
        { name: '硬件', role: '中央处理器、内存、磁盘与网卡等物理设备，是软件最终操作的资源。' },
        { name: '内核（kernel）', role: '操作系统中直接管理硬件、进程、内存与文件的核心程序；应用不能绕过它随意访问设备。' },
        { name: '用户空间（user space）', role: '内核之外运行的应用与工具所在区域，例如编辑器、Shell 和数据库。' },
        { name: '发行版（distribution）', role: '把 Linux 内核、系统工具、包管理器和默认配置组合成可安装系统的产品。' },
      ],
      principles: [
        '内核管资源，用户程序提需求：读写磁盘、创建进程、打开网络连接都要经过内核提供的受控入口。',
        '发行版是组合层：Ubuntu、Debian 等提供默认软件与配置，但命令行为还取决于具体版本、文件系统与安全模块。',
        '一条命令跨越多个层次：Shell 负责解释，用户程序负责逻辑，内核负责资源操作，硬件完成实际传输。',
      ],
      history: [
        { when: '1969', what: 'Unix 在美国贝尔实验室诞生', why: '形成进程、文件与权限等影响深远的操作系统设计。' },
        { when: '1991', what: 'Linus Torvalds 发布 Linux 内核初版', why: '以自由许可的内核项目吸引全球开发者持续扩展硬件支持。' },
        { when: '1990 年代中期以后', what: 'Debian、Red Hat 等发行版逐步成熟', why: '把内核与用户工具打包成可安装、可维护的完整系统。' },
      ],
    },
    capabilities: [
      { name: '分层定位', sentence: '遇到问题时先判断故障属于硬件、内核、系统工具还是应用。' },
      { name: '识别发行版', sentence: '根据包管理器、默认路径与版本信息选择合适操作方式。' },
      { name: '理解共享内核', sentence: '解释为什么容器与宿主机共享内核，却不能因此共享全部运行环境。' },
      { name: '建立排查顺序', sentence: '从现象逐层下钻，而不是看到报错就直接重装系统。' },
    ],
    path: {
      intent: '追踪在 Linux 上输入 ls 后，系统如何从启动走到用户空间并列出目录。',
      environment: '一台使用 systemd 的通用 Linux 机器；不同发行版的启动工具可能不同。',
      steps: [
        { title: '固件找到启动设备', description: '开机后，基本输入输出系统或统一可扩展固件接口完成硬件自检，并按启动顺序找到引导程序。', terms: [{ name: 'BIOS / UEFI', definition: '固件接口，负责最底层硬件初始化并把控制权交给引导程序。' }], state: '固件完成自检，启动设备已确定。' },
        { title: '引导程序加载内核', description: '引导程序读取 Linux 内核与初始内存盘，把它们装入内存；此时还没有桌面，也没有用户命令。', terms: [{ name: '引导程序', definition: '固件之后运行的软件，负责选择并加载操作系统内核。' }], state: '内核映像已在内存中。' },
        { title: '内核初始化硬件与资源', description: '内核检测处理器、内存和设备，建立中断、调度、虚拟文件系统等基础设施，然后启动第一个用户空间进程。', terms: [{ name: 'PID 1', definition: '进程编号为 1 的第一个用户空间进程，常承担系统与服务管理职责。' }], state: '内核可提供进程、内存与文件服务。' },
        { title: '发行版用户空间接管', description: '初始内存盘协助找到根文件系统，systemd 等初始化系统挂载必要目录并启动服务；发行版的默认配置从这里开始发挥作用。', terms: [{ name: '根文件系统', definition: '以 / 为起点、承载系统目录与文件的文件系统视图。' }], state: '系统目录与服务逐步可用。' },
        { title: 'Shell 启动并执行 ls', description: '终端中的命令解释器读取 ls，找到同名用户程序并启动它；程序通过内核读取目录，Shell 最后把结果显示给用户。', terms: [{ name: 'Shell', definition: '解释命令文本、启动程序并连接输入输出的命令解释器。' }], state: '用户看到目录列表。' },
      ],
      stateTable: {
        columns: ['阶段', '内核', '用户空间', '用户看到什么'],
        rows: [
          ['固件自检', '尚未加载', '尚未运行', '厂商画面或无输出'],
          ['引导程序加载', '进入内存', '仅有引导相关代码', '启动菜单或日志'],
          ['内核初始化', '建立资源管理', '第一个进程将启动', '内核日志'],
          ['初始化系统运行', '持续提供服务', '挂载、服务与终端启动', '登录界面或命令行'],
          ['执行 ls', '读取目录数据', 'Shell 与 ls 协作', '目录列表'],
        ],
      },
      summary: 'Linux 是内核及其驱动的资源管理能力，发行版是完整系统组合，终端里的每条命令都是跨层协作的结果。',
    },
    costs: [
      { choice: '统一称“Linux”', cost: '交流简短，但会把内核版本、发行版工具和应用问题混在一起。', misread: '“Ubuntu 出问题，一定是 Linux 内核坏了。”' },
      { choice: '发行版默认配置', cost: '开箱可用，但不同版本的命令、路径和安全策略可能不同。', misread: '“所有 Linux 机器的输出都完全一样。”' },
      { choice: '共享宿主机内核', cost: '容器轻量且启动快，但内核漏洞与资源行为会影响全部共享者。', misread: '“容器里跑着 Ubuntu，就拥有独立 Ubuntu 内核。”' },
    ],
    example: {
      title: '用两个确定性模型分清请求与启动边界',
      intent: '不安装虚拟机，也能先看懂“应用提需求、内核完成操作”和“用户态、内核态交替”。',
      setup: '在 Git Bash 中直接运行 Python 标准库脚本；脚本只打印固定事件，不访问真实硬件，也不需要管理员权限。',
      terms: [
        { name: '系统调用', definition: '用户程序请求内核服务的受控入口，例如打开文件或写入设备。' },
        { name: 'ELF', definition: 'Linux 常见的可执行文件格式，包含程序代码、数据与加载所需元数据。' },
        { name: '用户态', definition: '普通应用运行的模式，不能直接执行任意硬件管理操作。' },
        { name: '内核态', definition: '内核运行的模式，可执行管理硬件和系统资源所需的特权操作。' },
      ],
      diagram: {
        kind: 'layers',
        title: '从一条命令到硬件，每一层只做自己的事',
        caption: '上层把意图逐层下传，内核把资源操作结果逐层返回；发行版横跨内核之外的用户工具。',
        items: [
          { title: '① 用户程序', detail: '编辑器、ls 或数据库运行在用户空间，负责业务逻辑并向内核提出读写、创建进程等请求。', tag: '提需求', tone: 'blue' },
          { title: '② 系统工具与发行版', detail: '包管理器、初始化系统与 Shell 组合成可维护环境；它们是用户空间软件，不是内核本身。', tag: '组合环境', tone: 'muted' },
          { title: '③ Linux 内核', detail: '调度进程、管理内存与文件，并驱动设备；通过系统调用向上层提供受控服务。', tag: '管资源', tone: 'orange' },
          { title: '④ 硬件', detail: '处理器执行指令，内存保存数据，磁盘与网卡完成实际输入输出。', tag: '执行物理操作', tone: 'green' },
        ],
        footnote: '终端只是交互界面；关闭终端通常不会关闭整个操作系统。',
      },
      commands: [
        {
          title: '模拟应用请求经过内核入口',
          command: `PYTHONIOENCODING=utf-8 python - <<'PY'
# 用稳定队列表示应用发出的请求，避免依赖真实系统调用。
requests = [('cat 读取配置', 'openat'), ('编辑器保存', 'write'), ('ls 列目录', 'getdents64')]
print('请求 -> 内核入口 -> 返回')
for label, name in requests:
    print(f'{label} -> {name} -> 完成')
PY`,
          output: `请求 -> 内核入口 -> 返回
cat 读取配置 -> openat -> 完成
编辑器保存 -> write -> 完成
ls 列目录 -> getdents64 -> 完成`,
          expect: '三行请求分别落到打开、写入和读取目录的内核入口；请用这句话说明“命令名不是直接操作硬件的魔法”。',
          note: '已在 Git Bash 中用 Python 标准库实际执行；这是机制模拟，不是对真实文件或目录执行操作。',
        },
        {
          title: '模拟程序启动时的模式交替',
          command: `PYTHONIOENCODING=utf-8 python - <<'PY'
# 启动阶段按固定顺序推进，展示用户程序、C 库和内核的分工。
stages = [
    ('装载器打开 ELF 程序', '用户态'),
    ('C 库发出 read 系统调用', '用户态'),
    ('内核读取磁盘并返回数据', '内核态'),
    ('程序继续执行 main', '用户态'),
]
for index, (event, mode) in enumerate(stages, 1):
    print(f'{index}. {event} [{mode}]')
PY`,
          output: `1. 装载器打开 ELF 程序 [用户态]
2. C 库发出 read 系统调用 [用户态]
3. 内核读取磁盘并返回数据 [内核态]
4. 程序继续执行 main [用户态]`,
          expect: '普通程序准备参数时仍在用户态，只有进入内核服务时才切换到内核态，随后返回用户态。',
          note: '已在 Git Bash 中实际执行；C 库是提供常用函数封装的用户空间库，main 是许多程序的主函数入口。',
        },
      ],
      checkpoints: ['能分别指出内核、用户空间、发行版和 Shell 的职责', '知道终端关闭不等于内核停止', '能把一次文件读取描述为应用请求、内核操作、硬件传输', '理解容器共享的是宿主机内核'],
      safety: '本示例只打印事件，不修改系统；不要为了验证启动流程而重启生产机器。',
    },
    boundaries: {
      blocks: ['把终端误当操作系统', '混淆发行版与内核', '逐层分析启动与请求'],
      notBlocks: ['硬件故障', '内核漏洞', '应用逻辑错误', '发行版包冲突'],
    },
  },
  {
    id: 'linux-kernel-user-space',
    track: 'linux',
    title: '内核与用户空间：系统调用如何穿过边界',
    english: 'USER MODE / SYSCALL / LIBC / ELF',
    summary: '理解用户态与内核态的分工，弄清风 Shell 启动的程序、C 库包装和内核服务之间怎样协作。',
    icon: 'shield',
    group: '系统与内核',
    dependencies: ['linux-mental-model'],
    dependents: [],
    philosophy: {
      problem: '应用需要读写文件、创建进程和访问设备，但若每个程序都能直接控制硬件，稳定性与隔离就无从保证。',
      rejects: '系统调用不是普通函数调用的另一种写法，用户态权限也不是“身份认证”；它首先是一条由处理器强制执行的特权边界。',
      counter: 'C 库让 open、read 等接口易用，但真正跨越边界的是底层系统调用；绕过库并不等于绕过内核检查。',
    },
    design: {
      abstractions: [
        { name: '用户态与内核态', role: '处理器划分的两种运行模式；普通应用在用户态，内核在内核态执行资源管理与特权操作。' },
        { name: '系统调用（system call）', role: '用户程序请求内核服务的受控入口，内核校验参数、权限与对象状态后执行。' },
        { name: 'C 库（libc）', role: '用户空间中提供常用函数封装的库，常把 open、read 等接口转换为一个或多个系统调用。' },
        { name: 'ELF 可执行文件', role: 'Executable and Linkable Format，Linux 常见的程序文件格式，装载器据此建立代码、数据与运行环境。' },
      ],
      principles: [
        '特权不能靠应用自觉：处理器模式与系统调用入口共同限制用户程序，错误参数也不能让内核无条件信任。',
        '库函数不等于系统调用：一次 read 包装可能检查缓冲与错误，也可能发出系统调用；具体实现取决于 libc、架构与内核接口。',
        '边界返回结果而非无限等待：成功、错误码与资源句柄都要由上层检查，不能把“调用了函数”当成“操作已经成功”。',
      ],
      history: [
        { when: '1970 年代', what: 'Unix 建立系统调用与 C 语言接口', why: '让可移植应用通过稳定入口使用内核服务。' },
        { when: '1980—1990 年代', what: 'UNIX System V 与 BSD 等接口逐步分化', why: '不同系统在进程、文件和网络调用上形成各自约定。' },
        { when: 'Linux 发展过程中', what: 'glibc 等 C 库持续适配内核接口', why: '向上层提供常用函数，同时处理版本与架构差异。' },
      ],
    },
    capabilities: [
      { name: '解释库与内核', sentence: '区分应用调用、libc 包装和系统调用入口。' },
      { name: '理解权限边界', sentence: '说明用户态程序为什么不能任意访问硬件。' },
      { name: '读取错误结果', sentence: '根据系统调用返回码定位参数、权限或资源问题。' },
      { name: '理解 ELF 启动', sentence: '知道程序文件如何被装载成可运行进程。' },
    ],
    path: {
      intent: '观察一个动态链接程序从 ELF 文件启动，到通过 libc 读取文件并返回数据的完整路径。',
      environment: '64 位 x86 Linux 概念路径，使用 glibc 与动态链接器；其他架构的寄存器与指令不同，分层思想一致。',
      steps: [
        { title: 'Shell 启动程序文件', description: 'Shell 找到 ELF 可执行文件并请求执行；动态链接器把程序需要的共享库映射到进程地址空间。', terms: [{ name: '动态链接器', definition: '在程序启动时解析共享库依赖并完成重定位的用户空间程序。' }], state: '程序代码与所需库已映射。' },
        { title: 'libc 包装应用请求', description: '应用调用 C 库提供的 read；包装器准备缓冲区、长度和文件描述符，并选择底层系统调用入口。', terms: [{ name: '文件描述符', definition: '进程引用已打开对象的非负整数句柄，不是文件路径本身。' }], state: '系统调用参数已准备。' },
        { title: '受控进入内核态', description: '应用执行特定指令触发系统调用，处理器保存必要现场并进入内核；应用不能任意跳到内核代码。', terms: [{ name: '陷入', definition: '用户态通过受控机制进入内核处理例行程序的过程。' }], state: '处理器处于内核态。' },
        { title: '内核校验并执行', description: '内核根据系统调用号找到处理函数，检查指针、权限和对象状态，再读取文件或操作设备。', terms: [{ name: '系统调用号', definition: '内核用来区分不同服务的数字编号，例如 read 与 write。' }], state: '受控资源操作已执行。' },
        { title: '结果返回用户态', description: '内核把字节数、错误码或新句柄放入约定的返回位置并恢复用户态；libc 再转换 errno 等错误信息。', terms: [{ name: 'errno', definition: 'C 库保存最近一次失败原因的线程局部状态，不是系统调用号。' }], state: '应用得到可检查的结果。' },
        { title: '应用处理错误或继续', description: '短读、中断和资源暂时不可用都可能出现；健壮程序检查返回结果并按协议重试、退出或报告。', terms: [{ name: '短读', definition: 'read 返回的字节数少于请求长度；可能是文件结束、管道暂时无数据或信号中断。' }], state: '业务逻辑依据真实结果继续。' },
      ],
      stateTable: {
        columns: ['阶段', '运行模式', '执行者', '关键结果'],
        rows: [
          ['装载 ELF', '用户态', '装载器与动态链接器', '代码、数据和库已映射'],
          ['调用 read', '用户态', '应用与 libc', '参数与缓冲区就绪'],
          ['系统调用入口', '切换到内核态', '处理器受控机制', '进入内核处理函数'],
          ['读取文件', '内核态', '内核文件与设备代码', '数据复制到用户缓冲区'],
          ['返回结果', '切回用户态', '内核与 libc', '字节数或错误码'],
          ['应用判断', '用户态', '应用程序', '继续、重试或退出'],
        ],
      },
      summary: '用户态负责意图，libc 提供便利，系统调用形成检查边界，内核完成资源操作；每一层返回的结果都要继续检查。',
    },
    costs: [
      { choice: 'libc 包装', cost: '接口易用且可移植，但多一层函数与错误处理，调用路径不总是一对一。', misread: '“一个 C 库函数一定只发出一次系统调用。”' },
      { choice: '系统调用边界', cost: '换来稳定与权限控制，但模式切换、参数复制和校验都有开销。', misread: '“系统调用只是一次普通 C 函数跳转。”' },
      { choice: '直接系统调用', cost: '适合运行时、追踪和特殊优化，但绕过便捷包装会增加版本兼容与错误处理难度。', misread: '“绕过 libc 就能绕过内核权限检查。”' },
    ],
    example: {
      title: '观察 libc、系统调用号与模式切换',
      intent: '用固定数据展示包装关系，并强调进入内核态不是由用户程序随意决定的。',
      setup: '在 Git Bash 中运行两个 Python 标准库模拟；它们不创建真实文件，所有编号和返回字节数均为教学常量。',
      terms: [
        { name: 'libc', definition: '用户空间中的 C 标准库实现，提供 read、write 等包装函数。' },
        { name: '系统调用', definition: '向内核请求服务的受控入口；本示例重点观察调用名和返回结果。' },
        { name: '用户态', definition: '应用运行的模式，只能通过受控入口请求内核服务。' },
        { name: '内核态', definition: '内核执行资源管理的特权模式。' },
      ],
      diagram: {
        kind: 'flow',
        title: '一次读取如何穿过用户态与内核态',
        caption: 'libc 准备参数，处理器受控进入内核，内核完成读取，结果沿原路径返回应用。',
        items: [
          { title: '① 应用调用 read', detail: '应用给出文件描述符、缓冲区地址与读取长度，此时仍在用户态。', tag: '用户态', tone: 'blue' },
          { title: '② libc 准备参数', detail: '包装器处理可移植接口，并把参数放入系统调用约定要求的位置。', tag: '包装', tone: 'muted' },
          { title: '③ 受控进入内核', detail: '通过系统调用指令切换模式，处理器保存现场并进入对应处理函数。', tag: '边界', tone: 'orange' },
          { title: '④ 内核读取并返回', detail: '内核校验描述符与缓冲区，执行读取，再把字节数或错误码交回用户态。', tag: '内核服务', tone: 'green' },
        ],
        footnote: '图中把 C 库与处理器入口分开画，是为了强调“包装函数”与“特权边界”不是同一件事。',
      },
      commands: [
        {
          title: '模拟 libc 名称到系统调用的映射',
          command: `PYTHONIOENCODING=utf-8 python - <<'PY'
# syscalls 模拟 C 库包装器，operations 表示应用真正要完成的文件操作。
syscalls = {'open': 'openat', 'read': 'read', 'write': 'write', 'close': 'close'}
operations = ['open', 'read', 'read', 'close']
fd = 3
print(f'文件描述符起始值: {fd}')
for op in operations:
    if op == 'open':
        print(f'{op}() -> {syscalls[op]}() -> fd={fd}')
    elif op == 'read':
        print(f'{op}() -> {syscalls[op]}(fd={fd}) -> 4 字节')
    elif op == 'close':
        print(f'{op}() -> {syscalls[op]}(fd={fd}) -> fd 已释放')
PY`,
          output: `文件描述符起始值: 3
open() -> openat() -> fd=3
read() -> read(fd=3) -> 4 字节
read() -> read(fd=3) -> 4 字节
close() -> close(fd=3) -> fd 已释放`,
          expect: 'fd=3 是打开后得到的句柄；后续 read 复用这个整数，close 才释放它。open 在本例中映射到 openat，而不是假定所有库函数都同名直通。',
          note: '已在 Git Bash 中实际执行；openat 是 Linux 常用的相对目录文件打开接口，模拟输出不代表真实文件已打开。',
        },
        {
          title: '模拟一次模式切换的事件顺序',
          command: `PYTHONIOENCODING=utf-8 python - <<'PY'
# events 记录 CPU 在应用与内核服务之间切换；真实系统还会保存现场。
events = [
    ('应用计算', '用户态', 'CPU 执行普通指令'),
    ('写入终端', '用户态', '准备 write 参数'),
    ('进入 write', '内核态', '内核完成受限操作'),
    ('返回应用', '用户态', '检查结果并继续'),
]
for action, mode, detail in events:
    print(f'{mode} | {action} | {detail}')
PY`,
          output: `用户态 | 应用计算 | CPU 执行普通指令
用户态 | 写入终端 | 准备 write 参数
内核态 | 进入 write | 内核完成受限操作
用户态 | 返回应用 | 检查结果并继续`,
          expect: '准备参数发生在用户态，进入 write 服务时切换到内核态，服务结束后返回用户态；不能把整条命令都称为“内核在执行”。',
          note: '已在 Git Bash 中实际执行；脚本没有执行真实 write 系统调用，仅打印教学事件。',
        },
      ],
      checkpoints: ['能区分 libc 函数与系统调用', '知道文件描述符是句柄而不是路径', '能按顺序说出用户态、内核态、用户态', '理解每次返回结果都必须检查'],
      safety: '不要用直接系统调用覆盖关键程序来做实验；本模块只使用无副作用的模拟脚本。',
    },
    boundaries: {
      blocks: ['用户程序任意控制硬件', '把应用错误都归因于硬件', '忽略返回码'],
      notBlocks: ['内核漏洞', 'libc 与内核版本不匹配', '恶意程序利用边界缺陷', '设备驱动故障'],
    },
  },
  {
    id: 'linux-process-model',
    track: 'linux',
    title: '进程模型：从 fork、exec 到僵尸与线程',
    english: 'PROCESS / FORK / EXEC / THREAD',
    summary: '把程序运行实例拆成进程标识、地址空间、状态与父子关系，理解程序替换、退出回收和多线程。',
    icon: 'workflow',
    group: '进程与文件',
    dependencies: ['linux-kernel-user-space'],
    dependents: [],
    philosophy: {
      problem: '用户只看到“程序启动了”，系统却要同时管理多个运行实例、它们的父子关系、资源、状态和退出结果。',
      rejects: '进程不是可执行文件，线程也不是独立进程；进程存在不代表正在使用处理器，退出也不代表资源已经全部回收。',
      counter: 'fork 创建相似子进程，exec 替换当前进程的程序映像；子进程先退出而父进程未回收时，会短暂留下僵尸状态。',
    },
    design: {
      abstractions: [
        { name: '进程与 PID / PPID', role: '进程是程序运行的实例；进程标识 PID 是编号，父进程标识 PPID 记录创建它的进程。' },
        { name: 'fork 与 exec', role: 'fork 创建子进程并返回两次，exec 用新程序替换当前进程的映像而不改变 PID。' },
        { name: '状态与僵尸', role: '运行、睡眠、停止等状态描述进程处境；僵尸是已退出但退出状态尚未被父进程读取的残留记录。' },
        { name: '线程', role: '进程内可被调度的执行流，共享地址空间与多数资源，但各有寄存器、栈与线程本地状态。' },
      ],
      principles: [
        'PID 只是运行期身份：同一程序可对应多个进程，PID 也可能在系统重启或大量创建后被复用，不能作为永久业务标识。',
        '创建与替换是两步能力：fork 复制出子进程，exec 再把子进程变成目标程序；Shell 常把两者组合使用。',
        '退出需要被处理：父进程等待并读取子进程状态后，内核才释放僵尸记录；线程退出也需处理 Join 或 Detach 的生命周期。',
      ],
      history: [
        { when: 'Unix 早期', what: '形成 fork、exec、wait 的进程模型', why: '用少量正交操作组合创建、替换与回收流程。' },
        { when: '1980—1990 年代', what: 'POSIX 线程接口逐步标准化', why: '让同一进程中的并发执行流拥有可移植接口。' },
        { when: 'Linux 2.6', what: '新的调度与线程实现逐步成熟', why: '改善多处理器扩展、抢占与大规模并发性能。' },
      ],
    },
    capabilities: [
      { name: '查看进程关系', sentence: '用 PID、PPID 和状态把终端、服务与子进程关联起来。' },
      { name: '理解程序替换', sentence: '解释为什么 Shell 启动外部命令时常用 fork 加 exec。' },
      { name: '识别僵尸', sentence: '区分已退出、不可运行与父进程未回收。' },
      { name: '认识线程共享', sentence: '判断共享数据竞争、锁与栈溢出属于哪一层问题。' },
    ],
    path: {
      intent: '观察 Shell 启动 cat：先创建子进程，再替换为 cat，最后等待并回收退出结果。',
      environment: '通用 Linux 进程模型；示例中的 PID 是固定教学值，真实编号由内核分配。',
      steps: [
        { title: 'Shell 创建子进程', description: 'Shell 调用 fork，内核复制出子进程；父子从同一点继续，但返回值不同，PID 与 PPID 也不同。', terms: [{ name: 'fork', definition: '创建子进程的系统调用；父进程得到子 PID，子进程得到 0。' }], state: '父 PID 200 与子 PID 201 同时存在。' },
        { title: '子进程替换程序映像', description: '子进程调用 exec，把代码、数据与执行入口替换为 cat；PID 仍为 201，PPID 仍指向 200。', terms: [{ name: 'exec', definition: '用新程序替换当前进程映像的系统调用族，成功时不返回旧程序。' }], state: '子进程开始执行 cat。' },
        { title: '父进程等待结果', description: 'Shell 调用 wait 等机制暂停等待子进程，并把标准输入输出连接到终端或管道。', terms: [{ name: 'wait', definition: '父进程读取子进程终止状态的接口，可阻塞等待或稍后查询。' }], state: '父进程等待，子进程执行或结束。' },
        { title: '子进程退出成为僵尸', description: 'cat 结束后，内核释放大部分资源，但保留 PID 与退出状态，直到父进程读取；此时状态常显示为 Z。', terms: [{ name: '僵尸进程', definition: '已经退出、但退出状态尚未被父进程回收的进程记录。' }], state: '子 PID 201 为僵尸，不占处理器运行。' },
        { title: '父进程回收退出状态', description: 'Shell 读取退出码，内核删除僵尸记录；退出码供后续脚本判断成功或失败。', terms: [{ name: '退出码', definition: '进程结束时返回给父进程的整数，0 通常表示成功。' }], state: '子进程记录消失，退出码可用。' },
        { title: '多线程作为另一维度', description: '一个进程可创建多个线程共享内存；线程数量增加不等于 CPU 数量增加，共享数据仍需要同步。', terms: [{ name: '线程标识 TID', definition: '线程在内核中的标识；在 Linux 中它也可作为轻量级进程的 PID 出现。' }], state: '同一地址空间内存在多个执行流。' },
      ],
      stateTable: {
        columns: ['事件', '父进程 200', '子进程 201', '子进程状态', '资源变化'],
        rows: [
          ['fork 前', 'Shell 运行', '不存在', '无', '只有父进程'],
          ['fork 后', '得到 PID 201', '得到 0', '可运行', '子进程拥有独立地址空间'],
          ['exec 后', '继续等待', '运行 cat', '运行或睡眠', '程序映像被替换'],
          ['cat 退出', '尚未 wait', '已终止', '僵尸 Z', '大部分资源释放，状态保留'],
          ['wait 返回', '得到退出码', '记录删除', '不存在', 'PID 与状态被回收'],
          ['创建线程', '进程仍存在', '新增 TID', '各线程调度', '共享地址空间，栈独立'],
        ],
      },
      summary: '进程管理围绕“谁创建谁、正在运行什么、处于什么状态、谁负责回收”展开；fork、exec、wait 与线程分别回答不同问题。',
    },
    costs: [
      { choice: 'fork 复制地址空间', cost: '接口简洁、父子协作自然，但复制与写时复制仍有成本，线程或进程池有时更合适。', misread: '“fork 出来的是一个已经执行新程序的孩子。”' },
      { choice: '僵尸保留状态', cost: '让父进程能读取退出结果，但父进程失控时会累积进程记录与 PID 占用。', misread: '“显示 Z 说明它还在消耗 CPU 计算。”' },
      { choice: '多线程共享内存', cost: '通信快、创建轻，但数据竞争、锁顺序与一个线程崩溃影响全进程的风险更高。', misread: '“线程越多，程序就一定并行得越快。”' },
    ],
    example: {
      title: '用固定事件理解程序替换与僵尸回收',
      intent: '先模拟内部生命周期，再用 ps 的 STAT 列把概念对应到真实 Linux 状态字符。',
      setup: '第一命令在 Git Bash 中运行 Python 标准库模拟；第二命令仅在 Linux 终端运行，依赖 procps 软件包提供的 ps，不在 Windows 上执行。',
      terms: [
        { name: 'PID / PPID', definition: '进程编号与父进程编号；PPID 帮助建立父子关系。' },
        { name: 'exec', definition: '用新程序替换当前进程映像，成功后不会回到旧程序。' },
        { name: '僵尸 Z', definition: '已退出但尚未被父进程读取状态的进程，ps 的状态列常显示 Z。' },
        { name: 'STAT', definition: 'ps 输出的一列或多字符状态码，例如 S 表示可中断睡眠，Z 表示僵尸。' },
      ],
      diagram: {
        kind: 'flow',
        title: 'Shell 启动 cat 的两阶段与回收闭环',
        caption: 'fork 决定“多一个执行者”，exec 决定“这个执行者运行什么”，wait 决定“谁取走退出结果”。',
        items: [
          { title: '① Shell fork', detail: '父进程得到子 PID，子进程从相同位置继续；两者拥有独立地址空间。', tag: '创建', tone: 'blue' },
          { title: '② 子进程 exec', detail: 'PID 不变，程序映像变成 cat；失败则子进程通常需要报错并退出。', tag: '替换', tone: 'orange' },
          { title: '③ cat 运行', detail: '进程可运行或等待输入输出；运行中不等于始终占用 CPU。', tag: '执行', tone: 'green' },
          { title: '④ 退出为 Z', detail: '内核释放大部分资源，保留退出状态，等待父进程读取。', tag: '待回收', tone: 'orange' },
          { title: '⑤ wait 回收', detail: 'Shell 得到退出码，内核删除僵尸记录；父进程若长期不回收才成为问题。', tag: '闭环', tone: 'muted' },
        ],
        footnote: '状态 Z 是正常的短暂阶段，不等于死锁；持续大量出现才应检查父进程是否正确回收子进程。',
      },
      commands: [
        {
          title: '模拟 fork、exec、僵尸与 wait',
          command: `PYTHONIOENCODING=utf-8 python - <<'PY'
# process 用字典记录 PID、PPID、程序与状态，模拟一次子进程退出到回收。
parent = {'pid': 200, 'ppid': 1, 'program': 'bash', 'state': '运行'}
child = {'pid': 201, 'ppid': 200, 'program': 'bash', 'state': '运行'}
print(f"fork: parent={parent['pid']} child={child['pid']} ppid={child['ppid']}")
child['program'] = 'cat'
print(f"exec: pid={child['pid']} program={child['program']}")
child['state'] = '僵尸'
print(f"child exit: pid={child['pid']} state={child['state']} 等待父进程读取退出状态")
child['state'] = '已回收'
print(f"wait: pid={child['pid']} state={child['state']} exit=0")
PY`,
          output: `fork: parent=200 child=201 ppid=200
exec: pid=201 program=cat
child exit: pid=201 state=僵尸 等待父进程读取退出状态
wait: pid=201 state=已回收 exit=0`,
          expect: 'exec 前后 PID 都是 201，只有程序改变；僵尸出现在退出之后、wait 之前，回收后记录消失。',
          note: '已在 Git Bash 中实际执行；脚本用字典模拟内核记录，没有创建真实子进程。',
        },
        {
          title: '在 Linux 上查看 PID、PPID 与状态列',
          command: `ps -o pid,ppid,stat,comm -p 1,$$`,
          output: `  PID  PPID STAT COMMAND
    1     0 Ss   systemd
  482   481 S    bash`,
          expect: 'PID 1 的 PPID 为 0，STAT 以 S 表示睡眠；第二行是当前 Shell 的典型状态。请把这些字符与模拟中的运行、等待概念联系起来。',
          note: '环境：通用 Linux + procps 的 ps，输出为未在 Windows 运行的写实示例；PID、PPID 与进程名因机器和 Shell 而异。STAT 可包含多个字符，Ss 常表示会话领导者。',
        },
      ],
      checkpoints: ['fork 创建新进程而 exec 替换程序', 'exec 成功不改变原 PID', '能解释 Z 状态出现在退出与回收之间', '知道线程共享地址空间但仍需同步'],
      safety: '不要用 kill -9 或清理僵尸命令处理生产进程；先确认父进程与业务影响。ps 本身只读取状态。',
    },
    boundaries: {
      blocks: ['把程序文件当运行实例', '混淆 PID 与 PPID', '识别僵尸与线程关系'],
      notBlocks: ['修复父进程回收逻辑', '解决共享内存竞争', '保证实时调度', '跨节点进程迁移'],
    },
  },
  {
    id: 'linux-filesystem-vfs',
    track: 'linux',
    title: '文件系统与 VFS：一个路径如何找到数据',
    english: 'PATH / DENTRY / INODE / MOUNT',
    summary: '从路径逐级解析目录项与 inode，再穿过挂载点找到具体文件系统，理解文件名和存储对象的分离。',
    icon: 'folder',
    group: '进程与文件',
    dependencies: ['linux-kernel-user-space'],
    dependents: [],
    philosophy: {
      problem: '应用只认识 /etc/passwd 这样的路径，背后却可能横跨 ext4、XFS、网络文件系统与内存文件系统；内核需要统一入口。',
      rejects: '路径不是数据本身，文件名也不是 inode；挂载不是把设备名写进目录，更不会自动合并两个目录。',
      counter: '删除一个文件名只删除目录项并减少 inode 引用；只要还有硬链接或进程打开着，数据就可能继续存在。',
    },
    design: {
      abstractions: [
        { name: '虚拟文件系统 VFS', role: 'Virtual File System，内核向应用提供的统一文件接口，连接系统调用与 ext4、XFS 等具体实现。' },
        { name: '路径与目录项', role: '路径是定位表达；目录项 dentry 是目录中名称到 inode 的缓存映射。' },
        { name: '索引节点 inode', role: '文件系统内的元数据对象，记录类型、权限、属主、大小与数据块位置，不含文件名。' },
        { name: '挂载 mount', role: '把某个文件系统的根接到现有目录树的挂载点，之后该路径进入新文件系统。' },
      ],
      principles: [
        '先解析路径，再操作对象：每一级目录都要有执行权限，遇到挂载点还会切换到对应文件系统根。',
        '名称与对象分离：目录项保存名称和 inode 关联，硬链接就是多个名称指向同一 inode，不是复制整份数据。',
        '缓存服务于正确性而非替代存储：dentry 与 inode 缓存加速查找，实际数据仍由具体文件系统与设备管理。',
      ],
      history: [
        { when: 'Unix 早期', what: '形成目录、inode 与链接模型', why: '把文件命名与数据对象分离，支持统一文件和硬链接。' },
        { when: 'Linux 2.x 演进', what: 'VFS 与多种文件系统接口逐步完善', why: '让本地、网络和虚拟文件系统共享上层操作模型。' },
        { when: '现代 Linux', what: 'ext4、XFS、Btrfs 与 overlayfs 等并存', why: '在可靠性、性能、快照和容器层视图等需求间提供不同取舍。' },
      ],
    },
    capabilities: [
      { name: '逐级定位', sentence: '按路径组成部分理解目录查找与挂载切换。' },
      { name: '解释硬链接', sentence: '说明多个文件名为何能共享同一份数据与 inode。' },
      { name: '核对元数据', sentence: '用 stat 查看 inode、类型、权限、属主与大小。' },
      { name: '识别挂载视图', sentence: '判断同一路径当前由哪个文件系统提供内容。' },
    ],
    path: {
      intent: '解析 /srv/demo/readme.txt，其中 /srv 是另一个文件系统的挂载点。',
      environment: '通用 Linux VFS；演示中 inode 编号、挂载设备名与文件大小均为固定教学值。',
      steps: [
        { title: '从根目录开始', description: '路径以 / 开头，查找从当前进程的根目录开始；相对路径则从当前工作目录开始。', terms: [{ name: '当前工作目录', definition: '进程用于解释相对路径的起始目录，可由 pwd 查看。' }], state: '确定根目录 inode。' },
        { title: '逐级查找目录项', description: 'VFS 在每级目录中查找 srv、demo、readme.txt 对应的目录项，并检查目录执行权限。', terms: [{ name: 'dentry', definition: '目录项的 VFS 表示，缓存名称与 inode 的关联以加速查找。' }], state: '得到下一级目录或文件的 inode。' },
        { title: '在挂载点切换文件系统', description: '查到 /srv 时，VFS 发现该目录是挂载点，转而从 datadisk 文件系统的根继续解析 demo。', terms: [{ name: '挂载点', definition: '目录树中附加另一个文件系统根的位置；挂载后原内容被遮蔽。' }], state: '后续查找进入 datadisk。' },
        { title: '读取最终 inode 元数据', description: 'readme.txt 的目录项指向 inode 42；inode 说明它是普通文件、大小、权限以及数据块位置。', terms: [{ name: 'inode', definition: '文件系统中描述对象元数据与数据位置的记录；inode 编号只在所属文件系统内有意义。' }], state: '定位普通文件 inode 42。' },
        { title: '由文件系统读取数据', description: 'VFS 把 read 请求交给 datadisk 的具体实现，后者根据 inode 与数据块映射读取内容并返回用户缓冲区。', terms: [{ name: '数据块', definition: '文件系统分配存储空间的基本单位；文件内容通过这些块保存。' }], state: '应用获得 12 字节文件内容。' },
      ],
      stateTable: {
        columns: ['已解析路径', '当前目录项', 'inode', '文件系统', '下一步'],
        rows: [
          ['/', '根目录', '根 inode', 'rootfs', '查找 srv'],
          ['/srv', 'srv', '目录 inode', 'rootfs → datadisk', '跨挂载点'],
          ['/srv/demo', 'demo', '目录 inode', 'datadisk', '查找 readme.txt'],
          ['/srv/demo/readme.txt', 'readme.txt', '42', 'datadisk', '读取元数据与数据'],
          ['read(…, 12)', '名称不再参与读取', '42', 'datadisk', '返回文件内容'],
        ],
      },
      summary: '路径解析是“目录项逐级找 inode、遇挂载点换文件系统”的过程；VFS 统一接口，inode 描述对象，目录项保存名称关联。',
    },
    costs: [
      { choice: '名称与 inode 分离', cost: '支持硬链接与灵活命名，但 inode 编号、链接计数和跨文件系统移动更容易混淆。', misread: '“inode 就是文件名，文件名一定存在 inode 里。”' },
      { choice: '挂载覆盖', cost: '可组合多个文件系统，但目标原目录被遮蔽，容器与网络文件系统还会引入权限和可用性差异。', misread: '“挂载会把两个目录的内容自动合并。”' },
      { choice: 'VFS 缓存', cost: '提升重复查找性能，但缓存一致性与网络文件系统语义更复杂。', misread: '“ls 没立刻显示新文件，说明数据一定没有写入。”' },
    ],
    example: {
      title: '逐段观察路径、目录项、inode 与挂载切换',
      intent: '先用 Python 固定模型走完解析，再在 Linux 上核对真实路径的 inode 与挂载来源。',
      setup: '第一命令可在 Git Bash 运行，仅操作内存字典；第二命令只在 Linux 运行，依赖 coreutils 的 stat 和 util-linux 的 findmnt。',
      terms: [
        { name: 'VFS', definition: '内核统一文件接口，应用通过它访问不同文件系统。' },
        { name: 'dentry', definition: '目录项，表示名称到 inode 的关联。' },
        { name: 'inode', definition: '文件系统记录元数据与数据位置的对象。' },
        { name: '挂载点', definition: '目录树中接入另一个文件系统根的位置。' },
      ],
      diagram: {
        kind: 'flow',
        title: '/srv/demo/readme.txt 的四次关键判断',
        caption: '名称用于逐级查找，inode 用于描述对象，挂载点决定后续由哪个文件系统回答。',
        items: [
          { title: '① / → srv', detail: '从根目录项找到 srv 对应的目录 inode，并检查继续查找所需的执行权限。', tag: '目录项', tone: 'blue' },
          { title: '② /srv 挂载点', detail: '发现 srv 是挂载点，查找上下文切到 datadisk 的根，不再继续使用原下层目录内容。', tag: '切换文件系统', tone: 'orange' },
          { title: '③ demo → readme.txt', detail: '在 datadisk 中逐级查找目录项，最终得到指向 inode 42 的文件名称。', tag: '逐级解析', tone: 'green' },
          { title: '④ inode 42 → 数据', detail: 'VFS 读取 inode 元数据，再由 datadisk 按数据块映射把文件内容返回应用。', tag: '读取对象', tone: 'muted' },
        ],
        footnote: '硬链接让多个目录项指向同一 inode；删除其中一个名称不等于立刻抹掉全部数据。',
      },
      commands: [
        {
          title: '模拟 VFS 逐级路径解析',
          command: `PYTHONIOENCODING=utf-8 python - <<'PY'
# mount_table 与 tree 只保留演示所需的目录项和 inode 元数据。
mount_table = {'/': 'rootfs', '/srv': 'datadisk'}
tree = {
    '/': {'srv': 'd:srv'},
    '/srv': {'demo': 'd:demo'},
    '/srv/demo': {'readme.txt': 'f:42'},
}
inodes = {'f:42': {'type': 'regular', 'size': 12}}
path = '/srv/demo/readme.txt'
parts = [part for part in path.split('/') if part]
current = '/'
print(f'输入路径: {path}')
for part in parts:
    entry = tree[current][part]
    current = current.rstrip('/') + '/' + part
    mount = mount_table.get(current, '沿用')
    print(f'目录项: {current} -> {entry} -> {mount}')
inode = inodes[entry]
print(f"最终 inode: {entry} type={inode['type']} size={inode['size']}")
PY`,
          output: `输入路径: /srv/demo/readme.txt
目录项: /srv -> d:srv -> datadisk
目录项: /srv/demo -> d:demo -> 沿用
目录项: /srv/demo/readme.txt -> f:42 -> 沿用
最终 inode: f:42 type=regular size=12`,
          expect: '在 /srv 处文件系统从 rootfs 切到 datadisk；最终名称 readme.txt 只用于找到 inode 42，读取阶段不再依赖名称。',
          note: '已在 Git Bash 中实际执行；脚本是内存模型，不创建或读取 /srv 下的真实文件。',
        },
        {
          title: '在 Linux 上核对 inode 与挂载来源',
          command: `stat -c '%n inode=%i mode=%A uid=%u gid=%g' / /etc/passwd
findmnt -T /etc/passwd -o TARGET,SOURCE,FSTYPE`,
          output: `/ inode=2 mode=drwxr-xr-x uid=0 gid=0
/etc/passwd inode=2678 mode=-rw-r--r-- uid=0 gid=0
TARGET SOURCE    FSTYPE
/      /dev/sda2 ext4`,
          expect: 'stat 显示路径对应的 inode、类型、权限与属主；findmnt 显示 /etc/passwd 当前位于根挂载点 /，其来源是 ext4 文件系统。',
          note: '环境：Linux + coreutils + util-linux，输出为未在 Windows 运行的写实示例；inode、设备名与文件系统因机器而异，某些系统 / 可能由 overlayfs 等提供。',
        },
      ],
      checkpoints: ['能按顺序说出路径、dentry、inode、文件系统', '知道 /srv 处发生了挂载切换', '理解文件名不在 inode 中', '能用 stat 与 findmnt 分别核对对象与挂载视图'],
      safety: '本示例只读取元数据；不要用 mkfs、mount 或修改 /etc/fstab 的方式验证概念，以免影响现有数据。',
    },
    boundaries: {
      blocks: ['路径跨文件系统不可见', '名称与存储对象混淆', '硬链接原理不清'],
      notBlocks: ['磁盘坏块恢复', '文件系统一致性修复', '备份与权限审计', '网络存储性能'],
    },
  },
  {
    id: 'linux-permissions-identity',
    track: 'linux',
    title: '权限与身份：属主、组、模式与 ACL',
    english: 'UID / GID / MODE / ACL',
    summary: '把一次访问检查拆成身份识别、属主属组匹配、模式位与访问控制列表，理解 root 特权为何特殊。',
    icon: 'lock',
    group: '进程与文件',
    dependencies: ['linux-filesystem-vfs'],
    dependents: [],
    philosophy: {
      problem: '多个用户和服务共享一台机器，系统必须回答“这个进程能否读取这个对象”，同时让管理员保留受控的维护能力。',
      rejects: '权限不只是 chmod 的三个数字，用户也不只由登录名决定；root 不是普通“最大文件属主”，而是拥有特殊内核能力的身份。',
      counter: '属主匹配优先于属组与其他用户，但 ACL、挂载选项、安全模块和进程能力都可能改变最终结果。',
    },
    design: {
      abstractions: [
        { name: '用户与组', role: '用户由 UID 标识，组由 GID 标识；进程除主组外还可携带补充组，登录名与组名只是可读映射。' },
        { name: '属主与属组', role: '每个 inode 记录所属 UID 与 GID，访问检查先把请求者身份与这两个字段比较。' },
        { name: '模式 mode', role: '用属主、属组、其他用户三组读、写、执行位表达基本自主访问控制。' },
        { name: 'ACL 与 root', role: '访问控制列表 ACL 提供更细的命名用户与组授权；root 的特殊能力来自内核权限模型而非普通模式位。' },
      ],
      principles: [
        '先匹配身份类别再选权限位：属主使用属主位，否则考虑命名 ACL 与组，最后才使用其他用户位。',
        '目录权限同样重要：读取目录需要读位，进入或穿过目录通常需要执行位，创建删除条目还需要写位。',
        '最小权限要组合验证：UID、补充组、mode、ACL、能力、安全模块与挂载选项共同决定访问，不能只看 chmod 输出。',
      ],
      history: [
        { when: 'Unix 早期', what: '形成 UID、GID 与九位基本权限', why: '用简单模型支持多用户文件共享。' },
        { when: '1990 年代', what: 'POSIX ACL 在多种 Unix 系统实现', why: '在不改变属主属组的前提下为更多用户与组授权。' },
        { when: 'Linux 2.6 起', what: 'capability 机制逐步成熟', why: '把 root 的全能特权拆成可单独授予和裁剪的内核能力。' },
      ],
    },
    capabilities: [
      { name: '读取身份', sentence: '用 id 查看当前 UID、主 GID 与补充组。' },
      { name: '解释模式', sentence: '把 640、644、755 等数字转换成三类用户的读写执行权限。' },
      { name: '核对属主', sentence: '用 stat 区分 root、普通用户与文件实际所有者。' },
      { name: '认识 ACL 边界', sentence: '知道普通 mode 检查之外还可能有更细或更严格的策略。' },
    ],
    path: {
      intent: '判断 UID 1000 的用户读取属主 UID 1000、属组 GID 100、模式 640 的文件时会发生什么。',
      environment: '启用传统自主访问控制的通用 Linux；若文件有 ACL、SELinux 或 AppArmor 策略，还需追加检查。',
      steps: [
        { title: '确认请求者身份', description: '内核读取进程的 UID、主 GID 与补充组；id 命令展示的是这些运行时身份，不只是/etc/passwd 中的登录名。', terms: [{ name: 'UID / GID', definition: '用户标识与组标识；权限比较使用数字身份，而不是显示名称。' }], state: '请求者 UID=1000，补充组含 100。' },
        { title: '读取 inode 的属主属组', description: '文件 inode 记录属主 UID=1000、属组 GID=100 与 mode=640；这些元数据决定基本检查的输入。', terms: [{ name: '属主 ownership', definition: 'inode 记录的用户与组所有者，通常分别显示为 user 与 group。' }], state: '目标元数据已确定。' },
        { title: '属主优先匹配', description: '请求者 UID 等于属主 UID，因此选用属主权限位 6，即读与写；不会退回去使用组或其他用户位。', terms: [{ name: '模式位 mode bits', definition: 'mode 中属主、属组、其他用户各自的读、写、执行三个权限位。' }], state: '属主类别匹配，允许读取。' },
        { title: '必要时检查 ACL', description: '若 inode 带 ACL，内核按 ACL 规则判断命名用户、命名组与掩码；掩码会限制 ACL 条目最终能获得的权限。', terms: [{ name: 'ACL 掩码', definition: '限制命名用户、命名组与所属组条目有效权限的权限集合。' }], state: '传统 mode 结果还需通过附加策略。' },
        { title: '应用特殊权限与安全模块', description: 'root 可通过 capability 等机制执行特定管理操作，但并非所有检查都简单绕过；SELinux、AppArmor 与只读挂载仍可能拒绝访问。', terms: [{ name: 'capability', definition: '把管理操作拆成具体内核能力的授权单位，例如绑定低端口或改变文件属主。' }], state: '得到最终允许或拒绝结果。' },
      ],
      stateTable: {
        columns: ['请求者', '目标元数据', '匹配类别', '候选权限', '传统检查结果'],
        rows: [
          ['UID 1000，组 100', '属主 1000，属组 100，640', '属主', 'rw-', '允许读'],
          ['UID 1002，组 102', '属主 1000，属组 100，640', '其他', '---', '拒绝读'],
          ['UID 1001，组 101', '属主 1000，属组 100，640', '其他', '---', '拒绝读'],
          ['UID 1001，组 100', '属主 1000，属组 100，640', '属组', 'r--', '允许读'],
          ['root 且有所需能力', '任意普通文件', '特殊管理身份', '按能力与策略', '可能允许，仍受 LSM 等约束'],
        ],
      },
      summary: '访问检查是“识别数字身份、读取 inode 元数据、匹配类别、叠加 ACL 与安全策略”的过程；chmod 只是其中一层。',
    },
    costs: [
      { choice: '九位基本模式', cost: '简单通用，但难以为多个不同用户精细授权，chmod 777 常把问题扩大而不是解决。', misread: '“rwxrwxrwx 是最安全的管理方式。”' },
      { choice: 'ACL 细粒度控制', cost: '可保持属主属组不变并授权更多主体，但继承、掩码与工具差异增加排障难度。', misread: '“ls 看不到加号以外信息，就说明没有额外策略。”' },
      { choice: 'root 与 capability', cost: '便于维护，但误用影响巨大；把服务降为非 root 也不自动移除全部能力。', misread: '“UID 不是 0，进程就绝对没有任何管理特权。”' },
    ],
    example: {
      title: '从数字身份判断读取权限，再核对真实元数据',
      intent: '先掌握传统 mode 的选择顺序，再用 id 与 stat 查看 Linux 中实际参与检查的信息。',
      setup: '第一命令在 Git Bash 运行 Python 标准库模型；第二命令仅在 Linux 运行，依赖 coreutils 的 id 与 stat，不需要修改任何文件权限。',
      terms: [
        { name: 'UID', definition: '内核用于标识用户的数字，权限比较不依赖可显示的用户名。' },
        { name: 'GID', definition: '内核用于标识组的数字；进程还可拥有多个补充组。' },
        { name: 'mode 640', definition: '属主可读写、属组可读、其他用户无权限的传统模式。' },
        { name: 'root', definition: 'UID 为 0 的特殊管理身份，具体操作还受 capability 与安全模块约束。' },
      ],
      diagram: {
        kind: 'flow',
        title: '一次读取请求如何得到允许或拒绝',
        caption: '先比较数字身份，再选择权限类别；附加 ACL 与安全策略可以在传统结果之上继续约束。',
        items: [
          { title: '① 读取进程身份', detail: '取得 UID、主 GID 与补充组；这些值来自进程凭据，不是命令显示的名字。', tag: '谁在请求', tone: 'blue' },
          { title: '② 读取 inode 元数据', detail: '取得文件属主、属组与 mode；路径解析和目录执行权限在此之前也必须成功。', tag: '访问哪个对象', tone: 'muted' },
          { title: '③ 选择传统类别', detail: 'UID 等于属主就用属主位，否则看组与其他用户；本例属主位 6 允许读写。', tag: '基本模式', tone: 'green' },
          { title: '④ 叠加 ACL 与 LSM', detail: 'ACL 掩码、SELinux/AppArmor 与挂载选项仍可收紧结果；root 也按能力和策略处理。', tag: '最终判定', tone: 'orange' },
        ],
        footnote: '目录的 x 位通常决定能否进入该目录继续查找；文件的可执行位与目录的执行位含义不同。',
      },
      commands: [
        {
          title: '模拟属主、属组与其他用户的选择顺序',
          command: `PYTHONIOENCODING=utf-8 python - <<'PY'
# mode 用三组八进制位表示属主、属组和其他用户权限。
def access(user, owner, group, mode):
    bits = int(str(mode), 8)
    if user == owner:
        selected = (bits >> 6) & 7
    elif group in groups_by_user.get(user, ()):
        selected = (bits >> 3) & 7
    else:
        selected = bits & 7
    return '允许读' if selected & 4 else '拒绝读'
groups_by_user = {1000: (100,), 1001: (101,)}
for user in (1000, 1002, 1001):
    print(f'uid={user} mode=640 -> {access(user, 1000, 100, 640)}')
PY`,
          output: `uid=1000 mode=640 -> 允许读
uid=1002 mode=640 -> 拒绝读
uid=1001 mode=640 -> 拒绝读`,
          expect: 'UID 1000 因属主身份使用 rw-；另外两个用户不属于目标属组，落到其他用户位 ---，因此拒绝读取。',
          note: '已在 Git Bash 中实际执行；脚本省略 ACL、能力与安全模块，只演示传统 mode 的类别选择。',
        },
        {
          title: '在 Linux 上查看身份与两个典型对象',
          command: `id
stat -c '%U %G %a %A %n' /etc/passwd /tmp`,
          output: `uid=1000(learner) gid=1000(learner) groups=1000(learner),100(dev)
root root 644 -rw-r--r-- /etc/passwd
root root 1777 drwxrwxrwt /tmp`,
          expect: 'id 同时显示主组与补充组；/etc/passwd 的 644 表示属主可写、其他用户可读；/tmp 的 1777 包含 drwxrwxrwt，末尾 t 表示粘滞位。',
          note: '环境：Linux + coreutils，输出为未在 Windows 运行的写实示例；用户名、组与 inode 元数据因机器而异。1777 中的 1 是特殊权限位，不是“其他用户有 1 权限”。',
        },
      ],
      checkpoints: ['权限比较使用 UID/GID 而非名称', '能解释 640 的三组权限', '知道目录执行位影响路径穿越', '理解 ACL、能力与安全模块可继续改变结果'],
      safety: '只运行 id 与 stat，不要用 chmod 777、chown 或递归修改 /tmp、/etc 权限来“修复”问题。',
    },
    boundaries: {
      blocks: ['多用户基本隔离', '按身份读取文件元数据', '传统权限快速判断'],
      notBlocks: ['完整 ACL 排障', 'SELinux 策略分析', '能力最小化审计', '修复错误属主'],
    },
  },
  {
    id: 'linux-shell-essentials',
    track: 'linux',
    title: 'Shell 基础：从文本到展开、重定向与退出码',
    english: 'SHELL / EXPANSION / REDIRECTION',
    summary: '理解 Shell 并非只负责显示提示符：它切词、展开、连接管道、重定向输出，并把每条命令的退出状态交给下一层。',
    icon: 'terminal',
    group: '命令行工作',
    dependencies: ['linux-mental-model'],
    dependents: [],
    philosophy: {
      problem: '用户输入一行字符，系统却要决定哪些是程序、哪些是参数、通配符何时展开、输出流向哪里，以及整行是否成功。',
      rejects: 'Shell 不是 Linux 内核，也不等于终端；引号、通配符和重定向主要由 Shell 解释，不能把所有语法都归给被启动的程序。',
      counter: '“没有输出”可能是程序成功但无内容，也可能是错误被重定向；退出码和通道位置比屏幕上有没有字更可靠。',
    },
    design: {
      abstractions: [
        { name: 'Shell 与终端', role: 'Shell 是命令解释器，终端 terminal 是输入输出界面；Shell 也可在脚本中无交互运行。' },
        { name: '切词与展开', role: 'Shell 把命令行拆成词，再处理变量、波浪号、通配符等，最后才启动程序。' },
        { name: '管道与重定向', role: '管道把前一命令标准输出连接到后一命令标准输入，重定向把通道改接到文件或其他目标。' },
        { name: '退出码', role: '命令结束时返回给 Shell 的整数状态，0 通常表示成功，非 0 表示失败或特定信号。' },
      ],
      principles: [
        '展开发生在程序启动之前：通配符由 Shell 匹配文件名后变成多个参数，不是每个程序都要自己实现星号。',
        '引号控制哪些展开发生：单引号通常保留字面文本，双引号允许许多变量展开但阻止通配符与再次切词。',
        '检查状态而不是只看输出：脚本应读取退出码，管道也需按需要启用 pipefail，避免最后一个命令成功掩盖前一个失败。',
      ],
      history: [
        { when: '1970 年代', what: 'Unix Shell 与管道逐步形成', why: '让小程序通过标准输入输出组合成复杂工作流。' },
        { when: '1977', what: 'Bourne shell 随 Unix 第七版发布', why: '为脚本与交互命令提供影响深远的语法基础。' },
        { when: '1989 起', what: 'Bash 等 Shell 持续增加交互与脚本能力', why: '改善补全、作业控制、数组和条件表达式等体验。' },
      ],
    },
    capabilities: [
      { name: '安全传参', sentence: '用引号避免空格与通配符被意外展开。' },
      { name: '连接命令', sentence: '用管道把文本处理工具组合成流水线。' },
      { name: '控制输出去向', sentence: '区分标准输出文件、标准错误与追加重定向。' },
      { name: '判断成功失败', sentence: '根据退出码决定脚本继续、重试或报告错误。' },
    ],
    path: {
      intent: '解析并执行 printf \'%s\\n\' notes/*.txt > result.txt，观察从文本到参数和输出目标的变化。',
      environment: 'Bash 语法概念路径；演示假定 notes/a.txt、notes/b.txt 与 notes/a.md 存在，但脚本不创建文件。',
      steps: [
        { title: '读取并切分命令行', description: 'Shell 识别空格、引号与运算符，把输入切成程序名、格式串、通配模式和重定向符号等词。', terms: [{ name: '词法切分', definition: 'Shell 按引号、空白与元字符把一行命令拆成可处理片段的过程。' }], state: '得到带引号信息的词序列。' },
        { title: '处理引号并展开模式', description: '去掉引号、展开变量与波浪号，再把 notes/*.txt 匹配为 notes/a.txt 与 notes/b.txt；没有匹配时行为取决于 Shell 选项。', terms: [{ name: '通配符展开', definition: 'Shell 把 *、? 等模式展开为匹配文件名列表的过程。' }], state: '参数成为两个具体文件名。' },
        { title: '先建立重定向连接', description: 'Shell 在启动 printf 前打开 result.txt 的标准输出目标；若打开失败，命令通常不会按原计划执行。', terms: [{ name: '文件描述符', definition: '进程访问打开对象的整数句柄；标准输入、标准输出、标准错误通常为 0、1、2。' }], state: '标准输出指向 result.txt。' },
        { title: '启动程序并传递参数', description: 'Shell 创建子进程并执行 printf，把已展开的参数逐个传入；程序看到的不是原始星号，而是实际文件名。', terms: [{ name: '参数 arguments', definition: '程序启动时收到的字符串列表，不包含 Shell 已经解释掉的引号与重定向语法。' }], state: 'printf 接收格式串和两个文件名。' },
        { title: '收集状态并进入下一步', description: '程序退出后 Shell 保存退出码；交互式 Shell 通常继续显示提示符，脚本则可据此分支或终止。', terms: [{ name: '退出码 0 / 非 0', definition: '0 通常表示成功，非 0 表示失败类别；128 加信号编号常用于表示信号终止。' }], state: '结果已写入目标，退出状态可用。' },
      ],
      stateTable: {
        columns: ['阶段', '输入文本', '参数', '输出目标', '状态'],
        rows: [
          ['切词', '含引号与 *', '尚未完全展开', '识别到 >', '语法待检查'],
          ['去引号', '格式串保留', '字面参数', 'result.txt', '准备展开'],
          ['通配符展开', 'notes/*.txt', 'a.txt、b.txt', 'result.txt', '得到两个文件名'],
          ['启动 printf', '命令名', '格式串 + 文件名', '文件描述符 1', '等待退出'],
          ['命令结束', '下一行输入', '不再使用', '写入完成', '保存退出码'],
        ],
      },
      summary: 'Shell 先把文本变成参数与连接关系，再启动程序；引号、展开、重定向和退出码都属于这条处理链，而不只是显示效果。',
    },
    costs: [
      { choice: '灵活展开', cost: '命令行简洁，但空格、隐藏文件与无匹配模式可能产生意外参数；生产脚本应明确引用与选项。', misread: '“所有程序都会自己识别 *.txt。”' },
      { choice: '管道组合', cost: '数据无需中间文件且易读，但默认只传递最后一条命令的退出状态，还会引入并发与缓冲。', misread: '“管道最后一个命令成功，就代表整条流水线成功。”' },
      { choice: '重定向到文件', cost: '便于保存和复用输出，但 > 会截断文件，错误通道也可能被误接或覆盖。', misread: '“2>&1 只是把错误显示到屏幕。”' },
    ],
    example: {
      title: '观察通配符展开与标准输出的去向',
      intent: '先模拟 Shell 的参数处理，再用只读命令确认工作目录和管道计数。',
      setup: '第一命令在 Git Bash 运行 Python 标准库，使用 fnmatch 模拟固定文件名匹配，不创建 result.txt；第二命令只在 Linux Bash 中运行，依赖 coreutils 的 printf 与 wc。',
      terms: [
        { name: '展开', definition: 'Shell 在启动程序前把变量、通配符等文本转换成实际参数的过程。' },
        { name: '标准输出', definition: '程序默认输出数据的通道，通常连接到终端，也可被管道或文件接管。' },
        { name: '重定向', definition: '改变命令标准输入、标准输出或标准错误连接目标的操作。' },
        { name: '退出码', definition: '命令返回给 Shell 的状态整数，0 通常表示成功。' },
      ],
      diagram: {
        kind: 'flow',
        title: '一行命令在 Shell 中经历的五个时刻',
        caption: 'Shell 先解释，再连接，最后启动程序；程序只接收已经处理好的参数和通道。',
        items: [
          { title: '① 切词与去引号', detail: '识别程序、格式串、模式与 >，引号保证格式串成为一个参数。', tag: '语法', tone: 'blue' },
          { title: '② 展开通配符', detail: 'notes/*.txt 变成两个文件名；notes/a.md 因后缀不匹配而排除。', tag: '参数', tone: 'orange' },
          { title: '③ 建立重定向', detail: '标准输出从终端改到 result.txt；连接在程序启动前完成。', tag: '通道', tone: 'orange' },
          { title: '④ 执行 printf', detail: '程序收到三个参数：一个格式串和两个文件名，不再看到 Shell 的星号与 >。', tag: '程序', tone: 'green' },
          { title: '⑤ 保存退出码', detail: 'Shell 根据程序返回值决定下一条命令或脚本分支。', tag: '状态', tone: 'muted' },
        ],
        footnote: '单引号通常保留字面量，双引号允许变量展开；这些是 Shell 语法，不是 printf 自己完成的解析。',
      },
      commands: [
        {
          title: '模拟切词、通配符展开与重定向识别',
          command: `PYTHONIOENCODING=utf-8 python - <<'PY'
# 先按引号切词，再展开通配符，最后分离重定向目标。
import fnmatch
import shlex
line = "printf '%s\\\\n' notes/*.txt > result.txt"
tokens = shlex.split(line)
names = ['notes/a.txt', 'notes/b.txt', 'notes/a.md']
expanded = []
for token in tokens:
    if token.endswith('>'):
        break
    if '*' in token:
        expanded.extend(name for name in names if fnmatch.fnmatch(name, token))
    else:
        expanded.append(token)
target = tokens[-1]
print('切词:', ' | '.join(tokens))
print('展开:', ' | '.join(expanded))
print(f'重定向: stdout -> {target}（演示中不创建文件）')
PY`,
          output: `切词: printf | %s
 | notes/*.txt | > | result.txt
展开: printf | %s
 | notes/a.txt | notes/b.txt
重定向: stdout -> result.txt（演示中不创建文件）`,
          expect: '星号展开成两个 .txt 文件名，a.md 被排除；> 与 result.txt 被识别为重定向，不会作为 printf 的参数传入。',
          note: '已在 Git Bash 中实际执行；命令字符串中的 \\\\n 最终在 Python 源码里表示反斜杠加 n，因此输出会换行显示格式串。',
        },
        {
          title: '在 Linux 上确认目录并把文本送入计数器',
          command: `pwd
printf '%s\n' 'linux notes' | wc -w`,
          output: `/home/learner/lab
2`,
          expect: 'pwd 返回当前目录；单引号让 linux notes 保持为一个参数，printf 输出两个单词，wc -w 通过管道读取标准输入并计数为 2。',
          note: '环境：Linux Bash + coreutils，输出为未在 Windows 运行的写实示例；路径因机器而异。wc -w 统计空白分隔的词，不是字符数或行数。',
        },
      ],
      checkpoints: ['知道通配符通常由 Shell 展开', '能说明单引号与双引号的关键差别', '能区分 >、>>、2> 与管道', '理解退出码 0 通常表示成功'],
      safety: '不要在真实文件上试用 > 来验证截断效果；需要保留输出时先确认目标路径，必要时使用追加或临时文件。',
    },
    boundaries: {
      blocks: ['手工拆分复杂命令', '参数被空格意外拆开', '输出通道混乱'],
      notBlocks: ['程序业务逻辑', 'Shell 注入防护', '跨平台脚本兼容', '作业调度与进程监控'],
    },
  },
  {
    id: 'linux-streams-text',
    track: 'linux',
    title: '标准流与文本工具：用管道处理数据',
    english: 'STDIN / STDOUT / STDERR / TEXT TOOLS',
    summary: '把输入输出看成三条独立文本通道，用 grep、sort、uniq 等过滤器组成可检查、可组合的数据流水线。',
    icon: 'code',
    group: '命令行工作',
    dependencies: ['linux-shell-essentials'],
    dependents: [],
    philosophy: {
      problem: '日志、配置与命令结果大多是逐行文本，手工复制粘贴既慢又容易遗漏；小工具需要一种统一方式交换数据。',
      rejects: '文本工具不是只能处理纯文本文件，管道也不是把数据“混在一起”；错误流与正常输出必须分开理解。',
      counter: 'grep 负责筛选，sort 负责排序，uniq 负责合并相邻重复行；工具各自保持简单，组合才获得表达能力。',
    },
    design: {
      abstractions: [
        { name: '文件描述符与标准流', role: '进程用整数句柄引用通道；标准输入 stdin、标准输出 stdout、标准错误 stderr 通常对应 0、1、2。' },
        { name: '文本行', role: '文本工具常以换行分隔记录处理数据，但二进制内容、超长行与不同编码需要额外确认。' },
        { name: '过滤器 filter', role: '读取标准输入、转换后写到标准输出的程序，例如 grep、sort、uniq。' },
        { name: '管道流水线', role: 'Shell 把多个命令的通道连接起来，使前一程序输出直接成为后一程序输入。' },
      ],
      principles: [
        '通道与内容分离：正常结果走 stdout，诊断信息走 stderr；重定向一个通道不会自动改变另一个。',
        '先筛选再排序去重更清晰：uniq 只合并相邻重复行，因此通常先 sort 再 uniq，不能把 uniq 当全局去重器。',
        '每一步都可验证：短数据先打印中间结果，确认编码、行边界与退出码，再接入真实日志或生产流水线。',
      ],
      history: [
        { when: '1970 年代', what: 'Unix 形成标准输入输出与管道', why: '让独立小程序无需知道彼此细节即可交换数据。' },
        { when: '1970 年代末', what: 'grep 等文本搜索工具出现', why: '用正则表达式从流中快速筛选匹配行。' },
        { when: '1980 年代后', what: 'sort、uniq、awk、sed 等工具成熟', why: '覆盖排序、去重、字段处理与流式编辑等常见任务。' },
      ],
    },
    capabilities: [
      { name: '分离输出通道', sentence: '把正常数据与错误诊断分别处理。' },
      { name: '筛选文本', sentence: '用 grep 按固定字符串或正则表达式选择行。' },
      { name: '排序与计数', sentence: '用 sort 与 uniq -c 汇总重复行。' },
      { name: '组合流水线', sentence: '把多个过滤器的输出连接成可复用处理流程。' },
    ],
    path: {
      intent: '处理三行示例数据 error、info、error，得到每条消息出现次数，并让非错误诊断留在标准错误。',
      environment: 'Linux Bash + coreutils（sort、uniq）与 grep；模拟部分可在 Git Bash 用 Python 标准库运行。',
      steps: [
        { title: '输入进入标准输入', description: '数据可以来自键盘、文件重定向或前一命令管道；程序不应假定标准输入一定是终端。', terms: [{ name: 'stdin', definition: '标准输入通道，文件描述符通常为 0，供程序读取数据。' }], state: '三行文本等待处理。' },
        { title: '筛选匹配行', description: 'grep 按模式保留匹配行；没有匹配时常见退出码为 1，这既不是输出内容，也不等于程序崩溃。', terms: [{ name: '退出码 1', definition: 'grep 未找到匹配时的常见状态；它与真正的执行错误需要区分。' }], state: '只保留符合条件的行。' },
        { title: '按文本排序', description: 'sort 读取全部或外部排序所需数据，并按当前语言环境与排序规则输出有序行。', terms: [{ name: '语言环境 locale', definition: '影响字符排序、大小写与编码解释的区域设置，可用 locale 查看。' }], state: '相同文本行相邻。' },
        { title: '合并相邻重复并计数', description: 'uniq -c 对相邻相同行计数，因此输入必须先排序；输出前缀表示出现次数。', terms: [{ name: 'uniq -c', definition: '合并相邻重复行并在每行前加计数的选项组合。' }], state: '得到 error 两次、info 一次。' },
        { title: '结果走标准输出或标准错误', description: '正常统计写入 stdout，可继续传给下一工具或终端；诊断信息写入 stderr，避免污染数据流。', terms: [{ name: 'stdout / stderr', definition: '标准输出与标准错误两个独立通道，通常分别为文件描述符 1 和 2。' }], state: '数据与错误可分别收集。' },
      ],
      stateTable: {
        columns: ['阶段', '工具', '标准输入', '标准输出', '标准错误'],
        rows: [
          ['原始数据', '生产者', '无或外部数据', 'error、info、error 三行', '无'],
          ['筛选', 'grep', '三行原始数据', '匹配行', '错误诊断'],
          ['排序', 'sort', '筛选后的行', '有序文本行', '排序错误'],
          ['相邻去重', 'uniq -c', '已排序行', '计数后的行', '读取错误'],
          ['汇总查看', '终端或重定向', '最终结果', '显示或保存', '单独显示'],
        ],
      },
      summary: '标准流让工具只关心“读什么、写什么”，管道负责连接；掌握通道、排序前提与退出码，才能可靠处理文本。',
    },
    costs: [
      { choice: '按行处理', cost: '适合日志与配置，但超长行、二进制内容和内嵌换行会破坏简单记录假设。', misread: '“任何文件都能直接当普通文本按行处理。”' },
      { choice: 'uniq 相邻去重', cost: '内存与实现简单、适合排序后流水线，但未排序输入会漏掉非相邻重复。', misread: '“uniq 会自动统计整个文件中所有重复行。”' },
      { choice: '错误流独立', cost: '数据更干净，但若只用 2>&1 混合收集，排障时又可能难以分辨正常输出与错误。', misread: '“屏幕上同时出现输出，就说明它们来自同一个通道。”' },
    ],
    example: {
      title: '把三行数据变成带计数的错误摘要',
      intent: '先用独立内存通道观察 stdout 与 stderr，再用 Linux 文本工具完成筛选、排序与计数。',
      setup: '第一命令在 Git Bash 运行 Python 标准库，StringIO 分别模拟三个通道；第二命令只在 Linux Bash 运行，依赖 coreutils 的 printf、sort、uniq 与 grep。',
      terms: [
        { name: '标准输入', definition: '程序读取数据的默认通道，通常为文件描述符 0。' },
        { name: '标准输出', definition: '程序输出正常结果的默认通道，通常为文件描述符 1。' },
        { name: '标准错误', definition: '程序输出诊断与错误信息的默认通道，通常为文件描述符 2。' },
        { name: '文本过滤器', definition: '从标准输入读取数据、转换后写到标准输出的程序。' },
      ],
      diagram: {
        kind: 'flow',
        title: '错误摘要流水线：数据向前，诊断向侧面',
        caption: 'grep、sort、uniq 只通过标准流连接；stdout 是数据主线，stderr 是独立诊断通道。',
        items: [
          { title: '① printf 生产数据', detail: '固定输出 error、info、error 三行到标准输出，便于重复验证。', tag: '输入', tone: 'blue' },
          { title: '② grep 筛选', detail: '保留匹配行；没有匹配时返回 1，错误诊断则走标准错误。', tag: '筛选', tone: 'orange' },
          { title: '③ sort 排序', detail: '把相同文本行排到相邻位置，为相邻去重创造前提。', tag: '排序', tone: 'green' },
          { title: '④ uniq -c 计数', detail: '合并相邻重复行，输出 error 两次、info 一次。', tag: '汇总', tone: 'green' },
          { title: '⑤ stderr 独立', detail: '工具错误不进入数据主线，可由脚本单独记录或显示。', tag: '诊断通道', tone: 'muted' },
        ],
        footnote: '管道默认只暴露最后一条命令的退出码；Bash 可用 set -o pipefail 让任一阶段失败都反映到流水线状态。',
      },
      commands: [
        {
          title: '用三个内存通道模拟文本分流',
          command: `PYTHONIOENCODING=utf-8 python - <<'PY'
# StringIO 分别表示标准输入、标准输出与标准错误三个独立文本通道。
import io
import sys
stdin = io.StringIO('error\\ninfo\\nerror\\n')
stdout = io.StringIO()
stderr = io.StringIO()
for raw in stdin:
    text = raw.strip()
    if text == 'error':
        stdout.write(f'[{text}]\\n')
    else:
        stderr.write(f'收到非错误行: {text}\\n')
print('stdout:')
sys.stdout.write(stdout.getvalue())
print('stderr:')
sys.stdout.write(stderr.getvalue())
PY`,
          output: `stdout:
[error]
[error]
stderr:
收到非错误行: info`,
          expect: '两条 error 进入模拟标准输出，info 的诊断进入模拟标准错误；两段内容分开打印，证明通道独立而不是混成一条数据流。',
          note: '已在 Git Bash 中实际执行；StringIO 是 Python 标准库的内存文本缓冲区，脚本没有读取真实日志。',
        },
        {
          title: '在 Linux 上筛选、排序并计数',
          command: `printf 'error\ninfo\nerror\n' | grep -v '^debug$' | sort | uniq -c`,
          output: `      2 error
      1 info`,
          expect: '三行都不是 debug，因此 grep 全部保留；sort 把两个 error 排相邻，uniq -c 分别统计为 2 和 1。',
          note: '环境：Linux Bash + coreutils + grep，输出为未在 Windows 运行的写实示例；uniq -c 的计数右对齐，前导空格属于格式而非额外数据。',
        },
      ],
      checkpoints: ['能分别说明 stdin、stdout、stderr 的用途', '知道 uniq 只处理相邻重复行', '理解 grep 无匹配返回 1 的常见语义', '能逐步检查流水线中间输出与退出码'],
      safety: '先用固定小数据验证，再处理日志；不要把未筛选的错误诊断、敏感信息或二进制内容直接导入生产数据流。',
    },
    boundaries: {
      blocks: ['手工复制文本', '重复行全局统计', '正常输出与错误混合'],
      notBlocks: ['二进制解析', '多行记录关联', '超大文件全部装入内存', '日志脱敏与访问控制'],
    },
  },
]
