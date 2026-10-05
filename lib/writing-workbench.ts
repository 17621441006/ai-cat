import {visualIssues,visualMarkdown,type WritingVisual} from './writing-visuals';
export type Topic='scope'|'progress'|'risk'|'action'|'acceptance';
export const topicLabels:Record<Topic,string>={scope:'业务范围',progress:'当前进展',risk:'风险与依赖',action:'下一步行动',acceptance:'验收与承诺'};
export type Passage={id:string;topic:Topic;text:string;owner?:string;due?:string};
export type KnowledgeSource={id:string;name:string;kind:'PDF'|'纪要'|'清单'|'文本';version:string;date:string;state:'current'|'old';origin:'sample'|'paste'|'upload';passages:Passage[]};
export type Scenario={id:string;name:string;tag:string;sources:KnowledgeSource[]};
export type Evidence={sourceId:string;sourceName:string;version:string;state:'current'|'old';passage:Passage};
export type WritingSettings={format:'weekly'|'email'|'brief'|'sop';audience:'leader'|'client'|'team';tone:'formal'|'plain';length:'short'|'standard'|'long'};
export type WritingBlock={id:string;topic:Topic;heading:string;body:string;baseText:string;refs:Evidence[];reviewed:boolean;visual?:WritingVisual};
export type WritingDocument={title:string;blocks:WritingBlock[];context:string;format:string;audience:string};
export type KnowledgeCard={id:string;question:string;body:string;refs:Evidence[];tag:string;owner:string;reviewed:boolean};
export const formatNames={weekly:'项目周报',email:'客户沟通邮件',brief:'决策简报',sop:'操作与复核清单'};
export const audienceNames={leader:'管理层',client:'客户业务负责人',team:'项目交付团队'};
const p=(id:string,topic:Topic,text:string,owner?:string,due?:string):Passage=>({id,topic,text,owner,due});
export const writingScenarios:Scenario[]=[
 {id:'procurement',name:'采购审单助手试点',tag:'供应链 AI · 从试点记录到汇报',sources:[
  {id:'scope',name:'采购审单助手_试点方案.pdf',kind:'PDF',version:'V1.2',date:'2026-09-18',state:'current',origin:'sample',passages:[p('1','scope','本次试点覆盖采购订单的供应商、物料、数量与价格字段核验。AI 先给出审单建议，业务人员确认后才进入后续处理。'),p('2','acceptance','试点验收需逐条核对字段映射、异常拦截、人工确认与日志留存。现有材料没有正式上线日期，也没有可用于对外宣传的准确率或年度收益。')]},
  {id:'minutes',name:'9月19日_项目例会纪要',kind:'纪要',version:'V2.0',date:'2026-09-19',state:'current',origin:'sample',passages:[p('1','progress','团队已完成字段映射，并用 20 条合成订单完成首轮规则测试；其中 3 条异常样例已转交业务人员复核。这些样例不能代表真实生产效果。'),p('2','risk','ERP 接口权限尚未获批；供应商编码在两套系统中的口径仍需统一。当前不能进入生产回填。'),p('3','action','接口负责人李工计划于 2026-09-23 前确认权限申请进度；业务负责人王经理计划于 2026-09-24 前复核 3 条异常样例。','李工 / 王经理','2026-09-23 / 2026-09-24')]},
  {id:'checklist',name:'联调与验收行动清单',kind:'清单',version:'V1.1',date:'2026-09-19',state:'current',origin:'sample',passages:[p('1','action','数据负责人陈工计划于 2026-09-25 前提交供应商编码映射表。项目经理在权限、映射与异常样例复核完成后，再组织联调日期评审。','陈工 / 项目经理','2026-09-25 / 待确认'),p('2','acceptance','对外汇报应区分“合成样例测试完成”和“生产验收通过”。未经业务批准，不自动创建或回填采购订单。')]},
  {id:'old-plan',name:'采购审单助手_早期讨论稿.pdf',kind:'PDF',version:'V0.3',date:'2026-09-10',state:'old',origin:'sample',passages:[p('1','acceptance','早期讨论曾建议于 2026-09-22 上线，但该日期尚未审批，已被后续版本中的“待评审”安排替代。'),p('2','scope','早期方案讨论过自动回填订单。后续方案已改为先给建议、再由业务人员确认。')]},
 ]},
 {id:'erp',name:'海外 ERP 上线准备',tag:'跨境财务 · 从联调材料到客户沟通',sources:[
  {id:'scope',name:'海外ERP_上线准备方案.pdf',kind:'PDF',version:'V1.3',date:'2026-09-18',state:'current',origin:'sample',passages:[p('1','scope','本轮演练覆盖总账 GL、应付 AP 与应收 AR 的期初数据核对、权限检查和接口联调；固定资产 FA 的后续优化不纳入本轮切换范围。'),p('2','acceptance','正式切换需要财务负责人确认期初余额、业务负责人签署 UAT 结果，并验证回退步骤。现有资料没有批准正式上线日期。')]},
  {id:'minutes',name:'财务与接口_联调会议纪要',kind:'纪要',version:'V2.1',date:'2026-09-19',state:'current',origin:'sample',passages:[p('1','progress','团队已完成 12 条合成财务凭证的导入演练，借贷平衡检查通过；2 条客商编码问题仍待修正。当前结果属于测试环境。'),p('2','risk','银行对账文件格式仍需确认；跨时区 UAT 参与人员尚未全部确定。测试环境检查通过不等于生产切换获批。'),p('3','action','财务顾问林工计划于 2026-09-23 前完成客商编码复核；接口负责人周工计划于 2026-09-24 前确认银行文件样例。','林工 / 周工','2026-09-23 / 2026-09-24')]},
  {id:'checklist',name:'切换演练与业务签字清单',kind:'清单',version:'V1.0',date:'2026-09-19',state:'current',origin:'sample',passages:[p('1','action','项目经理计划于 2026-09-25 前确认 UAT 排期和参会人员；财务负责人完成余额复核后，再评审切换窗口。','项目经理 / 财务负责人','2026-09-25 / 待确认'),p('2','acceptance','切换前保留余额核对表、权限矩阵、UAT 签字记录与回退演练记录。关键问题未关闭时，应重新评估切换条件。')]},
  {id:'old-plan',name:'海外ERP_初版切换讨论稿.pdf',kind:'PDF',version:'V0.2',date:'2026-09-09',state:'old',origin:'sample',passages:[p('1','acceptance','初版曾拟于 2026-09-21 进行切换，该时间未审批；最新材料要求完成 UAT 和余额签字后再评审。')]},
 ]},
 {id:'team-report',name:'AI 三组协作周报',tag:'参考团队周报的排版方式 · 以下任务、日期和数值均为独立教学示例',sources:[
  {id:'team-plan',name:'三组协作_任务进度表（教学示例）',kind:'清单',version:'V1.0',date:'2026-09-20',state:'current',origin:'sample',passages:[
   p('1','scope','以 AI 工具使用、AI 辅助编程、AI 业务智能体三个小组演示周报整理。所有任务、日期、进度和数量均为模拟数据，不是用户提供截图中的实际项目记录。'),
   p('2','progress','任务 | 小组 | 责任人 | 开始日期 | 截止日期 | 进度 | 状态\n工具调研与选型 | AI 工具使用 | 工具组 | 2026-09-01 | 2026-09-08 | 90% | 进行中\n操作手册与培训 | AI 工具使用 | 培训组 | 2026-09-09 | 2026-09-25 | 60% | 进行中\nERP 编程场景验证 | AI 辅助编程 | 研发组 | 2026-09-05 | 2026-09-22 | 75% | 进行中\n采购审单助手搭建 | AI 业务智能体 | 产品组 | 2026-09-10 | 2026-09-28 | 45% | 受阻\n试点阶段评审 | AI 业务智能体 | 项目组 | | 2026-09-30 | | 计划中'),
   p('3','risk','小组 | 事项 | 责任人 | 状态\nAI 工具使用 | 培训效果需要跟踪 | 培训组 | 进行中\nAI 辅助编程 | 跨项目场景样本待补充 | 研发组 | 待确认\nAI 业务智能体 | ERP 接口权限待审批 | 项目组 | 受阻'),
  ]},
  {id:'team-research',name:'工具研究与后续验证（教学示例）',kind:'清单',version:'V1.0',date:'2026-09-20',state:'current',origin:'sample',passages:[
   p('1','action','小组 | 工具 | 应用场景 | 状态\nAI 工具使用 | 通义听悟 | 会议纪要 | 已验证\nAI 工具使用 | WPS AI | 文档与表格 | 已验证\nAI 工具使用 | 飞书多维表格 | 协作台账 | 待验证\nAI 辅助编程 | Cursor | 代码补全与修改 | 已验证\nAI 辅助编程 | 通义灵码 | 项目问答 | 进行中\nAI 业务智能体 | Dify | 采购审单工作流 | 进行中\nAI 业务智能体 | 知识库检索 | 业务规则问答 | 待验证'),
  ]},
  {id:'team-feedback',name:'培训反馈记录（教学示例）',kind:'清单',version:'V1.0',date:'2026-09-20',state:'current',origin:'sample',passages:[
   p('1','acceptance','周次 | 反馈数量 | 单位\n第 1 周 | 12 | 份\n第 2 周 | 18 | 份\n第 3 周 | 15 | 份\n第 4 周 | 24 | 份\n\n口径说明：每周收集的反馈份数，不是去重人数；数量不代表满意度或生产收益。全部为教学模拟数据。'),
  ]},
 ]},
];
export const writingReferences=[
 {name:'Google Notebook / NotebookLM',feature:'选来源 → 问问题 → 点击引用回到原文',url:'https://support.google.com/gemininotebook/answer/16179559?hl=en',guide:'把问题限制在选中的材料里。先看引用能否直接支持结论，再把答案存成笔记。',step:'sources'},
 {name:'WPS AI',feature:'起草 → 改写 → 调整篇幅 → 人工精修',url:'https://www.wps.com/tools/rewording-tool/',guide:'将读者、目的和篇幅写清楚。逐段比较修改，保留数字、责任人与承诺边界。',step:'write'},
 {name:'Notion AI',feature:'页面知识 → 摘要与标签 → 团队知识库',url:'https://www.notion.com/help/notion-ai-faqs',guide:'把文稿中的结论、行动项和来源整理成可再次找到的知识条目。给条目标注负责人和复核状态。',step:'knowledge'},
];
export function sourceSignature(sources:KnowledgeSource[],ids:string[]){return JSON.stringify(sources.filter(s=>ids.includes(s.id)).map(s=>[s.id,s.version,s.passages]))}
export function allEvidence(sources:KnowledgeSource[],ids:string[]):Evidence[]{return sources.filter(s=>ids.includes(s.id)).flatMap(s=>s.passages.map(passage=>({sourceId:s.id,sourceName:s.name,version:s.version,state:s.state,passage})))}
export function topicForQuery(query:string):Topic|undefined{
 if(/上线|切换|承诺|验收|准确率|收益|效果/.test(query))return 'acceptance';if(/风险|阻碍|问题|依赖|未关闭/.test(query))return 'risk';if(/谁|负责|下一步|行动|计划|截止|日期/.test(query))return 'action';if(/进展|进度|完成|测试|多少/.test(query))return 'progress';if(/范围|覆盖|是什么|哪些功能/.test(query))return 'scope';
}
export function findEvidence(sources:KnowledgeSource[],ids:string[],query:string):Evidence[]{
 const all=allEvidence(sources,ids),topic=topicForQuery(query);if(topic)return all.filter(e=>e.passage.topic===topic).slice(0,6);
 const clean=query.toLowerCase().replace(/[\s，。？?！!、：:]/g,'');if(clean.length<2)return [];
 const terms=clean.match(/[a-z0-9]{2,}|[\u4e00-\u9fa5]{2}/g)||[clean];return all.map(e=>({e,n:terms.filter(t=>(e.passage.text+e.sourceName).toLowerCase().includes(t)).length})).filter(x=>x.n>0).sort((a,b)=>b.n-a.n).slice(0,4).map(x=>x.e);
}
const unknown='所选资料尚未提供这一部分的信息，请补充来源后再完成文稿。';
export function createWritingDocument(project:string,sources:KnowledgeSource[],ids:string[],settings:WritingSettings):WritingDocument{
 const all=allEvidence(sources,ids),count=settings.length==='short'?1:settings.length==='long'?3:2;
 const topics:Topic[]=settings.format==='sop'?['scope','action','acceptance','risk']:settings.format==='brief'?['progress','risk','acceptance','action']:['progress','risk','action','acceptance'];
 const blocks=topics.map((topic,i)=>{const refs=all.filter(e=>e.passage.topic===topic).slice(0,count);let body=refs.map(e=>e.passage.text).join('\n\n')||unknown;
  if(settings.format==='email'&&i===0)body=(settings.audience==='client'?'各位项目伙伴，您好：\n\n':settings.audience==='leader'?'各位领导，您好：\n\n':'各位同事，您好：\n\n')+body;
  if(settings.format==='sop'&&refs.length)body=refs.map((e,j)=>`${j+1}. ${e.passage.text}`).join('\n');
  if(topic==='action'&&refs.length)body+='\n\n'+({leader:'请协调上述依赖项，并在条件具备后组织决策。',client:'请核对上述安排，后续计划以双方确认结果为准。',team:'请按职责跟进，保留完成记录和未关闭事项。'}[settings.audience]);
  if(settings.tone==='plain')body=body.replace(/尚未/g,'还未').replace(/现有材料/g,'目前资料').replace(/逐条核对/g,'一项项核对').replace(/计划于/g,'计划在').replace(/后续处理/g,'下一步处理').replace(/上述/g,'以上');
  const heading=project==='AI 三组协作周报'?({progress:'三组任务与整体进度',risk:'风险与可提升项',action:'工具研究与验证状态',acceptance:'培训反馈与统计口径',scope:'协作范围'}[topic]):topic==='action'?(settings.audience==='leader'?'需要协调与决策':settings.audience==='client'?'后续安排与待确认事项':'责任分工与下一步'):topicLabels[topic];
  return {id:'block-'+i,topic,heading,body,baseText:body,refs,reviewed:false};
 });
 const extra=all.filter(e=>sources.find(s=>s.id===e.sourceId)?.origin!=='sample');if(extra.length)blocks.push({id:'supplement',topic:'scope',heading:'补充资料摘录',body:extra.slice(0,count).map(e=>e.passage.text).join('\n\n'),baseText:extra.slice(0,count).map(e=>e.passage.text).join('\n\n'),refs:extra.slice(0,count),reviewed:false});
 return {title:`${project}｜${formatNames[settings.format]}`,blocks,context:sourceSignature(sources,ids),format:formatNames[settings.format],audience:audienceNames[settings.audience]};
}
export function rewriteParagraph(text:string,mode:string){
 const clean=text.replace(/^(?:[•*\-]\s+|\d+[.、)]\s+)/gm,'').trim();const lines=clean.split(/\n+|(?<=[。！？])\s*/).map(s=>s.trim()).filter(Boolean);
 if(mode==='bullets')return lines.map(t=>'• '+t).join('\n');
 if(mode==='concise')return clean.replace(/现就本项目进展说明如下。\n?/g,'').replace(/本次|目前|当前|团队已|计划于/g,m=>({'本次':'','目前':'','当前':'','团队已':'已','计划于':'拟于'}[m]||m)).replace(/\n{2,}/g,'\n');
 if(mode==='formal')return clean.replace(/大家好[，,]?/g,'各位同事，您好：').replace(/搞定/g,'完成').replace(/卡住/g,'受阻').replace(/还没/g,'尚未').replace(/先看看/g,'先行核对').replace(/\n{3,}/g,'\n\n')+(clean.endsWith('请核对以上事实及待确认事项。')?'':'\n\n请核对以上事实及待确认事项。');
 if(mode==='expand')return clean+'\n\n说明：上述完成项、待办与验收条件应分别核对。下一轮沟通时，建议逐项补充责任人、截止时间和确认记录；缺失信息保持待确认。';
 return clean;
}
export function blockIssues(block:WritingBlock):string[]{
 const issues:string[]=[];if(!block.heading.trim())issues.push('段落标题为空');if(!block.body.trim())issues.push('正文为空');if(!block.refs.length)issues.push('缺少来源');if(block.refs.some(r=>r.state==='old'))issues.push('引用了旧版资料');
 const numericTokens=(text:string)=>(text.replace(/^\s*\d+[.、)]\s+/gm,'').replace(/\s/g,'').match(/\d{4}-\d{2}-\d{2}|\d+(?:\.\d+)?(?:%|万元|亿元|万|亿|条|月|日)?/g)||[]);
 const facts=new Set(numericTokens(block.refs.map(r=>r.passage.text).join(' '))),numbers=numericTokens(block.body);
 const unsupported=numbers.filter(n=>!facts.has(n));if(unsupported.length)issues.push('出现来源未支持的数字：'+[...new Set(unsupported)].join('、'));
 if(/已全面上线|零错误|保证.*上线|100\s*%|节省\s*\d+/.test(block.body))issues.push('确定性承诺或成效需要另行举证');
 if(block.body.length>650&&!block.visual?.note.startsWith('实际解析'))issues.push('段落较长，建议拆分');if(block.visual)issues.push(...visualIssues(block.visual,block.body));return issues;
}
export function buildWritingPrompt(project:string,sources:KnowledgeSource[],ids:string[],settings:WritingSettings){return `任务：基于所选材料，为${audienceNames[settings.audience]}撰写《${project}》${formatNames[settings.format]}。\n语气：${settings.tone==='formal'?'正式、清楚':'直接、易懂'}；篇幅：${{short:'简短',standard:'标准',long:'详细'}[settings.length]}。\n约束：保留数字、日期、责任人及“计划/已完成”的差别；不新增上线承诺、准确率或收益；每段标注来源与版本。资料不足写待确认；发现旧版冲突先列出差异。\n输出：标题、分节正文、行动项、待确认事项。\n\n参考材料：\n${sources.filter(s=>ids.includes(s.id)).map(s=>`[${s.name} ${s.version}${s.state==='old'?' · 旧版':''}]\n${s.passages.map(p=>p.text).join('\n')}`).join('\n\n')}`}
export function documentMarkdown(doc:WritingDocument,reviewed:boolean){return `# ${doc.title}\n\n> ${reviewed?'已人工复核':'待审草稿'} · ${doc.audience} · 教学演练，不代表实际项目记录\n\n`+doc.blocks.map(b=>`## ${b.heading}\n\n${b.visual?visualMarkdown(b.visual)+'\n\n<details><summary>整理前原文</summary>\n\n'+b.body+'\n\n</details>':b.body}\n\n来源：${b.refs.map(r=>`${r.sourceName} ${r.version} §${r.passage.id}`).join('；')||'待补充'}`).join('\n\n')}
export function importTextSource(name:string,text:string,origin:'paste'|'upload'):KnowledgeSource{
 const lines=text.trim().split(/\n+/).filter(Boolean).slice(0,60);return {id:'local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),name,kind:'文本',version:'本地导入',date:new Date().toISOString().slice(0,10),state:'current',origin,passages:lines.map((text,i)=>p(String(i+1),topicForQuery(text)||'scope',text))};
}
