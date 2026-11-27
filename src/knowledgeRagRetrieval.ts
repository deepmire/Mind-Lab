/**
 * RAG 检索课程的前七个模块：先界定问题，再准备资料，最后组合并改写查询。
 * 全部示例只使用本地内存与 Python 标准库；分数、ANN 图和查询改写均为确定性教学模拟。
 */
import type { KnowledgeModule } from './knowledgeTypes'

/**
 * 按学习依赖导出检索基础课程。dependents 留空，由课程聚合层依据 dependencies 统一重算。
 * 不变量：权限先于相关性，检索候选不等于事实，改写不得扩大授权或把不清楚的问题说清楚。
 */
export const ragRetrievalModules: KnowledgeModule[] = [
  // 意图：先判断该不该检索，避免把每个问题都送进同一条流水线。
  {
    id: 'rag-intent',
    track: 'rag',
    title: 'RAG 意图：什么时候该找资料',
    english: 'RETRIEVAL INTENT / ROUTING',
    summary: '检索增强生成（RAG）是回答前先从受控资料中查找证据，再把证据交给模型生成的架构。先判断问题需要什么，再决定是否检索。微调（用额外样本调整模型内部参数）适合改变行为风格，不等于给模型装入一本可随时更新的手册；记忆（跨会话保存用户事实的程序存储）适合保存个人偏好，也不等于共享知识库。',
    icon: 'target',
    group: '问题与资料',
    dependencies: [],
    dependents: [],
    philosophy: {
      problem: '一个应用可能同时收到闲聊、个人偏好、需要最新制度、需要多篇资料比较的问题。全部检索会浪费成本，全部不检索又会凭空回答。路由是在调用检索器前先识别答案来源、时间要求和权限范围的产品机制。',
      rejects: 'RAG 不是“问题越长越需要”，也不是“回答带链接就实现了 RAG”。微调、记忆和检索可以共存，但各自解决不同问题；检索无法补救资料缺失，更不能代替业务计算。',
      counter: '反直觉的是，最好的检索路由常常是不检索。纯计算、明确闲聊或已有完整上下文的问题直接回答，既减少噪声，也避免把本来简单的问题复杂化。',
    },
    design: {
      abstractions: [
        { name: '问题路由', role: '按问题所需来源选择直接回答、共享资料检索、用户记忆读取或拒答；它决定流水线入口，不直接产生事实。' },
        { name: '证据需求', role: '问题中必须被外部材料支持的条件，例如版本、环境、数字和限制；这是后续覆盖检查的起点。' },
        { name: '时间要求', role: '答案是否必须来自当前有效资料；涉及“最新”“现在”时还要检查文档生效时间，而不只看上传时间。' },
        { name: '作用域', role: '这次回答允许读取的用户、租户（相互隔离的客户或团队）、环境和资料范围；改写与检索都不得越过它。' },
      ],
      principles: [
        '先定义缺口再选技术：缺少可更新的私有事实优先检索；需要固定表达风格才考虑微调；需要跨会话偏好才写入记忆。',
        '来源可组合但职责不混淆：先读用户偏好，再检索制度，最后计算或生成；任何一路都不能冒充另一路的证据。',
        '无证据是可接受结果：资料不存在、用户无权或问题依赖未提供数据时，明确说明缺口，不用模型常识伪造结论。',
      ],
      history: [
        { when: '2020', what: 'RAG 研究把参数知识与外部检索结合', why: '让生成过程使用可更新证据，而不是把所有知识都压进模型参数。' },
        { when: '2022—2023', what: '应用层开始把意图识别、工具路由与检索拆开', why: '真实产品的问题来源多样，单一检索入口无法同时处理计算、闲聊与知识问答。' },
      ],
    },
    capabilities: [
      { name: '来源路由', sentence: '区分直接回答、共享资料、用户记忆和外部工具，减少无意义检索。' },
      { name: '缺口识别', sentence: '找出问题中的环境、版本、数值和限制，作为检索后的核对清单。' },
      { name: '时效判断', sentence: '识别“最新”等信号，并要求资料版本与生效时间参与决策。' },
      { name: '拒答出口', sentence: '对无权、缺资料或纯计算类问题给出正确出口，而不是强行生成。' },
    ],
    path: {
      intent: '应用同时收到“我们的缓存容量是多少”“我喜欢简短回答”“2 加 3 等于多少”；系统必须选三种不同处理方式，并保留共享资料的权限范围。',
      environment: '一个不调用模型的规则路由器。规则只是教学代理：输入问题字符串和用户范围，输出 route（处理路线）、needs_evidence（是否需要证据）与 reason（原因）。',
      steps: [
        { title: '接收问题与身份范围', description: '保留用户原话，同时接收租户和环境。范围是路由输入，不是模型可以自行修改的提示；不先确定范围，后续检索就可能越权。', terms: [{ name: '路由', definition: '根据输入选择下一条处理路径的决策，例如直接回答还是检索。' }, { name: '用户范围', definition: '当前请求允许访问的数据边界，包含用户、租户和环境。' }], state: '原问题与授权范围已保存，尚未选择处理方式。' },
        { title: '识别可直接回答的问题', description: '明确算术由计算器或宿主处理，闲聊不查企业文档。规则命中只是教学简化，真实系统也不能让模型代替精确算术。', terms: [{ name: '直接回答', definition: '不读取外部资料就回答，适用于闲聊或已有完整信息的问题。' }, { name: '宿主计算', definition: '由应用程序执行算术等确定性操作，而不是让语言模型猜结果。' }], state: '算术问题进入计算分支，企业资料库未被查询。' },
        { title: '识别共享资料缺口', description: '“我们的缓存容量”依赖组织内部事实，路由到共享资料检索，并记录 evidence_terms（必须被证据覆盖的词）。没有指定版本时先查当前有效版本。', terms: [{ name: '共享资料', definition: '按权限提供给多个用户查阅的文档集合，不是某个用户的私人记忆。' }, { name: '证据条件', definition: '回答必须覆盖的具体信息，例如“缓存”和“容量”。' }], state: '得到检索路线及必须核对的两个信息条件。' },
        { title: '识别个人记忆问题', description: '“我喜欢简短回答”询问稳定偏好，读取当前用户记忆即可。它不能触发共享库检索，更不能读取其他用户偏好。', terms: [{ name: '个人记忆', definition: '按用户隔离保存、可纠正和删除的跨会话事实；只对相应用户可见。' }], state: '偏好问题进入当前用户记忆分支。' },
        { title: '输出计划或说明缺口', description: '路由结果包含处理方式、证据条件、允许范围和拒绝原因。无匹配路线时返回 clarify（需要澄清），不把“没看懂”伪装成“资料中没有”。', terms: [{ name: '澄清', definition: '请用户补充环境、对象或范围，使下一步处理有明确输入。' }, { name: '处理计划', definition: '路由生成的后续动作说明，不是最终答案，也不授予额外权限。' }], state: '每个问题都有可执行计划；资料缺口进入后续检索模块处理。' },
      ],
      stateTable: {
        columns: ['阶段', '输入信号', '选择路线', '保留状态', '不应做的事'],
        rows: [
          ['接收', '问题 + 用户范围', '尚未决定', '原话与范围冻结', '不先检索再补权限'],
          ['算术识别', '2 加 3', '直接计算', '调用宿主计算', '不让模型猜数值'],
          ['资料识别', '我们的缓存容量', '共享检索', '记录证据条件', '不用个人记忆替代制度'],
          ['偏好识别', '我喜欢简短回答', '用户记忆', '仅当前用户', '不读取他人偏好'],
          ['路线不明', '缺少对象或环境', '澄清', '记录缺少信息', '不把路由失败当无答案'],
        ],
      },
      summary: '意图模块不回答业务问题，它负责把问题送到正确的证据来源，并让“不检索”“查记忆”“检索”“澄清”都成为显式决定。',
    },
    costs: [
      { choice: '规则路由', cost: '便宜、可预测，但覆盖有限，需要持续维护表达变体。', misread: '“列几条关键词就能可靠识别所有意图。”' },
      { choice: '模型路由', cost: '能处理模糊表达，却增加一次调用、延迟与错误路由风险。', misread: '“让模型选路线一定比规则更安全。”' },
      { choice: '统一全部检索', cost: '实现简单，却把闲聊、计算和偏好问题也送进知识库。', misread: '“多查一次总没有坏处。”' },
    ],
    example: {
      title: '用规则路由把三个问题送到不同来源',
      intent: '标准库模拟意图识别、证据条件提取与用户隔离；不调用语言模型，也不真正读取文档或记忆。',
      setup: '打开终端（输入命令的程序），复制整段命令并回车。命令先检查 python3 是否存在，否则使用 python；Python 是这里使用的编程语言，标准库指语言自带、无需额外安装的模块。代码把列表（按顺序存放多项数据的容器）和字典（用键读取值的容器）放在内存中。JSON 是程序易读的数据格式，末行打印的是本次路由结果。场景中的用户和问题均为虚构。',
      terms: [
        { name: 'route', definition: 'route 是处理路线字段；compute 表示宿主计算，rag 表示检索共享资料，memory 表示读取个人记忆。' },
        { name: 'scope', definition: 'scope 是允许读取的数据范围；本例固定为 staging 租户，表示测试环境。' },
        { name: 'evidence_terms', definition: 'evidence_terms 是回答必须被资料支持的信息条件；空列表表示该问题不需要外部证据。' },
      ],
      diagram: {
        kind: 'flow',
        title: '先决定答案来源，再进入对应处理',
        caption: '路由只决定去哪里找答案；它不负责证明资料中的事实。',
        items: [
          { title: '问题与范围', detail: '保存原问题和当前用户可见范围。', tag: '输入', tone: 'blue' },
          { title: '来源识别', detail: '计算走宿主，组织事实走 RAG，个人偏好走记忆。', tag: '决策', tone: 'muted' },
          { title: '计划输出', detail: '附带证据条件和原因，权限范围始终不变。', tag: '输出', tone: 'green' },
        ],
      },
      commands: [
        {
          title: '为三个问题选择计算、检索或个人记忆',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import json
# 每条输入保存问题、问题类型和该用户允许访问的范围。
requests = [
    {'question': '2 加 3 等于多少', 'kind': 'compute', 'user': 'u1'},
    {'question': '我们的缓存容量是多少', 'kind': 'org_fact', 'user': 'u1'},
    {'question': '我喜欢简短回答', 'kind': 'preference', 'user': 'u1'},
]
def route(request):
    # 根据类型选择路线；共享检索额外记录必须被证据覆盖的条件。
    common = {'question': request['question'], 'scope': 'tenant-demo/staging'}
    if request['kind'] == 'compute':
        return {**common, 'route': 'compute', 'evidence_terms': [], 'reason': '宿主精确计算'}
    if request['kind'] == 'org_fact':
        return {**common, 'route': 'rag', 'evidence_terms': ['缓存', '容量'], 'reason': '需要共享资料'}
    return {**common, 'route': 'memory', 'evidence_terms': [], 'reason': '只读当前用户偏好'}
# 列表推导依次处理请求，字典结果按输入顺序输出，因此每次运行完全一致。
plans = [route(request) for request in requests]
print(json.dumps(plans, ensure_ascii=False))
PY`,
          output: '[{"question": "2 加 3 等于多少", "scope": "tenant-demo/staging", "route": "compute", "evidence_terms": [], "reason": "宿主精确计算"}, {"question": "我们的缓存容量是多少", "scope": "tenant-demo/staging", "route": "rag", "evidence_terms": ["缓存", "容量"], "reason": "需要共享资料"}, {"question": "我喜欢简短回答", "scope": "tenant-demo/staging", "route": "memory", "evidence_terms": [], "reason": "只读当前用户偏好"}]',
          expect: '三个问题分别进入 compute、rag、memory；只有共享资料问题带有“缓存、容量”两个证据条件，所有计划的范围都不变。',
          note: '这里用显式类型代替自然语言分类，避免把模型判断混入演示。真实路由仍应验证身份与范围，且计算必须由程序执行。',
        },
        {
          title: '区分资料缺口、权限拒绝与需要澄清',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import json
cases = [
    {'case': 'no_fact', 'visible': True, 'document_exists': False},
    {'case': 'forbidden', 'visible': False, 'document_exists': True},
    {'case': 'clarify', 'visible': True, 'document_exists': True},
]
results = []
for case in cases:
    # 权限检查先于资料是否存在；拒答原因必须可观察。
    if not case['visible']:
        status, next_step = 'forbidden', '不读取、不泄露文档是否存在'
    elif not case['document_exists']:
        status, next_step = 'no_answer', '说明缺少资料，不用常识补全'
    else:
        status, next_step = 'clarify', '请用户补充版本或环境'
    results.append({'case': case['case'], 'status': status, 'next_step': next_step})
print(json.dumps(results, ensure_ascii=False))
PY`,
          output: '[{"case": "no_fact", "status": "no_answer", "next_step": "说明缺少资料，不用常识补全"}, {"case": "forbidden", "status": "forbidden", "next_step": "不读取、不泄露文档是否存在"}, {"case": "clarify", "status": "clarify", "next_step": "请用户补充版本或环境"}]',
          expect: '越权、缺资料和需澄清分别得到 forbidden、no_answer、clarify，且不会互相伪装。',
          note: '对无权用户隐藏文档是否存在，可以避免通过错误信息侧面探测私有资料。',
        },
      ],
      checkpoints: ['能说出 RAG、微调、记忆各自解决什么问题', '能举例说明哪些问题不应检索', '知道证据条件与权限范围应在检索前保留', '能区分无答案、无权限和需要澄清'],
      safety: '示例不访问真实身份系统。产品中权限必须由宿主根据可信身份执行，不能采信问题文字或模型自报的用户范围。',
    },
    boundaries: {
      blocks: ['所有问题都走同一种处理', '需要最新私有事实时只能靠模型记忆', '检索范围与个人记忆混用'],
      notBlocks: ['错误或过期文档', '权限系统配置错误', '模型幻觉', '资料中根本没有答案'],
    },
  },
  // 摄取：把原始资料变成有来源、可鉴权、可重建的文档记录。
  {
    id: 'rag-ingestion',
    track: 'rag',
    title: '资料摄取：解析、元数据与权限',
    english: 'INGESTION / METADATA / ACL',
    summary: '摄取（ingestion）是把原始资料读入系统并整理为可检索记录的过程。解析（parsing）把文件内容转换成文本和结构；元数据（metadata）是描述文档的来源、版本、环境和可见性的附加信息；访问控制列表（ACL）规定哪些用户或群组能读。原始文件存在，不代表已经可以进入当前用户的检索结果。',
    icon: 'folder',
    group: '问题与资料',
    dependencies: ['rag-intent'],
    dependents: [],
    philosophy: {
      problem: '企业资料可能是文本、表格、扫描件或带目录的文档，文件名也可能无法表达真实版本与权限。摄取要解决的不是“把文字存下来”，而是让每个字段都能追溯到来源，并让更新、删除和权限变更有明确行为。',
      rejects: '解析成功不等于内容完整，上传成功不等于公开，文件名里的“最终版”不等于有效版本。不能悄悄把 ACL 缺失的文档设为全员可见，也不能让更新只覆盖一半字段。',
      counter: '反直觉的是，摄取阶段漏掉标题层级和表格关系，后面再好的向量模型也难恢复。很多“检索不准”实际发生在模型介入之前。',
    },
    design: {
      abstractions: [
        { name: '原始对象', role: '尚未解释的文件字节、页面或附件；保留原地址与内容摘要，便于校验是否变化和重新解析。' },
        { name: '解析结果', role: '从原始对象提取的正文、标题层级、表格和错误列表；解析失败必须可见，不能静默跳过。' },
        { name: '文档元数据', role: '与正文分离管理的 doc_id、source（来源）、version（版本）、effective_at（生效时间）、tenant（租户）和 acl（访问控制列表）。' },
        { name: '规范文档记录', role: '通过格式、权限和版本检查的统一记录；它是切分输入，也是后续删除、审计与重建的依据。' },
      ],
      principles: [
        '原始内容与元数据分开保存：正文更新、权限变更和版本替换是不同事件，不能靠改文件名隐式完成。',
        '先校验再发布：解析错误、ACL 缺失或版本冲突要隔离并报告；新版本通过检查后才替换当前有效记录。',
        '每次摄取可追溯：记录来源、解析器版本和内容摘要，使同一版本能够重建，并解释索引为何变化。',
      ],
      history: [
        { when: '2020 起', what: 'RAG 应用把文档解析、切分与索引纳入独立流水线', why: '生成效果越来越依赖可追踪、可更新的数据准备过程。' },
        { when: '2022—2023', what: '元数据过滤与权限继承成为向量检索常见要求', why: '企业知识库必须按用户与组织边界返回结果，而不是只比较文本相似度。' },
      ],
    },
    capabilities: [
      { name: '格式解析', sentence: '提取正文与标题、表格等结构，并保留解析错误和原文位置。' },
      { name: '元数据归一', sentence: '统一来源、版本、租户、环境和生效时间字段，避免同名不同义。' },
      { name: 'ACL 校验', sentence: '拒绝权限缺失或无法映射身份的文档进入可查询集合。' },
      { name: '版本与摘要', sentence: '用内容摘要识别重复或变更，用版本替换支持审计与回滚。' },
    ],
    path: {
      intent: '团队上传同一部署手册的两个版本，其中一个缺少 ACL；系统只能发布合规的新版本，并向检索层提供当前有效记录。',
      environment: '三个内存文档字典模拟解析后的输入，包含 doc_id、source、version、tenant、effective_at、acl 和 text。程序不读取真实文件，也不连接身份服务。',
      steps: [
        { title: '登记原始对象', description: '为每个输入分配 doc_id，记录来源与内容摘要。摘要用于发现内容是否变化，不承担身份认证；原文保留，解析失败也能重试。', terms: [{ name: '内容摘要', definition: '对内容计算出的短指纹，内容变化时指纹通常变化；它不是权限证明。' }, { name: '原始对象', definition: '解析前的文件字节或附件，是重建解析结果的依据。' }], state: '输入对象已登记，尚未成为可检索文档。' },
        { title: '解析正文与结构', description: '读取文本并提取标题、段落和表格；教学输入已经提供结构，真实系统还需处理扫描文字识别和复杂版式。错误随记录保留。', terms: [{ name: '解析', definition: '把原始文件转换成程序可处理的正文与结构；成功只代表转换完成。' }], state: '每个对象得到正文、结构或明确错误。' },
        { title: '归一元数据并检查 ACL', description: '检查租户、生效时间和 ACL 是否存在且属于允许格式。ACL 缺失时隔离，不猜测为公开；权限映射失败也不能绕过。', terms: [{ name: 'ACL', definition: '访问控制列表，用用户或群组条目规定谁可以读取文档。' }, { name: '隔离', definition: '把不合规记录放入不可查询状态，等待修复或人工处理。' }], state: '合规记录保留，缺失 ACL 的记录进入 isolated（隔离）状态。' },
        { title: '比较版本并选择有效记录', description: '同一 doc_id 的新版本先与当前版本比较。按生效时间选择当前有效版本，较新但未生效的版本只保留为待生效，不能提前覆盖。', terms: [{ name: '有效版本', definition: '在指定时间已经生效、允许参与检索的文档版本。' }, { name: '待生效', definition: '已经解析但生效时间未到，暂不进入当前检索集合的状态。' }], state: '得到当前有效文档与未来版本清单。' },
        { title: '发布规范记录并记录血缘', description: '只有通过检查的记录进入发布集合，附带 source、version、摘要和解析器版本。血缘（lineage）指记录到原文与处理步骤的追溯关系。', terms: [{ name: '血缘', definition: '文档、版本、原文位置与索引之间的追溯关系，使结果可以回查。' }, { name: '发布', definition: '把已验证记录标记为检索可见；它仍受每次查询的用户权限约束。' }], state: '规范文档可交给切分模块，隔离记录不会泄漏到检索结果。' },
      ],
      stateTable: {
        columns: ['阶段', '文档状态', '元数据', 'ACL', '下一步'],
        rows: [
          ['登记', 'raw', '来源 + doc_id', '尚未验证', '解析'],
          ['解析成功', 'parsed', '正文 + 结构', '尚未验证', '归一'],
          ['ACL 缺失', 'isolated', '保留原记录', '禁止猜测公开', '修复后重试'],
          ['新版本未生效', 'pending', '未来生效时间', '必须合规', '到期后发布'],
          ['检查通过', 'published', '版本 + 摘要 + 血缘', '随记录保存', '切分'],
        ],
      },
      summary: '摄取的产物不是一堆文本，而是带来源、版本、权限和失败状态的规范文档；检索质量从这一步就开始被决定。',
    },
    costs: [
      { choice: '尽量保留原始结构', cost: '标题和表格更完整，但解析器更复杂，异常版式也更多。', misread: '“先全部压成纯文本，结构以后总能补回来。”' },
      { choice: '严格 ACL 校验', cost: '减少越权风险，但身份系统故障时可能阻断资料更新与查询。', misread: '“为了可用，ACL 缺失时先当公开。”' },
      { choice: '自动接受新版本', cost: '更新及时，却可能让错误解析或未来版本提前生效。', misread: '“版本号更大就一定应该立即替换。”' },
    ],
    example: {
      title: '发布合规版本，隔离缺权限文档',
      intent: '用内存字典模拟原始对象登记、正文解析、ACL 检查、版本选择和血缘记录，观察未生效版本不会提前覆盖当前版本。',
      setup: '命令使用 Python 标准库 hashlib（计算内容摘要的自带模块）。文件正文已经由字符串提供，因此没有真实磁盘读取。records 列表保存三个文档字典；acl 是允许读取的用户列表；published 列表保存最终发布记录。JSON 输出中的摘要为真实计算值。',
      terms: [
        { name: 'parse', definition: 'parse 是解析函数；本例从文本提取以“# ”开头的标题和其余正文，模拟最小解析器。' },
        { name: 'acl', definition: 'acl 是文档的访问控制列表；空列表在示例规则中表示禁止发布。' },
        { name: 'version / effective_at', definition: 'version 是版本号，effective_at 是生效日期；程序按日期判断哪版当前可用。' },
      ],
      diagram: {
        kind: 'layers',
        title: '从原始对象到可查询记录',
        caption: '每一层增加一种保证，任何一层失败都不能悄悄进入下一层。',
        items: [
          { title: '原始对象', detail: 'doc_id、来源、正文和摘要。', tag: '输入', tone: 'blue' },
          { title: '解析结构', detail: '标题和正文可分别使用。', tag: '解析', tone: 'muted' },
          { title: '权限与版本', detail: 'ACL 合规且已生效才可能发布。', tag: '闸门', tone: 'orange' },
          { title: '规范记录', detail: '带版本和血缘，交给切分。', tag: '输出', tone: 'green' },
        ],
      },
      commands: [
        {
          title: '解析文档并隔离 ACL 缺失记录',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import json, hashlib
# 输入字典模拟解析器已经读到的原始对象；字段缺失必须被显式处理。
records = [
    {'doc_id': 'guide', 'source': 'memory://guide.txt', 'version': 1,
     'effective_at': '2026-01-01', 'acl': ['u1'], 'text': '# 部署\\n先检查镜像摘要。'},
    {'doc_id': 'secret', 'source': 'memory://secret.txt', 'version': 1,
     'effective_at': '2026-01-01', 'acl': [], 'text': '# 内部\\n不公开。'},
]
def ingest(record):
    # 第一行作为标题，后续行合并为正文；这里只演示文本解析，不处理扫描件。
    lines = record['text'].splitlines()
    title = lines[0][2:] if lines and lines[0].startswith('# ') else ''
    body = '\\n'.join(lines[1:] if title else lines).strip()
    digest = hashlib.sha256(record['text'].encode('utf-8')).hexdigest()[:12]
    allowed = bool(record.get('acl'))
    return {'doc_id': record['doc_id'], 'title': title, 'body': body,
            'version': record['version'], 'source': record['source'],
            'content_hash': digest, 'acl': record.get('acl', []),
            'status': 'parsed' if allowed else 'isolated'}
print(json.dumps([ingest(record) for record in records], ensure_ascii=False))
PY`,
          output: '[{"doc_id": "guide", "title": "部署", "body": "先检查镜像摘要。", "version": 1, "source": "memory://guide.txt", "content_hash": "2519d159c729", "acl": ["u1"], "status": "parsed"}, {"doc_id": "secret", "title": "内部", "body": "不公开。", "version": 1, "source": "memory://secret.txt", "content_hash": "d8f438e1c26c", "acl": [], "status": "isolated"}]',
          expect: 'guide 解析出标题“部署”和正文，状态为 parsed；secret 虽能解析，却因 ACL 为空成为 isolated。',
          note: '摘要由正文 UTF-8 编码后计算。真实系统还应记录解析器版本、原文位置与错误列表。',
        },
        {
          title: '只发布已生效的最新合规版本',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import json
# 同一文档包含当前版本和未来版本；ACL 不合规的更新不能覆盖当前记录。
versions = [
    {'doc_id': 'guide', 'version': 1, 'effective_at': '2026-01-01', 'acl': ['u1'], 'text': '旧版'},
    {'doc_id': 'guide', 'version': 2, 'effective_at': '2026-03-01', 'acl': [], 'text': '未授权新版'},
    {'doc_id': 'guide', 'version': 3, 'effective_at': '2026-02-01', 'acl': ['u1'], 'text': '当前有效版'},
    {'doc_id': 'guide', 'version': 4, 'effective_at': '2026-04-01', 'acl': ['u1'], 'text': '未来版'},
]
today = '2026-02-15'
eligible = [v for v in versions if v['acl'] and v['effective_at'] <= today]
current = max(eligible, key=lambda v: (v['effective_at'], v['version']))
pending = [v['version'] for v in versions if v['acl'] and v['effective_at'] > today]
print(json.dumps({'published': current, 'pending_versions': pending,
                  'excluded_versions': [v['version'] for v in versions if not v['acl']]},
                 ensure_ascii=False))
PY`,
          output: '{"published": {"doc_id": "guide", "version": 3, "effective_at": "2026-02-01", "acl": ["u1"], "text": "当前有效版"}, "pending_versions": [4], "excluded_versions": [2]}',
          expect: '当前发布 version 3；version 2 因 ACL 为空被排除，version 4 因尚未生效进入待生效列表。',
          note: '版本号最大不自动等于当前有效。生产系统应使用事务和唯一约束，避免并发发布同一文档的多个有效版本。',
        },
      ],
      checkpoints: ['能区分解析、元数据归一与发布', '知道 ACL 缺失不能默认公开', '能解释版本号、上传时间与生效时间的区别', '知道内容摘要和血缘分别用于什么'],
      safety: '示例只操作内存字符串。接入真实文件时，应限制可读取目录、隔离恶意文件，并在查询与删除路径继续执行权限检查。',
    },
    boundaries: {
      blocks: ['原始资料无法直接参与检索', '版本与权限信息散落在文件名中', '更新后无法解释索引变化'],
      notBlocks: ['扫描件识别错误', '身份系统失效', '恶意文档提示注入', '错误权限策略本身'],
    },
  },
  // 切分：在可读性、边界完整性与检索成本之间做显式取舍。
  {
    id: 'rag-chunking',
    track: 'rag',
    title: '文本切分：边界、重叠与 token',
    english: 'CHUNKING / OVERLAP / TOKEN',
    summary: '文本块（chunk）是送入检索和引用的基本文本单元。切分（chunking）按标题、段落、句子或长度上限把文档分成小块；重叠（overlap）让相邻块共享一部分文字。token 是模型计量文本的小单位，不等于一个汉字或一个单词，真实计数必须使用与模型一致的分词器（tokenizer）。',
    icon: 'layers',
    group: '问题与资料',
    dependencies: ['rag-ingestion'],
    dependents: [],
    philosophy: {
      problem: '整篇文档太大，直接检索会引入大量噪声；切得太碎又可能把操作条件、例外和结论拆开。切分没有脱离业务的固定最佳长度，只有与文档结构、查询和模型预算相匹配的策略。',
      rejects: '字符数切分不等于 token 切分，重叠也不是越多越好。不能为了省事从表格或代码中间硬切，更不能把 ACL、标题和版本从文本块中丢掉。',
      counter: '反直觉的是，更小的块不一定带来更准的召回。一个 20 字的碎片可能高度相似，却没有说明“在什么环境下、有什么前提”，无法支持完整答案。',
    },
    design: {
      abstractions: [
        { name: '切分边界', role: '优先选择标题、段落、句子等自然边界，再在边界内处理长度上限；边界决定上下文是否完整。' },
        { name: '块大小', role: '单个块允许的 token 或字符预算；过大增加噪声，过小丢失前提，必须为嵌入模型和上下文留余量。' },
        { name: '重叠长度', role: '相邻块共享的文字量，用于降低跨边界信息丢失，但会增加存储、重复召回与投票偏差。' },
        { name: '原文定位', role: '用 start（起始位置）和 end（结束位置）记录块在原文中的范围，使引用可以回到完整上下文。' },
      ],
      principles: [
        '结构优先于机械长度：先找标题和自然段，再处理超长段；表格行、列表条件和代码块应作为整体或带上下文处理。',
        '块必须携带来源信息：正文、doc_id、版本、标题路径、权限与原文偏移一起保存，不能只存一段孤立文字。',
        '用问题验证切分：选择最小重叠和合适大小，应通过边界问题测试，而不是只追求平均块长。',
      ],
      history: [
        { when: '2020—2021', what: '早期 RAG 实现常用固定窗口切分文本', why: '固定窗口简单、可复现，适合快速验证检索链路。' },
        { when: '2022—2023', what: '结构感知切分、句段边界和可调重叠成为常见实践', why: '实践表明切分边界直接影响事实完整性和引用质量。' },
      ],
    },
    capabilities: [
      { name: '结构切分', sentence: '优先沿标题、段落和句子生成块，减少条件与结论被拆散。' },
      { name: '大小控制', sentence: '按字符或真实 token 预算限制块长，并记录实际计量方式。' },
      { name: '受控重叠', sentence: '只为必要的边界添加共享文字，避免无上限重复。' },
      { name: '定位引用', sentence: '保存块起止位置和标题路径，使检索结果可以回到原文。' },
    ],
    path: {
      intent: '一篇部署文档包含前提、操作和例外，系统需要切成可检索块，同时保证“例外”不会被单独切走。',
      environment: 'Python 按固定 12 个字符、重叠 4 个字符演示切分。字符只是教学代理；生产代码应调用目标模型的 tokenizer，并单独限制 token。',
      steps: [
        { title: '读取规范文档与标题路径', description: '从摄取结果取得正文、版本、ACL 和标题路径。切分器不能修改权限，也不能丢掉来源字段。', terms: [{ name: '标题路径', definition: '文档中当前章节的多级标题，用于说明片段位于哪个上下文。' }, { name: '规范文档', definition: '已经解析、校验权限和版本的文档记录。' }], state: '正文与全部元数据可用，尚未产生块。' },
        { title: '标出自然边界', description: '先识别标题、段落结束和句末标点。教学输入用“|”标记自然边界，真实解析器会从结构直接取得位置。', terms: [{ name: '自然边界', definition: '由文档结构或语言表达形成的切分点，例如章节、段落和句子结束。' }], state: '候选边界已记录，仍未强行截断。' },
        { title: '在预算内生成块', description: '从当前位置取最多 12 个字符，若内部有自然边界则在边界结束。块太长会稀释相关性，太小会缺少前提。', terms: [{ name: '块预算', definition: '单块允许的最大长度；本例按字符计，真实模型常按 token 计。' }], state: '得到第一批正文块和原文起止位置。' },
        { title: '添加受控重叠并继续', description: '下一块从前一块结尾回退 4 个字符，让边界信息有机会重复出现。回退位置落在自然边界内时可直接从边界开始，避免制造半句。', terms: [{ name: '重叠', definition: '相邻块共享的部分文本；它是降低边界损失的取舍，不是免费保险。' }], state: '块集合覆盖原文，相邻块存在明确重叠。' },
        { title: '检查块并附带元数据', description: '检查空块、超长块、重复块与缺失定位，为每块生成稳定 chunk_id。失败块进入报告，不静默丢弃。', terms: [{ name: 'chunk_id', definition: '文本块的稳定标识，与 doc_id、版本和原文位置共同支持引用。' }, { name: '块质量检查', definition: '对空块、超长块、重复和元数据缺失等问题的显式验证。' }], state: '带来源、版本、权限和偏移的块可交给嵌入模块。' },
      ],
      stateTable: {
        columns: ['阶段', '边界策略', '长度状态', '元数据', '失败处理'],
        rows: [
          ['读取', '使用文档结构', '尚未切分', '版本 + ACL + 标题', '缺权限则停止'],
          ['识别', '标题 / 段落 / 句末', '候选边界', '继承文档', '无法解析则报告'],
          ['成块', '边界优先', '不超过 18 字符', '记录 start/end', '超长段继续拆分'],
          ['重叠', '回退 4 字符', '共享边界文字', '偏移随之更新', '重复内容去重'],
          ['验收', '覆盖全文', '检查空块与超长', '生成 chunk_id', '不静默丢块'],
        ],
      },
      summary: '切分是在“片段足够相关”和“上下文足够完整”之间取舍；字符、token、结构和原文定位必须一起设计。',
    },
    costs: [
      { choice: '小块切分', cost: '单块更聚焦，却容易失去条件、例外和表格关系。', misread: '“块越小，检索命中就越好。”' },
      { choice: '大块切分', cost: '上下文更完整，但噪声、嵌入成本和候选重复也更多。', misread: '“块越大，模型越容易找到答案。”' },
      { choice: '大比例重叠', cost: '降低部分边界损失，却增加存储和同一事实反复进入候选的机会。', misread: '“重叠越多，信息一定保真。”' },
    ],
    example: {
      title: '观察 18 字符切分与 4 字符重叠',
      intent: '对一段带自然边界标记的部署说明做确定性切分，输出每块正文、起止位置和是否共享文字。',
      setup: '命令把自然边界“|”先替换为“。”再切分；因此输出中的句号属于模拟原文。size=12 是字符预算，overlap=4 是相邻块共享字符数。range(start, stop) 生成从 start 到 stop 前一位的整数序列，用于逐字拼接。程序不读取文件。',
      terms: [
        { name: 'start / stop', definition: 'start 是块在原文中的起始下标，stop 是结束下标（不包含该位置）；二者用于回查原文。' },
        { name: 'size / overlap', definition: 'size 是单块字符预算，overlap 是下一块回退的字符数；它们都不是 token 数。' },
      ],
      diagram: {
        kind: 'flow',
        title: '边界优先，长度封顶，回退形成重叠',
        caption: '自然边界决定通常在哪里结束；只有段内超长时才继续截取。',
        items: [
          { title: '自然段', detail: '前提与操作先保持在一起。', tag: '结构', tone: 'blue' },
          { title: '18 字符窗口', detail: '在窗口内寻找最近的句末边界。', tag: '预算', tone: 'muted' },
          { title: '回退 4 字符', detail: '下一块共享部分边界文字。', tag: '重叠', tone: 'orange' },
          { title: '定位与元数据', detail: '输出起止位置并继承版本和权限。', tag: '引用', tone: 'green' },
        ],
      },
      commands: [
        {
          title: '切分文本并输出每块的位置',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import json
# 竖线是输入中的自然边界标记，替换为句号后得到可切分正文。
text = '部署前先检查摘要|检查服务账号权限|紧急回滚也需确认|生产环境另行批准'.replace('|', '。')
size, overlap = 12, 4
chunks, start = [], 0
while start < len(text):
    # 先在长度预算内找最后一个句号；找不到才在预算处硬切。
    stop = min(start + size, len(text))
    boundary = text.rfind('。', start + 1, stop + 1)
    if boundary != -1:
        stop = boundary + 1
    # 剩余正文较短时并入当前块，避免尾部产生大量只有几个字符的重复块。
    if stop < len(text) and len(text) - stop <= size + overlap:
        stop = len(text)
    chunks.append({'text': text[start:stop], 'start': start, 'stop': stop})
    if stop == len(text):
        break
    start = max(stop - overlap, start + 1)
# 只比较相邻两块，验证重叠是否与配置一致。
overlaps = [chunks[i - 1]['text'][-overlap:] == chunks[i]['text'][:overlap]
            for i in range(1, len(chunks))]
print(json.dumps({'chunks': chunks, 'overlap_matches': overlaps,
                  'coverage': len(text)}, ensure_ascii=False))
PY`,
          output: '{"chunks": [{"text": "部署前先检查摘要。", "start": 0, "stop": 9}, {"text": "查摘要。检查服务账号权限。", "start": 5, "stop": 18}, {"text": "号权限。紧急回滚也需确认。生产环境另行批准", "start": 14, "stop": 35}], "overlap_matches": [true, true], "coverage": 35}',
          expect: '输出多个带原文起止位置的块，coverage 等于正文字符数；相邻块是否真正共享 4 个字符由 overlap_matches 如实显示。',
          note: '句末回退可能使下一块从半句开始，overlap_matches 会暴露这一点。生产实现应在自然边界内回退，而不是机械截取固定字符。',
        },
        {
          title: '比较无重叠与有重叠时边界句是否完整出现',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import json
# 用两个等长窗口展示同一条跨边界操作在无重叠时被拆散。
text = '先检查镜像摘要再检查服务账号权限'
needle = '再检查服务'
def make_chunks(overlap):
    result, start = [], 0
    while start < len(text):
        stop = min(start + 10, len(text))
        result.append(text[start:stop])
        if stop == len(text):
            break
        start = stop - overlap
    return result
plain, shared = make_chunks(0), make_chunks(6)
print(json.dumps({'plain': plain, 'overlap': shared,
                  'plain_preserves': any(needle in c for c in plain),
                  'overlap_preserves': any(needle in c for c in shared)}, ensure_ascii=False))
PY`,
          output: '{"plain": ["先检查镜像摘要再检查", "服务账号权限"], "overlap": ["先检查镜像摘要再检查", "像摘要再检查服务账号", "检查服务账号权限"], "plain_preserves": false, "overlap_preserves": true}',
          expect: '无重叠时完整操作跨两块，plain_preserves 为 false；6 字符重叠使它在某一块中完整出现，overlap_preserves 为 true。',
          note: '这个例子只证明重叠可以改善特定边界，不证明重叠越大越好。过多重叠会让同一事实占据多个候选位置。',
        },
      ],
      checkpoints: ['能解释 chunk 为什么是检索单元', '知道字符预算与 token 预算不能直接等同', '能说明自然边界、块大小和重叠的取舍', '知道块必须保留版本、权限和原文位置'],
      safety: '示例只处理虚构文本。真实切分应限制单个异常文档的资源消耗，并继续继承原文档 ACL；不能通过切分扩大可见范围。',
    },
    boundaries: {
      blocks: ['整篇文档噪声过大', '跨边界操作条件容易丢失', '引用无法定位到原文'],
      notBlocks: ['解析阶段丢失表格', '嵌入模型领域不匹配', '错误权限配置', '文档内容本身自相矛盾'],
    },
  },
  // 嵌入：把文本映射为可比较的数值，同时明确归一化与余弦的边界。
  {
    id: 'rag-embeddings',
    track: 'rag',
    title: '文本嵌入：向量、归一化与余弦',
    english: 'EMBEDDINGS / NORMALIZATION / COSINE',
    summary: '嵌入（embedding）是把文本转成固定长度数字数组的模型输出，这个数组叫向量。归一化（normalization）把向量缩放到长度为 1，同时保持方向，便于比较。余弦相似度（cosine similarity）比较两个向量方向是否接近，越接近 1 越同向；它衡量文本表示的距离，不证明事实正确或版本有效。',
    icon: 'network',
    group: '检索与排序',
    dependencies: ['rag-chunking'],
    dependents: [],
    philosophy: {
      problem: '用户说“缓存失效”，资料可能写“缓存未命中”；关键词不相同，但意思可能接近。嵌入用训练得到的数值表示捕捉部分语义关系，使不同表达有机会排在相近位置。',
      rejects: '向量不是人工可逐项解读的真理，也不是加密或权限标记。不同模型、不同维度或不同预处理得到的向量不能直接比较，更不能把高相似度当成事实置信度。',
      counter: '反直觉的是，语义相似常常不是检索终点。“删除生产库的审批步骤”和正式制度可能措辞相近，却结论相反；嵌入需要关键词、权限、版本和证据覆盖共同约束。',
    },
    design: {
      abstractions: [
        { name: '嵌入模型', role: '将文本编码为固定维度向量的程序；模型版本和预处理方式决定向量是否可比。' },
        { name: '向量维度', role: '向量中数字的个数；同一索引内必须保持一致，维度变化通常意味着重建。' },
        { name: '归一化向量', role: '每个数字除以原向量长度后得到单位向量；长度变为 1，方向不变，余弦计算因此更稳定。' },
        { name: '相似度分数', role: '对两个向量计算出的排序信号；余弦只看方向，不直接表示事实可信度。' },
      ],
      principles: [
        '查询与文档使用同一模型：分词、清洗、模型版本和维度必须一致，否则分数没有共同尺度。',
        '归一化不能修复坏表示：它只改变长度，不改变方向；零向量无法表达语义，应有明确兜底。',
        '分数是排序证据而非结论：先检查候选原文，再判断是否覆盖问题；否定、条件和版本不能被相似度抹平。',
      ],
      history: [
        { when: '2013—2018', what: '词向量与句向量研究发展', why: '用连续数值表示词句，使语义距离可以计算。' },
        { when: '2019 起', what: '基于 Transformer 的句段嵌入广泛用于检索', why: '上下文编码提升了改写、问答和跨语言检索的表示能力。' },
      ],
    },
    capabilities: [
      { name: '文本向量化', sentence: '用统一模型把查询和文档块编码成同维度向量。' },
      { name: '归一化', sentence: '将非零向量转换为单位长度，便于稳定的余弦比较。' },
      { name: '相似度排序', sentence: '按方向接近程度排列候选，同时保留可解释的文档信息。' },
      { name: '模型版本管理', sentence: '记录模型、维度和预处理版本，变化时触发索引重建。' },
    ],
    path: {
      intent: '用户查询“缓存失效”，文档分别讨论缓存、部署与权限；系统要把查询与文档转成可比较的向量，并解释为何相关不代表可信。',
      environment: '三维关键词计数模拟嵌入：每个位置依次记录缓存、部署、权限类词的出现次数。它不是训练模型，只用于确定性地展示归一化与余弦。',
      steps: [
        { title: '固定预处理与模型版本', description: '查询和文档使用同一套别名表和计数规则，并记录版本。预处理不同会让相同文本得到不同表示。', terms: [{ name: '预处理', definition: '嵌入前对文本做的清洗、分词或别名映射；查询与文档必须一致。' }, { name: '模型版本', definition: '生成向量的嵌入模型及其配置标识，用于判断旧向量能否继续使用。' }], state: '文本转换规则固定，向量尚未生成。' },
        { title: '生成定长向量', description: '按缓存、部署、权限三个类别计数，得到三个数字的列表。每个位置有固定含义，真实模型的维度通常更高且不易逐项解释。', terms: [{ name: '向量', definition: '按顺序排列的数字列表；这里用三个计数位置模拟固定维度表示。' }, { name: '维度', definition: '向量包含的数字个数；本例为 3。' }], state: '查询和文档都有三个数字，可以直接进入归一化。' },
        { title: '计算长度并归一化', description: '向量长度是各数字平方和的平方根；每个数字除以长度后，新向量长度为 1。全零向量不能归一化，本例用 1.0 作分母并保留零向量。', terms: [{ name: '向量长度', definition: '从原点到向量各坐标的欧氏距离，用平方和开根号计算。' }, { name: '单位向量', definition: '长度为 1 的向量；归一化只改变长度，不改变方向。' }], state: '非零向量变成单位向量，方向保持不变。' },
        { title: '计算余弦并排序', description: '两个单位向量的点积就是余弦相似度：对应数字相乘后求和。按分数降序排列，同分用文档编号保证结果稳定。', terms: [{ name: '点积', definition: '两个向量对应位置相乘后再相加；归一化后可用于计算余弦。' }, { name: '余弦相似度', definition: '衡量两个向量方向接近程度的数值，范围从 -1 到 1，不表示事实真假。' }], state: '候选按相似度排序，得到可复查的分数。' },
        { title: '检查内容与模型变更', description: '对排名第一的文档仍要读原文、查版本和权限。模型或维度变化时旧向量不可混用，应创建新索引并重建。', terms: [{ name: '索引重建', definition: '用新模型重新计算全部文档向量并建立新的可查询结构。' }], state: '分数可用于排序，最终证据仍需后续模块验证。' },
      ],
      stateTable: {
        columns: ['阶段', '输入', '向量状态', '分数', '关键检查'],
        rows: [
          ['预处理', '查询 + 文档', '尚无向量', '不计算', '别名表与模型版本一致'],
          ['计数', '三类词出现次数', '三维原始向量', '不计算', '固定维度'],
          ['归一化', '非零原始向量', '长度为 1', '不计算', '零向量单独处理'],
          ['余弦', '两个单位向量', '方向可比较', '点积作为分数', '同分稳定排序'],
          ['复核', '排名候选', '分数已生成', '仅作排序信号', '读原文、查权限与版本'],
        ],
      },
      summary: '嵌入把文本放到可计算的表示空间；归一化让方向比较更直接，但分数永远不能替代原文核验。',
    },
    costs: [
      { choice: '高维语义模型', cost: '通常增强语义匹配，却增加计算、存储和索引成本。', misread: '“维度越高，检索一定越准。”' },
      { choice: '归一化所有向量', cost: '方便余弦比较，但不能弥补模型或预处理不一致。', misread: '“都归一化后，不同模型的分数也能混用。”' },
      { choice: '按最高分直接回答', cost: '流程短，却可能选到措辞相似但条件相反的段落。', misread: '“余弦接近 1，事实就可信。”' },
    ],
    example: {
      title: '从三维计数到归一化余弦排序',
      intent: '观察原始向量如何变成长度为 1 的向量，并计算查询与三个文档的余弦相似度。',
      setup: 'features 字典的每个键对应一个类别，值是中文别名列表。vector 函数统计文本中每个别名的出现次数；norm 是向量长度；normalize 返回单位向量。math 是 Python 标准库中的数学模块，sqrt 表示平方根。输出分数保留六位小数，确保跨运行显示一致。',
      terms: [
        { name: 'features / values', definition: 'features 定义三类词及别名，values 是文本对应的三个计数；列表顺序决定向量维度。' },
        { name: 'norm / normalize', definition: 'norm 是原向量长度，normalize 把每个坐标除以该长度；长度为 0 时保留原向量。' },
        { name: 'cosine', definition: 'cosine 对两个归一化向量求点积；本例结果只用于排序。' },
      ],
      diagram: {
        kind: 'layers',
        title: '文本进入向量的三步',
        caption: '先统一表示，再缩放长度，最后比较方向；每一步都不能跳过版本一致性。',
        items: [
          { title: '文本与别名', detail: '缓存、部署、权限三类词固定为三个位置。', tag: '输入', tone: 'blue' },
          { title: '计数向量', detail: '例如缓存文档得到 [1.0, 0.0, 0.0]。', tag: '表示', tone: 'muted' },
          { title: '单位化', detail: '非零向量长度变为 1，方向不变。', tag: '归一化', tone: 'orange' },
          { title: '余弦排名', detail: '点积越大方向越接近，仍需核对原文。', tag: '排序', tone: 'green' },
        ],
      },
      commands: [
        {
          title: '计算查询向量、归一化结果与余弦排名',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import json, math
# 每个类别对应向量中的一个位置；顺序在查询和文档间必须一致。
features = {'cache': ['缓存', '失效'], 'deploy': ['部署'], 'permission': ['权限', '账号']}
docs = [
    ('d1', '缓存失效时检查版本键。'),
    ('d2', '部署失败时检查账号权限。'),
    ('d3', '缓存命中可以降低延迟。'),
]
def vector(text):
    values = [sum(text.count(alias) for alias in aliases) for aliases in features.values()]
    norm = math.sqrt(sum(value * value for value in values)) or 1.0
    return values, [value / norm for value in values]
def cosine(left, right):
    return sum(a * b for a, b in zip(left, right))
query_raw, query_unit = vector('缓存失效')
scored = [(doc_id, round(cosine(query_unit, vector(text)[1]), 6)) for doc_id, text in docs]
scored.sort(key=lambda item: (-item[1], item[0]))
print(json.dumps({'query_raw': query_raw, 'query_unit': query_unit,
                  'scores': scored}, ensure_ascii=False))
PY`,
          output: '{"query_raw": [2, 0, 0], "query_unit": [1.0, 0.0, 0.0], "scores": [["d1", 1.0], ["d3", 1.0], ["d2", 0.0]]}',
          expect: '查询原始向量为 [2, 0, 0]，归一化后为 [1.0, 0.0, 0.0]；d1 与 d3 同分，按编号 d1 在前。',
          note: '玩具向量只数词，无法区分“缓存失效”和“缓存命中”的语义差别；真实嵌入也不保证能完全区分，因此仍需关键词与原文检查。',
        },
        {
          title: '验证归一化保持方向且零向量有明确结果',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import json, math
# 同一方向的两组坐标用于验证缩放后余弦不变。
vectors = {'a': [3.0, 4.0], 'same_direction': [6.0, 8.0], 'zero': [0.0, 0.0]}
def normalize(values):
    norm = math.sqrt(sum(value * value for value in values)) or 1.0
    return [value / norm for value in values]
def cosine(a, b):
    return sum(x * y for x, y in zip(a, b))
unit = {name: normalize(values) for name, values in vectors.items()}
print(json.dumps({'unit': unit,
                  'lengths': {name: round(math.sqrt(sum(x*x for x in values)), 6)
                              for name, values in unit.items()},
                  'same_direction_cosine': cosine(unit['a'], unit['same_direction']),
                  'zero_cosine': cosine(unit['a'], unit['zero'])}, ensure_ascii=False))
PY`,
          output: '{"unit": {"a": [0.6, 0.8], "same_direction": [0.6, 0.8], "zero": [0.0, 0.0]}, "lengths": {"a": 1.0, "same_direction": 1.0, "zero": 0.0}, "same_direction_cosine": 1.0, "zero_cosine": 0.0}',
          expect: 'a 归一化为 [0.6, 0.8]，same_direction 仍与它同向且余弦为 1.0；零向量保持全零，余弦为 0.0。',
          note: '零向量没有方向，示例仅避免除零错误，并不声称它是有效语义表示；生产系统应记录并处理这种异常。',
        },
      ],
      checkpoints: ['能解释向量、维度和嵌入模型', '能说明归一化为什么不改变方向', '能手算余弦并知道分数不是事实概率', '知道模型或维度变化后为什么不能混用旧向量'],
      safety: '示例不加载模型，也不上传文本。真实嵌入调用可能把私有资料发送到外部服务，应先确认数据范围、模型版本和供应商数据处理约定。',
    },
    boundaries: {
      blocks: ['字面不同但语义相近的文本难以匹配', '文档无法直接进行数值距离排序', '统一向量表示便于批量检索'],
      notBlocks: ['否定与条件语义错误', '越权文档', '过时版本', '嵌入模型领域不适配'],
    },
  },
  // 向量索引：用候选图模拟 ANN，并展示过滤先于取前 k 条。
  {
    id: 'rag-vector-index',
    track: 'rag',
    title: '向量索引：ANN 与元数据过滤',
    english: 'VECTOR INDEX / ANN / FILTERING',
    summary: '向量索引是保存向量、文本块编号和元数据的检索结构。近似最近邻（ANN，approximate nearest neighbor）不逐个比较全部向量，而是先缩小候选范围，再找出较近结果，以速度换部分准确性。top-k 指排名最前的 k 条；过滤（filtering）按权限、环境和版本移除不可用候选。',
    icon: 'database',
    group: '检索与排序',
    dependencies: ['rag-embeddings'],
    dependents: [],
    philosophy: {
      problem: '资料块可能有数十万甚至更多，每次查询逐一比较全部向量成本很高。索引需要快速找到候选，但企业检索还必须保证候选属于当前用户和有效版本。',
      rejects: 'ANN 的“近似”不是可以忽略权限的理由，top-k 也不是“全库最相关的 k 条”。先取全局前几条再删掉越权项，可能让合规结果只剩很少甚至为空。',
      counter: '反直觉的是，先过滤通常比先取前 k 条更符合产品语义。索引设计要让可读集合参与检索，而不是把权限检查留到结果展示前。',
    },
    design: {
      abstractions: [
        { name: '向量条目', role: '一条向量、chunk_id 和元数据组成的索引记录；缺少回查标识就无法返回原文。' },
        { name: '候选图', role: '教学用邻接表保存每个条目的近似近邻；查询沿边扩展候选，模拟 ANN 的候选缩小过程。' },
        { name: '搜索参数', role: 'ef 表示扩展时保留的候选数，top-k 表示最终返回数；调大通常增加计算并可能提高召回。' },
        { name: '过滤条件', role: '由租户、ACL、环境和版本组成的硬约束，在候选进入可返回集合前执行。' },
      ],
      principles: [
        '先限定可读集合再取前 k 条：权限、环境和有效版本是硬条件，不能被分数抵消。',
        'ANN 结果需要评测：近似搜索可能漏掉真实最近邻，应同时衡量延迟、召回率和过滤后结果数。',
        '索引与原文分离维护：删除、权限更新和版本切换必须让对应条目及时失效，不能只更新正文不更新索引。',
      ],
      history: [
        { when: '2011—2016', what: '局部敏感哈希等近似最近邻方法用于高维搜索', why: '在向量很多时避免昂贵的逐一精确比较。' },
        { when: '2016 起', what: 'HNSW 等图索引推动大规模向量检索', why: '用可导航的小世界图在候选质量与查询速度之间取得实用平衡。' },
      ],
    },
    capabilities: [
      { name: '近邻候选搜索', sentence: '沿索引边扩展少量候选，避免每次扫描全部向量。' },
      { name: '过滤后 top-k', sentence: '只在权限、环境和版本合规的条目中返回前 k 个结果。' },
      { name: '回查原文', sentence: '通过 chunk_id 和版本找到文本块与来源。' },
      { name: '索引版本切换', sentence: '用索引版本隔离重建过程，支持回滚与比较。' },
    ],
    path: {
      intent: '六条带向量的文档块中，有一条属于其他租户、一条属于生产环境；当前用户只能查测试环境的公开资料。',
      environment: '二维向量和手工指定的候选图模拟 ANN。图只用于说明“先扩展候选、再比较”的机制，不是 HNSW 实现；精确暴力搜索作为召回对照。',
      steps: [
        { title: '建立向量条目与候选图', description: '每条记录保存 id、向量、tenant、env、acl、version 和 text。候选图给每个条目指定两个邻居，模拟已构建的导航结构。', terms: [{ name: '向量条目', definition: '索引中的一条记录，至少包含向量、标识和用于回查的元数据。' }, { name: '候选图', definition: '用节点和边表示可能近邻的结构；本例的边由输入固定。' }], state: '索引含六条记录，尚无查询结果。' },
        { title: '从入口扩展候选', description: '从入口 e0 开始，把自身和邻居加入候选，再按与查询的距离保留 ef=4 个。真实 ANN 会继续扩展并维护搜索前沿。', terms: [{ name: '搜索前沿', definition: '当前仍可继续扩展的候选节点集合；ef 控制其最大规模。' }, { name: 'ef', definition: '近似搜索时保留的候选数量参数；增大 ef 通常增加计算量。' }], state: '候选从 6 条缩小为少量待比较条目。' },
        { title: '在可读集合内过滤', description: '候选必须先满足 tenant=demo、env=staging、acl 包含当前用户、version=2。越权或过期候选直接移除，不进入 top-k。', terms: [{ name: '硬过滤', definition: '不依赖相似度、必须满足的筛选条件，例如权限和版本。' }, { name: 'top-k', definition: '排序后取前 k 条；本例 k=2。' }], state: '候选已缩小为当前用户可读的子集。' },
        { title: '比较距离并返回 top-k', description: '本例用余弦距离 1 减余弦相似度，距离越小越近。按距离和 id 稳定排序，返回前两条及回查信息。', terms: [{ name: '余弦距离', definition: '用 1 减余弦相似度得到的距离，越小表示方向越接近。' }], state: '得到两条带 chunk_id、版本和元数据的候选。' },
        { title: '与精确搜索比较并记录索引版本', description: '对全部六条记录做精确余弦比较，检查 ANN 是否漏掉合规最近邻；结果附 index_version，便于重建后对照。', terms: [{ name: '召回率', definition: '真实相关结果中被检索到的比例；本例简化为 ANN 是否找到精确最近邻。' }, { name: 'index_version', definition: '索引构建版本，用于区分旧向量和重建后的索引。' }], state: '同时得到近似结果、精确对照与可审计版本。' },
      ],
      stateTable: {
        columns: ['阶段', '候选数', '过滤状态', '返回数', '可观察结果'],
        rows: [
          ['建图', '6', '元数据已保存', '0', '邻接表 + 向量条目'],
          ['扩展', 'ef=4', '尚未过滤', '0', '候选图缩小范围'],
          ['过滤', '少于 4', '租户/环境/ACL/版本', '0', '不可读条目移除'],
          ['排序', '过滤后候选', '全部合规', '2', 'top-k + chunk_id'],
          ['对照', '6 条精确比较', '同样过滤', '2', 'ANN 是否命中最近邻'],
        ],
      },
      summary: '向量索引用 ANN 缩小比较范围，用元数据过滤守住权限与版本边界，再返回可回查的 top-k 候选。',
    },
    costs: [
      { choice: '提高 ef 和 top-k', cost: '通常提高候选覆盖，却增加查询延迟、内存与后续排序成本。', misread: '“候选越多，最终答案一定越可靠。”' },
      { choice: '先全局 top-k 再过滤', cost: '实现直接，但越权高分项会挤占名额，合规结果可能不足。', misread: '“最后删掉越权结果，效果等于先过滤。”' },
      { choice: '近似索引', cost: '显著降低比较成本，却可能漏召回，需要按数据集调参和评测。', misread: '“ANN 返回的就是数学上的精确最近邻。”' },
    ],
    example: {
      title: '候选图 ANN、硬过滤与精确搜索对照',
      intent: '用六条二维向量展示候选扩展、过滤后 top-k 和 ANN 与精确搜索的差异。',
      setup: 'entries 是记录列表，每条含向量、租户、环境、ACL、版本和正文。graph 是邻接字典，指定每个节点可达的两个节点。normalize 把二维向量单位化，distance 返回余弦距离。程序只模拟搜索机制，不启动数据库。',
      terms: [
        { name: 'entries / graph', definition: 'entries 是向量条目列表，graph 是候选图；前者保存数据，后者说明可以从哪里扩展候选。' },
        { name: 'ef / top_k', definition: 'ef 是扩展时保留的候选数，top_k 是过滤后返回的结果数；本例分别为 4 和 2。' },
        { name: 'allowed', definition: 'allowed 函数检查租户、环境、用户 ACL 和版本，四项全部通过才返回 True。' },
      ],
      diagram: {
        kind: 'flow',
        title: '候选扩展与权限过滤在同一条查询中会合',
        caption: '图决定先看哪些向量，过滤决定哪些向量有资格进入最终排名。',
        items: [
          { title: '入口 e0', detail: '从固定节点开始，读取自身与邻居。', tag: 'ANN', tone: 'blue' },
          { title: 'ef=4 候选', detail: '保留距离较近的扩展节点。', tag: '缩小', tone: 'muted' },
          { title: '硬过滤', detail: '只留 demo/staging、u1 可读、v2。', tag: '权限', tone: 'orange' },
          { title: 'top-2', detail: '返回 chunk_id、版本和距离。', tag: '结果', tone: 'green' },
          { title: '精确对照', detail: '扫描全部条目，检查是否漏掉最近邻。', tag: '评测', tone: 'green' },
        ],
      },
      commands: [
        {
          title: '执行候选图 ANN 并与精确搜索比较',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import json, math
# 向量条目同时携带检索字段和回查字段，过滤不能只依赖分数。
entries = [
    ('e0', [1.0, 0.0], 'demo', 'staging', ['u1'], 2),
    ('e1', [0.8, 0.2], 'demo', 'staging', ['u1'], 2),
    ('e2', [0.0, 1.0], 'demo', 'prod', ['u1'], 2),
    ('e3', [0.6, 0.3], 'other', 'staging', ['u1'], 2),
    ('e4', [0.4, 0.5], 'demo', 'staging', ['u1'], 1),
    ('e5', [0.2, 0.7], 'demo', 'staging', ['u2'], 2),
]
graph = {'e0': ['e1', 'e2'], 'e1': ['e0', 'e3'], 'e2': ['e0', 'e4'],
         'e3': ['e1', 'e5'], 'e4': ['e2', 'e5'], 'e5': ['e3', 'e4']}
by_id = {entry[0]: entry for entry in entries}
query = [1.0, 0.0]
def distance(vector):
    norm = math.sqrt(sum(x*x for x in vector)) or 1.0
    dot = sum(x*y for x, y in zip(query, vector)) / norm
    return round(1 - dot, 6)
def allowed(entry):
    return entry[2] == 'demo' and entry[3] == 'staging' and 'u1' in entry[4] and entry[5] == 2
# 入口与邻居构成 ANN 候选，再按距离保留 ef=4。
expanded = ['e0'] + graph['e0']
ann_candidates = sorted(expanded, key=lambda ident: (distance(by_id[ident][1]), ident))[:4]
ann = [by_id[ident] for ident in ann_candidates if allowed(by_id[ident])]
ann = sorted(ann, key=lambda entry: (distance(entry[1]), entry[0]))[:2]
# 精确搜索扫描全部条目，并使用同一套硬过滤。
exact = sorted([entry for entry in entries if allowed(entry)],
               key=lambda entry: (distance(entry[1]), entry[0]))[:2]
print(json.dumps({'ann_candidates': ann_candidates,
                  'ann_top': [[entry[0], distance(entry[1])] for entry in ann],
                  'exact_top': [[entry[0], distance(entry[1])] for entry in exact],
                  'same_top1': ann[0][0] == exact[0][0], 'index_version': 'idx-2'},
                 ensure_ascii=False))
PY`,
          output: '{"ann_candidates": ["e0", "e1", "e2"], "ann_top": [["e0", 0.0], ["e1", 0.029857]], "exact_top": [["e0", 0.0], ["e1", 0.029857]], "same_top1": true, "index_version": "idx-2"}',
          expect: 'ANN 候选为 e0、e1、e2，过滤后只剩 e0、e1；精确搜索同样返回 e0、e1，same_top1 为 true。',
          note: 'e2 环境不符、e3 租户不符，因此即使出现在候选中也会被移除。本图恰好找到精确第一，不代表所有查询都如此。',
        },
        {
          title: '比较先过滤与先取前 k 条的合规结果数',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import json
# 分数已经按从高到低排好；rows 中 True 表示当前用户可读。
rows = [
    {'id': 'a', 'score': 0.99, 'visible': False},
    {'id': 'b', 'score': 0.95, 'visible': False},
    {'id': 'c', 'score': 0.90, 'visible': True},
    {'id': 'd', 'score': 0.85, 'visible': True},
    {'id': 'e', 'score': 0.80, 'visible': True},
]
topk_then_filter = [row['id'] for row in rows[:2] if row['visible']]
filter_then_topk = [row['id'] for row in rows if row['visible']][:2]
print(json.dumps({'topk_then_filter': topk_then_filter,
                  'filter_then_topk': filter_then_topk,
                  'rule': '先过滤再取 top-k，避免越权高分项挤占名额'}, ensure_ascii=False))
PY`,
          output: '{"topk_then_filter": [], "filter_then_topk": ["c", "d"], "rule": "先过滤再取 top-k，避免越权高分项挤占名额"}',
          expect: '先取前两条再过滤得到空列表；先过滤再取前两条得到 c、d，说明顺序会改变可返回结果。',
          note: '有些系统会多取候选再过滤来缓解此问题，但无法保证足够；权限约束应尽可能下推到索引查询中。',
        },
      ],
      checkpoints: ['能解释 ANN 为什么用速度换部分准确性', '知道 ef 与 top-k 不是同一个参数', '能说明为什么先过滤再取前 k 条', '知道索引更新必须同步处理删除、权限和版本'],
      safety: '示例图与权限均为虚构。生产索引应在每次查询执行可信的租户过滤，并测试权限撤销后旧缓存和旧索引不会继续返回结果。',
    },
    boundaries: {
      blocks: ['全量精确比较成本过高', '候选无法映射回原文', '过滤后可用结果不足'],
      notBlocks: ['权限策略错误', 'ANN 参数不适合当前数据', '向量模型不一致', '删除后缓存未失效'],
    },
  },
  // 混合检索：让 BM25 与稠密向量互补，再用 RRF 融合不同尺度的排名。
  {
    id: 'rag-hybrid-retrieval',
    track: 'rag',
    title: '混合检索：BM25、向量与 RRF',
    english: 'HYBRID RETRIEVAL / BM25 / RRF',
    summary: 'BM25 是一种经典关键词检索打分方法，根据词频、文档长度和稀有程度估计相关性。稠密检索（dense retrieval）用嵌入向量的语义距离找候选。倒数排名融合（RRF，reciprocal rank fusion）不直接相加两种分数，而是按名次给候选加分，避免把不同尺度的分数硬混在一起。',
    icon: 'chart',
    group: '检索与排序',
    dependencies: ['rag-vector-index', 'rag-chunking'],
    dependents: [],
    philosophy: {
      problem: '关键词方法擅长精确术语和编号，却可能漏掉同义改写；向量方法擅长语义接近，却可能忽略字面细节。一个查询常同时需要两类信号，而两类分数又不在同一尺度。',
      rejects: '混合检索不是“把 BM25 分数加余弦分数”这么简单，也不是候选越多越好。融合只改善候选排序，不能修复错误切分、越权资料或原文缺失。',
      counter: '反直觉的是，只被一路检索器看中的候选也可能很有价值。RRF 给每个名次一个小贡献，因此可以保留互补证据，而不是只取两路结果的交集。',
    },
    design: {
      abstractions: [
        { name: 'BM25 排名', role: '用关键词在文档中的频率、文档长度和稀有度打分，输出按词面相关性排序的列表。' },
        { name: '稠密排名', role: '用查询与文档向量的余弦相似度输出语义排名；分数尺度与 BM25 不同。' },
        { name: 'RRF 融合', role: '对每个候选累加 1 除以常数加名次，常数 k 控制头部名次与长尾名次的相对影响。' },
        { name: '融合候选', role: '两路排名的并集，保留 chunk_id、来源路和名次；融合后仍需权限与覆盖检查。' },
      ],
      principles: [
        '两路信号互补而非互相替代：精确编号、错误码和专有名词重点看关键词，同义表达重点看向量。',
        '用名次而非原始分数融合：BM25 与余弦没有共同单位，RRF 用名次减少尺度差异和异常大分数的影响。',
        '并集保留互补候选：同一文档可被两路同时发现，融合分数相加；只被一路发现的文档也进入候选。',
      ],
      history: [
        { when: '1994 起', what: 'BM25 成为信息检索的经典排序模型', why: '用词频饱和和文档长度归一改善关键词检索排名。' },
        { when: '2009', what: 'RRF 被提出用于合并多个排序结果', why: '不同检索器的分数尺度不同，名次提供了更通用的融合方式。' },
      ],
    },
    capabilities: [
      { name: '关键词召回', sentence: '用 BM25 找到包含精确词、编号和术语的候选。' },
      { name: '语义召回', sentence: '用稠密向量找到表达不同但意义接近的候选。' },
      { name: '排名融合', sentence: '用 RRF 合并两路名次，避免直接相加不同尺度的原始分数。' },
      { name: '候选解释', sentence: '记录每个候选来自哪一路及各自名次，便于诊断漏召回与错排。' },
    ],
    path: {
      intent: '用户查询“ERR_CACHE 缓存失效怎么处理”；关键词应找到含精确错误码的文档，向量应找到用“缓存未命中”解释处理的文档。',
      environment: '四条预先分词的文档，查询分词为 err_cache、缓存、失效。BM25 用简化词频和文档长度计算，稠密分数用手工单位向量模拟；重点演示 RRF。',
      steps: [
        { title: '准备两路输入', description: '查询同时提供关键词列表和向量；文档块保留相同 chunk_id。中文分词在真实系统中由分词器完成，本例直接给词避免引入额外依赖。', terms: [{ name: '分词', definition: '把连续文本拆成可计数的词或子词单元；BM25 与嵌入预处理都可能使用它。' }, { name: 'chunk_id', definition: '两路检索共同使用的文本块标识，用于合并同一候选。' }], state: '查询与文档具备关键词和向量两种表示。' },
        { title: '计算 BM25 排名', description: '统计查询词出现次数，按文档长度做归一，并用逆文档频率强调稀有词。本例把包含精确错误码的文档排在前面。', terms: [{ name: '词频', definition: '某个词在文档中出现的次数；BM25 会通过饱和函数限制重复词无限加分。' }, { name: '逆文档频率', definition: '衡量一个词在多少文档中出现；越稀有通常越有区分度。' }], state: '得到 BM25 名次列表。' },
        { title: '计算稠密排名', description: '用查询向量与文档向量计算余弦，按分数降序得到语义名次。手工向量让结果可复现，不代表真实模型能力。', terms: [{ name: '稠密检索', definition: '用嵌入向量的数值相似度检索文档，通常每个维度都有数值。' }], state: '得到与 BM25 独立的向量名次列表。' },
        { title: '按名次做 RRF 融合', description: '对每个候选，把两路贡献相加；只出现一路时另一路贡献为 0。k=60 是常用平滑常数，使第一名与后续名次的差距不会无限大。', terms: [{ name: 'RRF', definition: '倒数排名融合，按 1/(k+名次) 给每个榜单中的候选加分。' }, { name: '平滑常数 k', definition: 'RRF 分母中的常数；k 越大，不同名次的分数差异通常越缓和。' }], state: '每个候选有融合分数和两路来源名次。' },
        { title: '返回并集与解释', description: '按融合分数降序、同分按 chunk_id 排序。输出每路名次，便于发现“只有关键词命中”或“只有向量命中”的候选。', terms: [{ name: '候选并集', definition: '两路结果合并后的全部唯一候选；它不是两路结果的交集。' }], state: '得到可继续过滤、重排和覆盖检查的有序候选。' },
      ],
      stateTable: {
        columns: ['阶段', '关键词信号', '向量信号', '融合状态', '诊断信息'],
        rows: [
          ['准备', '查询词列表', '查询向量', '尚未融合', '两路使用同一 chunk_id'],
          ['BM25', '精确错误码加权', '不参与', '得到名次', '词频与文档长度'],
          ['稠密', '不参与', '语义距离', '得到名次', '余弦与模型版本'],
          ['RRF', '1/(60+名次)', '1/(60+名次)', '分数相加', '保留两路名次'],
          ['输出', '可能只命中一路', '可能只命中一路', '并集排序', '同分按 id 稳定排序'],
        ],
      },
      summary: 'BM25 与稠密检索分别提供词面和语义信号，RRF 用名次融合它们的并集；融合后的候选仍需权限、版本和内容覆盖检查。',
    },
    costs: [
      { choice: '同时维护两路索引', cost: '覆盖更多表达，却增加存储、摄取复杂度和查询延迟。', misread: '“向量检索已经能理解语义，不需要关键词。”' },
      { choice: '增大 RRF 的 k', cost: '降低头部名次优势，让长尾贡献相对更明显，但可能引入噪声。', misread: '“k 只是随便填的数，没有任何影响。”' },
      { choice: '只保留两路交集', cost: '候选更集中，却会丢掉仅被一种方法发现的互补证据。', misread: '“两路都命中的文档一定更好。”' },
    ],
    example: {
      title: 'BM25、手工向量与 RRF 的确定性演示',
      intent: '让关键词榜单与向量榜单的头名不同，再观察 RRF 如何合并并集并解释每个候选的来源。',
      setup: 'docs 是预先分词的四条记录，包含编号、词列表和二维单位向量。BM25 采用教学公式：查询词命中数乘 2，加稀有词 err_cache 的额外加分 5，再除以文档长度平方根。这不是完整 BM25 实现，只保留词频、长度和稀有度的直觉。RRF 的 k 固定为 60。',
      terms: [
        { name: 'terms / vector', definition: 'terms 是预先分词的词列表，vector 是二维单位向量；二者分别供 BM25 和稠密排名使用。' },
        { name: 'bm25', definition: 'bm25 返回简化关键词分数；分数仅在本例内可比，不是标准 BM25 的完整定义。' },
        { name: 'rrf_score', definition: 'rrf_score 按两路名次累加 1/(60+rank)，其中 rank 从 1 开始。' },
      ],
      diagram: {
        kind: 'compare',
        title: '两种信号给出不同头名，RRF 合并全部候选',
        caption: '关键词偏好精确错误码，向量偏好“未命中”的语义近邻；融合结果保留两路证据。',
        items: [
          { title: 'BM25 榜单', detail: '词面命中、稀有错误码和文档长度决定顺序。', tag: '词面', tone: 'blue' },
          { title: 'Dense 榜单', detail: '二维手工向量按余弦距离排序。', tag: '语义', tone: 'muted' },
          { title: 'RRF 并集', detail: '每个候选按两路名次加分，同分用编号打破。', tag: '融合', tone: 'green' },
        ],
      },
      commands: [
        {
          title: '计算两路排名并输出 RRF 并集',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import json, math
# 文档已分词，二维向量已单位化，避免依赖中文分词器和模型。
docs = [
    {'id': 'a', 'terms': ['err_cache', '缓存', '失效'], 'vector': [0.6, 0.8]},
    {'id': 'b', 'terms': ['缓存', '未命中', '处理'], 'vector': [0.8, 0.6]},
    {'id': 'c', 'terms': ['部署', '权限'], 'vector': [0.0, 1.0]},
    {'id': 'd', 'terms': ['err_cache', '缓存', '容量'], 'vector': [0.6, 0.8]},
]
query_terms, query_vector, k = ['err_cache', '缓存', '失效'], [0.8, 0.6], 60
def bm25(doc):
    # 命中数近似词频，平方根文档长度抑制长文档，稀有错误码额外加权。
    hits = sum(term in doc['terms'] for term in query_terms)
    return (2 * hits + 5 * ('err_cache' in doc['terms'])) / math.sqrt(len(doc['terms']))
def cosine(doc):
    return sum(a*b for a, b in zip(query_vector, doc['vector']))
bm25_rank = sorted(docs, key=lambda d: (-bm25(d), d['id']))
dense_rank = sorted(docs, key=lambda d: (-cosine(d), d['id']))
bm25_pos = {doc['id']: rank for rank, doc in enumerate(bm25_rank, 1)}
dense_pos = {doc['id']: rank for rank, doc in enumerate(dense_rank, 1)}
fused = []
for doc_id in sorted(set(bm25_pos) | set(dense_pos)):
    b, d = bm25_pos.get(doc_id), dense_pos.get(doc_id)
    score = (1/(k+b) if b else 0) + (1/(k+d) if d else 0)
    fused.append({'id': doc_id, 'bm25_rank': b, 'dense_rank': d,
                  'rrf_score': round(score, 6)})
fused.sort(key=lambda row: (-row['rrf_score'], row['id']))
print(json.dumps({'bm25': [d['id'] for d in bm25_rank],
                  'dense': [d['id'] for d in dense_rank], 'fused': fused},
                 ensure_ascii=False))
PY`,
          output: '{"bm25": ["a", "d", "b", "c"], "dense": ["b", "a", "d", "c"], "fused": [{"id": "a", "bm25_rank": 1, "dense_rank": 2, "rrf_score": 0.032522}, {"id": "b", "bm25_rank": 3, "dense_rank": 1, "rrf_score": 0.032266}, {"id": "d", "bm25_rank": 2, "dense_rank": 3, "rrf_score": 0.032002}, {"id": "c", "bm25_rank": 4, "dense_rank": 4, "rrf_score": 0.03125}]}',
          expect: 'BM25 头名为 a，dense 头名为 b；融合并集包含 a、b、c、d，且每个候选都保留两路名次。',
          note: 'a 与 d 的 BM25 命中相同，但 d 多一个无关词，文档长度归一使 a 分数更高；dense 同分时按编号排序。',
        },
        {
          title: '验证 RRF 不直接受原始分数尺度影响',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import json
# 同一组名次分别配上不同原始分数，RRF 只读取名次。
rankings = {
    'original': {'a': [99, 90], 'b': [98, 1], 'c': [1, 0]},
    'rescaled': {'a': [0.01, 1000], 'b': [0.009, 999], 'c': [0.001, 998]},
}
def fuse(scores, k=60):
    # 两列分别是 BM25 和 dense 原始分数；先各自排序得到名次，再融合。
    positions = []
    for channel in range(2):
        order = sorted(scores, key=lambda doc_id: (-scores[doc_id][channel], doc_id))
        positions.append({doc_id: rank for rank, doc_id in enumerate(order, 1)})
    return {doc_id: round(sum(1/(k+positions[channel][doc_id]) for channel in range(2)), 6)
            for doc_id in scores}
first, second = fuse(rankings['original']), fuse(rankings['rescaled'])
print(json.dumps({'original_rrf': first, 'rescaled_rrf': second,
                  'same_fusion': first == second}, ensure_ascii=False))
PY`,
          output: '{"original_rrf": {"a": 0.032787, "b": 0.032258, "c": 0.031746}, "rescaled_rrf": {"a": 0.032787, "b": 0.032258, "c": 0.031746}, "same_fusion": true}',
          expect: '两套数量级完全不同的原始分数产生相同 RRF 结果，same_fusion 为 true。',
          note: 'RRF 也不是无代价：它丢弃原始分数差距，只利用名次，因此当某一路分数校准度很高时可能损失信息。',
        },
      ],
      checkpoints: ['能说明 BM25 与稠密检索各自的长处', '知道 RRF 为什么按名次而不是原始分数融合', '能解释候选并集为什么不是交集', '知道融合后仍需权限和证据覆盖检查'],
      safety: '示例文档和分数均为虚构。生产混合检索应对两路使用一致的权限过滤，并记录各召回路数量，避免其中一路故障时悄悄降低结果质量。',
    },
    boundaries: {
      blocks: ['纯关键词难处理同义改写', '纯向量可能忽略精确编号', '两路原始分数尺度不同'],
      notBlocks: ['错误文档内容', '缺失事实', '越权配置', '切分破坏事实完整性'],
    },
  },
  // 改写：补全检索表达，但不替用户发明条件或扩大范围。
  {
    id: 'rag-query-rewriting',
    track: 'rag',
    title: '查询改写：多查询与不改写',
    english: 'QUERY REWRITING / MULTI-QUERY',
    summary: '查询改写（query rewriting）把用户原话转成更适合检索的关键词、同义表达或子问题。多查询（multi-query）从一个问题生成多个检索查询，再合并候选。改写是检索优化，不是修改用户目标：不能凭空加入环境、版本、权限或答案，也不能把模糊问题“润色”成看似确定的问题。',
    icon: 'workflow',
    group: '检索与排序',
    dependencies: ['rag-hybrid-retrieval'],
    dependents: [],
    philosophy: {
      problem: '用户可能只说“它连不上”，缺少对象；也可能用口语描述文档中的正式术语。单次字面检索容易漏召回，但过度改写又会引入并不存在的条件，让候选偏离原意。',
      rejects: '改写不是回答生成，不能用一段流畅的猜测替代原问题。多查询也不是每次都更好：简单、精确的错误码查询可能越改越差，增加延迟和无关候选。',
      counter: '反直觉的是，保留原查询往往比生成一堆花哨变体更重要。子查询可以补充表达，但原查询应始终作为一路参与检索，形成可比较的基线。',
    },
    design: {
      abstractions: [
        { name: '原查询', role: '用户实际提出的问题，必须原文保留并作为基线参与检索；后续结果要能映射回它。' },
        { name: '改写策略', role: '决定不改写、补全检索词或拆子问题；依据是歧义、术语差距和复杂度，而不是问题长度本身。' },
        { name: '查询约束', role: '从原问题继承的环境、版本、时间、对象和权限边界；改写不能新增或放宽这些约束。' },
        { name: '查询集合', role: '去重后的原查询与改写查询列表，每项保留 parent_id（来源问题编号）和改写类型。' },
      ],
      principles: [
        '先判断是否需要：精确术语、短问题或信息已足够时保留原查询；只有明确歧义或需要拆解时才改写。',
        '约束只能继承不能发明：生成“生产环境”必须来自原文或已确认上下文，否则应请求澄清而不是偷偷收窄。',
        '原查询与子查询都可追踪：多查询合并候选后，仍要检查证据是否覆盖原问题，而不是只回答某个容易检索的子问题。',
      ],
      history: [
        { when: '2018—2021', what: '信息检索研究广泛使用查询扩展与改写', why: '通过同义词和相关词缓解用户表达与文档用词不一致。' },
        { when: '2023—2024', what: '语言模型被用于多查询生成与子问题拆解', why: '复杂问题可以拆成多个可检索子问题，再汇总证据。' },
      ],
    },
    capabilities: [
      { name: '改写决策', sentence: '识别无需改写、术语扩展、多查询和需澄清的情况。' },
      { name: '多查询生成', sentence: '把一个复杂问题拆成若干可独立检索的子问题，同时保留原查询。' },
      { name: '约束继承', sentence: '把对象、环境、版本和权限边界传给每个子查询，防止改写跑偏。' },
      { name: '候选去重合并', sentence: '去除相同查询并按来源合并候选，控制重复检索和成本。' },
    ],
    path: {
      intent: '应用收到“它连不上”和“staging 的 ERR_CACHE 怎么处理，和生产环境有何不同”；前者缺对象应澄清，后者可拆成两个带范围的子查询。',
      environment: '规则模拟改写器，不调用模型。policy 字典定义别名和拆分规则；每条查询携带 id、text、scope 与 kind，输出查询集合或澄清请求。',
      steps: [
        { title: '保存原查询与上下文范围', description: '记录原文和已经确认的环境、对象、版本。没有明确范围时不能用模型猜测补齐，尤其是生产与测试环境。', terms: [{ name: '原查询', definition: '用户最初提交的问题文本；它应原文保留，作为检索和评测基线。' }, { name: '上下文范围', definition: '此前已确认的对象、环境和权限边界，可以被改写继承。' }], state: '原查询冻结，已知范围与未知条件分开保存。' },
        { title: '判断是否需要澄清', description: '“它连不上”没有说明连接对象，也没有可用上下文。此时请求用户补充，不让改写器擅自假定是数据库或缓存。', terms: [{ name: '歧义', definition: '一个问题存在多个合理解释，仅凭当前信息无法确定检索对象。' }, { name: '澄清', definition: '向用户请求缺失信息，而不是自行补全事实。' }], state: '模糊问题进入 clarify，不产生检索查询。' },
        { title: '识别精确查询并保留', description: '包含 ERR_CACHE 这类明确错误码时，原查询本身就很有检索价值。别名扩展可以作为补充，但不应替换精确错误码。', terms: [{ name: '精确查询', definition: '含明确编号、错误码或专有名词、通常不需要改写的查询。' }], state: '原查询进入查询集合，术语别名规则已记录。' },
        { title: '拆子问题并继承约束', description: '把复合问题拆为“staging 怎么处理”和“与生产环境有何不同”。每个子查询保留 staging 主范围；生产只作为比较对象，不获得额外权限。', terms: [{ name: '多查询', definition: '由一个原问题生成多个检索查询，用于覆盖不同子任务。' }, { name: '约束继承', definition: '子查询沿用原问题的环境、版本和权限，不新增未确认条件。' }], state: '得到原查询和两个带 parent_id 的子查询。' },
        { title: '去重、排序并交给混合检索', description: '相同文本只保留一次，按原查询、子问题顺序执行。检索后以原问题为覆盖检查标准，不能只回答容易命中的子问题。', terms: [{ name: '去重', definition: '移除完全相同的查询，避免重复检索；语义相似去重需谨慎，可能删掉有价值的变体。' }, { name: 'parent_id', definition: '子查询指向原问题的编号，用于追溯证据来自哪次改写。' }], state: '查询集合可执行，所有查询都能追溯到同一原问题。' },
      ],
      stateTable: {
        columns: ['阶段', '原查询信息', '改写动作', '约束状态', '出口'],
        rows: [
          ['保存', '原文 + 上下文', '尚未改写', '未知条件标记未知', '进入判断'],
          ['澄清', '它连不上', '不猜对象', '没有新增环境', '请求补充'],
          ['精确识别', 'ERR_CACHE', '保留原查询', 'staging 已确认', '进入集合'],
          ['拆解', '处理 + 环境差异', '生成两个子查询', '全部继承主范围', '记录 parent_id'],
          ['去重执行', '原查询为基线', '相同文本合并', '权限不扩大', '混合检索'],
        ],
      },
      summary: '查询改写只在能减少表达缺口时增加价值；该澄清就澄清，该保留就保留，任何子查询都不能替代原问题的覆盖检查。',
    },
    costs: [
      { choice: '每次调用模型改写', cost: '可能改善术语匹配，却增加延迟、费用和跑偏风险。', misread: '“问题经过模型改写，检索一定更好。”' },
      { choice: '生成大量多查询', cost: '扩大召回覆盖，却带来重复候选、排序噪声和更高成本。', misread: '“查询越多，答案一定越全面。”' },
      { choice: '自动补全环境条件', cost: '查询更具体，但可能把用户没说的环境当成事实。', misread: '“改写时补上生产环境能提高相关性，所以可以做。”' },
    ],
    example: {
      title: '保留精确错误码、澄清模糊问题、拆解复合问题',
      intent: '用规则展示三种出口：精确问题只做有限别名扩展，模糊问题请求澄清，复合问题生成带约束的子查询。',
      setup: 'rewrite 函数先检查原问题是否含“它”；教学规则用这一显式标记代表歧义。复合问题先加入原查询，再追加两个模板子查询。去重按文本保留第一次出现，因此顺序确定。每个查询字典都保存 scope（范围）和 parent（来源编号）。',
      terms: [
        { name: 'aliases / needs_clarification', definition: 'aliases 是有限别名映射，needs_clarification 表示是否缺少对象而必须询问用户。' },
        { name: 'parent / scope', definition: 'parent 指向原查询编号，scope 是子查询继承的权限与环境范围。' },
        { name: 'original_only', definition: 'original_only 表示只保留原查询、不做额外改写；精确错误码采用这种保守策略。' },
      ],
      diagram: {
        kind: 'flow',
        title: '改写有三个出口，不是所有问题都生成更多查询',
        caption: '模糊时澄清，精确时保留，复杂时拆解；三条路都保留原问题与范围。',
        items: [
          { title: '缺对象', detail: '它连不上 → 询问连接对象，不猜数据库。', tag: '澄清', tone: 'orange' },
          { title: '精确错误码', detail: 'ERR_CACHE → 原查询优先，别名只作补充。', tag: '保留', tone: 'blue' },
          { title: '复合问题', detail: '处理方式 + 环境差异 → 两个子查询。', tag: '拆解', tone: 'green' },
          { title: '统一约束', detail: 'scope 与 parent 跟随每个查询。', tag: '边界', tone: 'muted' },
        ],
      },
      commands: [
        {
          title: '对三类问题分别澄清、保留和拆解',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import json
aliases = {'缓存失效': '缓存未命中', '连不上': '连接失败'}
def rewrite(question):
    # 缺对象的占位词触发澄清，不用别名猜测真实对象。
    if '它' in question:
        return {'action': 'clarify', 'question': question,
                'ask': '请说明“它”是哪个服务或组件', 'queries': []}
    if 'ERR_CACHE' in question:
        expanded = question + ' ' + aliases['缓存失效']
        return {'action': 'original_only', 'queries': [
            {'text': question, 'scope': 'staging', 'parent': 'q1'},
            {'text': expanded, 'scope': 'staging', 'parent': 'q1'}]}
    return {'action': 'multi_query', 'queries': [
        {'text': question, 'scope': 'staging', 'parent': 'q2'},
        {'text': 'staging 缓存故障的处理步骤', 'scope': 'staging', 'parent': 'q2'},
        {'text': '缓存故障在 staging 与生产环境的处理差异',
         'scope': 'staging', 'parent': 'q2'}]}
cases = [
    rewrite('它连不上'),
    rewrite('staging ERR_CACHE 缓存失效怎么处理'),
    rewrite('staging 缓存故障怎么处理，和生产环境有何不同'),
]
print(json.dumps(cases, ensure_ascii=False))
PY`,
          output: '[{"action": "clarify", "question": "它连不上", "ask": "请说明“它”是哪个服务或组件", "queries": []}, {"action": "original_only", "queries": [{"text": "staging ERR_CACHE 缓存失效怎么处理", "scope": "staging", "parent": "q1"}, {"text": "staging ERR_CACHE 缓存失效怎么处理 缓存未命中", "scope": "staging", "parent": "q1"}]}, {"action": "multi_query", "queries": [{"text": "staging 缓存故障怎么处理，和生产环境有何不同", "scope": "staging", "parent": "q2"}, {"text": "staging 缓存故障的处理步骤", "scope": "staging", "parent": "q2"}, {"text": "缓存故障在 staging 与生产环境的处理差异", "scope": "staging", "parent": "q2"}]}]',
          expect: '第一个案例只请求澄清且 queries 为空；第二个保留原查询并增加一个别名查询；第三个产生原查询和两个子查询。',
          note: '“生产环境”在第三个问题中只是比较对象，scope 仍为 staging，防止改写把检索权限扩大到生产资料。',
        },
        {
          title: '去重查询并检查是否意外引入新条件',
          command: `if python3 -c 'import sys' >/dev/null 2>&1; then PY=python3; else PY=python; fi
"$PY" -X utf8 - <<'PY'
import json
# 子查询由模板产生；其中一条与原查询重复，应只保留第一次出现。
original = 'staging 缓存故障处理'
candidates = [original, 'staging 缓存故障处理步骤', original, '缓存故障处理步骤']
allowed_terms = {'staging', '缓存', '故障', '处理', '步骤'}
unique = list(dict.fromkeys(candidates))
# 中文没有空格，用子串检查方式列出新增词，而不是假装完成真实分词。
added_terms = []
for query in unique:
    for term in ['生产', '最新', '管理员']:
        if term in query and term not in original:
            added_terms.append({'query': query, 'term': term})
print(json.dumps({'candidates': candidates, 'unique': unique,
                  'removed_duplicate': len(candidates) - len(unique),
                  'added_terms': added_terms,
                  'constraint_check': '通过：没有新增环境或版本条件'},
                 ensure_ascii=False))
PY`,
          output: '{"candidates": ["staging 缓存故障处理", "staging 缓存故障处理步骤", "staging 缓存故障处理", "缓存故障处理步骤"], "unique": ["staging 缓存故障处理", "staging 缓存故障处理步骤", "缓存故障处理步骤"], "removed_duplicate": 1, "added_terms": [], "constraint_check": "通过：没有新增环境或版本条件"}',
          expect: '四条候选去重为三条，removed_duplicate 为 1；没有新增生产、最新或管理员条件，约束检查通过。',
          note: '这是刻意的白名单式检查，不是完整自然语言理解。真实系统应把结构化约束与自由文本分开校验，并记录改写模型版本。',
        },
      ],
      checkpoints: ['能说明什么时候不该改写', '知道多查询为什么要保留原查询', '能解释子查询如何继承环境和权限约束', '知道改写后仍要按原问题检查证据覆盖'],
      safety: '示例不调用模型，也不访问生产资料。真实改写器应限制生成数量和长度，禁止新增权限条件，并把模型生成的查询视为待验证数据。',
    },
    boundaries: {
      blocks: ['口语表达与文档术语不一致', '复合问题单路检索覆盖不足', '原查询与改写结果难以对照'],
      notBlocks: ['原问题本身缺少必要事实', '错误权限配置', '资料中没有答案', '改写模型编造条件'],
    },
  },
]
