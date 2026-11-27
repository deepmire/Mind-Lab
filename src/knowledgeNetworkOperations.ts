/**
 * 网络边界与排障课程：把地址转换、自动配置、抓包、分层排障与性能测量组织成可验证的操作路径。
 * 每个模块严格遵循“哲学—设计—能力—机制—成本—示例—边界”七章契约。
 */
import type { KnowledgeModule } from './knowledgeTypes'

/**
 * 导出网络边界与排障模块，顺序固定为 NAT/防火墙、DHCP、抓包、排障、性能。
 * dependents 统一留空，由全站聚合器依据 dependencies 重算。
 * 不变量：Python 命令仅使用标准库并模拟内存状态；真实网络命令均只读或仅探测文档保留地址。
 */
export const networkOperationsModules: KnowledgeModule[] = [
  {
    id: 'network-nat-firewall',
    track: 'network',
    title: 'NAT、端口映射与防火墙',
    english: 'NAT / PORT FORWARDING / STATEFUL FIREWALL',
    summary: 'NAT 改写地址或端口以解决地址共享与入口映射；防火墙按规则决定是否放行。二者常在同一台设备上工作，但回答的是不同问题。',
    icon: 'shield',
    group: '边界与排障',
    dependencies: ['network-ipv4-subnetting', 'network-routing'],
    dependents: [],
    philosophy: {
      problem: '家庭或小型办公室通常只有一个公网地址，却有多台设备同时上网；有时还要把外部的特定请求送到内网服务器。与此同时，不能把所有入口都无限制地开放。',
      rejects: 'NAT 不是防火墙。做了源地址转换，不代表自动获得安全；做了端口映射，也不代表映射一定成功。防火墙允许一个包，不代表另一个方向的新连接也自动被允许。',
      counter: '把网络边界拆成两个问题：地址转换决定“包上的源或目的地址变成什么”，访问控制决定“这个包能不能通过”。真实设备常把两者组合，但分析时必须分开。',
    },
    design: {
      abstractions: [
        { name: '私网地址', role: '只在局部网络内使用的地址，不能直接作为公网端点；多个私网可以重复使用同一段地址。' },
        { name: '源网络地址转换（SNAT）', role: '设备把离开某个方向的包的源地址或源端口改写，使回包能沿同一路径返回；家庭宽带上网常用它。' },
        { name: '目的网络地址转换（DNAT）', role: '设备把包的目的地址或目的端口改写到另一台主机；端口映射是 DNAT 的一种常见配置。' },
        { name: '连接跟踪（conntrack）', role: '记录一条连接的方向、地址端口与状态，帮助设备识别返回流量并实施有状态防火墙策略。' },
        { name: '默认拒绝', role: '没有命中明确允许规则的流量按拒绝处理；它是策略的兜底，不等于“所有规则都禁止”。' },
      ],
      principles: [
        '转换与授权正交：先判断包是否允许，再按策略决定是否以及如何转换；顺序可因设备实现而异，但不能把两者当成同一机制。',
        '有状态规则依赖方向：内部主动发起的连接可自动允许其返回流量，外部主动发起的新连接仍需独立入口规则。',
        '映射要同时满足两端：DNAT 改目的地址后，目标主机还必须有可达路由；防火墙放行后，服务还必须监听对应端口。',
        '默认拒绝但保留证据：策略末尾拒绝未匹配流量，并记录接口、方向、五元组与命中规则，避免用“全放行”掩盖排障。',
      ],
      history: [
        { when: '1994—1996 年', what: '私网地址范围被标准化为 RFC 1597、RFC 1918', why: '让不同机构复用地址，缓解 IPv4 公网地址不足。' },
        { when: '1990 年代中后期', what: 'NAT 在宽带路由器与企业中普及', why: '用少量公网地址连接大量私网设备，并提供稳定的内部寻址。' },
        { when: '2000 年代起', what: '有状态防火墙与连接跟踪成为常见边界', why: '用连接方向与状态简化规则，同时保留外部主动连接的拒绝能力。' },
      ],
    },
    capabilities: [
      { name: '共享出口', sentence: '用 SNAT 让多台私网设备共享一个或多个公网地址访问外部服务。' },
      { name: '发布入口', sentence: '用 DNAT 或端口映射把公网地址的特定端口送到指定内网主机与端口。' },
      { name: '识别返回流量', sentence: '借助连接跟踪把外部响应匹配回原连接，并执行反向地址转换。' },
      { name: '实施边界策略', sentence: '按接口、方向、地址、端口与连接状态允许或拒绝流量，并用日志解释命中结果。' },
    ],
    path: {
      intent: '让一台内网电脑访问外部服务，再把一个公网端口映射到内网服务器，最后观察未映射入口如何被默认拒绝。',
      environment: '使用一台支持 SNAT、DNAT 与有状态防火墙的边界路由器；192.168.1.0/24、198.51.100.0/24 与 203.0.113.0/24 均为文档保留地址。',
      steps: [
        { title: '内网主机发起外出连接', description: '192.168.1.20:51000 要访问 198.51.100.10:443。主机先检查自己的路由，把包交给默认网关；此时包的源仍是私网地址和临时端口。', terms: [{ name: '临时端口', definition: '客户端发起连接时由系统选择的本机端口，用来区分同时进行的多条连接。' }], state: '包处于 NEW 外出方向，源地址为私网地址。' },
        { title: '边界设备检查外出策略', description: '路由器按接口、方向与规则检查包。如果默认拒绝且没有匹配的允许规则，包会在这里被丢弃；允许后才进入地址转换阶段。', terms: [{ name: '有状态防火墙', definition: '除静态规则外，还结合连接跟踪状态判断流量是否属于已建立或相关连接的防火墙。' }], state: '允许则继续；拒绝则记录 DROP，连接跟踪不创建可用映射。' },
        { title: '创建连接跟踪并执行 SNAT', description: '设备为这条外出连接保存原始五元组，并把源改成 203.0.113.10:62000。之后同一连接通常复用该映射，避免每个包重新选择端口。', terms: [{ name: '五元组', definition: '由协议、源地址、源端口、目的地址、目的端口组成的连接标识。' }], state: 'conntrack 新增记录，外发包的源变为公网地址与端口。' },
        { title: '外部服务返回响应', description: '响应目的地址是 203.0.113.10:62000。边界设备按 conntrack 找到原始连接，把目的地址反向改回 192.168.1.20:51000，再路由回内网。', terms: [{ name: '反向转换', definition: '按连接跟踪把已经转换过的地址或端口恢复为原始值，使响应能回到发起方。' }], state: '响应匹配 ESTABLISHED 连接，回包送达原客户端。' },
        { title: '外部请求端口映射', description: '外部主机访问 203.0.113.10:8080。若存在 DNAT 规则，目的地址被改为 192.168.1.20:80；若目标服务正在监听且防火墙允许该新连接，请求才会到达应用。', terms: [{ name: '端口映射', definition: '把一个地址和端口组合映射到另一个地址和端口组合的规则，通常通过 DNAT 实现。' }], state: '命中映射则转换并新建连接；无映射、无监听或无允许规则都会失败。' },
        { title: '未登记的新入口被拒绝', description: '另一台外部主机访问 203.0.113.10:8081，但没有对应 DNAT，也没有明确放行规则。默认拒绝策略使包止步边界，不会自动转发到任意内网主机。', terms: [{ name: '拒绝分支', definition: '策略没有允许或前置条件不满足时，流量被丢弃、重置或返回错误的路径。' }], state: '无匹配映射，防火墙记录默认拒绝，内网收不到包。' },
      ],
      stateTable: {
        columns: ['场景', '入站方向', '转换动作', '连接状态', '防火墙结果', '最终去向'],
        rows: [
          ['内网主动上网', 'inside → outside', 'SNAT 私网源为公网源', 'NEW → ESTABLISHED', '允许外出及返回', '外部服务'],
          ['映射端口已配置', 'outside → inside', 'DNAT 到 192.168.1.20:80', 'NEW', '命中明确允许规则', '内网 Web 服务'],
          ['映射存在但服务未监听', 'outside → inside', 'DNAT 已完成', 'NEW 或失败', '可能允许', '目标主机拒绝或超时'],
          ['端口未映射', 'outside → inside', '无', '无有效连接', '默认拒绝', '丢弃'],
          ['属于已建立连接的回包', 'outside → inside', '按 conntrack 反向转换', 'ESTABLISHED', '按状态允许', '原客户端'],
          ['状态已过期', 'outside → inside', '可能无可用映射', 'INVALID 或 NEW', '按规则重新判断', '常被拒绝'],
          ['目标路由不可达', 'outside → inside', 'DNAT 已完成', 'NEW', '防火墙可能已允许', '路由失败，应用不可达'],
        ],
      },
      summary: 'NAT 负责地址端口的改写与回程映射，防火墙负责准入判断；一次成功访问通常还要路由、连接跟踪、目标监听与应用响应共同成立。',
    },
    costs: [
      { choice: '源地址转换', cost: '少量公网地址即可带多台设备上网，但外部无法直接主动连接内网，且排障时两端看到的地址不同。', misread: '“做了 SNAT，内网设备就自动安全了。”' },
      { choice: '端口映射', cost: '能把服务发布到外部，同时扩大暴露面；映射过多或过宽会绕过原本隐藏的内网边界。', misread: '“端口映射就是防火墙放行，两者是一回事。”' },
      { choice: '默认拒绝', cost: '安全性更高，但新服务、返回路径或动态端口容易因缺少规则失败，需要日志与变更记录支持。', misread: '“拒绝越多越好，不需要检查返回流量和路由。”' },
    ],
    example: {
      title: '模拟 SNAT、DNAT 与默认拒绝，再查看防火墙规则',
      intent: '用内存中的连接跟踪展示地址转换和访问控制的分工，不修改真实路由器或防火墙。',
      setup: 'Python 命令只需标准库，可在 Git Bash 中运行；nft 命令面向已安装 nftables 的 Linux，只读规则且可能需要管理员权限。',
      terms: [
        { name: 'nftables', definition: 'Linux 内核防火墙框架，可用 nft 命令查看或修改规则；本示例只执行 list，不执行 add、insert 或 flush。' },
        { name: 'ESTABLISHED', definition: '连接跟踪中的已建立状态，常用于允许已许可连接的后续报文和返回报文。' },
        { name: '文档保留地址', definition: '专门用于示例和文档、不应在公网路由的地址段，例如 192.0.2.0/24、198.51.100.0/24、203.0.113.0/24。' },
      ],
      diagram: {
        kind: 'flow',
        title: '一条外出连接与一条外部新连接',
        caption: '外出连接由 SNAT 建立映射，回包按 conntrack 恢复；外部新连接必须命中 DNAT 和允许规则。',
        items: [
          { title: '① 内网外出', detail: '192.168.1.20:51000 被允许后，源地址转换为 203.0.113.10:62000。', tag: 'SNAT', tone: 'blue' },
          { title: '② 返回内网', detail: '外部响应按连接跟踪恢复为原始目的地址与端口。', tag: '回程', tone: 'green' },
          { title: '③ 外部入口', detail: '8080 命中 DNAT 且服务监听；8081 无映射，按默认拒绝丢弃。', tag: 'DNAT + 策略', tone: 'orange' },
        ],
        footnote: '地址转换成功不等于应用可用；还要检查路由、防火墙、目标监听和服务状态。',
      },
      commands: [
        {
          title: '用 Python 模拟连接跟踪、SNAT、DNAT 与默认拒绝',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" - <<'PY'
import sys
sys.stdout.reconfigure(newline='\\n')
conntrack = {}
next_port = 62000

def outgoing(src, sport, dst, dport):
    global next_port
    key = (src, sport, dst, dport)
    if key not in conntrack:
        conntrack[key] = ('203.0.113.10', next_port)
        next_port += 1
    public_ip, public_port = conntrack[key]
    print(f'SNAT {src}:{sport} -> {public_ip}:{public_port}')
    return key

def returning(key):
    src, sport, dst, dport = key
    public_ip, public_port = conntrack[key]
    print(f'RETURN {dst}:{dport} -> {src}:{sport}')

key = outgoing('192.168.1.20', 51000, '198.51.100.10', 443)
returning(key)
print('DNAT 203.0.113.10:8080 -> 192.168.1.20:80')
print('NEW 198.51.100.30:40000 -> 192.168.1.20:80 ALLOW')
print('DROP 198.51.100.30:40001 -> 192.168.1.20:81 DROP default-deny')
print('NAT=translation FIREWALL=policy')
PY`,
          output: 'SNAT 192.168.1.20:51000 -> 203.0.113.10:62000\nRETURN 198.51.100.10:443 -> 192.168.1.20:51000\nDNAT 203.0.113.10:8080 -> 192.168.1.20:80\nNEW 198.51.100.30:40000 -> 192.168.1.20:80 ALLOW\nDROP 198.51.100.30:40001 -> 192.168.1.20:81 DROP default-deny\nNAT=translation FIREWALL=policy\n',
          expect: '外出连接的源地址被改写，响应恢复原目的地址；8080 被映射并允许，8081 因无映射和允许规则被拒绝。',
          note: '已在 Git Bash 中用 Python 标准库实际执行；只操作内存字典，没有访问网络或修改防火墙。',
        },
        {
          title: '只读查看 Linux 防火墙与 NAT 规则',
          command: 'sudo nft list ruleset',
          output: `table inet filter {
  chain input {
    type filter hook input priority filter; policy drop;
  }
  chain forward {
    type filter hook forward priority filter; policy drop;
    ct state established,related accept
    ip daddr 192.168.1.20 tcp dport 80 accept
  }
}
table ip nat {
  chain postrouting {
    type nat hook postrouting priority srcnat; policy accept;
    oifname "eth0" masquerade
  }
  chain prerouting {
    type nat hook prerouting priority dstnat; policy accept;
    iifname "eth0" tcp dport 8080 dnat to 192.168.1.20:80
  }
}`,
          expect: 'forward 链默认拒绝，只放行已建立连接和内网 80 端口；postrouting 做出站 masquerade，prerouting 把 8080 转到内网 80。',
          note: 'Linux 专用，输出为固定示意，未在本机执行；nft list ruleset 只读，但读取完整规则通常需要管理员权限。不要用 add、insert、flush 等写命令做“试验”。',
        },
      ],
      checkpoints: ['能分别说明 SNAT 与 DNAT 改写的方向', '知道 NAT 与防火墙是不同机制', '能解释为什么外部响应可回而外部新连接仍可能被拒绝', '知道端口映射成功还要目标路由、监听与应用同时成立'],
      safety: '不要在真实边界设备上批量尝试规则；先导出只读规则与连接跟踪，确认方向、接口、地址范围和回程路径，再在变更窗口内实施。',
    },
    boundaries: {
      blocks: ['多台私网设备共享公网地址上网', '把特定公网端口映射到内网服务', '按连接状态允许返回流量', '用默认拒绝缩小外部暴露面'],
      notBlocks: ['替代应用层认证与授权', '自动修复错误路由或服务未监听', '防止所有拒绝服务攻击', '让映射端口天然等于防火墙放行'],
    },
  },
  {
    id: 'network-dhcp',
    track: 'network',
    title: 'DHCP：自动获得网络配置',
    english: 'DHCP / DORA / LEASE / RELAY',
    summary: 'DHCP 让设备自动获得地址、子网掩码、默认网关与 DNS 等配置；租约使地址可被回收、续租和重新分配。',
    icon: 'target',
    group: '边界与排障',
    dependencies: ['network-udp', 'network-ipv4-subnetting'],
    dependents: [],
    philosophy: {
      problem: '如果每台设备都由人工填写地址、掩码、网关和 DNS，移动设备与大型网络会频繁冲突，配置也难以统一。自动配置还必须处理地址耗尽、重复地址和租约到期。',
      rejects: '“网卡插上就能上网”不是 DHCP 保证的事情。DHCP 只提供配置，不代表网关、DNS 或目标服务可用；169.254 开头的地址也不是正常上网的证明。',
      counter: '把自动配置看成一次有状态的协商：客户端提出需求，服务器提供租约，客户端选择并确认，之后在租约到期前续租；任何一步失败都会回到可观察的状态。',
    },
    design: {
      abstractions: [
        { name: 'DHCP 客户端与服务器', role: '客户端请求网络配置，服务器从地址池中选择租约并返回选项；服务器可以是路由器，也可以是独立服务。' },
        { name: 'DORA', role: 'Discover、Offer、Request、Acknowledge 四个阶段的缩写，描述客户端从发现服务器到确认租约的主流程。' },
        { name: '租约（lease）', role: '服务器允许客户端使用某地址的一段有限时间，包含地址、期限和续租时间点。' },
        { name: 'DHCP 中继（relay）', role: '把不同子网客户端的广播请求转发给指定 DHCP 服务器，使一个服务器能够服务多个网段。' },
        { name: '配置选项', role: '租约中除地址外的数据，例如子网掩码、默认网关、DNS 服务器和租约期限。' },
      ],
      principles: [
        '先获得地址，再验证连通：DHCP 成功只说明客户端接受了租约，后续还要检查默认路由、DNS、链路与应用。',
        '租约是有时间的状态：续租、重绑定、到期和服务器 NAK 都会改变客户端能否继续使用该地址。',
        '广播需要边界配合：同一广播域内客户端可直接发现服务器；跨子网时依赖中继，而不是路由器默认替它转发所有广播。',
        '服务器选择要避免冲突：多个 Offer 不意味着故障，客户端会选择一个并 Request；重复地址检测失败时应拒绝该租约。',
      ],
      history: [
        { when: '1985 年', what: 'BOOTP 协议标准化', why: '让无盘设备通过网络从服务器获得启动地址与配置。' },
        { when: '1993 年', what: 'DHCP 在 BOOTP 基础上提出', why: '加入动态地址租约、自动续租与更灵活的配置选项。' },
        { when: '1997 年起', what: 'RFC 2131 等文档完善 DHCP 与中继机制', why: '明确 DORA、租约状态与跨子网服务方式，推动大规模部署。' },
      ],
    },
    capabilities: [
      { name: '自动分配地址', sentence: '从服务器地址池取得可用地址，减少手工配置与地址冲突。' },
      { name: '下发基础配置', sentence: '同时获得掩码、默认网关、DNS 与租约期限等选项。' },
      { name: '续租与回收', sentence: '在租约到期前续租，释放或过期后允许服务器把地址重新分配。' },
      { name: '跨网段服务', sentence: '通过 DHCP 中继让多个子网共享集中式地址与策略管理。' },
    ],
    path: {
      intent: '观察一台新设备从无地址到绑定租约，再经历续租、NAK 与重复地址拒绝的完整状态变化。',
      environment: '客户端、DHCP 服务器与中继均使用 UDP；地址 192.168.1.0/24 与文档保留地址仅作教学示意。',
      steps: [
        { title: '客户端进入无租约状态', description: '设备没有有效租约时先进入初始化状态。它还不知道服务器地址，只能从 0.0.0.0 向广播地址发送 DHCP Discover。', terms: [{ name: '0.0.0.0', definition: '表示“尚未确定本机地址”的特殊地址，不是可路由的普通主机地址。' }], state: 'INIT，无有效租约。' },
        { title: 'Discover 到达服务器', description: '同一广播域内的服务器直接收到请求；跨子网时由中继把请求转发给服务器，并记录客户端所在网段，以便选择正确地址池。', terms: [{ name: 'DHCP 中继', definition: '代客户端跨子网转发 DHCP 报文的服务，常配置在路由器或三层交换机上。' }], state: '一个或多个服务器收到发现请求。' },
        { title: '服务器返回 Offer', description: '服务器从合适地址池选一个候选地址，附上掩码、网关、DNS 与租约期限。此时只是提议，客户端尚未最终使用该地址。', terms: [{ name: 'Offer', definition: '服务器提供的候选租约；多个服务器可能给出不同候选，客户端需要选择。' }], state: 'SELECTING，收到一个或多个候选。' },
        { title: '客户端发送 Request', description: '客户端选择其中一个 Offer，并广播 Request 告知所有服务器自己的选择。未被选中的服务器可以收回候选，避免地址被无意义占用。', terms: [{ name: 'Request', definition: '客户端对所选租约的确认请求，也可用于续租或重新确认现有租约。' }], state: 'REQUESTING，等待所选服务器确认。' },
        { title: 'ACK 提交租约', description: '服务器发送 Acknowledge 后，客户端才把地址、掩码、网关与 DNS 安装到网络配置中。若收到 NAK，则放弃该地址并回到初始化状态。', terms: [{ name: 'ACK 与 NAK', definition: 'ACK 表示服务器确认租约；NAK 表示拒绝客户端当前请求或现有租约。' }], state: '成功进入 BOUND；被拒绝则回到 INIT。' },
        { title: '安装配置并检测重复地址', description: '客户端在正式使用前可用地址解析协议检查地址是否已被占用。如果检测到冲突，应发送 Decline 拒绝该租约，而不是继续使用。', terms: [{ name: '地址冲突检测', definition: '客户端在使用新地址前确认没有其他设备占用同一地址的过程。' }], state: '无冲突则 BOUND；冲突则 DECLINE，租约无效。' },
        { title: '到达续租时间点', description: '通常到租约约一半时进入 RENEWING，向原服务器续租；若失败可在后续重绑定时联系其他服务器。租约完全过期仍未获确认，就不能继续依赖该地址。', terms: [{ name: 'T1 与 T2', definition: '两个续租时间点：T1 开始向原服务器续租，T2 改为重绑定，尝试联系其他服务器。' }], state: 'BOUND → RENEWING → REBINDING → BOUND，或到期回到 INIT。' },
      ],
      stateTable: {
        columns: ['事件', '客户端状态', '有效租约', '主要报文', '失败或拒绝分支'],
        rows: [
          ['启动且无租约', 'INIT', '无', 'Discover', '持续重试，仍无地址'],
          ['收到服务器候选', 'SELECTING', '尚未绑定', 'Offer', '候选超时则重新 Discover'],
          ['选定候选', 'REQUESTING', '待确认', 'Request', '未收到 ACK 则重试或重新选择'],
          ['服务器确认', 'BOUND', '有', 'ACK', '配置安装后仍需验证 DNS 与路由'],
          ['服务器拒绝', 'INIT', '无', 'NAK', '放弃地址，重新 Discover'],
          ['检测到地址冲突', 'DECLINE', '拒绝该租约', 'Decline', '重新申请其他地址'],
          ['到达 T1', 'RENEWING', '原租约仍可能可用', 'Request 单播给原服务器', '失败则等待 T2'],
          ['到达 T2', 'REBINDING', '租约将到期', 'Request 广播给其他服务器', '无 ACK 则到期失效'],
          ['租约过期', 'INIT', '无', 'Discover', '停止使用该地址配置'],
        ],
      },
      summary: 'DHCP 的核心不是“自动填 IP”，而是 Discover、Offer、Request、ACK 与租约状态机；只有 ACK 后的配置才进入使用阶段。',
    },
    costs: [
      { choice: '动态地址池', cost: '地址利用率高，但设备重启后地址可能变化，依赖固定地址的服务需要保留或使用静态租约。', misread: '“DHCP 地址永远不变，适合所有服务器。”' },
      { choice: '集中式 DHCP 服务器', cost: '便于统一策略与审计，但服务器或中继故障会影响多个网段，需要冗余与监控。', misread: '“客户端拿不到地址，一定是客户端网卡坏了。”' },
      { choice: '自动续租', cost: '减少人工维护，但错误的租约期限、时钟或服务器策略会导致续租失败和突然断网。', misread: '“昨天能上网，今天地址过期也一定会自动恢复。”' },
    ],
    example: {
      title: '模拟 DORA 与续租状态机，再查看本机 DHCP 配置',
      intent: '先观察租约状态如何变化，再认识系统实际保存的 DHCP 结果；示例不请求或修改真实租约。',
      setup: 'Python 命令可在 Git Bash 中运行；ipconfig /all 是 Windows 只读命令，本示例未执行，输出为固定示意。',
      terms: [
        { name: 'DHCP Enabled', definition: 'Windows 配置中表示该接口是否启用 DHCP 的字段，不代表当前一定持有有效租约。' },
        { name: '默认网关', definition: '客户端访问非本地网段时优先交给的下一跳地址。' },
        { name: '自动配置地址 169.254.x.x', definition: '系统在无法通过 DHCP 获得地址时可能自行使用的链路本地地址，只能进行有限的本地通信，不等于正常上网。' },
      ],
      diagram: {
        kind: 'flow',
        title: 'DORA 与租约时间线',
        caption: 'ACK 后才绑定租约；T1 续租、T2 重绑定，NAK 或到期都会使租约失效。',
        items: [
          { title: '① Discover → Offer', detail: '客户端广播寻找服务器，服务器提供候选地址与选项。', tag: '发现与提议', tone: 'blue' },
          { title: '② Request → ACK', detail: '客户端选择候选，服务器确认后客户端才安装配置。', tag: '确认租约', tone: 'green' },
          { title: '③ T1 / T2', detail: '租约到期前先联系原服务器，再尝试重绑定；失败则最终回到无租约状态。', tag: '时间状态', tone: 'orange' },
        ],
        footnote: '拿到地址只完成一层；DNS、默认网关、链路质量与应用服务仍需分别验证。',
      },
      commands: [
        {
          title: '用 Python 模拟 DORA、续租与 NAK 拒绝',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" - <<'PY'
import sys
sys.stdout.reconfigure(newline='\\n')
state = 'INIT'
lease = None

def event(message, new_state, new_lease):
    global state, lease
    state = new_state
    lease = new_lease
    lease_text = 'none' if lease is None else str(lease) + 's'
    print(f'{message} state={state} lease={lease_text}')

event('DISCOVER', 'DISCOVERING', None)
event('OFFER proposed=192.168.1.50/24', 'SELECTING', None)
event('REQUEST selected=192.168.1.50', 'REQUESTING', None)
event('ACK', 'BOUND', 3600)
event('T1 RENEW', 'RENEWING', 3600)
event('ACK', 'BOUND', 3600)
event('NAK', 'INIT', None)
PY`,
          output: 'DISCOVER state=DISCOVERING lease=none\nOFFER proposed=192.168.1.50/24 state=SELECTING lease=none\nREQUEST selected=192.168.1.50 state=REQUESTING lease=none\nACK state=BOUND lease=3600s\nT1 RENEW state=RENEWING lease=3600s\nACK state=BOUND lease=3600s\nNAK state=INIT lease=none\n',
          expect: '只有 ACK 后状态才是 BOUND 且租约有效；续租期间保留租约，NAK 后租约被清空。',
          note: '已在 Git Bash 中用 Python 标准库实际执行；只模拟内存状态，没有发送 DHCP 报文。',
        },
        {
          title: '只读查看 Windows 接口的 DHCP 与地址配置',
          command: 'ipconfig /all',
          output: `Windows IP Configuration

   Host Name . . . . . . . . . . . . : lab-client
   Primary Dns Suffix  . . . . . . . :
   Node Type . . . . . . . . . . . . : Hybrid
   IP Routing Enabled. . . . . . . . : No

Ethernet adapter Ethernet:

   Connection-specific DNS Suffix  . : lab.example
   Description . . . . . . . . . . . : Virtual Ethernet Adapter
   Physical Address. . . . . . . . . : 02-00-5E-10-00-01
   DHCP Enabled. . . . . . . . . . . : Yes
   Autoconfiguration Enabled . . . . : Yes
   IPv4 Address. . . . . . . . . . . : 192.168.1.50(Preferred)
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1
   DHCP Server . . . . . . . . . . . : 192.168.1.1
   DNS Servers . . . . . . . . . . . : 192.168.1.1
   Lease Obtained. . . . . . . . . . : Monday, November 2, 2026 09:00:00
   Lease Expires . . . . . . . . . . : Monday, November 2, 2026 10:00:00`,
          expect: '接口启用了 DHCP，并有地址、掩码、默认网关、DNS、服务器和租约起止时间；若地址是 169.254.x.x，应继续检查 DHCP 失败原因。',
          note: 'Windows 专用；输出为固定示意，未在本机执行。该命令只读取配置，不续租、不释放地址，也不访问外网。',
        },
      ],
      checkpoints: ['能按顺序说出 DORA 四个阶段', '知道 ACK 前候选地址尚未正式绑定', '理解 T1 续租、T2 重绑定与租约到期', '知道 169.254 地址不等于正常上网'],
      safety: '不要在共享网络上随意运行 dhclient、ipconfig /release 或 /renew；这些操作可能中断现有连接，应在授权维护窗口内进行。',
    },
    boundaries: {
      blocks: ['手工录入地址、掩码、网关与 DNS', '地址冲突与配置漂移', '集中维护地址池和租约', '通过中继服务多个子网'],
      notBlocks: ['保证 DNS 解析成功', '替代默认路由与应用健康检查', '让 169.254 地址自动变成正常上网地址', '防止恶意 DHCP 服务器或中继配置错误'],
    },
  },
  {
    id: 'network-packet-capture',
    track: 'network',
    title: '抓包与协议解码',
    english: 'PACKET CAPTURE / PROMISCUOUS MODE / BPF / TLS',
    summary: '抓包把流经抓包点的报文复制出来，供工具按协议解码；能看到什么首先取决于抓包点，其次才取决于过滤器和解码能力。',
    icon: 'terminal',
    group: '边界与排障',
    dependencies: ['network-layering', 'network-tcp'],
    dependents: [],
    philosophy: {
      problem: '网络故障发生在多个设备和协议层之间，只看应用日志常缺少证据。抓包可以展示报文何时、从哪来、到哪去，以及各层字段如何变化。',
      rejects: '抓包不是“把网卡变成万能镜子”。在交换网络中，默认只能看到发给本机、广播或特定镜像的流量；开启混杂模式也不会自动看到所有跨交换机流量。',
      counter: '抓包分析应先问“我在哪里看”，再问“我看到了什么”。抓包点决定可见范围，过滤器只减少展示量，TLS 加密则使应用内容对抓包者不可读。',
    },
    design: {
      abstractions: [
        { name: '抓包点', role: '报文被复制观察的位置，例如客户端网卡、虚拟机交换机、容器接口或服务器镜像端口；它决定初始可见范围。' },
        { name: '混杂模式', role: '让网卡接收同一链路上并非发给本机 MAC 的报文；它不能穿越交换机或路由器的隔离边界。' },
        { name: 'BPF 过滤器', role: '在内核复制报文阶段按表达式筛选，减少用户态负担和存储量；常见写法包括 tcp port 443、host 与 net。' },
        { name: '协议解码', role: '根据以太网、IP、TCP 或应用协议字段解释报文；解码正确不等于字段语义一定正常。' },
        { name: 'TLS 元数据', role: '加密连接中仍可见的地址、端口、握手类型、长度与时间等信息；HTTP 路径、请求体和响应内容通常不可见。' },
      ],
      principles: [
        '先选点再选过滤器：抓包点不对，再复杂的过滤表达式也看不到不存在的报文；应同时比较客户端与服务器两端。',
        '过滤器降低噪声但不改变事实：BPF 在内核尽早丢弃不匹配报文，展示过滤器只改变显示，二者不能替代抓包点选择。',
        '时间与方向同样重要：记录接口、方向、时间同步和包序号，才能区分重传、乱序与单纯显示顺序。',
        '加密只暴露元数据：没有会话密钥时，TLS 抓包通常只能看到握手记录与密文长度，不能据此断言 HTTP 内容。',
      ],
      history: [
        { when: '1988 年', what: 'tcpdump 由 Van Jacobson 等人开发', why: '为 TCP/IP 网络分析提供命令行抓包与报文解码能力。' },
        { when: '1990 年代', what: 'libpcap 与 BPF 过滤机制逐步成熟', why: '把抓包和内核过滤抽象为可复用接口，减少用户态处理负担。' },
        { when: '1998 年起', what: '图形化协议分析工具发展为 Wireshark', why: '让协议字段、会话流与专家信息更易阅读和协作。' },
      ],
    },
    capabilities: [
      { name: '选择观察位置', sentence: '按故障范围选择客户端、服务端、网桥或镜像端口，明确可见流量边界。' },
      { name: '过滤报文', sentence: '用 BPF 按地址、端口、协议与方向减少噪声，保存关键证据。' },
      { name: '分层解码', sentence: '从链路层到传输层和应用层检查字段、标志、序号与握手过程。' },
      { name: '识别加密盲区', sentence: '区分可见元数据与不可见内容，避免从 TLS 密文臆测 HTTP 请求。' },
    ],
    path: {
      intent: '定位一次 HTTPS 请求为什么失败：先选抓包点，再开启可选混杂模式、设置 BPF，观察握手与元数据并处理失败分支。',
      environment: 'Linux 抓包主机使用 tcpdump；示例流量限定在回环接口，目标端口 443，不连接外网。',
      steps: [
        { title: '把症状写成可观察问题', description: '不要只写“网页打不开”，而应明确要判断 DNS、TCP 三次握手、TLS 握手还是 HTTP 响应哪一步缺失，并记录客户端、服务器、端口与时间。', terms: [{ name: '可观察问题', definition: '能用报文、状态码或日志直接回答的问题，例如是否收到 TCP SYN-ACK。' }], state: '问题与预期报文已定义。' },
        { title: '选择抓包点', description: '先抓客户端出站接口可判断本机是否发出请求；抓服务器入站可判断包是否到达。两端都抓才能区分“没发出”“中途丢失”和“到了但没响应”。', terms: [{ name: '镜像端口', definition: '交换机把指定端口流量复制到观察端口的配置，常用于不干扰原链路地抓包。' }], state: '抓包点确定，可见范围已知。' },
        { title: '确认权限与接口', description: '抓包需要读取网络报文的能力，很多系统要求管理员权限或专用 capability。权限不足时工具可能根本打不开接口，这不是“网络没有流量”。', terms: [{ name: '网络管理权限', definition: '允许配置混杂模式、读取原始报文或访问网络设备的系统权限。' }], state: '接口可打开；权限失败则停止并修正环境。' },
        { title: '按需启用混杂模式', description: '在共享链路或需要观察同网段其他主机时，混杂模式可能扩大可见范围；在现代交换网络中，仍可能需要端口镜像，且会带来隐私与性能开销。', terms: [{ name: 'MAC 地址', definition: '链路层用于区分接口的地址；网卡默认主要接收发给本机、广播或组播的帧。' }], state: '可见帧范围扩大，但不跨越交换隔离。' },
        { title: '用 BPF 尽早过滤', description: '表达式 tcp port 443 只保留源或目的端口为 443 的 TCP 报文。过滤在内核阶段执行，可减少磁盘占用；但表达式写错也会把关键报文过滤掉。', terms: [{ name: 'BPF', definition: '伯克利数据包过滤器，可在内核中按小型表达式程序判断报文是否保留。' }], state: '仅匹配报文进入抓包缓冲。' },
        { title: '复现并观察握手与元数据', description: '在另一终端复现请求。若 TCP 握手成功而 TLS 握手失败，应检查证书、协议版本或加密参数；若 TLS 已建立，抓包通常仍看不到 HTTP 路径与正文。', terms: [{ name: 'TLS 握手', definition: '客户端与服务器协商加密参数并建立安全通道的过程，发生在传输层连接之上。' }], state: '得到 SYN、SYN-ACK、ACK 与 TLS 记录等元数据证据。' },
        { title: '处理丢包、截断与停止', description: '内核缓冲溢出会出现 dropped 计数，工具显示过大的包可能被截断；时间不同步也会造成两端无法对齐。保存原始文件、接口、过滤器与计数后再停止。', terms: [{ name: '抓包丢弃计数', definition: '因缓冲或处理能力不足而未能捕获的报文数量，不等于网络链路本身丢包。' }], state: '形成可复核证据；若 dropped 过多则需缩短范围或调整缓冲。' },
      ],
      stateTable: {
        columns: ['阶段', '抓包点', '混杂模式', 'BPF 结果', '可见内容', '失败分支'],
        rows: [
          ['准备', '未确定', '关闭', '未设置', '无', '问题模糊，无法判断'],
          ['客户端接口', '客户端网卡', '按需', 'tcp port 443', '本机收发与回环流量', '接口或权限错误'],
          ['服务器接口', '服务器镜像口', '通常关闭', 'tcp port 443', '到达服务器的包', '无包可能是路由、ACL 或镜像缺失'],
          ['TCP 握手', '任一端点', '任意', '匹配', 'SYN、SYN-ACK、ACK', '缺包需对齐两端'],
          ['TLS 握手', '任一端点', '任意', '匹配', '握手记录、长度、时间', '内容加密，不能直接看 HTTP'],
          ['不匹配报文', '已选接口', '任意', '丢弃', '不可见', '过滤器过窄'],
          ['缓冲溢出', '已选接口', '任意', '匹配', '部分报文', 'dropped 增加，证据不完整'],
          ['停止保存', '已选接口', '恢复', '不再接收', 'pcap 文件', '未记录过滤器则难以复核'],
        ],
      },
      summary: '抓包结论的可信度由抓包点、权限、过滤范围、时间对齐和完整性共同决定；TLS 下元数据可见并不等于应用内容可见。',
    },
    costs: [
      { choice: '多接口广泛抓包', cost: '覆盖范围大，但产生海量数据、占用 CPU 与磁盘，并可能捕获敏感信息。', misread: '“抓得越多越好，不需要限定接口和时间。”' },
      { choice: '启用混杂模式', cost: '可能看到同链路更多帧，但增加隐私风险，也不能突破交换机端口隔离。', misread: '“打开混杂模式就能看到整个公司的流量。”' },
      { choice: '在内核使用 BPF', cost: '显著减少噪声与存储，但表达式错误会静默丢掉关键包，需要与原始文件一起记录。', misread: '“过滤器只是显示效果，不会影响证据完整性。”' },
    ],
    example: {
      title: '模拟 BPF 过滤与 TLS 元数据解码，再用 tcpdump 观察回环流量',
      intent: '先理解过滤后哪些字段可见，再观察真实只读抓包命令的边界；不采集外网或敏感流量。',
      setup: 'Python 命令可在 Git Bash 中运行；tcpdump 命令面向 Linux，未在本机执行。它只读回环接口，通常需要管理员权限。',
      terms: [
        { name: '回环接口（lo）', definition: '本机内部网络栈使用的虚拟接口，适合在不访问外部网络的情况下观察本地连接。' },
        { name: 'pcap', definition: '常见的抓包文件格式，保存报文与时间戳，供后续离线分析。' },
        { name: '记录层', definition: 'TLS 传输数据的基本单位，抓包可看到类型和长度，但密文内容通常不可解码。' },
      ],
      diagram: {
        kind: 'flow',
        title: '抓包点决定入口，BPF 决定保留，TLS 决定内容',
        caption: '报文先到达抓包点，再经过 BPF；即使保留下来，TLS 应用层内容仍可能不可见。',
        items: [
          { title: '① 抓包点', detail: '客户端网卡、回环接口和服务器镜像口看到的流量范围不同。', tag: '可见范围', tone: 'blue' },
          { title: '② BPF', detail: 'tcp port 443 在内核丢弃不匹配报文，只把目标流量交给用户态。', tag: '减少噪声', tone: 'orange' },
          { title: '③ TLS 元数据', detail: '地址、端口、握手类型与长度可见；HTTP 路径、正文和响应内容通常加密。', tag: '加密盲区', tone: 'green' },
        ],
        footnote: '两端同时抓包并比较时间，才能区分本机未发送、链路丢失与对端未响应。',
      },
      commands: [
        {
          title: '用 Python 模拟 BPF 过滤和 TLS 元数据解码',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" - <<'PY'
import sys
sys.stdout.reconfigure(newline='\\n')
frames = [
    {'src': '127.0.0.1', 'sport': 51000, 'dst': '127.0.0.1', 'dport': 443, 'tls': 'ClientHello'},
    {'src': '127.0.0.1', 'sport': 51001, 'dst': '127.0.0.1', 'dport': 53, 'tls': 'none'},
    {'src': '127.0.0.1', 'sport': 51000, 'dst': '127.0.0.1', 'dport': 443, 'tls': 'ApplicationData'},
]
kept = []
for index, frame in enumerate(frames, 1):
    if frame['dport'] != 443 and frame['sport'] != 443:
        print(f"frame={index} action=DROP bpf=tcp port 443")
        continue
    kept.append(frame)
    payload = 'encrypted' if frame['tls'] == 'ApplicationData' else 'metadata'
    print(f"frame={index} action=KEEP ip={frame['src']} tcp={frame['dport']} tls={frame['tls']} payload={payload}")
print(f'captured={len(frames)} filtered={len(frames) - len(kept)} visible={len(kept)}')
print('note=TLS application payloads are encrypted')
PY`,
          output: 'frame=1 action=KEEP ip=127.0.0.1 tcp=443 tls=ClientHello payload=metadata\nframe=2 action=DROP bpf=tcp port 443\nframe=3 action=KEEP ip=127.0.0.1 tcp=443 tls=ApplicationData payload=encrypted\ncaptured=3 filtered=1 visible=2\nnote=TLS application payloads are encrypted\n',
          expect: '53 端口报文被 BPF 丢弃；两个 443 报文保留，ClientHello 作为元数据可观察，ApplicationData 的应用内容仍被加密。',
          note: '已在 Git Bash 中用 Python 标准库实际执行；只遍历内存列表，没有打开真实网卡。',
        },
        {
          title: '只读抓取回环接口上的 TLS 元数据',
          command: "sudo timeout 5s tcpdump -i lo -nn -c 4 'tcp port 443'",
          output: `12:00:00.000001 IP 127.0.0.1.51000 > 127.0.0.1.443: Flags [S], seq 1000, win 65495, options [mss 65495,sackOK,TS val 1 ecr 0,nop,wscale 7], length 0
12:00:00.000002 IP 127.0.0.1.443 > 127.0.0.1.51000: Flags [S.], seq 2000, ack 1001, win 65495, options [mss 65495,sackOK,TS val 1 ecr 1,nop,wscale 7], length 0
12:00:00.000003 IP 127.0.0.1.51000 > 127.0.0.1.443: Flags [.], ack 2001, win 65495, options [nop,nop,TS val 1 ecr 1], length 0
12:00:00.000010 IP 127.0.0.1.51000 > 127.0.0.1.443: Flags [P.], seq 1:518, ack 1, win 65495, options [nop,nop,TS val 1 ecr 1], length 517`,
          expect: '能看到 TCP 三次握手和随后带有长度的加密记录；仅凭这些输出不能读出 HTTP 路径、请求体或响应正文。',
          note: 'Linux 专用；输出为固定示意，未在本机执行。读取原始报文通常需要管理员权限；timeout 只限制抓包时长。不要在生产环境无授权抓包，也不要保存无关敏感流量。',
        },
      ],
      checkpoints: ['能解释抓包点为什么决定可见范围', '知道混杂模式不能突破交换机隔离', '理解 BPF 过滤会真正减少保留报文', '知道 TLS 下通常只能分析元数据'],
      safety: '抓包前确认授权、接口、时间范围与数据保存位置；优先抓回环或指定主机，避免捕获密码、令牌和无关业务内容。',
    },
    boundaries: {
      blocks: ['确认报文是否发出或到达', '观察 TCP 标志、序号与握手过程', '用 BPF 降低噪声并保存证据', '识别加密连接的可见元数据'],
      notBlocks: ['自动看到所有交换网络流量', '在无密钥情况下解密 TLS 内容', '证明应用逻辑一定正确', '消除抓包缓冲丢失与时间偏差'],
    },
  },
  {
    id: 'network-troubleshooting',
    track: 'network',
    title: '网络排障：从现象到证据',
    english: 'NETWORK TROUBLESHOOTING / LAYERED EVIDENCE',
    summary: '排障不是随机重试，而是把现象拆成 DNS、路由、TCP、TLS 与 HTTP 等层次，逐层收集证据并验证最小变更。',
    icon: 'workflow',
    group: '边界与排障',
    dependencies: ['network-routing', 'network-dns', 'network-http'],
    dependents: [],
    philosophy: {
      problem: '同一个“打不开网页”现象可能来自地址没拿到、DNS 失败、路由缺失、端口拒绝、证书错误或 HTTP 错误。只看最终报错，很难知道应该改哪一层。',
      rejects: 'ping 通不代表 HTTP 可用；curl 失败也不能只解释成“网络断了”。ICMP 和 TCP 走的是不同路径与策略，HTTP 还依赖应用层状态。',
      counter: '把排障建成一条证据链：先复现并限定范围，再从低层向高层验证，每次只改变一个变量，并用相同方法确认结果。',
    },
    design: {
      abstractions: [
        { name: '现象', role: '用户或监控看到的可复现结果，例如超时、拒绝连接、证书错误或 HTTP 404。' },
        { name: '层次', role: '把网络通信拆成链路、地址、路由、传输、加密与应用等可独立验证的部分。' },
        { name: '证据', role: '命令输出、日志、抓包或时间序列，必须能支持或反驳某个具体假设。' },
        { name: '假设', role: '对失败原因的可检验解释，例如“DNS 返回空结果”或“TCP 443 被拒绝”。' },
        { name: '变更与验证', role: '先保存原状态，做最小修改，再用原复现方法确认改善或回滚，避免一次改多项。' },
      ],
      principles: [
        '先复现再修复：记录时间、源、目标、端口和错误原文，确认问题范围是单机、单网段还是全局。',
        '按层取证：DNS 解析成功后才检查 TCP，TCP 建立后才检查 TLS，TLS 成功后才解释 HTTP 状态码。',
        '一次只改一个变量：变更前备份配置，记录预期，失败时回滚，避免多个改动互相掩盖。',
        '成功也要证明边界：ping 成功只证明该时刻到该地址的 ICMP 往返，不能证明 DNS、TCP 443、TLS 或 HTTP 都正常。',
      ],
      history: [
        { when: '1983 年', what: 'ping 被提出', why: '用 ICMP 回显快速判断目标是否可达以及往返时间。' },
        { when: '1980 年代末', what: 'traceroute 等路径工具出现', why: '通过逐跳探测帮助定位路由与中间设备问题。' },
        { when: '1998 年起', what: 'curl 等面向多协议的命令行客户端普及', why: '用详细模式观察 DNS、连接、TLS 与 HTTP 的逐步结果。' },
      ],
    },
    capabilities: [
      { name: '限定故障范围', sentence: '按设备、网段、时间、协议与目标判断影响面，避免把局部问题升级为全局故障。' },
      { name: '分层验证', sentence: '依次检查链路、地址、路由、DNS、TCP、TLS 与 HTTP，找到第一处失败。' },
      { name: '对齐多方证据', sentence: '把命令输出、服务日志、抓包与监控放在同一时间线上交叉验证。' },
      { name: '安全变更', sentence: '用最小改动验证假设，保存原配置并准备回滚，防止排障本身扩大故障。' },
    ],
    path: {
      intent: '处理“内网用户访问 HTTPS 服务失败”，沿证据链区分 DNS、TCP、TLS 与 HTTP 问题。',
      environment: '使用有权限的排障终端；命令只读或探测文档保留地址，不修改真实网络。所有时间、地址与输出均为教学示意。',
      steps: [
        { title: '记录现象并复现', description: '收集完整错误、发生时间、客户端、目标域名或地址、端口、是否所有用户受影响。用相同方法复现一次，避免把间歇性问题当成已消失。', terms: [{ name: '复现', definition: '用明确且可重复的步骤再次触发问题，以便比较修复前后的证据。' }], state: '现象已记录，故障范围初步形成。' },
        { title: '检查本地链路与地址', description: '确认接口启用、有地址和路由。若地址是 169.254.x.x，先检查 DHCP；若地址正常，再确认默认网关与源地址是否符合预期。', terms: [{ name: '本地链路', definition: '设备到最近交换机或接入点的物理与链路层连接，是更高层通信的基础。' }], state: '地址与路由可用；否则停止在链路或配置层。' },
        { title: '验证 DNS', description: '把域名解析成地址，并比较不同 DNS 或客户端的结果。解析失败或返回错误地址时，不应继续用 ping 或 curl 的 TCP 结果解释应用层问题。', terms: [{ name: 'DNS 解析', definition: '把人类可读域名转换为 IP 地址的过程，失败会阻止后续基于地址的连接。' }], state: '得到预期地址；失败则记录 DNS 错误并转向 DNS 排障。' },
        { title: '验证路由与 TCP', description: '用路由查询确认下一跳，再尝试建立到目标端口的 TCP 连接。超时、拒绝和路由不可达是不同证据，不能都写成“网络不通”。', terms: [{ name: 'TCP 连接', definition: '客户端与服务器通过三次握手建立的传输层连接，建立成功不等于应用请求成功。' }], state: 'TCP 建立；失败则定位路由、ACL、防火墙或服务监听。' },
        { title: '验证 TLS', description: '如果目标是 HTTPS，在 TCP 建立后检查证书链、主机名、有效期与协议协商。证书错误属于 TLS 层，即使应用本身健康也会失败。', terms: [{ name: '证书链', definition: '从服务器证书到受信任根证书的验证路径，用于确认身份与签发关系。' }], state: 'TLS 握手成功；失败则检查时间、证书、SNI 或协议配置。' },
        { title: '解释 HTTP 结果', description: 'TLS 成功后观察状态码、重定向、响应头和正文。404、401、500 表示已经到达 HTTP 层，但分别指向资源、认证或服务端问题。', terms: [{ name: 'HTTP 状态码', definition: '服务器对请求结果的三位数分类，例如 200 成功、404 未找到、500 服务端错误。' }], state: '得到 HTTP 响应；无响应则回看服务日志与上游依赖。' },
        { title: '做最小变更并回归', description: '针对第一处失败提出单一假设，备份后修改一项配置，用原复现方法验证。若无效或引入新问题，立即回滚并继续检查下一层。', terms: [{ name: '回归验证', definition: '用原始复现步骤重新测试，确认变更解决问题且没有破坏相关功能。' }], state: '验证成功并记录证据；失败则回滚，回到对应层次。' },
      ],
      stateTable: {
        columns: ['现象', '检查层', '关键证据', '成功意味着', '失败分支', '下一步'],
        rows: [
          ['完全无网络', '链路/地址', '接口、地址、默认路由', '本机具备发送条件', '169.254 或无地址', '检查 DHCP 与链路'],
          ['域名打不开', 'DNS', '解析结果、DNS 服务器', '得到预期 IP', '超时、NXDOMAIN、错误 IP', '检查 DNS 记录与解析路径'],
          ['连接超时', '路由/TCP', '路由、TCP 握手、ACL', '端口可达', '无路由、丢弃、超时', '检查网关、防火墙与监听'],
          ['连接被拒绝', 'TCP/服务', 'RST、监听端口', '服务端口可达', '无监听或主动拒绝', '检查服务与绑定地址'],
          ['证书错误', 'TLS', '证书链、主机名、时间', '加密通道建立', '过期、不受信任、名称不符', '修复证书或信任配置'],
          ['HTTP 404/500', 'HTTP', '状态码、响应头、日志', '应用已响应', '资源或服务端异常', '检查路由、资源与应用日志'],
          ['ping 通但 curl 失败', '分层对比', 'ICMP 与 curl 详细输出', '只能说明 ICMP 路径可用', 'TCP/TLS/HTTP 任一失败', '按 curl 输出定位具体层'],
        ],
      },
      summary: '排障的目标是找到第一处失败并取得可复核证据；任何单次成功探测都只能证明它覆盖的那一层和那一刻。',
    },
    costs: [
      { choice: '快速反复重试', cost: '可能暂时恢复，但会掩盖根因、放大负载，并破坏原始时间线。', misread: '“多重启几次就好了，不需要记录证据。”' },
      { choice: '一次修改多项配置', cost: '看似提高效率，实际无法判断哪项有效，回滚也困难。', misread: '“同时改 DNS、防火墙和路由，总能碰到正确项。”' },
      { choice: '依赖单一工具', cost: 'ping、curl 或抓包各自只覆盖部分层次，单工具正常不能证明全链路健康。', misread: '“ping 通就说明 HTTP 一定可用。”' },
    ],
    example: {
      title: '模拟分层判定，再用 curl 查看失败发生在哪一层',
      intent: '把多组观察结果映射到 DNS、TCP、TLS 或 HTTP，而不是把所有失败笼统归为网络故障。',
      setup: 'Python 命令可在 Git Bash 中运行；curl 命令面向 Linux，未在本机执行。目标 192.0.2.10 是文档保留地址，不会作为真实公网服务使用。',
      terms: [
        { name: 'verbose 模式', definition: 'curl 的 -v 选项，显示连接、TLS 与请求响应头等详细过程，但可能包含敏感请求头。' },
        { name: 'Connection refused', definition: '目标主机明确拒绝连接，常见于端口没有服务监听或防火墙主动拒绝。' },
        { name: 'Connection timed out', definition: '在限定时间内未收到连接结果，可能来自丢包、路由、防火墙丢弃或目标无响应。' },
      ],
      diagram: {
        kind: 'flow',
        title: '从现象到第一处失败',
        caption: '每一层都为下一层提供前提；失败时停在当前层，不把后续层的“未测试”误判为失败。',
        items: [
          { title: '① DNS', detail: '域名是否变成预期地址？失败则后续 TCP 目标都不明确。', tag: '命名', tone: 'blue' },
          { title: '② TCP', detail: '能否建立到地址和端口的传输连接？超时与拒绝含义不同。', tag: '传输', tone: 'orange' },
          { title: '③ TLS → HTTP', detail: '证书与加密握手成功后，才解释状态码、重定向和响应正文。', tag: '应用', tone: 'green' },
        ],
        footnote: 'ping 使用 ICMP，不能替代 DNS、TCP、TLS 或 HTTP 的任何一层验证。',
      },
      commands: [
        {
          title: '用 Python 按证据定位首个失败层',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" - <<'PY'
import sys
sys.stdout.reconfigure(newline='\\n')
cases = [
    ('web-ok', True, 'ok', 'ok', 'ok', 200),
    ('dns-down', True, 'fail', 'skip', 'skip', None),
    ('port-closed', True, 'ok', 'fail', 'skip', None),
    ('cert-bad', True, 'ok', 'ok', 'fail', None),
    ('http-404', True, 'ok', 'ok', 'ok', 404),
]
for name, ping_ok, dns, tcp, tls, http in cases:
    if dns == 'fail':
        verdict = 'DNS'
    elif tcp == 'fail':
        verdict = 'TCP'
    elif tls == 'fail':
        verdict = 'TLS'
    else:
        verdict = 'HTTP ' + str(http)
    print(f'case={name} ping={"yes" if ping_ok else "no"} dns={dns} tcp={tcp} tls={tls} verdict={verdict}')
print('lesson: ping success cannot prove HTTP')
PY`,
          output: 'case=web-ok ping=yes dns=ok tcp=ok tls=ok verdict=HTTP 200\ncase=dns-down ping=yes dns=fail tcp=skip tls=skip verdict=DNS\ncase=port-closed ping=yes dns=ok tcp=fail tls=skip verdict=TCP\ncase=cert-bad ping=yes dns=ok tcp=ok tls=fail verdict=TLS\ncase=http-404 ping=yes dns=ok tcp=ok tls=ok verdict=HTTP 404\nlesson: ping success cannot prove HTTP\n',
          expect: '即使 ping 都成功，DNS、TCP、TLS 或 HTTP 仍可能失败；判定始终停在第一个有失败证据的层。',
          note: '已在 Git Bash 中用 Python 标准库实际执行；只处理固定案例，没有发起网络请求。',
        },
        {
          title: '用 curl 详细模式观察 HTTP 连接失败',
          command: "curl -v --noproxy '*' --connect-timeout 2 --max-time 4 http://192.0.2.10:80/",
          output: `*   Trying 192.0.2.10:80...
* connect to 192.0.2.10 port 80 failed: Connection timed out
* Failed to connect to 192.0.2.10 port 80 after 2001 ms: Couldn't connect to server
* closing connection #0
curl: (28) Connection timed out after 2000 milliseconds`,
          expect: '输出显示 DNS 不参与本次 IP 直连，连接停在 TCP 阶段；下一步应检查路由、ACL、防火墙与 80 端口监听，而不是先改证书。',
          note: 'Linux 专用；输出为固定示意，未在本机执行。192.0.2.10 属于文档保留地址，命令不用于访问外网；实际等待时间和错误文本会随系统与网络变化。',
        },
      ],
      checkpoints: ['能按 DNS、TCP、TLS、HTTP 顺序解释 curl 失败', '知道 ping 成功不能证明 HTTP 可用', '能区分连接超时与连接被拒绝', '理解一次只改一个变量并回归验证'],
      safety: '排障命令可能暴露代理、请求头或内部拓扑；分享输出前脱敏。生产变更前保存配置与证据，并准备明确回滚步骤。',
    },
    boundaries: {
      blocks: ['随机重试和盲目改配置', '把不同层次错误混为一谈', '缺少证据的故障结论', '一次修改多项导致无法回归'],
      notBlocks: ['替代应用日志与业务指标', '保证所有探测都经过相同路径', '自动识别恶意流量', '避免排障过程本身影响生产'],
    },
  },
  {
    id: 'network-performance',
    track: 'network',
    title: '延迟、丢包、带宽与拥塞',
    english: 'LATENCY / LOSS / THROUGHPUT / CONGESTION',
    summary: '带宽是容量上限，吞吐量是实际传速率，延迟看等待时间，抖动看变化，丢包看缺失；拥塞会让队列变长并放大延迟。',
    icon: 'chart',
    group: '边界与排障',
    dependencies: ['network-tcp', 'network-udp'],
    dependents: [],
    philosophy: {
      problem: '网络“慢”可能来自带宽不足、排队、丢包重传、远端处理或本机资源限制。只看下载速度，无法判断用户该优化哪一环。',
      rejects: '带宽高不等于吞吐量高，平均延迟低也不代表没有卡顿。UDP 丢包和 TCP 丢包的影响不同；大包不通还可能是路径 MTU 或 ICMP 被阻断。',
      counter: '性能诊断要把容量、速率、时间、稳定性与路径放在同一张图上：先确定测点和方向，再分别观察吞吐、延迟、抖动、丢包与队列。',
    },
    design: {
      abstractions: [
        { name: '带宽（bandwidth）', role: '链路或路径在理论上限时间内能承载的数据量，常以 bit/s 表示；它不是应用每秒实际收到的数据量。' },
        { name: '吞吐量（throughput）', role: '在特定时间窗口内实际成功传输的数据速率，受带宽、协议开销、丢包、远端与端系统共同影响。' },
        { name: '延迟与抖动', role: '延迟是报文往返或单程所需时间，抖动是延迟的变化程度；实时音视频对抖动尤其敏感。' },
        { name: '丢包与拥塞', role: '丢包是报文未到达；拥塞是资源需求超过容量导致排队或丢弃，二者相关但不能等同。' },
        { name: '缓冲膨胀（bufferbloat）', role: '设备缓冲过大时，拥塞期间持续排队，使空闲时延迟很低、有负载时延迟急升。' },
        { name: 'MTU 与 MSS', role: '最大传输单元限制单个链路层报文大小；TCP 最大报文段通常受路径 MTU 约束，IPv4 无选项时常按 MTU 减 40 字节估算。' },
      ],
      principles: [
        '先定义测点与方向：客户端到服务器和服务器到客户端可能受不同链路限制，必须说明时间窗口、协议、并发与数据量。',
        '分开容量与体验：带宽和吞吐回答“能传多少”，延迟、抖动和丢包回答“是否稳定、是否等待”。',
        '拥塞要看队列：吞吐下降同时延迟急升，常提示排队或缓冲膨胀；持续丢包也可能来自无线干扰、错误链路或限速策略。',
        'MTU 问题单独验证：小包通而大包不通时，检查路径 MTU、MSS、ICMP 不可达和 DF 位，不要直接归因于带宽不足。',
      ],
      history: [
        { when: '1988 年', what: 'Jacobson 提出 TCP 拥塞控制机制', why: '让发送端根据丢包和网络反馈调整速率，避免多个发送方压垮共享链路。' },
        { when: '2000 年代', what: 'iperf 等吞吐测试工具普及', why: '用可控客户端与服务端测量实际吞吐，而不只依赖运营商标称带宽。' },
        { when: '2011 年起', what: '缓冲膨胀问题被系统提出并推动队列管理改进', why: '揭示大缓冲在拥塞时造成高延迟，促进主动队列管理与智能队列配置。' },
      ],
    },
    capabilities: [
      { name: '区分性能指标', sentence: '分别解释带宽、吞吐量、延迟、抖动、丢包与拥塞，避免用一个数字概括所有问题。' },
      { name: '设计测量', sentence: '明确测点、方向、协议、样本量与时间窗口，使结果可比较。' },
      { name: '识别排队与丢包', sentence: '结合延迟变化、吞吐下降、重传和接口计数判断拥塞或缓冲膨胀。' },
      { name: '排查 MTU 路径', sentence: '理解 MTU、MSS、ICMP 不可达与路径 MTU 发现之间的关系。' },
    ],
    path: {
      intent: '诊断一条链路“测速尚可但视频卡顿”，从基线指标逐步检查丢包、队列、并发与 MTU。',
      environment: '在授权的客户端与服务端之间测量；示例地址均为文档保留地址，不执行真实限速或修改队列。',
      steps: [
        { title: '定义场景与基线', description: '明确用户访问的应用、时间、方向、协议和并发数。先测空闲时的往返延迟，再记录接口速率、错误计数与当前负载，形成可比较基线。', terms: [{ name: '基线', definition: '在已知负载和条件下记录的初始指标，用于判断后续变化是否异常。' }], state: '测点、方向与基线已确定。' },
        { title: '测量吞吐量与带宽', description: '用单连接和多连接分别测试实际传输速率，并与链路标称容量比较。若吞吐远低于带宽，应继续检查丢包、延迟、协议开销和端系统限制。', terms: [{ name: '有效吞吐', definition: '应用层实际完成的有用数据传输速率，不包含全部协议握手与重传开销。' }], state: '得到实际速率；低吞吐形成待验证假设。' },
        { title: '采样延迟、抖动与丢包', description: '连续发送多个探测并记录每次往返时间，而不是只看平均值。延迟突然升高、抖动增大或丢包上升，都说明质量在恶化。', terms: [{ name: '往返时间（RTT）', definition: '报文从发送到收到对应响应所经历的时间，不等同于单程延迟。' }], state: '得到延迟分布与丢包率。' },
        { title: '在有负载时观察队列', description: '同时开始传输并重复延迟采样。如果空闲延迟低、负载后延迟大幅上升，而吞吐没有明显增加，可能存在排队或缓冲膨胀。', terms: [{ name: '排队延迟', definition: '报文在设备缓冲中等待转发的时间，拥塞时会显著增加。' }], state: '确认延迟与负载相关；无相关性则检查其他路径。' },
        { title: '检查丢包与重传来源', description: 'TCP 重传、UDP 丢包、接口错误和网卡丢弃是不同证据。结合链路质量、ACL、限速与远端统计，避免把本地抓包 dropped 当成网络丢包。', terms: [{ name: '重传', definition: '发送端因未收到确认或超时而再次发送数据，会降低有效吞吐并增加延迟。' }], state: '丢包位置与类型被缩小；无丢包则转向端系统或应用。' },
        { title: '验证路径 MTU 与 MSS', description: '若小请求正常而较大数据卡住，检查接口 MTU、TCP MSS 和路径 MTU。IPv4 路径 MTU 发现依赖 ICMP“需要分片”消息；这些消息被阻断时可能出现大包超时、小包正常。', terms: [{ name: '路径 MTU', definition: '从源到目的路径上能够不分片通过的最大报文尺寸，由路径中最小 MTU 决定。' }, { name: 'ICMP 不可达', definition: '网络设备报告目的不可达、端口不可达或需要分片等信息的控制报文，排障时不应一概丢弃。' }], state: 'MTU 不匹配被确认或排除。' },
        { title: '做单项调整并复测', description: '根据证据选择调整队列、限速、MSS 或端系统配置之一，保持其他条件不变并重复相同测量。比较吞吐、尾延迟和丢包，确认不是只改善一个平均值。', terms: [{ name: '尾延迟', definition: '接近最慢那一部分请求的延迟，例如 P95 或 P99，比平均值更能反映卡顿。' }], state: '调整后指标改善；无效则回滚并继续验证。' },
      ],
      stateTable: {
        columns: ['状态', '带宽利用', '吞吐量', '延迟', '丢包/重传', '可能解释', '下一步'],
        rows: [
          ['空闲', '低', '接近 0', '基线低', '无或很少', '正常', '记录基线'],
          ['轻度负载', '中', '随负载上升', '略升', '少', '链路仍有余量', '继续增加受控负载'],
          ['排队明显', '高', '增长变慢', '显著上升', '可能仍低', '拥塞或缓冲膨胀', '检查队列与并发'],
          ['持续拥塞', '接近上限', '停滞或下降', '高', '丢弃/重传增加', '需求超过容量', '限速、调度或扩容'],
          ['MTU 黑洞', '可能不高', '小包正常、大包卡住', '大请求超时', 'TCP 重传', '路径 MTU 或 ICMP 被阻断', '检查 PMTUD 与 MSS'],
          ['端系统受限', '网络空闲', '仍低', '可能正常', '不一定多', 'CPU、磁盘或应用限制', '检查本机资源'],
          ['实时抖动', '可能充足', '足够', '波动大', '可能少', '排队或无线干扰', '看延迟分布与链路质量'],
        ],
      },
      summary: '性能问题要用一组相互印证的指标解释：容量、速率、延迟、稳定性、丢包和队列共同决定体验，MTU 与 ICMP 控制消息也要单独检查。',
    },
    costs: [
      { choice: '只看标称带宽', cost: '数字直观，但忽略协议开销、共享负载、丢包与端系统限制，容易误判瓶颈。', misread: '“办了千兆宽带，任何应用都应该达到千兆。”' },
      { choice: '只看平均延迟', cost: '平均值会掩盖少量严重卡顿，尾延迟和延迟分布才更接近真实体验。', misread: '“平均 10ms，就不会有人觉得卡。”' },
      { choice: '盲目加大缓冲', cost: '可吸收短时突发，但拥塞时缓冲过大造成缓冲膨胀，使延迟急升且吞吐恢复变慢。', misread: '“缓冲越大，网络性能一定越好。”' },
    ],
    example: {
      title: '计算性能指标并识别排队迹象，再用 ping 采样延迟',
      intent: '把带宽、吞吐、延迟、抖动、丢包与 MTU 分开计算，避免用一个“网速”概括全部。',
      setup: 'Python 命令可在 Git Bash 中运行；ping 命令面向 Linux，未在本机执行。192.0.2.1 是文档保留地址，不用于访问外网。',
      terms: [
        { name: 'bit/s 与 Byte/s', definition: '网络带宽通常用 bit/s，文件速度常用 Byte/s；1 Byte 等于 8 bit，换算时不能混用。' },
        { name: 'P95', definition: '95% 的样本不超过的延迟值，用于观察较慢请求的体验。' },
        { name: 'MSS', definition: 'TCP 报文段中能承载的数据大小上限，需要与路径 MTU 协调。' },
      ],
      diagram: {
        kind: 'compare',
        title: '“有带宽”与“体验好”是两组问题',
        caption: '吞吐受容量和端到端效率影响；延迟、抖动、丢包和队列决定传输是否平稳。',
        items: [
          { title: '容量与速率', detail: '带宽是上限，吞吐是实际完成量；重传和协议开销会降低有效吞吐。', tag: '能传多少', tone: 'blue' },
          { title: '时间与稳定', detail: '延迟看等待，抖动用延迟变化，丢包看缺失；实时应用更敏感。', tag: '是否平稳', tone: 'orange' },
          { title: '队列与 MTU', detail: '拥塞排队会抬高延迟；MTU 不匹配则可能只卡住大包。', tag: '两种不同瓶颈', tone: 'green' },
        ],
        footnote: 'IPv4 无选项时，MSS 常按路径 MTU 减 40 字节估算；实际值以 TCP 协商为准。',
      },
      commands: [
        {
          title: '用 Python 计算吞吐、延迟、抖动、丢包与 MTU 提示',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" - <<'PY'
import sys
sys.stdout.reconfigure(newline='\\n')
baseline = [10, 11, 10, 12, 11]
loaded = [10, 11, 240, 12, 11]
sent = 200
received = 199
bandwidth_mbps = 1000
payload_bytes = 94_000_000
seconds = 8
mtu = 1500
mss = mtu - 40
baseline_avg = sum(baseline) / len(baseline)
loaded_avg = sum(loaded) / len(loaded)
jitter = max(loaded) - min(loaded)
loss_pct = (sent - received) * 100 / sent
throughput_mbps = payload_bytes * 8 / seconds / 1_000_000
queue_estimate = loaded_avg - baseline_avg
print(f'bandwidth_mbps={bandwidth_mbps}')
print(f'throughput_mbps={throughput_mbps:.1f}')
print(f'baseline_rtt_ms={baseline_avg:.1f}')
print(f'loaded_rtt_ms={loaded_avg:.1f}')
print(f'jitter_ms={jitter:.1f}')
print(f'loss_pct={loss_pct:.1f}')
print(f'queue_estimate_ms={queue_estimate:.1f}')
print(f'mtu_mss={mtu}/{mss}')
print('bufferbloat=possible')
PY`,
          output: 'bandwidth_mbps=1000\nthroughput_mbps=94.0\nbaseline_rtt_ms=10.8\nloaded_rtt_ms=56.8\njitter_ms=230.0\nloss_pct=0.5\nqueue_estimate_ms=46.0\nmtu_mss=1500/1460\nbufferbloat=possible\n',
          expect: '吞吐 94 Mbps 低于 1000 Mbps 带宽；负载后平均延迟大幅上升且抖动很大，提示排队或缓冲膨胀，同时存在 0.5% 丢包。',
          note: '已在 Git Bash 中用 Python 标准库实际执行；只计算固定样本，没有发送网络流量或修改队列。',
        },
        {
          title: '用 ping 采样往返延迟与丢包',
          command: 'ping -c 4 192.0.2.1',
          output: `PING 192.0.2.1 (192.0.2.1) 56(84) bytes of data.
64 bytes from 192.0.2.1: icmp_seq=1 ttl=63 time=11.2 ms
64 bytes from 192.0.2.1: icmp_seq=2 ttl=63 time=10.9 ms
64 bytes from 192.0.2.1: icmp_seq=3 ttl=63 time=240.1 ms
64 bytes from 192.0.2.1: icmp_seq=4 ttl=63 time=11.0 ms

--- 192.0.2.1 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3004ms
rtt min/avg/max/mdev = 10.9/68.3/240.1/97.5 ms`,
          expect: '平均值约 68.3 ms，但最大 240.1 ms，说明存在明显延迟尖峰；0% 丢包也不代表没有排队或卡顿。',
          note: 'Linux 专用；输出为固定示意，未在本机执行。ping 只反映 ICMP 路径，不能单独证明 TCP 吞吐、TLS 或 HTTP 性能；192.0.2.1 为文档保留地址。',
        },
      ],
      checkpoints: ['能区分带宽与吞吐量', '知道平均延迟会掩盖尖峰和尾延迟', '理解拥塞、排队、缓冲膨胀与丢包的关系', '知道 MTU/MSS 与 ICMP 不可达可能造成大包异常'],
      safety: '吞吐测试会占用带宽，ping 和 traceroute 也会产生流量；生产环境应限定目标、速率、时长与时间窗口，避免压垮共享链路。',
    },
    boundaries: {
      blocks: ['把标称带宽当成实际吞吐', '用平均值掩盖延迟尖峰', '把丢包全部归因于拥塞', '忽视 MTU 与 ICMP 控制消息'],
      notBlocks: ['替代端系统和应用性能分析', '保证实时业务体验', '自动定位所有丢包位置', '通过单个 ping 结果证明整条 HTTP 链路健康'],
    },
  },
]
