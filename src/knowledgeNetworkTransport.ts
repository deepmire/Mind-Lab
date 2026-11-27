/**
 * 网络路由与传输课程：从逐跳选路，到 TCP 的可靠字节流，再到 UDP 的数据报边界。
 * 三个模块按固定顺序组成 KnowledgeModule[]；所有 dependents 先留空，由聚合器重算。
 * Python 示例只使用标准库和虚构地址，不访问真实网络；Linux 查询命令仅作为未执行的只读示例。
 */
import type { KnowledgeModule } from './knowledgeTypes'

export const networkTransportModules: KnowledgeModule[] = [
  {
    id: 'network-routing',
    track: 'network',
    title: '路由、默认网关与最长前缀匹配',
    english: 'ROUTING / DEFAULT GATEWAY / LONGEST PREFIX MATCH',
    summary: '路由是设备为每一个 IP 包决定“下一跳交给谁”的逐跳过程。路由器用路由表匹配目标地址，多个条目都匹配时选择前缀最长、最具体的一条；默认网关只是默认路由的下一跳，不是包会经过的唯一出口。',
    icon: 'target',
    group: '路由与传输',
    dependencies: ['network-ipv4-subnetting'],
    dependents: [],
    philosophy: {
      problem: '一台设备通常不会预先知道通往所有地址的完整路线。它只掌握本地直连网段、管理员配置的远端网段，以及一条兜底的默认路由；收到数据包时，必须快速选出下一跳，否则包只能停在原地。',
      rejects: '路由不是出发前一次性规划整条路线，也不是“只要能上网就都交给默认网关”。本地直连网段通常不需要网关；多条路由同时匹配时，也不是任意选择或永远选择默认路由。',
      counter: '把路由理解成一张“按目标地址查下一跳”的本地查表规则：每台设备独立决策，包走过一台路由器后还会在新设备上重新查表。因此路线可能随拓扑和策略变化，默认网关只是路由表中 0.0.0.0/0 这一条兜底路由的下一跳。',
    },
    design: {
      abstractions: [
        { name: '路由表（routing table）', role: '设备保存的“目标网段—下一跳—出接口”等转发规则集合；查表结果决定当前设备把包交给谁。' },
        { name: '下一跳（next hop）', role: '当前设备把包交给的直接下一台设备；它不是最终目的地，也不代表后续路径已经固定。' },
        { name: '出接口（egress interface）', role: '本机用来把包发出去的网卡或逻辑接口；直连网段常通过它直接交付，远端网段则常先交给下一跳。' },
        { name: '默认路由（default route）', role: '前缀长度为 0 的兜底条目，IPv4 常写作 0.0.0.0/0；没有更具体匹配时才会被选中。' },
        { name: '默认网关（default gateway）', role: '默认路由中配置的下一跳地址；它负责接收发往未明确路由地址的包，但并不接管所有本地流量。' },
        { name: '最长前缀匹配（longest prefix match）', role: '多条路由都包含目标地址时，选择前缀位数最多、范围最小的条目，因为它的描述最具体。' },
      ],
      principles: [
        '逐跳决策：每台路由器只根据本机路由表选择下一跳；下一台设备会再次查表，发送端不掌握也不保证最终完整路径。',
        '具体优先于笼统：目标同时命中本地网段、汇总网段和默认路由时，最长前缀匹配保证更具体的路由优先。',
        '查表与交付分开：选出下一跳后，设备还要解决本地链路如何把帧交给对方；路由正确不等于链路、过滤策略或目的应用一定可用。',
      ],
      history: [
        { when: '1970 年代末至 1980 年代初', what: '早期互联网采用路由信息协议等机制交换可达信息', why: '网络规模扩大后，设备无法只靠人工维护每一条远端路由。' },
        { when: '1980 年代', what: '无类别域间路由让地址块按任意前缀长度汇总', why: '减少路由表规模，并让最长前缀匹配能够表达更具体的例外路由。' },
        { when: '1990 年代起', what: '策略路由、多路由表与动态路由协议持续发展', why: '实际网络不仅要考虑可达性，还要处理服务质量、多出口、安全隔离和管理边界。' },
      ],
    },
    capabilities: [
      { name: '选择下一跳', sentence: '根据目标地址和本机路由表决定包从哪个接口、交给哪个地址继续转发。' },
      { name: '汇总与例外', sentence: '用较短的网段汇总大量地址，再用更长的前缀覆盖少数例外，兼顾表规模与控制精度。' },
      { name: '默认兜底', sentence: '在缺少明确路由时使用默认路由，避免为每个远端地址重复配置。' },
      { name: '循环与超时约束', sentence: '利用 TTL 或 Hop Limit 限制包的存活跳数，并在耗尽时丢弃、返回 ICMP 超时信息。' },
    ],
    path: {
      intent: '让一台主机向 10.20.30.40 发送数据，观察它如何从多条路由中选出 10.20.0.0/16，再经过两个路由器；同时展示 TTL 耗尽和没有路由时的失败分支。',
      environment: '纯内存教学模拟：主机地址、路由器和地址均为虚构值；不发送真实数据包。',
      steps: [
        { title: '产生要转发的数据包', description: '应用把数据交给本机网络协议栈，协议栈根据目标 IP 10.20.30.40 准备转发。此时包还没有决定走哪条路线，本机只持有目标和待发送内容。', terms: [{ name: '数据包（packet）', definition: '网络层传输的数据单元，头部包含源地址、目标地址、TTL 等信息。' }, { name: 'TTL', definition: 'IPv4 包头中的生存时间计数，每经过一次路由器转发通常减 1；到 0 时不能再继续转发。' }], state: '目标=10.20.30.40；TTL=64；尚未选路。' },
        { title: '查询本机路由表', description: '主机把目标地址与每条路由的目标网段比较。10.0.0.0/8、10.20.0.0/16 和 0.0.0.0/0 都包含该目标，因此形成三个候选。', terms: [{ name: '前缀长度', definition: '路由目标地址中固定不变的位数，例如 /16 表示前 16 位用于标识网段。' }, { name: '默认路由', definition: '0.0.0.0/0 表示匹配所有 IPv4 目标，是最后才考虑的兜底规则。' }], state: '候选路由=3；当前未提交转发。' },
        { title: '执行最长前缀匹配', description: '主机比较候选条目的前缀长度，选择 /16，因为它比 /8 和 /0 更具体。被选中的规则给出下一跳 10.0.0.9；默认路由的下一跳 192.0.2.1 不参与本次转发。', terms: [{ name: '最长前缀匹配', definition: '在全部匹配项中选择前缀长度最大的路由，避免笼统规则覆盖具体例外。' }, { name: '下一跳', definition: '当前设备直接交付包的下一个地址；它不一定是最终接收者。' }], state: '选择=10.20.0.0/16；下一跳=10.0.0.9。' },
        { title: '把包交给下一跳并重新查表', description: '包到达 R1 后，R1 根据自己的路由表再次选择下一跳；TTL 从 64 减为 63。随后 R2 也独立查表，TTL 再减为 62。发送端设置的路线不会自动变成整条路径的固定承诺。', terms: [{ name: '逐跳决策', definition: '每一台转发设备各自完成一次选路，后续设备不必沿用前一跳的完整判断。' }, { name: 'ICMP', definition: '互联网控制报文协议，用于传递超时、目的不可达等网络层错误与诊断信息。' }], state: 'R1 已转发；TTL=63；R2 再次查表后 TTL=62。' },
        { title: '处理 TTL 耗尽的拒绝分支', description: '如果包到达 R3 时 TTL 已减为 0，R3 不再转发，而是丢弃该包并通常向源地址返回 ICMP 超时。这个分支说明“有路由”也可能因为环路或过长路径而失败。', terms: [{ name: 'ICMP 超时', definition: '设备因 TTL 或 Hop Limit 耗尽而丢弃包时发送的错误报文，用于揭示跳数限制或可能的路由环路。' }], state: '拒绝分支：R3 丢弃；TTL=0；返回 ICMP 超时。' },
        { title: '处理查表失败与最终交付', description: '如果本机没有任何匹配路由，就不能转发，通常丢弃并向上层报告网络不可达；如果配置了默认路由，则改走默认路由。成功分支中，包最终到达目标所在链路并交给目的主机。', terms: [{ name: '网络不可达', definition: '设备没有可用路由把包继续送往目标时出现的失败，不等于目标主机上的应用拒绝服务。' }], state: '成功：目标收到；失败：无路由则丢弃并报告；默认路由仅作为兜底。' },
      ],
      stateTable: {
        columns: ['观察阶段', '目标', '匹配路由', '下一跳 / 出接口', 'TTL', '结果或拒绝分支'],
        rows: [
          ['收到待发包', '10.20.30.40', '尚未查询', '未确定', '64', '等待本机查表'],
          ['形成候选', '10.20.30.40', '/8、/16、/0', '未提交', '64', '三个条目均包含目标'],
          ['最长前缀胜出', '10.20.30.40', '10.20.0.0/16', '10.0.0.9', '64', '默认网关未被选中'],
          ['R1 转发', '10.20.30.40', 'R1 路由表', 'R2', '63', 'R1 独立决策'],
          ['R2 转发', '10.20.30.40', 'R2 路由表', '目标链路', '62', '继续逐跳靠近目标'],
          ['TTL 耗尽', '任意远端地址', '路由可能存在', 'R3', '0', '丢弃并返回 ICMP 超时'],
          ['没有匹配路由', '198.51.100.7', '无', '无', '64', '丢弃并向上报告网络不可达'],
          ['只有默认路由', '198.51.100.7', '0.0.0.0/0', '默认网关', '64', '交给默认路由的下一跳'],
          ['到达目的链路', '10.20.30.40', '直连或最终路由', '目的主机接口', '剩余值', '交给目的主机的网络层'],
        ],
      },
      summary: '路由是“当前设备查表—选择最具体匹配—交给下一跳”的重复过程；默认网关只是默认路由的下一跳，最长前缀匹配决定具体路由优先，TTL 耗尽和无路由是两类明确失败分支。',
    },
    costs: [
      { choice: '默认路由兜底', cost: '配置简单、无需列出所有远端网段，但会把未明确流量交给默认网关，可能掩盖错误配置或扩大故障影响面。', misread: '默认网关会接收所有包，包括本机直连网段的包。' },
      { choice: '最长前缀匹配', cost: '允许精确覆盖汇总网段，但要求前缀和地址规划一致，错误汇总可能把一大片流量引向错误下一跳。', misread: '多条路由都匹配时，后配置的或默认路由一定优先。' },
      { choice: 'TTL 与 ICMP 诊断', cost: '能阻止包无限循环并提供错误线索，但 ICMP 可能被过滤，traceroute 的星号也不一定代表最终不可达。', misread: '某一跳显示 *，就说明目标主机一定无法到达。' },
    ],
    example: {
      title: '用固定路由表演示最长前缀匹配与 TTL 分支',
      intent: '第一条命令在 Python 内存中完成确定性选路，逐字展示候选、最长前缀选择和失败分支；第二条命令只在 Linux 上展示如何读取真实路由表。',
      setup: 'Python 命令只需标准库，已在本机 Git Bash 实际执行。ip route show 是 Linux 只读查询，本机未执行；输出为使用文档保留地址的固定示意。',
      terms: [
        { name: 'CIDR', definition: '用“地址/前缀长度”表示一段连续 IPv4 或 IPv6 地址的方法，例如 10.20.0.0/16。' },
        { name: 'metric', definition: '某些系统用于在同一路由来源内区分优先级的数值；它不是最长前缀匹配的前缀长度。' },
      ],
      diagram: {
        kind: 'flow',
        title: '一个包如何经过三次独立决策',
        caption: '每一跳只回答“下一步交给谁”，默认路由在没有更具体匹配时兜底。',
        items: [
          { title: '① 主机查表', detail: '10.20.30.40 同时命中 /8、/16、/0；最长前缀选择 /16，下一跳为 10.0.0.9。', tag: '具体优先', tone: 'blue' },
          { title: '② R1、R2 逐跳查表', detail: '每台路由器再次匹配自己的路由表，并把 TTL 减 1；路径不因发送端的选择而永久固定。', tag: '逐跳决策', tone: 'orange' },
          { title: '③ 成功或拒绝', detail: '成功则到达目的链路；TTL 到 0 则丢弃并返回 ICMP 超时；无路由则丢弃并报告网络不可达。', tag: '显式失败', tone: 'green' },
        ],
        footnote: 'traceroute 的 * 只表示该探测没有收到预期回应，可能来自超时、过滤或中间设备限速，不能单独证明最终不可达。',
      },
      commands: [
        {
          title: '确定性模拟最长前缀匹配、逐跳 TTL 与失败分支',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
import ipaddress
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

target = ipaddress.ip_address("10.20.30.40")
routes = [
    ("10.0.0.0/8", "10.0.0.1"),
    ("10.20.0.0/16", "10.0.0.9"),
    ("0.0.0.0/0", "192.0.2.1"),
]
matches = []
for cidr, next_hop in routes:
    network = ipaddress.ip_network(cidr)
    if target in network:
        matches.append((network.prefixlen, cidr, next_hop))

print(f"目标地址={target}")
for prefix, cidr, next_hop in matches:
    print(f"命中 {cidr} 下一跳={next_hop}")
prefix, cidr, next_hop = max(matches, key=lambda item: item[0])
print(f"最长前缀选择={cidr}")
print(f"转发下一跳={next_hop} 说明=只决定先交给谁")
for ttl, hop in [(63, "路由器R1"), (62, "路由器R2"), (0, "路由器R3")]:
    print(f"逐跳转发 位置={hop} TTL={ttl}")
print("TTL=0分支=丢弃并返回ICMP超时")
print("无路由分支=查表失败则丢弃并向上报告网络不可达")
PY`,
          output: `目标地址=10.20.30.40
命中 10.0.0.0/8 下一跳=10.0.0.1
命中 10.20.0.0/16 下一跳=10.0.0.9
命中 0.0.0.0/0 下一跳=192.0.2.1
最长前缀选择=10.20.0.0/16
转发下一跳=10.0.0.9 说明=只决定先交给谁
逐跳转发 位置=路由器R1 TTL=63
逐跳转发 位置=路由器R2 TTL=62
逐跳转发 位置=路由器R3 TTL=0
TTL=0分支=丢弃并返回ICMP超时
无路由分支=查表失败则丢弃并向上报告网络不可达
`,
          expect: '三个候选按 /8、/16、/0 的顺序出现，最终选择 /16；随后显示 TTL 递减、TTL=0 和无路由两条失败分支。',
          note: '已在 Git Bash 中用 Python 标准库实际运行；只操作内存中的 ipaddress 对象，不访问真实网络。',
        },
        {
          title: '只读查看 Linux 主机的 IPv4 路由表',
          command: 'ip route show',
          output: `default via 192.0.2.1 dev eth0 proto dhcp src 192.0.2.50 metric 100
10.20.0.0/16 via 192.0.2.9 dev eth0 proto static metric 50
192.0.2.0/24 dev eth0 proto kernel scope link src 192.0.2.50
`,
          expect: '找到 default 以及更具体的 10.20.0.0/16；发往 10.20.x.x 的包会优先匹配 /16，而不是默认网关。',
          note: 'Linux 环境专用，本机未执行；输出为固定教学示意，地址均来自文档保留网段。ip route show 只读取本机路由表，不修改网络。',
        },
      ],
      checkpoints: [
        '能用“下一跳”解释逐跳路由，而不是认为发送端预先固定整条路径',
        '能指出默认网关只是默认路由的下一跳，本地直连网段通常不经过它',
        '能用最长前缀匹配从多条候选中选出最具体路由',
        '能区分 TTL 耗尽、无路由和应用不可达，并知道 traceroute 的星号不是最终结论',
      ],
      safety: '真实网络排障只读取路由表和必要的诊断信息；不要随意添加、删除默认路由或修改策略路由，以免影响远程管理连接。',
    },
    boundaries: {
      blocks: ['不知道远端完整路径时仍能逐跳转发', '用默认路由避免逐条配置所有远端网段', '通过更长前缀覆盖汇总路由中的例外', '用 TTL 与 ICMP 超时发现超长路径或环路线索'],
      notBlocks: ['保证某条路径始终不变或最短', '保证下一跳之后的所有路由器都按同样策略转发', '保证 ICMP 或 traceroute 探测一定收到回应', '替代链路故障、访问控制、目的应用故障的端到端检查'],
    },
  },
  {
    id: 'network-tcp',
    track: 'network',
    title: 'TCP：连接、可靠传输与流量控制',
    english: 'TCP / RELIABLE BYTE STREAM / FLOW CONTROL',
    summary: 'TCP 在通信前建立连接，把应用数据组织成可靠字节流：用序号标记每个字节，用确认、重传和去重尽量把字节按顺序交给接收方。它不保留应用写入时的消息边界，接收窗口控制发送速度，拥塞窗口则根据网络状况进一步限制发送。',
    icon: 'workflow',
    group: '路由与传输',
    dependencies: ['network-routing'],
    dependents: [],
    philosophy: {
      problem: '网络可能丢包、重复、乱序，也可能让发送方比接收方处理得更快。应用若自己逐包确认、排序和重传，会重复实现大量细节；但简单地把数据连续发出，又无法知道对方究竟收到了哪一段。',
      rejects: 'TCP 不是“每条应用消息对应一个网络包”，也不保证网络永远不丢包。它通过序号、确认和重传来弥补丢包；连接建立成功更不等于应用请求一定成功。丢包通常先触发等待或重传，而不是让连接立即失败。',
      counter: '把 TCP 看成一条两端共同维护的、按字节编号的可靠管道：应用可以分多次写入，接收方仍按顺序读到连续字节；管道内部再分成适合网络传输的段。管道有接收窗口和拥塞窗口两道速度限制，两者目的不同，不能混为一谈。',
    },
    design: {
      abstractions: [
        { name: '连接（connection）', role: '两端在握手后共同维护的通信状态，包含序号、窗口和定时器等；它不是一条独占物理线路。' },
        { name: '字节流（byte stream）', role: '按字节顺序排列的连续数据视图；应用写两次的数据可能被合并接收，读一次也不一定恰好对应一次写入。' },
        { name: '序号与确认号（sequence / acknowledgment）', role: '序号指出本段第一个字节在流中的位置，确认号表示接收方下一步期望收到的字节，实现排序和累计确认。' },
        { name: '重传（retransmission）', role: '发送方在超时或收到重复确认等线索后重新发送数据，以应对丢失；重传可能造成重复，接收方需要去重。' },
        { name: '接收窗口（receive window）', role: '接收方通告自己当前还能接收多少字节，用于流量控制，防止发送方压垮接收方缓存。' },
        { name: '拥塞窗口（congestion window）', role: '发送方根据网络拥塞线索动态调整的发送上限，与接收窗口共同决定实际可发送量。' },
        { name: '握手与挥手', role: '握手用 SYN、SYN-ACK、ACK 建立双向通信状态；关闭时双方通常通过 FIN 与确认逐步结束各自方向。' },
      ],
      principles: [
        '可靠的是有序字节，不是应用消息：TCP 保证在连接正常时尽量按序交付字节，但不记录应用 write 或 send 的边界。',
        '确认与重传协作：确认告诉发送方哪些字节已收到，超时或重复确认触发重传，接收方按序号去重并提交连续数据。',
        '流量控制与拥塞控制分离：接收窗口保护接收方，拥塞窗口保护网络；实际发送还受二者较小值以及其他策略限制。',
      ],
      history: [
        { when: '1973—1974 年', what: 'Cerf 与 Kahn 提出 TCP 早期设计', why: '让不同分组交换网络能够通过端到端可靠传输互连。' },
        { when: '1981 年', what: 'RFC 793 规范奠定经典 TCP 基础', why: '明确序号、确认、重传、流量控制与连接管理机制。' },
        { when: '1988 年起', what: 'Van Jacobson 等人发展拥塞控制算法', why: '在互联网拥塞崩溃后，让发送端根据网络反馈调整窗口，避免共同压垮共享链路。' },
      ],
    },
    capabilities: [
      { name: '建立和关闭连接', sentence: '通过握手同步初始序号并建立状态，通过挥手有序结束双向通信。' },
      { name: '可靠有序交付', sentence: '利用序号、累计确认、重传和去重，把网络中的丢失、重复与乱序转换为连续字节流。' },
      { name: '接收方流量控制', sentence: '根据接收缓存通过接收窗口限制未确认数据，避免发送方持续压入接收方暂时无法处理的数据。' },
      { name: '网络拥塞适应', sentence: '根据丢包、延迟等反馈调整拥塞窗口，让多个发送方共享链路时避免过度发送。' },
    ],
    path: {
      intent: '建立一条 TCP 连接，发送 HELLO；让最后一段先丢失，再观察确认、重传和有序交付，随后展示接收窗口为 0 与正常挥手。',
      environment: '纯内存教学状态机：序号、窗口和字节均为固定值；不创建真实 socket，也不访问网络。',
      steps: [
        { title: '从关闭状态发起握手', description: '客户端处于 CLOSED，发送 SYN 并进入 SYN_SENT。SYN 是同步请求，携带客户端选择的初始序号，用来声明字节从哪个编号开始。', terms: [{ name: 'SYN', definition: 'TCP 用于建立连接的同步标志，通常还携带初始序号。' }, { name: 'CLOSED / SYN_SENT', definition: 'TCP 连接状态：前者表示没有活动连接，后者表示已发出握手请求但尚未完成。' }], state: 'CLOSED → SYN_SENT；初始序号=1000；尚无应用数据。' },
        { title: '服务端确认并完成握手', description: '服务端以 SYN-ACK 响应，客户端再发送 ACK，双方进入 ESTABLISHED。握手让两端同步方向、初始序号和基本参数，但并不验证应用登录、权限或业务健康。', terms: [{ name: 'SYN-ACK', definition: '服务端同时确认客户端 SYN 并发送自己的 SYN，是三次握手的第二步。' }, { name: 'ACK', definition: '确认字段有效的 TCP 标志，用来告知对方已收到哪些数据或握手信息。' }], state: '服务端 SYN-RCVD → ESTABLISHED；客户端 ESTABLISHED。' },
        { title: '把字节流切成段并编号', description: '应用连续写入 HELLO。TCP 在内部把它拆成 seq=1000 的 HELL 和 seq=1004 的 O 两个段；接收方最终看到连续字节，而不是必须看到两次独立消息。', terms: [{ name: '段（segment）', definition: 'TCP 在网络中传输的数据单元，包含 TCP 头和一段字节流数据。' }, { name: '字节流', definition: '按顺序排列的字节集合；TCP 不保留应用每次写入的消息边界。' }], state: '待确认字节=1000—1004；应用消息边界不进入 TCP 协议状态。' },
        { title: '累计确认并发现缺口', description: 'HELL 到达后，接收方确认下一期望序号 1004；随后 O 丢失，接收方只能继续确认 1004，不能把后面的数据直接提交为完整连续流。发送方发现 1004 尚未被确认。', terms: [{ name: '累计确认', definition: '确认号表示该序号之前的所有字节都已按序收到，而不必逐段分别确认。' }, { name: '确认号', definition: '接收方下一步期望从发送方收到的字节序号。' }], state: 'next_expected=1004；已交付=HELL；1004 字节仍缺失。' },
        { title: '超时重传而不是立即放弃', description: '发送方等待后仍未收到 1004 的确认，于是重传 O。连接仍处于 ESTABLISHED；接收方收到后确认 1005，并把完整 HELLO 交给应用。若重传副本再次到达，序号可让接收方识别重复。', terms: [{ name: '重传计时器', definition: '发送方为未确认数据启动的等待计时器；超时是触发重传的一种线索。' }, { name: '重复确认', definition: '接收方反复确认同一期望序号，常提示后续数据存在缺口，也可能触发快速重传。' }], state: 'ESTABLISHED；重传 seq=1004；确认号=1005；已交付=HELLO。' },
        { title: '分别应用接收窗口与拥塞窗口', description: '接收方暂时不读取数据时，可以把接收窗口通告为 0，发送方便暂停新数据，但连接没有因此关闭。拥塞窗口则根据丢包等网络反馈单独缩小；二者共同限制发送，却保护不同对象。', terms: [{ name: '流量控制', definition: '根据接收方的接收能力限制发送速度，核心是保护接收方。' }, { name: '拥塞控制', definition: '根据网络承载能力调整发送速度，核心是避免交换机、路由器或链路过载。' }], state: '接收窗口=1200B → 0 → 1200B；拥塞窗口独立调整；连接保持 ESTABLISHED。' },
        { title: '通过挥手关闭连接', description: '一方发送 FIN 表示本方向不再发送新数据，另一方确认并可在合适时发送自己的 FIN。主动关闭方通常经历 FIN_WAIT_1、FIN_WAIT_2、TIME_WAIT 后回到 CLOSED，以确保最后的确认可靠并处理迟到重复段。', terms: [{ name: 'FIN', definition: 'TCP 表示发送方数据方向已结束的标志，不代表对方也必须同时停止发送。' }, { name: 'TIME_WAIT', definition: '主动关闭方在关闭后保留一段连接状态的时期，用于处理最后确认丢失和迟到报文。' }], state: 'ESTABLISHED → FIN_WAIT_1 → FIN_WAIT_2 → TIME_WAIT → CLOSED。' },
      ],
      stateTable: {
        columns: ['阶段', '连接状态', '发送方已发', '确认号 / 下一期望', '接收窗口', '结果或异常分支'],
        rows: [
          ['尚未连接', 'CLOSED', '无', '无', '未协商', '不能直接发送应用数据'],
          ['发出握手', 'SYN_SENT', 'SYN', '等待 SYN-ACK', '未协商', '超时可能重发 SYN'],
          ['握手被拒绝', 'SYN_SENT', 'SYN', '收到 RST', '未协商', '进入 CLOSED，连接建立失败'],
          ['握手完成', 'ESTABLISHED', 'SYN、SYN-ACK、ACK', '初始序号已同步', '服务端通告', '可以传输应用字节'],
          ['首段到达', 'ESTABLISHED', '1000—1003', '1004', '例如 1200B', '提交连续 HELL'],
          ['后段丢失', 'ESTABLISHED', '1000—1004', '仍为 1004', '仍可通告', '缺口存在，等待重传'],
          ['重传成功', 'ESTABLISHED', '重发 1004', '1005', '按接收方能力', '提交 HELLO，不立即断连'],
          ['重复段到达', 'ESTABLISHED', '可能重复', '保持 1005', '不变', '按序号去重并再次确认'],
          ['接收窗口为 0', 'ESTABLISHED', '暂停新数据', '按已收字节确认', '0', '连接仍在，等待窗口更新'],
          ['正常关闭', 'FIN_WAIT_1/2、TIME_WAIT', 'FIN', '最后字节之后', '不再传输新数据', '最终回到 CLOSED'],
          ['收到复位', 'CLOSED 或重置', '任意', 'RST', '不再有效', '连接异常终止'],
        ],
      },
      summary: 'TCP 用握手建立状态，用序号、确认和重传维护可靠字节流；接收窗口做流量控制，拥塞窗口保护网络，丢包通常先触发重传，只有无法恢复或收到复位等情况才会关闭连接。',
    },
    costs: [
      { choice: '面向连接与握手', cost: '获得同步初始状态和可靠管理，但增加往返延迟，且握手成功不代表应用鉴权或业务成功。', misread: 'TCP 连上了，就说明目标程序一定接受了请求。' },
      { choice: '按字节流交付', cost: '应用不必处理逐包排序，但必须自行设计长度字段、分隔符或消息头来恢复业务消息边界。', misread: '发送方调用两次 write，接收方就一定会分两次读到两条消息。' },
      { choice: '可靠性与双窗口', cost: '重传和窗口机制提升完整性，却带来缓存、定时器和协议开销；接收窗口与拥塞窗口混淆会导致错误排障。', misread: '接收窗口小是网络拥塞，或者一次丢包就说明连接已经失败。' },
    ],
    example: {
      title: '模拟握手、丢包重传、双窗口与挥手',
      intent: '第一条命令用固定事件展示 TCP 状态、累计确认和重传；第二条命令只读查看 Linux 上已建立的 TCP 连接，不发送测试流量。',
      setup: 'Python 命令只需标准库，已在本机 Git Bash 实际执行。ss 命令面向 Linux，本机未执行；输出为使用文档保留地址的固定示意。',
      terms: [
        { name: 'Recv-Q / Send-Q', definition: 'ss 输出中接收或发送队列里尚未被应用取走或尚未被确认的字节数量，具体语义随状态和工具版本略有差异。' },
        { name: 'RST', definition: 'TCP 复位标志，用于异常终止或拒绝连接；它不同于正常关闭使用的 FIN。' },
      ],
      diagram: {
        kind: 'flow',
        title: '可靠字节流内部发生了什么',
        caption: '连接状态、字节确认和窗口是三条相互关联但不同的状态线。',
        items: [
          { title: '① 握手建立状态', detail: 'SYN、SYN-ACK、ACK 同步双方初始序号，状态从 CLOSED 进入 ESTABLISHED。', tag: '连接', tone: 'blue' },
          { title: '② 序号与确认修复缺口', detail: '1004 丢失时确认停在 1004；超时后重传，确认推进到 1005，HELLO 才完整交付。', tag: '可靠', tone: 'orange' },
          { title: '③ 两种窗口限制速度', detail: '接收窗口保护接收方缓存，拥塞窗口保护网络；任一窗口为 0 都不等于连接关闭。', tag: '速率', tone: 'green' },
        ],
        footnote: 'TCP 只交付有序字节；消息长度、请求编号、幂等和业务重试仍需应用设计。',
      },
      commands: [
        {
          title: '确定性模拟 TCP 握手、累计确认、重传和关闭',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

state = "CLOSED"
print(f"握手开始 状态={state}")
state = "SYN_SENT"
print(f"客户端发送SYN 状态={state}")
state = "ESTABLISHED"
print("服务端SYN+ACK 客户端ACK 状态=ESTABLISHED")

recv_window = 1200
next_expected = 1000
delivered = bytearray()
inflight = {1000: b"HELL", 1004: b"O"}

def accept(seq, data):
    global next_expected
    if seq != next_expected:
        return False
    delivered.extend(data)
    next_expected += len(data)
    return True

print("发送数据 seq=1000 payload=HELL")
print("发送数据 seq=1004 payload=O")
print("网络事件 seq=1004 丢失")
accept(1000, inflight[1000])
print(f"接收确认 下一期望序号={next_expected} 已交付={delivered.decode()}")
print("重传计时器超时 状态=ESTABLISHED 继续等待")
print("重传数据 seq=1004 payload=O")
accept(1004, inflight[1004])
print(f"接收确认 下一期望序号={next_expected} 已交付={delivered.decode()}")
print(f"流量控制 接收窗口={recv_window}B 含义=接收方还能收多少")
recv_window = 0
print("接收窗口=0 发送方暂停新数据 连接状态=ESTABLISHED")
recv_window = 1200
print(f"窗口更新 接收窗口={recv_window}B 发送方恢复")
print(f"拥塞控制 拥塞窗口={recv_window}B 与接收窗口是两种限制")
print("挥手 ESTABLISHED -> FIN_WAIT_1 -> FIN_WAIT_2 -> TIME_WAIT -> CLOSED")
print("结论=丢包触发重传，不等于连接立即失败")
PY`,
          output: `握手开始 状态=CLOSED
客户端发送SYN 状态=SYN_SENT
服务端SYN+ACK 客户端ACK 状态=ESTABLISHED
发送数据 seq=1000 payload=HELL
发送数据 seq=1004 payload=O
网络事件 seq=1004 丢失
接收确认 下一期望序号=1004 已交付=HELL
重传计时器超时 状态=ESTABLISHED 继续等待
重传数据 seq=1004 payload=O
接收确认 下一期望序号=1005 已交付=HELLO
流量控制 接收窗口=1200B 含义=接收方还能收多少
接收窗口=0 发送方暂停新数据 连接状态=ESTABLISHED
窗口更新 接收窗口=1200B 发送方恢复
拥塞控制 拥塞窗口=1200B 与接收窗口是两种限制
挥手 ESTABLISHED -> FIN_WAIT_1 -> FIN_WAIT_2 -> TIME_WAIT -> CLOSED
结论=丢包触发重传，不等于连接立即失败
`,
          expect: '1004 丢失时期望序号停在 1004，重传后推进到 1005；接收窗口变为 0 时连接仍为 ESTABLISHED，最终展示完整挥手状态链。',
          note: '已在 Git Bash 中用 Python 标准库实际运行；所有状态和字节都在内存中，不创建真实 TCP 连接。',
        },
        {
          title: '只读查看 Linux 上已建立的 TCP 连接',
          command: "ss -tan state established '( dport = :443 )'",
          output: `State  Recv-Q  Send-Q  Local Address:Port  Peer Address:Port
ESTAB  0       0       192.0.2.50:53124   198.51.100.20:443
`,
          expect: '能看到一条本地端口 53124 到远端 443 的 ESTAB 连接；这只证明本机连接状态，不证明远端应用返回了正确业务结果。',
          note: 'Linux 环境专用，本机未执行；输出为固定教学示意，地址均来自文档保留网段。ss 只读取内核套接字信息，不发送数据包。',
        },
      ],
      checkpoints: [
        '能说明 TCP 交付的是可靠有序字节流，并自行设计应用消息边界',
        '能用序号、累计确认和重传解释一次丢包后为什么仍能恢复',
        '能区分接收窗口的流量控制与拥塞窗口的拥塞控制',
        '能描述握手、正常挥手和收到 RST 的不同结果，不把握手成功当作业务成功',
      ],
      safety: '不要用无边界重试放大故障；应用重试应配合超时、幂等和退避。真实抓包或连接测试前确认授权，避免泄露口令、令牌和个人数据。',
    },
    boundaries: {
      blocks: ['网络丢包、重复和乱序破坏字节顺序', '发送方长期压过接收方处理能力', '远端路由变化导致原有路径不可用', '应用需要保留简单可靠传输而不自行实现逐包确认'],
      notBlocks: ['应用消息边界', '业务权限与数据正确性', '端到端加密和证书验证', '所有网络故障下的最终交付', '自动实现幂等、事务或业务重试'],
    },
  },
  {
    id: 'network-udp',
    track: 'network',
    title: 'UDP：无连接数据报与实时应用',
    english: 'UDP / DATAGRAM / REAL-TIME APPLICATIONS',
    summary: 'UDP 把每次发送的数据作为独立数据报交给网络，不建立端到端连接，也不提供到达、顺序或去重保证。它保留数据报边界并带有校验和，适合愿意自行处理丢失与时序的应用；DNS、音视频和 QUIC 都因为不同理由使用 UDP。',
    icon: 'chart',
    group: '路由与传输',
    dependencies: ['network-routing'],
    dependents: [],
    philosophy: {
      problem: '有些数据如果迟到就已经失去价值，例如实时语音中的一小段声音；为等待丢失片段而阻塞后续数据，反而让通话更卡。另一些请求很小，建立完整连接和可靠流状态会增加不必要的开销。',
      rejects: 'UDP 不是“不可靠所以没有用”，也不保证数据一定到达、按发送顺序到达或只到达一次。校验和只能发现某些传输错误，不能修复丢包，也不会把 UDP 自动变成可靠协议。',
      counter: '把 UDP 看成一张张独立投递的明信片：每张明信片保留自己的边界，邮局不承诺一定送到、先到先送或不重复送。应用可以接受少量丢失，也可以在 UDP 上自行增加序号、确认、去重和重传，但这些都属于应用或其上层协议的责任。',
    },
    design: {
      abstractions: [
        { name: '数据报（datagram）', role: 'UDP 一次发送的独立数据单元，保留首尾边界；接收方一次读取通常对应一个数据报。' },
        { name: '无连接（connectionless）', role: 'UDP 协议没有握手、连接状态和跨数据报确认；本机仍有 socket 和端口状态用于收发，但两端不维护 TCP 式连接。' },
        { name: '端口（port）', role: '本机用于区分不同 UDP 通信端点的编号；系统可据此把数据报交给对应 socket 或应用。' },
        { name: '校验和（checksum）', role: '对伪首部、UDP 头和数据计算的值，用于检测传输中的某些错误；发现错误通常选择丢弃，而不是自动修复。' },
        { name: '实时应用', role: '更重视新鲜度和连续播放的音视频、会议、游戏等应用，常愿意用少量丢失换取更低等待和更少队头阻塞。' },
        { name: 'QUIC', role: '运行在 UDP 之上的传输协议，自行实现可靠流、拥塞控制和加密等机制；它证明 UDP 可以承载可靠机制，但可靠性由 QUIC 提供。' },
      ],
      principles: [
        '边界先于拼接：UDP 保留每次发送的数据报边界，但应用仍要检查最大长度；发送多个数据报不等于接收方得到一个连续流。',
        '最小传输承诺：UDP 不承诺到达、顺序和去重，校验和只负责检错；需要这些保证时必须由应用或上层协议补齐。',
        '按业务选择等待策略：实时媒体可跳过迟到数据，DNS 可重发小查询，QUIC 可在 UDP 上建立自己的可靠流，选择取决于业务而不是协议标签。',
      ],
      history: [
        { when: '1980 年', what: 'RFC 768 定义 UDP', why: '提供一种简单、低开销的数据报传输方式，直接复用 IP 的尽力而为交付。' },
        { when: '1980 年代起', what: 'DNS 等应用采用 UDP 完成小查询', why: '减少连接建立开销；需要更大响应或可靠传输时再按协议规则使用 TCP。' },
        { when: '2010 年代起', what: 'QUIC 标准化并在 2022 年成为 HTTP/3 基础', why: '在 UDP 上实现低时延、可靠流、拥塞控制和集成加密，同时减少传输层队头阻塞。' },
      ],
    },
    capabilities: [
      { name: '保留数据报边界', sentence: '让每次发送的 UDP 数据作为独立单元到达接收缓冲区，便于请求—响应或媒体帧式处理。' },
      { name: '低开销即时发送', sentence: '无需握手即可发送数据，适合小消息和能容忍丢失的实时场景。' },
      { name: '检测部分传输错误', sentence: '通过 UDP 校验和发现数据在传输中发生的某些比特错误，接收方通常丢弃错误数据报。' },
      { name: '承载自定义上层机制', sentence: '允许应用或 QUIC 等协议自行实现确认、重传、去重、拥塞控制和加密。' },
    ],
    path: {
      intent: '连续发送 HELLO、WORLD、FAIL 三个 UDP 数据报，让网络把第二个提前送达、重复送达，并丢弃第三个；观察边界仍在，但顺序、到达和重复都没有保证。',
      environment: '纯内存教学模拟：地址、端口和数据报均为虚构值；校验和计算使用 Python 标准库，不发送真实 UDP 包。',
      steps: [
        { title: '创建本地 UDP 端点', description: '应用创建一个 UDP socket，并绑定本地端口 53000。与 TCP 不同，此时不需要先和远端握手；系统仍会记录本地 socket，以便把收到的数据报交给应用。', terms: [{ name: 'socket', definition: '操作系统提供给程序收发网络数据的接口，包含协议、地址和端口等本地状态。' }, { name: '绑定（bind）', definition: '把本地地址或端口分配给 socket，使系统知道把哪些数据报交给它。' }], state: '本地端点=192.0.2.50:53000；无端到端连接状态。' },
        { title: '构造独立数据报', description: '应用准备 payload=HELLO，UDP 头记录源端口 53000、目的端口 53 和长度 13。每个数据报有自己的头和边界，不会因为连续发送而自动与前后数据报合并。', terms: [{ name: '数据报长度', definition: 'UDP 头加负载的字节数；接收方据此识别一个数据报的结束位置。' }, { name: '负载（payload）', definition: '数据报中由应用携带的实际数据，本示例为 HELLO。' }], state: 'd1=HELLO；长度=13；尚未进入网络。' },
        { title: '计算校验和后发送', description: '发送方根据伪首部、UDP 头和数据计算校验和，并填入 UDP 头。伪首部帮助校验和识别 IP 地址与协议；IPv4 中校验和可为零表示未计算，IPv6 中则必须计算。', terms: [{ name: '伪首部（pseudo-header）', definition: '计算 UDP 校验和时纳入的 IP 层信息，包括源地址、目的地址、协议和长度，但不会作为 UDP 头发送。' }, { name: '校验和', definition: '用于检测某些比特错误的数值；它不提供加密、身份验证或丢包恢复。' }], state: 'd1 校验和已计算；发送动作不等待远端确认。' },
        { title: '网络独立处理每个数据报', description: 'HELLO、WORLD、FAIL 分别进入网络。每个数据报可以走不同路径，也可能被丢弃、延迟或复制；UDP 本身不保存跨数据报的序号，也不会因为前一个丢失而自动重发。', terms: [{ name: '尽力而为交付', definition: '网络会尝试转发数据，但不保证最终到达；UDP 在此之上不增加可靠交付承诺。' }, { name: '队头阻塞', definition: '前一个数据未就绪时阻塞后续数据；UDP 没有有序流重排，因此不会在传输层制造 TCP 式跨数据报等待。' }], state: 'd1、d2、d3 独立发送；每个数据报命运可能不同。' },
        { title: '处理乱序与重复分支', description: '网络先送达 d2，又重复送达一次 d2，最后才送达 d1。接收方仍能按数据报边界读出 WORLD、WORLD、HELLO，但应用看到的是重复和乱序，UDP 不会替它去重或排序。', terms: [{ name: '乱序', definition: '后发送的数据先于先发送的数据到达，UDP 不负责恢复发送顺序。' }, { name: '重复', definition: '同一数据报可能因网络复制或应用重发而出现多次，UDP 不负责识别。' }], state: '接收序列=d2、d2、d1；d3 未到达；边界保持。' },
        { title: '处理丢失与校验和错误分支', description: 'd3 被网络丢弃时，UDP 没有确认和重传来补救。若某个数据报到达但校验和验证失败，接收方通常直接丢弃；两种失败都不会生成一个“空数据”来填补位置。', terms: [{ name: '丢失', definition: '数据报没有到达接收方；UDP 本身不会自动发现并重传。' }, { name: '校验失败', definition: '接收方重算校验和后发现不匹配，通常丢弃该数据报以避免把错误数据交给应用。' }], state: '失败分支：d3=丢失；错误校验和=丢弃；均无自动恢复。' },
        { title: '由应用决定是否补救', description: 'DNS 可以重发查询并在超时后切换传输方式；音视频可以跳过迟到帧；QUIC 则在 UDP 之上自行实现可靠流、拥塞控制和加密。选择哪种策略取决于业务，而不是 UDP 自带保证。', terms: [{ name: 'DNS', definition: '把名称解析为 IP 地址等信息的应用层系统，许多小查询使用 UDP，但协议允许在需要时使用 TCP。' }, { name: 'QUIC', definition: '基于 UDP 的现代传输协议，在用户空间实现可靠流、拥塞控制与加密，HTTP/3 使用它。' }], state: '接收完成或按应用策略丢弃；上层机制决定可靠性。' },
      ],
      stateTable: {
        columns: ['阶段', '本地 socket', '数据报', '校验和', '网络 / 接收结果', '协议动作或拒绝分支'],
        rows: [
          ['尚未创建', '无', '无', '无', '不能收发', '应用需先创建 UDP socket'],
          ['端点就绪', '已绑定 53000', '无', '未计算', '可发送或接收', '无需握手'],
          ['构造 d1', '保持', 'HELLO', '待计算', '尚未发送', '保留单次发送边界'],
          ['发送 d1', '保持', 'HELLO', '已计算并填入', '进入网络', '不等待远端确认'],
          ['d2 提前到达', '保持', 'WORLD', '验证通过', '先于 d1 到达', '按数据报交给应用，不排序'],
          ['d2 重复到达', '保持', 'WORLD', '再次通过', '同一负载出现两次', '不自动去重'],
          ['d1 后到达', '保持', 'HELLO', '验证通过', '顺序为 d2、d2、d1', '边界仍在，顺序不保证'],
          ['d3 丢失', '保持', 'FAIL', '无法在接收端验证', '没有数据报到达', '无确认、无自动重传'],
          ['校验和错误', '保持', '任意损坏数据', '验证失败', '接收方收到错误数据报', '通常丢弃，不交给应用'],
          ['应用补救', '保持', '按上层机制', '可继续使用', '重发、跳过或可靠流处理', '责任在应用或上层协议'],
        ],
      },
      summary: 'UDP 保留数据报边界并提供低开销发送，但不保证到达、顺序和去重；校验和只检错。DNS、实时音视频和 QUIC 使用 UDP 的原因不同，需要可靠性时必须由应用或上层协议自行实现。',
    },
    costs: [
      { choice: '无连接数据报', cost: '没有握手和跨数据报可靠状态，时延与实现开销较低，但应用必须自行处理丢失、重复、乱序和超时。', misread: 'UDP 不建立连接，所以本机不需要任何 socket 或端口状态。' },
      { choice: '校验和检错', cost: '能发现部分传输错误且计算便宜，但校验和不验证发送者身份，也不能恢复丢失；IPv4 中还可选择不计算。', misread: '有校验和就说明数据一定安全、完整且到达。' },
      { choice: '实时性优先', cost: '跳过迟到数据可降低等待和队头阻塞，却可能牺牲信息完整性；需要可靠机制时，复杂度会转移到应用或 QUIC 等上层协议。', misread: 'UDP 只能用于不可靠应用，或者 QUIC 的可靠性来自 UDP 本身。' },
    ],
    example: {
      title: '计算 UDP 校验和并观察乱序、重复与丢失',
      intent: '第一条命令在内存中计算一个真实格式的 IPv4 UDP 校验和，并用固定事件展示数据报边界和三种异常；第二条命令只读查看 Linux 的 UDP 监听端口。',
      setup: 'Python 命令只需标准库，已在本机 Git Bash 实际执行。ss -lun 面向 Linux，本机未执行；输出为固定教学示意，不使用真实网络地址。',
      terms: [
        { name: 'UNCONN', definition: 'ss 对未连接 UDP 套接字常见的状态显示，表示该 socket 没有建立 TCP 式端到端连接。' },
        { name: '伪首部校验', definition: 'UDP 校验和计算时纳入 IP 源地址、目的地址、协议号和 UDP 长度，以发现部分地址或传输错误。' },
      ],
      diagram: {
        kind: 'flow',
        title: '独立数据报的三种不同命运',
        caption: '边界由 UDP 保留，到达、顺序和去重则由网络状况决定。',
        items: [
          { title: '① 分别发送', detail: 'HELLO、WORLD、FAIL 各自成为一个 UDP 数据报，没有握手，也没有跨报序号。', tag: '无连接', tone: 'blue' },
          { title: '② 网络独立处理', detail: 'd2 先到并重复，d1 后到，d3 丢失；接收方仍能区分数据报边界。', tag: '不保证顺序', tone: 'orange' },
          { title: '③ 应用选择策略', detail: 'DNS 可重发，实时媒体可跳过，QUIC 在 UDP 上自行实现可靠流和拥塞控制。', tag: '责任上移', tone: 'green' },
        ],
        footnote: 'UDP 校验和验证失败通常导致丢弃，但“验证通过”只说明检错条件满足，不证明内容可信。',
      },
      commands: [
        {
          title: '确定性计算 UDP 校验和并模拟数据报异常',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import sys
import socket
import struct
sys.stdout.reconfigure(encoding="utf-8", newline="\\n")

src = "192.0.2.50"
dst = "198.51.100.20"
payload = b"HELLO"
length = 8 + len(payload)

def checksum(data):
    if len(data) % 2:
        data += b"\\x00"
    total = sum(struct.unpack(f"!{len(data) // 2}H", data))
    while total >> 16:
        total = (total & 0xFFFF) + (total >> 16)
    return (~total) & 0xFFFF

pseudo = socket.inet_aton(src) + socket.inet_aton(dst) + struct.pack("!BBH", 0, 17, length)
udp_zero = struct.pack("!HHHH", 53000, 53, length, 0)
value = checksum(pseudo + udp_zero + payload)
if value == 0:
    value = 0xFFFF

print(f"UDP数据报 src={src}:53000 dst={dst}:53 payload={payload.decode()}")
print(f"UDP校验和=0x{value:04x} 作用=检错，不保证到达")
datagrams = [("d1", b"HELLO"), ("d2", b"WORLD"), ("d3", b"FAIL")]
lookup = dict(datagrams)
events = [("d2", "到达"), ("d2", "重复"), ("d1", "到达")]
for name, event in events:
    print(f"网络事件={event} id={name} payload={lookup[name].decode()}")
print("网络事件=丢失 id=d3 payload=FAIL")
print("接收结果顺序=d2,d2,d1 说明=边界保留但顺序与重复不保证")
print("无连接状态=没有握手，也没有跨数据报的确认与重传")
print("应用可自行实现=序号、确认、去重、重传、拥塞控制")
PY`,
          output: `UDP数据报 src=192.0.2.50:53000 dst=198.51.100.20:53 payload=HELLO
UDP校验和=0x608a 作用=检错，不保证到达
网络事件=到达 id=d2 payload=WORLD
网络事件=重复 id=d2 payload=WORLD
网络事件=到达 id=d1 payload=HELLO
网络事件=丢失 id=d3 payload=FAIL
接收结果顺序=d2,d2,d1 说明=边界保留但顺序与重复不保证
无连接状态=没有握手，也没有跨数据报的确认与重传
应用可自行实现=序号、确认、去重、重传、拥塞控制
`,
          expect: '校验和为 0x608a；三个数据报中 d2 先到并重复、d1 后到、d3 丢失，接收结果保持 d2、d2、d1 的数据报边界。',
          note: '已在 Git Bash 中用 Python 标准库实际运行；socket.inet_aton 只把固定文本地址转成字节，不发送或接收网络数据。',
        },
        {
          title: '只读查看 Linux 上监听中的 UDP 端口',
          command: 'ss -lun',
          output: `Netid State   Recv-Q Send-Q Local Address:Port  Peer Address:Port
udp   UNCONN  0      0      127.0.0.53%lo:53    0.0.0.0:*
`,
          expect: '能看到本地 53 端口上的 UDP 监听 socket；UNCONN 表示没有 TCP 式连接状态，不代表端口没有应用在使用。',
          note: 'Linux 环境专用，本机未执行；输出为固定教学示意。ss -lun 只读取本机套接字表，不发送 DNS 或其他网络请求。',
        },
      ],
      checkpoints: [
        '能说明 UDP 保留数据报边界，但不保证到达、顺序和去重',
        '能解释校验和只负责检错，不能修复丢失或验证发送者身份',
        '能分别说明 DNS、实时音视频和 QUIC 使用 UDP 的原因',
        '知道可靠机制可以建立在 UDP 上，但需要应用或上层协议自己负责',
      ],
      safety: '不要向陌生地址发送 UDP 探测或放大流量；UDP 源地址可被伪造，实际系统还需要限速、防火墙和上层认证。教学命令不会发送真实数据报。',
    },
    boundaries: {
      blocks: ['实时媒体愿意用少量丢失换取新鲜度', '小查询希望避免握手开销', '应用需要按数据报边界处理请求或媒体帧', '上层协议希望在 UDP 上自行实现可靠流和拥塞控制'],
      notBlocks: ['UDP 自带到达、顺序或去重保证', '校验和提供加密或发送者身份认证', '阻止反射放大、泛洪和源地址伪造', '替代 DNS 重试、媒体抖动处理或 QUIC 等上层机制'],
    },
  },
]
