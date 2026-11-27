/**
 * 网络应用与命名课程：从名称解析，到请求响应，再到加密传输。
 * 三个模块均遵循“哲学—设计—能力—机制—成本—示例—边界”的七章契约。
 */
import type { KnowledgeModule } from './knowledgeTypes'

/**
 * 导出网络应用模块，顺序固定为 DNS、HTTP、TLS。
 * dependents 先留空，由全站聚合器根据 dependencies 反向计算。
 */
export const networkApplicationModules: KnowledgeModule[] = [
  {
    id: 'network-dns',
    track: 'network',
    title: 'DNS：名称怎样解析成地址',
    english: 'DOMAIN NAME SYSTEM / NAMES TO ADDRESSES',
    summary: 'DNS 是一套协作的分布式命名系统：递归解析器代替提问者，逐级向根、顶级域和权威服务器问路，最终把名称转换成地址，并用缓存和 TTL 控制结果的新鲜度。',
    icon: 'database',
    group: '应用与命名',
    dependencies: ['network-udp'],
    dependents: [],
    philosophy: {
      problem: '人更容易记住有含义的名称，网络设备却需要按地址转发数据；名称会变、设备会换，还常有多个地址，因此需要一个能随变化更新又不依赖单点故障的查询系统。',
      rejects: 'DNS 不是一本集中存放全部网址的电话簿，也不负责判断网站内容是否真实、善意或一定可访问。解析成功只说明此刻得到了名称对应的记录。',
      counter: '一次查询不是“问一台总服务器”，而是多个角色按层级分工：递归解析器负责跑腿，根和顶级域负责指路，权威服务器负责给出所管理区域的答案。',
    },
    design: {
      abstractions: [
        { name: '域名（domain name）', role: '用点分隔的层级名称，例如 www.example.test；从右向左看，标签逐级缩小管理范围。' },
        { name: '递归解析器（recursive resolver）', role: '替客户端完成完整查询的服务，可访问缓存并向其他服务器逐级询问，客户端通常只需与它打交道。' },
        { name: '根、顶级域与权威服务器', role: '根告诉解析器顶级域由谁管理，顶级域再指向该名称的权威服务器，权威服务器保存所管理区域的记录。' },
        { name: '资源记录（resource record）', role: '一条“名称—类型—值—有效期”的数据；常见 A 记录给 IPv4 地址，AAAA 给 IPv6 地址，CNAME 给另一个名称。' },
        { name: '缓存与 TTL', role: '解析器可暂时复用答案；TTL 是记录允许被缓存的秒数，到期后应重新查询，避免旧地址永久残留。' },
        { name: '查询传输方式', role: '较小的传统 DNS 查询常用 UDP，响应被截断等情况可改用 TCP；DoH 和 DoT 则保护客户端到递归解析器这一段传输。' },
      ],
      principles: [
        '按层级委派，而不是集中托管：每个权威服务器只回答自己负责的区域，根与顶级域提供 referrals，即“下一步该问谁”的指引。',
        '缓存必须受 TTL 约束：缓存能降低延迟和负载，但会带来有上限的陈旧窗口；更新记录后，旧答案仍可能存活到缓存到期。',
        '命名、可达性与传输安全分开：有 A 记录不代表端口开放，解析成功也不代表内容可信；DoH、DoT 保护查询传输，但不替代对网站身份的认证。',
      ],
      history: [
        { when: '1983 年', what: 'DNS 的早期规范发布', why: '用分层命名与分布式数据库替代集中维护的主机名单。' },
        { when: '1980 年代后期起', what: '层级域名、根服务器与缓存机制逐步部署', why: '让名称管理分散到不同组织，并用缓存承受不断增长的查询量。' },
        { when: '2016—2018 年', what: 'DoT 与 DoH 标准化', why: '把传统明文 DNS 查询放进受保护的传输通道，减少局域网观察者读取查询内容的机会。' },
      ],
    },
    capabilities: [
      { name: '名称到地址', sentence: '把应用使用的名称转换成可交给网络层的 IPv4 或 IPv6 地址。' },
      { name: '别名追踪', sentence: '沿着 CNAME 链找到最终记录，同时保留链上每一跳的有效期信息。' },
      { name: '分布式更新', sentence: '不同组织只维护自己的区域，通过委派关系共同回答全球名称。' },
      { name: '缓存与安全传输', sentence: '用 TTL 缓存减少重复查询，并可用 DoH 或 DoT 隐藏客户端与递归解析器之间的查询内容。' },
    ],
    path: {
      intent: '让应用查询 www.example.test 的 A 记录，展示缓存命中、逐级委派、权威回答以及超时、空答案和截断分支。',
      environment: '纯教学模型；example.test 是文档保留名称，192.0.2.10 与 2001:db8::10 是文档保留地址。递归解析器、根、顶级域和权威服务器均为逻辑角色。',
      steps: [
        { title: '应用提出名称问题', description: '应用知道要访问 www.example.test，但还不知道 IPv4 地址。它把“名称 + 记录类型”交给系统配置的递归解析器；若本地 hosts 文件等已有明确映射，可能不必走完整 DNS 查询。', terms: [{ name: '记录类型', definition: '要查询的数据种类，例如 A 表示 IPv4 地址，AAAA 表示 IPv6 地址，CNAME 表示别名。' }], state: '问题已构造，尚未得到地址。' },
        { title: '先查缓存：命中就返回', description: '递归解析器先查缓存。如果存在未过期的答案，直接返回剩余 TTL，不再打扰根和权威服务器；过期记录不能当作新鲜答案，但某些故障场景可能返回陈旧记录，这是策略与安全边界。', terms: [{ name: '缓存命中', definition: '请求的答案仍在有效期内，可直接复用，无需再次访问权威服务器。' }], state: '命中：进入返回分支；未命中：继续逐级查询。' },
        { title: '根服务器指出顶级域', description: '缓存未命中时，解析器询问根服务器。根通常不直接返回 example.test 的最终地址，而是告诉解析器 .test 顶级域由哪些服务器负责。', terms: [{ name: '根服务器', definition: '层级名称的起点，主要提供顶级域服务器的指引，而不是保存所有网站的最终记录。' }], state: '获得 .test 的 referrals，目标名称仍未解析。' },
        { title: '顶级域指向权威服务器', description: '解析器继续询问 .test 顶级域服务器，得到 example.test 权威服务器的地址。这里的“权威”表示对某个区域负有回答责任，不表示内容一定正确或可信。', terms: [{ name: '权威服务器', definition: '保存某个 DNS 区域记录、并能对该区域给出正式回答的服务器。' }], state: '已找到下一跳，尚未获得 A 记录。' },
        { title: '权威服务器返回记录链', description: 'example.test 的权威服务器可以回答 www.example.test 的 CNAME，并继续提供 docs.example.test 的 A 记录。解析器把这些记录与各自 TTL 一起放入答案；若名称不存在，则返回不存在答案，而不是凭空造地址。', terms: [{ name: 'CNAME', definition: '把当前名称指向另一个名称的别名记录；最终仍要查询目标名称所需的地址类型。' }], state: '成功：得到记录链；不存在：返回否定答案。' },
        { title: '回传并处理传输分支', description: '递归解析器把结果返回客户端。若 UDP 响应被截断，可按规则改用 TCP 重试；若超时、格式错误或服务器持续失败，则进入解析失败分支。DoH、DoT 改变的是客户端到解析器的传输保护方式，不改变上面的层级职责。', terms: [{ name: 'UDP 与 TCP', definition: '两种传输方式；UDP 开销小但不保证交付，TCP 提供可靠字节流，适合被截断或需要可靠传输的 DNS 消息。' }], state: '成功：答案可交付；截断：转 TCP；失败：返回错误或进入故障策略。' },
        { title: '客户端校验、缓存并尝试连接', description: '应用检查是否得到可用地址，再缓存结果并尝试建立连接。没有地址、地址不可达或 TTL 为 0 都是不同状态：没有地址应停止，地址不可达属于后续网络问题，TTL 为 0 表示不应把答案留作缓存。', terms: [{ name: 'TTL 为 0', definition: '记录仍可在本次回答中使用，但不应作为缓存答案继续复用。' }], state: '成功：进入连接阶段；空结果：拒绝继续；连接失败：保留解析成功但网络失败的事实。' },
      ],
      stateTable: {
        columns: ['阶段或分支', '缓存', '当前服务器', '输出', '下一步'],
        rows: [
          ['初始查询', '无有效答案', '递归解析器', '问题已接收', '检查缓存'],
          ['缓存命中', '答案未过期', '无需访问根或权威', '记录 + 剩余 TTL', '返回客户端'],
          ['缓存未命中', '无有效答案', '递归解析器', '开始完整查询', '询问根'],
          ['根返回指引', '尚无最终记录', '根服务器', '.test 的 referrals', '询问顶级域'],
          ['顶级域返回指引', '尚无最终记录', '.test 顶级域', 'example.test 权威服务器地址', '询问权威服务器'],
          ['权威回答成功', '可写入新记录', 'example.test 权威服务器', 'CNAME + A + TTL', '返回客户端'],
          ['名称不存在', '可缓存否定答案', '权威服务器', '不存在或该类型无记录', '停止地址连接'],
          ['UDP 响应截断', '尚未完成交付', '递归解析器', '需要更大传输容量', '改用 TCP 重试'],
          ['超时或格式错误', '可能保留旧缓存', '递归解析器', '解析失败或陈旧答案', '按策略报错'],
          ['TTL 为 0', '不保留', '递归解析器', '本次可用地址', '使用后到期'],
          ['客户端拒绝空结果', '不产生地址', '应用', '无地址可连接', '终止本次尝试'],
        ],
      },
      summary: 'DNS 的核心是“层级委派 + 递归跑腿 + 受 TTL 限制的缓存”；得到地址只是起点，地址能否连通、内容是否可信要由后续机制判断。',
    },
    costs: [
      { choice: '分布式层级', cost: '避免了单一总电话簿，但一次冷查询可能经过多个服务器，排障时要分清哪一跳失败。', misread: '“DNS 只有一个中央数据库，所有网站都登记在同一台机器上。”' },
      { choice: '缓存与 TTL', cost: '显著降低延迟和负载，但记录变更后旧答案可能继续存在，直到各级缓存到期。', misread: '“修改权威记录后，全世界会立刻看到新地址。”' },
      { choice: 'DoH 或 DoT', cost: '能保护客户端到递归解析器的查询，但会把信任更多交给解析服务提供者，也不能证明网站内容真实。', misread: '“用了加密 DNS，就说明访问的网站一定安全。”' },
    ],
    example: {
      title: '离线模拟 CNAME、A/AAAA 与 TTL 缓存，再只读查询 localhost',
      intent: '第一条命令用 Python 标准库在内存中模拟递归解析器的缓存行为；第二条用 Windows 自带工具查询 localhost，不访问外网。',
      setup: 'Python 命令可在 Git Bash 中运行，只使用标准库且不打开网络套接字。第二条命令适用于装有 nslookup 的 Windows；查询 localhost 通常由本机 hosts 配置回答，输出会随系统变化。',
      terms: [
        { name: 'referral', definition: '服务器返回的“该继续问谁”的指引，不是最终地址记录。' },
        { name: '文档保留名称与地址', definition: 'example.test、192.0.2.0/24 与 2001:db8::/32 等专用于示例，不对应真实网站。' },
      ],
      diagram: {
        kind: 'flow',
        title: '一次冷查询怎样在层级间前进',
        caption: '递归解析器替客户端跑腿；根和顶级域主要给指引，权威服务器给出记录。',
        items: [
          { title: '① 应用与递归解析器', detail: '应用提出 www.example.test 的 A 查询，解析器先检查缓存。', tag: '提问', tone: 'blue' },
          { title: '② 根与顶级域', detail: '根指出 .test，顶级域再指出 example.test 的权威服务器。', tag: '逐级指路', tone: 'orange' },
          { title: '③ 权威服务器', detail: '返回 CNAME 到 docs.example.test，以及目标名称的 A/AAAA 记录和 TTL。', tag: '正式回答', tone: 'green' },
          { title: '④ 缓存与连接', detail: '解析器在 TTL 内复用答案；应用拿到地址后仍需自行尝试连接。', tag: '有期限的复用', tone: 'muted' },
        ],
        footnote: 'DoH、DoT 保护的是客户端到递归解析器这一段，不会把根与权威服务器合并成一台机器。',
      },
      commands: [
        {
          title: '模拟别名解析、两类地址与 TTL 缓存',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
$PY - <<'PY'
import sys
sys.stdout.reconfigure(newline="\\n")
records = {
    "www.example.test": {"CNAME": [("docs.example.test", 60)]},
    "docs.example.test": {
        "A": [("192.0.2.10", 60)],
        "AAAA": [("2001:db8::10", 60)],
    },
}
cache = {}

def resolve(name, qtype, now):
    key = (name, qtype)
    if key in cache:
        chain, address, ttl, expires = cache[key]
        if now < expires:
            return "HIT", chain, address, ttl, expires - now
    chain = []
    current = name
    while "CNAME" in records.get(current, {}):
        target, ttl = records[current]["CNAME"][0]
        chain.append(f"{current} -> {target} (CNAME TTL {ttl})")
        current = target
    address, ttl = records[current][qtype][0]
    cache[key] = (tuple(chain), address, ttl, now + ttl)
    return "MISS", tuple(chain), address, ttl, ttl

for now in (0, 10, 70):
    status, chain, address, ttl, left = resolve("www.example.test", "A", now)
    print(f"t={now} {status} " + " ; ".join(chain))
    print(f"t={now} address={address} ttl={ttl} remaining={left}")
status, chain, address, ttl, left = resolve("docs.example.test", "AAAA", 0)
print(f"AAAA {address} ttl={ttl}")
print("transport: UDP for small queries; TCP after truncation; DoH/DoT encrypt resolver transport")
PY`,
          output: `t=0 MISS www.example.test -> docs.example.test (CNAME TTL 60)
t=0 address=192.0.2.10 ttl=60 remaining=60
t=10 HIT www.example.test -> docs.example.test (CNAME TTL 60)
t=10 address=192.0.2.10 ttl=60 remaining=50
t=70 MISS www.example.test -> docs.example.test (CNAME TTL 60)
t=70 address=192.0.2.10 ttl=60 remaining=60
AAAA 2001:db8::10 ttl=60
transport: UDP for small queries; TCP after truncation; DoH/DoT encrypt resolver transport
`,
          expect: 't=10 命中缓存且剩余 50 秒；t=70 因过期重新查询；A 与 AAAA 返回不同地址族；最后一行区分传输方式与层级解析。',
          note: '已在 Git Bash 中用 Python 标准库实际执行；数据全部在内存中，使用文档保留名称与地址，不访问外网。',
        },
        {
          title: '只读查看 localhost 的 A 记录',
          command: 'nslookup -type=A localhost',
          output: `Server:  UnKnown
Address:  127.0.0.1

Non-authoritative answer:
Name:    localhost
Address:  127.0.0.1`,
          expect: '通常看到 localhost 映射到 127.0.0.1；若系统配置不同，服务器名或返回地址可能变化，但不应修改网络配置。',
          note: 'Windows 10/11 自带 nslookup；查询 localhost，不访问外网。未在当前 Git Bash 执行，输出为常见风格示例，具体内容取决于本机 hosts 与 DNS 配置。',
        },
      ],
      checkpoints: [
        '能说明 DNS 是分布式系统，而不是单一电话簿',
        '能按递归解析器、根、顶级域、权威服务器解释一次冷查询',
        '能区分 A、AAAA、CNAME，并说出 TTL 到期后需要重新查询',
        '知道 UDP/TCP 与 DoH/DoT 改变的是传输层保护，不改变命名层级',
      ],
      safety: '只查询自己有权查询的名称；不要用 DNS 查询探测陌生内部域名。缓存、hosts 与解析器配置都可能影响结果，排障时应记录查询对象、时间、记录类型和返回 TTL。',
    },
    boundaries: {
      blocks: ['集中维护所有名称与地址', '手工同步名称变更', '每次冷查询都直达权威服务器', '用简单名称替代难记的地址'],
      notBlocks: ['保证地址对应端口可达', '证明网站内容真实或善意', '防止中间人篡改应用内容', '替代路由、防火墙与访问控制'],
    },
  },
  {
    id: 'network-http',
    track: 'network',
    title: 'HTTP：请求、连接与状态',
    english: 'HYPERTEXT TRANSFER PROTOCOL / REQUESTS AND RESPONSES',
    summary: 'HTTP 是应用之间的请求/响应协议：客户端说明方法、目标与头部，服务器返回状态码、头部和正文；连接如何复用、请求如何排队，则取决于 HTTP 版本与底层传输。',
    icon: 'workflow',
    group: '应用与命名',
    dependencies: ['network-tcp', 'network-dns'],
    dependents: [],
    philosophy: {
      problem: '不同程序需要一种共同语言来获取资源、提交表单或调用接口，还要能表达成功、拒绝、未找到和服务器故障；只返回一段文字无法让双方理解结果类别。',
      rejects: 'HTTP 不是“网页浏览器专用”，也不保证服务器一定可信。状态码表示服务器对本次请求的处理结果，不证明内容正确；连接复用也不代表所有响应可以乱序到达。',
      counter: '把一次交互拆成“请求行/方法 + 头部 + 可选正文”和“状态码 + 头部 + 正文”，就能在文本层面检查语义；连接只是搬运这些消息的通道，不是消息本身。',
    },
    design: {
      abstractions: [
        { name: '请求与响应', role: '客户端发送请求，服务器返回响应；两者都有明确边界，头部描述元数据，正文承载内容。' },
        { name: '方法（method）', role: '说明想对目标做什么，例如 GET 通常获取表示，POST 通常提交处理，PUT 通常整体替换；服务器可按规范与自身策略决定是否允许。' },
        { name: '状态码（status code）', role: '三位数表示结果类别：2xx 成功，3xx 重定向，4xx 请求或权限问题，5xx 服务器端问题；具体语义还要看方法和响应内容。' },
        { name: '头部（header）', role: '以名称和值补充请求或响应信息，例如 Host 指明目标主机，Content-Length 说明正文长度，Set-Cookie 要求客户端保存状态。' },
        { name: 'Cookie', role: '服务器通过 Set-Cookie 让浏览器保存一小段状态，后续请求用 Cookie 头部带回；它不是身份保证，敏感会话仍需要安全传输与适当属性。' },
        { name: '连接与流', role: 'HTTP/1.1 可在一条连接上按顺序复用多个请求；HTTP/2 用多路复用在一条连接中交错多个流，HTTP/3 则让流运行在基于 UDP 的 QUIC 上。' },
      ],
      principles: [
        '消息语义与连接管理分离：请求方法、状态码和头部描述应用含义；连接何时关闭、何时复用是传输管理，不应改变一次请求的业务结果。',
        '状态码是分类证据，不是完整解释：404 表示没有找到目标表示，403 表示理解请求但拒绝执行，500 表示服务器内部故障，排障还要看头部、正文和日志。',
        '版本演进减少等待，但不消除拥塞：HTTP/1.1 keep-alive 复用连接，但流水线响应仍需按序产生队头阻塞；HTTP/2 多路复用缓解这一层等待，HTTP/3 进一步把可靠流移到 QUIC。',
      ],
      history: [
        { when: '1991 年', what: '早期 HTTP 只有简单的请求与 HTML 响应', why: '满足万维网最初获取超文本文档的需要。' },
        { when: '1996—1999 年', what: 'HTTP/1.0 与 HTTP/1.1 标准化，持久连接普及', why: '用 keep-alive 复用连接，减少重复建立传输连接的开销。' },
        { when: '2015—2022 年', what: 'HTTP/2 与 HTTP/3 相继标准化', why: 'HTTP/2 引入多路复用，HTTP/3 改用基于 UDP 的 QUIC，进一步降低传输层队头阻塞。' },
      ],
    },
    capabilities: [
      { name: '统一资源交互', sentence: '用方法、目标和头部表达获取、提交、替换或删除等操作意图。' },
      { name: '结构化结果', sentence: '通过状态码、头部和正文让客户端区分成功、重定向、拒绝与服务器故障。' },
      { name: '状态保存', sentence: '用 Cookie 在多次请求间携带服务器认可的小段状态，同时保留属性与安全限制。' },
      { name: '高效连接复用', sentence: '通过 HTTP/1.1 持久连接、HTTP/2 多路复用和 HTTP/3 的 QUIC 流改善等待与连接开销。' },
    ],
    path: {
      intent: '客户端向 docs.example.test 请求 /catalog/demo，依次展示名称解析、连接、请求发送、服务器决策、响应解析和连接复用，并覆盖拒绝、未找到与传输失败分支。',
      environment: '教学模型使用 HTTP/1.1 明文请求，域名与数据均为虚构；真实浏览器访问 HTTPS 网站时，还会在 HTTP 之前完成地址解析与 TLS 握手。',
      steps: [
        { title: '构造请求', description: '客户端把方法 GET、目标 /catalog/demo、Host、Cookie 和连接偏好组装成请求。请求行说明做什么，头部补充上下文；正文在 GET 中通常没有。', terms: [{ name: '请求行', definition: '通常由方法、请求目标和 HTTP 版本组成的一行，是请求的第一部分。' }], state: '请求已准备，尚未发送。' },
        { title: '解析目标地址', description: '若目标使用名称，客户端先通过 DNS 得到地址。解析失败时无法继续连接；得到多个地址时，客户端可按系统策略依次尝试，而不是把第一个地址视为永远可用。', terms: [{ name: 'Happy Eyeballs', definition: '当地名同时解析出 IPv4 与 IPv6 时，客户端并行尝试并按成功速度选择的连接策略。' }], state: '成功：得到候选地址；失败：请求停在连接前。' },
        { title: '建立传输连接', description: '客户端与服务器地址、端口建立 TCP 连接。连接被拒绝、超时或路由失败都属于传输失败，此时还没有 HTTP 状态码，因为服务器可能根本没有收到请求。', terms: [{ name: '连接失败', definition: '在应用请求发送前或发送中发生的传输层失败，不能用 404 或 500 来解释。' }], state: '成功：通道可用；失败：终止或按策略重试。' },
        { title: '发送请求消息', description: '客户端通过连接发送请求行、头部和可选正文。服务器据此知道方法、目标主机、可接受的内容类型，以及 Cookie 等上下文；发送成功不等于处理成功。', terms: [{ name: 'Host 头部', definition: '指明请求要交给哪个逻辑主机，尤其在同一地址承载多个站点时非常重要。' }], state: '请求已发出，等待服务器处理。' },
        { title: '服务器路由并作出决策', description: '服务器选择处理程序并检查资源、方法和权限。资源存在且允许时可返回 200；资源不存在返回 404；理解请求但拒绝访问返回 403；程序异常可返回 500。这些是应用层结果，不是连接状态。', terms: [{ name: '403 与 404', definition: '403 表示服务器理解请求但拒绝执行；404 表示服务器找不到目标资源，二者不能混用。' }], state: '分支：200 成功、403 拒绝、404 未找到或 5xx 故障。' },
        { title: '返回并解析响应', description: '服务器发送状态码、头部和正文。客户端依据 Content-Length、分块编码或连接关闭判断正文边界，再按状态码和内容类型处理。响应被截断或格式错误时，不能把残缺正文当作完整成功结果。', terms: [{ name: '消息边界', definition: '接收方判断一条响应在哪里结束的规则，例如内容长度、分块编码或关闭连接。' }], state: '成功：响应完整；异常：进入解析失败分支。' },
        { title: '更新页面状态与连接', description: '客户端可把成功正文交给页面渲染，把错误正文交给错误提示，并把 Set-Cookie 写入浏览器。HTTP/1.1 连接可保持复用，但按序响应仍可能队头阻塞；HTTP/2 允许多个流交错，HTTP/3 则用 QUIC 流避免传输层队头阻塞。', terms: [{ name: '队头阻塞', definition: '排在前面的事项未完成时，后面的事项即使就绪也不能先被处理；HTTP/1.1 流水线响应必须按请求顺序返回。' }], state: '成功：更新界面并复用或关闭；拒绝：显示错误；传输失败：停止等待并记录证据。' },
      ],
      stateTable: {
        columns: ['阶段或分支', 'DNS', '连接', 'HTTP 结果', '客户端动作'],
        rows: [
          ['请求准备', '尚未查询或已有缓存', '未建立', '无', '检查目标与参数'],
          ['DNS 失败', '失败', '未建立', '无状态码', '停止并报告名称解析错误'],
          ['TCP 失败', '成功', '拒绝或超时', '无状态码', '停止或按策略重试'],
          ['请求发送', '成功', '已建立', '等待响应', '保持请求与连接关联'],
          ['200 成功', '成功', '已建立', '状态码与正文完整', '处理正文并更新页面'],
          ['403 拒绝', '成功', '已建立', '请求被拒绝', '显示权限或策略错误'],
          ['404 未找到', '成功', '已建立', '目标不存在', '显示未找到，不盲目重试'],
          ['500 服务器故障', '成功', '已建立', '服务器处理失败', '查看日志并按安全策略重试'],
          ['响应截断', '成功', '中途断开', '消息不完整', '不把残缺正文当成功'],
          ['keep-alive 复用', '成功', '保持打开', '后续请求继续', '按顺序或按版本机制处理'],
          ['连接关闭', '成功', '已关闭', '本次响应结束', '下次请求可能重新连接'],
        ],
      },
      summary: 'HTTP 用请求和响应表达应用语义，用状态码区分结果；DNS 与连接失败发生在 HTTP 之前或之外，不能伪造一个 404 来解释。',
    },
    costs: [
      { choice: '简单文本协议', cost: '容易阅读和调试，但头部与正文需要明确边界，解析错误或错误的内容长度会导致消息错位。', misread: '“HTTP 返回一段文字就够了，不需要状态码和头部。”' },
      { choice: 'HTTP/1.1 持久连接', cost: '减少重复连接开销，但多个请求按序处理时，慢响应会挡住后面的响应。', misread: '“keep-alive 会让所有响应同时返回。”' },
      { choice: 'HTTP/2 多路复用与 HTTP/3', cost: '减少连接与队头阻塞问题，但实现、拥塞控制和服务器支持更复杂，也不会让应用逻辑自动变快。', misread: '“用了 HTTP/2 或 HTTP/3，任何接口都不会再慢。”' },
    ],
    example: {
      title: '离线拼装请求与响应，再观察回环连接失败',
      intent: '第一条命令模拟方法、头部、Cookie、状态码和不同版本的流行为；第二条只连接本机回环地址，展示“没有 HTTP 状态码”的失败分支。',
      setup: 'Python 命令只需标准库，不启动服务器。curl 命令适用于 Git Bash 或装有 curl 的终端；它只访问 127.0.0.1，默认没有服务时应连接失败。',
      terms: [
        { name: 'keep-alive', definition: 'HTTP/1.1 中让同一 TCP 连接在响应后继续用于后续请求的机制。' },
        { name: '多路复用', definition: '在一条连接上交错传输多个独立流，使一个慢流不必按 HTTP/1.1 方式阻塞其他流的响应。' },
        { name: 'QUIC', definition: '运行在 UDP 之上的传输协议，提供可靠流、加密与连接迁移等能力；HTTP/3 使用它。' },
      ],
      diagram: {
        kind: 'flow',
        title: '消息、连接与结果分层',
        caption: '请求与响应是应用消息；DNS、TCP 或 QUIC 负责把消息送到对方；状态码只描述服务器处理结果。',
        items: [
          { title: '① 请求消息', detail: 'GET /catalog/demo，带 Host、Cookie 和连接偏好；方法表达意图，头部补充上下文。', tag: '应用语义', tone: 'blue' },
          { title: '② 传输通道', detail: '先解析地址，再建立连接；连接失败时没有 HTTP 状态码。', tag: '搬运消息', tone: 'orange' },
          { title: '③ 响应消息', detail: '状态码、头部、正文共同表达 200、403、404 或 500 等结果。', tag: '处理结果', tone: 'green' },
          { title: '④ 连接复用', detail: 'HTTP/1.1 按序复用，HTTP/2 多路复用，HTTP/3 通过 QUIC 传输流。', tag: '版本差异', tone: 'muted' },
        ],
        footnote: 'HTTPS 是在 HTTP 之外增加 TLS 保护；它不改变请求方法、状态码和头部的基本职责。',
      },
      commands: [
        {
          title: '模拟 HTTP 请求、Cookie、状态码与流顺序',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
$PY - <<'PY'
import sys
sys.stdout.reconfigure(newline="\\n")
request = {
    "method": "GET",
    "target": "/catalog/demo",
    "version": "HTTP/1.1",
    "headers": {
        "Host": "docs.example.test",
        "Cookie": "session=teaching",
        "Connection": "keep-alive",
    },
}
responses = [
    {"stream": 1, "status": 200, "reason": "OK", "body": "catalog demo"},
    {"stream": 2, "status": 404, "reason": "Not Found", "body": "missing"},
]
print(f"request: {request['method']} {request['target']} {request['version']}")
print("headers: " + " | ".join(f"{k}: {v}" for k, v in request["headers"].items()))
for response in responses:
    body = response["body"].encode("utf-8")
    print(f"stream={response['stream']} status={response['status']} {response['reason']} bytes={len(body)}")
print("HTTP/1.1 pipelining: response 1 completes before response 2 (head-of-line blocking)")
print("HTTP/2 streams: 1 and 2 can interleave on one connection")
print("HTTP/3 transport: QUIC over UDP; TLS 1.3 is built in")
PY`,
          output: `request: GET /catalog/demo HTTP/1.1
headers: Host: docs.example.test | Cookie: session=teaching | Connection: keep-alive
stream=1 status=200 OK bytes=12
stream=2 status=404 Not Found bytes=7
HTTP/1.1 pipelining: response 1 completes before response 2 (head-of-line blocking)
HTTP/2 streams: 1 and 2 can interleave on one connection
HTTP/3 transport: QUIC over UDP; TLS 1.3 is built in
`,
          expect: '请求包含方法、目标、Host、Cookie 与 keep-alive；200 和 404 是不同应用结果；三种版本对连接与流的处理被清楚区分。',
          note: '已在 Git Bash 中用 Python 标准库实际执行；只处理内存中的字典和字节串，不启动服务器，不访问网络。',
        },
        {
          title: '用 curl 观察回环端口没有服务时的失败',
          command: 'curl --http1.1 -I --max-time 3 http://127.0.0.1:8080/catalog/demo',
          output: 'curl: (7) Failed to connect to 127.0.0.1 port 8080 after 0 ms: Connection refused',
          expect: '没有本机服务时应看到连接失败，而不是 HTTP 404；这说明请求尚未得到应用层响应。',
          note: 'Git Bash + curl 环境；只访问 127.0.0.1。未在当前任务执行，输出为常见失败形态，具体措辞与耗时随 curl 版本和系统变化。',
        },
      ],
      checkpoints: [
        '能用“请求—状态码—头部—正文”描述一次 HTTP 交互',
        '能区分连接失败、403、404 与 500，不把它们混为一谈',
        '能解释 Cookie 怎样在多次请求间携带状态',
        '能说明 HTTP/1.1 队头阻塞、HTTP/2 多路复用与 HTTP/3 基于 QUIC 的差异',
      ],
      safety: '不要在 URL、Cookie 或日志中泄露令牌与个人信息；对可能改变服务器状态的方法先确认语义、权限和幂等性。重试前要区分连接失败与服务器已处理但响应丢失的情况。',
    },
    boundaries: {
      blocks: ['用统一消息格式交换资源与表单数据', '用状态码表达处理结果类别', '通过头部与 Cookie 携带上下文和状态', '用连接复用与多路复用降低等待'],
      notBlocks: ['保证服务器内容真实或善意', '替代 TLS 提供传输加密与身份认证', '保证业务操作幂等', '替代 DNS、路由、防火墙与访问控制'],
    },
  },
  {
    id: 'network-tls',
    track: 'network',
    title: 'TLS：加密、证书与握手',
    english: 'TRANSPORT LAYER SECURITY / ENCRYPTION, CERTIFICATES AND HANDSHAKE',
    summary: 'TLS 在传输连接上提供机密性、完整性和服务端身份认证：握手用证书确认对方，用非对称机制协商共享秘密，再用对称密钥保护应用数据。',
    icon: 'lock',
    group: '应用与命名',
    dependencies: ['network-tcp'],
    dependents: [],
    philosophy: {
      problem: '应用数据经过多个网络设备，既可能被旁观者读取，也可能被篡改；客户端还需要确认自己连接的是预期服务器，而不是冒名顶替者。',
      rejects: 'TLS 不证明网站内容真实、善意或没有漏洞。证书只说明某个名称在某个信任体系中通过了身份校验，HTTPS 页面仍可能传播错误信息或实施诈骗。',
      counter: '把安全目标拆开：证书链与名称校验回答“你是谁”，握手回答“怎样得到共享密钥”，对称加密回答“怎样高效地保护后续数据”，三者缺一不可。',
    },
    design: {
      abstractions: [
        { name: 'TLS 会话与连接', role: '连接是一次实际传输的安全通道，会话保存可复用的协商参数与秘密；恢复会话可以减少后续握手工作，但必须考虑前向保密与重放风险。' },
        { name: '密码套件（cipher suite）', role: '一组算法约定，描述认证、密钥交换、加密与完整性保护等选择；TLS 1.3 的套件主要聚焦记录保护算法。' },
        { name: '证书链（certificate chain）', role: '从服务端证书开始，经中间证书到受信任根证书的签名关系；客户端逐级验证签名、有效期、用途与名称。' },
        { name: '服务器名称指示（SNI）', role: '客户端在握手中告诉服务器要访问的逻辑名称，使同一地址上的多个站点能选择正确证书；SNI 本身不是秘密。' },
        { name: '握手（handshake）', role: '双方交换能力、选择参数、认证身份并计算密钥的过程；TLS 1.3 通常用一次往返完成主要握手。' },
        { name: '会话密钥与记录保护', role: '握手生成对称密钥和方向性密钥；应用数据被拆成记录，用加密与完整性校验防止读取和篡改。' },
      ],
      principles: [
        '先认证，再信任应用数据：客户端必须验证证书链、有效期、名称与用途；任何一步失败都应中止，而不是静默忽略后继续发送敏感信息。',
        '非对称负责建立身份与共享秘密，对称负责大量数据：用证书和签名验证服务端，用密钥交换导出共享秘密，再用高效对称算法保护正文。',
        '安全失败要显式关闭：证书错误、握手消息不完整或 Finished 校验失败都表示通道不可信；重连或恢复会话不能绕过身份与密钥校验。',
      ],
      history: [
        { when: '1994—1995 年', what: 'Netscape 开发并部署 SSL', why: '为早期 Web 交易提供加密通道，随后暴露的问题推动协议重新设计。' },
        { when: '1999 年', what: 'IETF 发布 TLS 1.0', why: '把协议纳入开放标准体系，并逐步替换存在缺陷的旧版本与算法。' },
        { when: '2018 年', what: 'TLS 1.3 标准化', why: '简化握手、移除过时算法，并要求临时密钥交换以改善前向保密。' },
      ],
    },
    capabilities: [
      { name: '机密性', sentence: '让网络上的旁观者难以读取应用数据，即使他们能复制传输的数据包。' },
      { name: '完整性', sentence: '检测应用数据在传输过程中是否被修改，并将被篡改的记录交给错误处理。' },
      { name: '服务端身份认证', sentence: '通过证书链、有效期、名称与用途校验，确认连接的是预期服务端。' },
      { name: '安全参数协商', sentence: '在握手中选择双方支持的协议版本与算法，并生成用于后续记录保护的会话密钥。' },
    ],
    path: {
      intent: '在已经建立的 TCP 连接上完成 TLS 1.3 握手，展示 ClientHello、SNI、证书校验、密钥交换、Finished 和应用数据，并覆盖证书拒绝与握手失败分支。',
      environment: '教学模型以 docs.example.test 为目标，证书名称和密钥材料均为虚构。真实 HTTPS 还会涉及 DNS、TCP、证书信任库与服务器配置；本路径不访问任何真实地址。',
      steps: [
        { title: 'TCP 已连接，客户端发出问候', description: '客户端发送 ClientHello，其中包含支持的 TLS 版本、密码套件、随机数、密钥共享参数和 SNI。SNI 告诉服务器要访问 docs.example.test，便于服务器选择正确证书。', terms: [{ name: 'ClientHello', definition: 'TLS 握手的第一条主要消息，声明客户端支持的能力并携带开始密钥交换所需的信息。' }], state: 'TCP 已建立，TLS 尚未认证，不能发送应用数据。' },
        { title: '服务器选择参数并表明身份', description: '服务器回复 ServerHello，选择版本、套件和密钥共享参数，并发送证书链与签名。证书链把服务端证书连接到客户端信任的根；签名证明服务器持有对应私钥。', terms: [{ name: '证书链', definition: '服务端证书、若干中间证书和受信任根之间的签名关系，用于建立身份信任链。' }], state: '已收到服务器身份材料，但客户端尚未接受。' },
        { title: '客户端验证证书：失败即拒绝', description: '客户端检查签名链、有效期、证书用途以及证书名称是否覆盖 SNI 目标。名称不匹配、链不受信、证书过期或用途不符都会进入拒绝分支，并发送握手失败警报。', terms: [{ name: '主机名验证', definition: '确认证书中的名称与客户端原本要访问的名称一致，不能只检查签名链。' }], state: '成功：继续派生密钥；失败：中止握手，不发送应用数据。' },
        { title: '双方计算握手密钥', description: '客户端和服务器结合密钥交换参数与握手消息，使用非对称密钥交换建立共享秘密，再通过密钥推导函数生成握手密钥。TLS 1.3 的临时密钥交换有助于旧私钥泄露后仍保护过去的会话。', terms: [{ name: '密钥交换', definition: '双方在不直接传输最终共享密钥的情况下，各自计算出相同秘密的过程。' }], state: '共享秘密已建立，握手消息开始受到保护。' },
        { title: '验证 Finished 并完成握手', description: '服务器先发送受握手密钥保护的 Finished，客户端验证握手记录未被篡改后发送自己的 Finished。任何校验失败都表示协商被破坏，必须关闭连接而不是继续。', terms: [{ name: 'Finished', definition: '覆盖此前握手内容的校验消息，用于确认双方对同一握手过程达成一致且记录未被篡改。' }], state: '成功：握手完成；失败：进入拒绝或中断分支。' },
        { title: '用对称密钥保护应用数据', description: '双方使用协商出的对称密钥和方向性密钥保护 HTTP 等应用数据。每条记录带有完整性保护；接收方先验证再解密，发现篡改或解密失败就丢弃并报告错误。', terms: [{ name: '对称加密', definition: '加密与解密使用相同或紧密相关密钥的算法，适合高速保护大量数据。' }, { name: '记录（record）', definition: 'TLS 传输数据的基本单元，包含受保护内容与相应元数据。' }], state: '进入安全的应用数据状态。' },
        { title: '关闭连接或恢复会话', description: '正常结束可通过 close_notify 表达，随后关闭连接。会话恢复可减少后续握手，但 TLS 1.3 的 0-RTT 早期数据有重放风险，不能默认用于所有改变状态的操作；证书或信任变化仍可能要求完整握手。', terms: [{ name: '0-RTT', definition: '客户端基于先前会话秘密，在完整握手完成前就发送早期数据的机制；必须考虑重放与隐私边界。' }], state: '成功：连接有序关闭或恢复；异常：网络中断，按超时处理。' },
      ],
      stateTable: {
        columns: ['阶段或分支', 'TCP', '身份认证', '会话密钥', '允许应用数据'],
        rows: [
          ['初始', '已建立', '未开始', '无', '否'],
          ['ClientHello 已发送', '已建立', '未开始', '尚未派生', '否'],
          ['收到服务器证书', '已建立', '待验证', '尚未派生', '否'],
          ['证书名称不匹配', '已建立', '拒绝', '不使用', '否'],
          ['证书链不受信或过期', '已建立', '拒绝', '不使用', '否'],
          ['证书验证成功', '已建立', '服务端已认证', '正在派生', '否'],
          ['Finished 校验失败', '已建立', '协商被破坏', '不可信', '否'],
          ['握手完成', '已建立', '成功', '握手与应用密钥可用', '是'],
          ['应用数据传输', '已建立', '保持', '方向性对称密钥', '是，记录受保护'],
          ['close_notify', '有序关闭中', '保持到关闭', '不再发送新数据', '否'],
          ['网络突然中断', '断开', '无法继续', '按超时清理', '否'],
        ],
      },
      summary: 'TLS 先用证书与握手证明服务端身份并协商密钥，再用对称加密和完整性保护应用数据；任何身份或握手校验失败都必须关闭通道。',
    },
    costs: [
      { choice: '证书与信任链', cost: '提供可验证的服务端身份，但证书签发、续期、信任库和名称配置都会成为故障来源。', misread: '“浏览器显示 HTTPS，就说明网站内容一定真实。”' },
      { choice: '完整 TLS 握手', cost: '能建立新会话并验证身份，但增加往返与计算开销，移动网络和高延迟场景尤其明显。', misread: '“每次请求都必须从零开始完整握手。”' },
      { choice: '会话恢复与 0-RTT', cost: '降低后续连接延迟，但早期数据可能被重放，也会带来隐私与状态管理的新边界。', misread: '“0-RTT 数据可以无条件重放支付或删除操作。”' },
    ],
    example: {
      title: '离线模拟证书校验与密钥派生，再查看回环 TLS 握手',
      intent: '第一条命令用 Python 标准库模拟证书链、名称、有效期、握手密钥与拒绝分支；第二条用 OpenSSL 连接本机回环地址，不访问外网。',
      setup: 'Python 命令只使用 hashlib 与 hmac 生成确定性的教学标签，不实现真实 TLS 加密。OpenSSL 命令需要本机 127.0.0.1:8443 已运行测试 TLS 服务且证书受信任；当前任务不启动该服务，也不执行这条网络命令。',
      terms: [
        { name: 'HMAC', definition: '一种带密钥的消息认证码；本例只用它演示不同标签会派生不同方向密钥，不是 TLS 的真实密钥调度。' },
        { name: '信任库', definition: '客户端预先信任的根证书集合；链最终要连接到其中一个受信任根。' },
      ],
      diagram: {
        kind: 'flow',
        title: 'TLS 1.3 的三段职责',
        caption: '证书解决身份，密钥交换解决共享秘密，对称记录保护解决后续数据安全。',
        items: [
          { title: '① 问候与选择', detail: 'ClientHello 携带 SNI 与能力；服务器选择参数并返回证书链和密钥共享信息。', tag: '协商', tone: 'blue' },
          { title: '② 验证与派生', detail: '客户端验证链、有效期和名称，双方从密钥交换与握手记录派生密钥。', tag: '认证', tone: 'orange' },
          { title: '③ Finished 与数据', detail: 'Finished 确认握手一致性；应用数据随后用方向性对称密钥加密并认证。', tag: '保护', tone: 'green' },
        ],
        footnote: '证书验证失败必须在发送应用数据前关闭；HTTPS 不评价网站内容是否真实或善意。',
      },
      commands: [
        {
          title: '模拟证书链、主机名校验与握手密钥',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
$PY - <<'PY'
import hashlib
import hmac
import sys

sys.stdout.reconfigure(newline="\\n")
now = 1700000000
chain = [
    {"name": "docs.example.test", "issuer": "intermediate.example.test", "signed_by": "intermediate.example.test", "not_before": 1600000000, "not_after": 1900000000},
    {"name": "intermediate.example.test", "issuer": "root.example.test", "signed_by": "root.example.test", "not_before": 1600000000, "not_after": 1900000000},
    {"name": "root.example.test", "issuer": "root.example.test", "signed_by": "root.example.test", "not_before": 1600000000, "not_after": 1900000000},
]

def verify_chain(items):
    if not items or items[-1]["name"] != items[-1]["issuer"]:
        return False
    for child, issuer in zip(items, items[1:]):
        if child["issuer"] != issuer["name"] or child["signed_by"] != issuer["name"]:
            return False
    return all(cert["not_before"] <= now <= cert["not_after"] for cert in items)

hostname_ok = chain[0]["name"] == "docs.example.test"
validity_ok = all(cert["not_before"] <= now <= cert["not_after"] for cert in chain)
chain_ok = verify_chain(chain)
secret = b"teaching-demo-shared-secret"

def derive(label):
    return hmac.new(secret, label.encode("utf-8"), hashlib.sha256).hexdigest()[:16]

print("ClientHello: SNI=docs.example.test versions=TLS1.3 key_share=present")
print("certificate: " + " <- ".join(cert["name"] for cert in chain))
print(f"hostname={'OK' if hostname_ok else 'REJECT'} validity={'OK' if validity_ok else 'REJECT'} chain={'OK' if chain_ok else 'REJECT'}")
print("wrong name check: " + ("OK" if "other.example.test" == chain[0]["name"] else "REJECT"))
print("handshake keys: client=" + derive("client handshake") + " server=" + derive("server handshake"))
print("application state: encrypted and authenticated with symmetric keys")
PY`,
          output: `ClientHello: SNI=docs.example.test versions=TLS1.3 key_share=present
certificate: docs.example.test <- intermediate.example.test <- root.example.test
hostname=OK validity=OK chain=OK
wrong name check: REJECT
handshake keys: client=8a10697bd25b2b93 server=3883428639eec3dc
application state: encrypted and authenticated with symmetric keys
`,
          expect: '名称、有效期和证书链均通过时握手才能继续；错误名称进入 REJECT；两个方向得到不同的教学密钥。',
          note: '已在 Git Bash 中用 Python 标准库实际执行；证书与秘密均为虚构，HMAC 只用于确定性教学，不是可用的 TLS 实现。',
        },
        {
          title: '用 OpenSSL 查看回环地址的 TLS 握手摘要',
          command: 'openssl s_client -connect 127.0.0.1:8443 -servername docs.example.test -verify_hostname docs.example.test -verify_return_error -brief </dev/null',
          output: `CONNECTION ESTABLISHED
Protocol version: TLSv1.3
Ciphersuite: TLS_AES_256_GCM_SHA384
Peer certificate: CN = docs.example.test
Verification: OK
DONE`,
          expect: '在已配置且证书受信任的本机测试服务上，应看到 TLS 1.3、密码套件、证书名称与验证结果；连接被拒绝则说明 TCP 尚未建立。',
          note: 'Git Bash + OpenSSL 3 风格命令；只连接 127.0.0.1:8443。未在当前任务执行，输出为成功握手示意，实际内容取决于本机测试服务与信任库。',
        },
      ],
      checkpoints: [
        '能分别说出 TLS 的机密性、完整性与服务端身份认证',
        '能解释证书链、SNI、主机名校验和会话密钥各自解决什么问题',
        '能按 ClientHello、服务器证书、密钥派生、Finished、应用数据复述 TLS 1.3 握手',
        '知道证书或握手失败必须拒绝，并理解 HTTPS 不证明内容真实或善意',
      ],
      safety: '不要关闭证书验证来“先让连接成功”；证书名称、信任链、有效期和用途都应检查。生产系统还要管理私钥、证书续期、协议版本与算法策略，并谨慎评估 0-RTT 的重放风险。',
    },
    boundaries: {
      blocks: ['网络旁观者读取应用数据', '传输中的数据被静默篡改', '客户端误连冒名服务端', '明文发送敏感凭据'],
      notBlocks: ['网站内容真实或善意', '服务器主机已被入侵', '应用逻辑漏洞与越权', '恶意扩展、钓鱼页面或终端被控制'],
    },
  },
]
