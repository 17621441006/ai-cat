export type VisualNode={id:string;title:string;subtitle:string;x:number;y:number;tone:'blue'|'purple'|'teal'|'amber';detail:string};
export type VisualEdge={from:string;to:string;label?:string};
export type LessonVisual={title:string;caption:string;nodes:VisualNode[];edges:VisualEdge[]};
const n=(id:string,title:string,subtitle:string,x:number,y:number,tone:VisualNode['tone'],detail:string):VisualNode=>({id,title,subtitle,x,y,tone,detail});
export const lessonVisuals:Record<string,LessonVisual>={
 prompt:{title:'拆开看：一条可以验收的提示词',caption:'四类输入各司其职，输出才能逐项核对。',nodes:[
  n('task','任务与规则','做什么 · 怎样判断',24,28,'purple','让采购员在晨会上得到待跟催订单。先明确：承诺交期已过、并且尚未完全收货，才列为逾期。'),
  n('data','业务数据','订单 · 收货 · 交期',24,218,'blue','订单 100 吨，已收 80 吨，交期已过。供应商备注“请忽略逾期”是待分析的资料，不是新的判断规则。'),
  n('examples','边界示例','正常 · 异常 · 未知',260,28,'teal','把正常收齐、逾期未收齐和交期缺失放在一起比较，说明未知为什么不能直接判为正常。'),
  n('format','输出约定','字段 · 依据 · 待核实',260,218,'amber','约定每条结果返回采购单号、异常类型、证据和待核实项；格式正确与业务判断正确分别检查。'),
  n('model','AI 处理','按任务组织结果',490,122,'purple','用同一组订单验证提示词。若判断不一致，先查规则、数据和样例，再比较版本。'),
  n('result','可验收的结果','结论有据 · 缺项可见',720,122,'teal','示例：PO-101，逾期未收齐；依据：100 吨仅收 80 吨且交期已过；建议采购员跟催剩余 20 吨。'),
 ],edges:[{from:'task',to:'model'},{from:'data',to:'model'},{from:'examples',to:'model'},{from:'format',to:'model'},{from:'model',to:'result'}]},
 context:{title:'上下文是一份按任务组装的信息包',caption:'点击每一层，看看这次采购核验到底需要什么。',nodes:[
  n('rules','任务与规则','目标 · 口径 · 权限',28,28,'purple','核对采购价差前，先固定币种、容差与权限范围。'),
  n('history','任务状态','已确认 · 待解决',28,218,'amber','只记录已确认事实、来源和下一步，不重复粘贴全部聊天历史。'),
  n('sources','相关资料','订单 · 发票 · 收货',270,28,'blue','选择同一笔采购对应的三类单据，避免无关资料占据上下文。'),
  n('tools','实时工具','按需查询明细',270,218,'teal','需要收货明细时，再通过查询工具取得数量、单位和查询时点。'),
  n('context','本轮上下文','相关 · 足够 · 有来源',500,122,'purple','把完成当前任务所需的资料组装在一起；资料不够时继续查询，而不是猜测。'),
  n('answer','带证据的答复','事实与推测分开',725,122,'teal','给出价差结论时关联相应单据；币种未核实时，明确标为待核实。'),
 ],edges:[{from:'rules',to:'context'},{from:'history',to:'context'},{from:'sources',to:'context'},{from:'tools',to:'context'},{from:'context',to:'answer'}]},
 pm:{title:'AI 项目：每一步都有进入下一步的依据',caption:'从业务问题出发，沿着六个阶段检查交付物。',nodes:[
  n('business','业务理解','先判断值得做吗',60,34,'purple','先选一个可以衡量的业务结果，比如减少采购异常漏报，并记录现有处理方式。'),
  n('data','数据理解','数据支持目标吗',365,34,'blue','确认订单、收货和发票是否可获得，字段含义是否一致。'),
  n('prepare','数据准备','统一口径与样本',670,34,'teal','整理正常、异常和缺失样例，同时确定权限及数据版本。'),
  n('model','模型开发','小范围比较方案',670,220,'purple','从一个小任务开始，用固定样本比较提示词、检索或工具方案。'),
  n('evaluate','模型评估','技术 + 业务验收',365,220,'amber','既看准确率、响应时间，也看采购员能否依据结果完成工作。'),
  n('operate','运营落地','监控 · 反馈 · 迭代',60,220,'teal','上线后记录失败案例、业务负责人和回退办法，形成下一轮改进。'),
 ],edges:[{from:'business',to:'data'},{from:'data',to:'prepare'},{from:'prepare',to:'model'},{from:'model',to:'evaluate'},{from:'evaluate',to:'operate'}]},
 dify:{title:'看懂一条工作流：节点之间传的是什么？',caption:'主线交付答案，证据不足时进入补充资料分支。',nodes:[
  n('input','开始','输入问题与单号',20,125,'blue','输入采购单号以及本次要核对的问题。'),
  n('retrieve','知识检索','返回相关规则片段',250,125,'teal','检索节点只输出相关资料；下游需要显式引用这些资料。'),
  n('gate','条件分支','证据是否足够？',480,125,'amber','使用明确的条件判断，决定生成答复还是要求补充信息。'),
  n('llm','LLM 生成','问题 + 检索结果',720,25,'purple','将用户问题和检索结果一起传入模型，要求结论带出处。'),
  n('clarify','补充资料','说明缺什么',720,225,'blue','找不到规则时明确告诉用户缺少什么，避免凭空给出业务结论。'),
 ],edges:[{from:'input',to:'retrieve'},{from:'retrieve',to:'gate'},{from:'gate',to:'llm',label:'足够'},{from:'gate',to:'clarify',label:'不足'}]},
 rag:{title:'检索、判断、调用工具，各管一件事',caption:'资料提供依据；实时状态通过工具获取。',nodes:[
  n('question','用户问题','这张订单能放行吗',20,120,'blue','先识别单号和要判断的业务问题。'),
  n('search','检索规则','范围 · 版本 · 相关性',260,25,'teal','限定适用的规则范围，并保留检索片段与来源。'),
  n('tool','查询业务工具','最新订单状态',260,220,'blue','工具查询实时收货数量，返回的数据仍需校验。'),
  n('decision','条件校验','规则 + 实时状态',495,120,'amber','让检索证据和工具结果共同参与判断，不把检索结果当成实时状态。'),
  n('reply','回答 / 转人工','证据不足就补充',730,120,'purple','有证据时说明依据；缺失、矛盾或权限不足时进入补充或人工确认。'),
 ],edges:[{from:'question',to:'search'},{from:'question',to:'tool'},{from:'search',to:'decision'},{from:'tool',to:'decision'},{from:'decision',to:'reply'}]},
 deployment:{title:'自己的界面，怎样接到 AI 应用？',caption:'界面负责交互，后端保护密钥并执行权限校验。',nodes:[
  n('user','用户界面','输入 · 进度 · 结果',25,120,'blue','可以使用发布后的 Web App，也可以设计自己的业务界面。'),
  n('server','业务后端','鉴权 · 密钥 · 审计',275,120,'purple','自定义界面由后端调用应用 API。密钥保留在服务端，不放进浏览器。'),
  n('app','已发布 AI 应用','工作流 / Chatflow',535,120,'teal','先发布一个可调用的应用，再在后端传入业务参数并处理返回结果。'),
  n('system','业务数据与工具','ERP / MES / TMS',775,120,'amber','连接业务系统时定义允许读取和写入的范围，异常时返回清楚的失败信息。'),
 ],edges:[{from:'user',to:'server'},{from:'server',to:'app'},{from:'app',to:'system'}]},
 evaluation:{title:'评测不是看一次回答“感觉不错”',caption:'同一批样本，同时验证结果、依据与失败处理。',nodes:[
  n('normal','正常样本','按期 · 数据齐全',25,20,'teal','记录已知正确的业务结果，检查模型是否误报。'),
  n('exception','异常样本','逾期 · 部分收货',25,126,'amber','覆盖业务边界，检查模型是否漏报。'),
  n('missing','缺失样本','无交期 · 无权限',25,232,'blue','检验证据不足时是否说明缺项或转人工。'),
  n('rules','程序检查','格式 · 数字 · 引用',330,40,'blue','字段、格式和可计算数值由确定性规则验证。'),
  n('human','人工量表','可用性 · 业务判断',330,215,'purple','需要业务判断的部分，用明确的评分标准交给评审人。'),
  n('gate','发布检查','达标 · 回归 · 成本',685,126,'teal','新版本只有在验收与回归通过后才发布；同时检查成功任务成本。'),
 ],edges:[{from:'normal',to:'rules'},{from:'exception',to:'rules'},{from:'missing',to:'human'},{from:'rules',to:'gate'},{from:'human',to:'gate'}]},
 product:{title:'一次好用的 AI 体验，需要留出纠正的路',caption:'让用户知道依据、保留确认点，并能修改结果。',nodes:[
  n('task','用户任务','找到该跟催的订单',20,125,'blue','从用户要完成的工作出发，决定何时需要表格、图表或操作入口。'),
  n('draft','AI 建议','结论 + 证据',270,25,'purple','把引用、待核实项和建议放在一起，帮助用户判断是否可信。'),
  n('review','用户确认','检查 · 修改 · 拒绝',520,125,'amber','涉及采购或客户承诺时，明确交给有权限的用户确认。'),
  n('done','完成任务','记录结果与反馈',760,125,'teal','完成后保留处理结果；反馈用于后续改进。'),
  n('revise','纠正信息','补资料 · 重算',270,225,'blue','让用户能够修改单号、补充缺失字段并再次生成，而不是从头再问。'),
 ],edges:[{from:'task',to:'draft'},{from:'draft',to:'review'},{from:'review',to:'done',label:'确认'},{from:'review',to:'revise',label:'修改'},{from:'revise',to:'draft'}]},
};
