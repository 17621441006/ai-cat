import {z} from 'zod';

export const researchSourceSchema=z.object({id:z.string().regex(/^S\d{1,3}$/),title:z.string().trim().min(1).max(100),kind:z.enum(['official','internal','unverified','personal']),date:z.string().max(40),text:z.string().trim().min(1).max(1200),url:z.string().max(500).optional()}).strict();
export type ResearchSource=z.infer<typeof researchSourceSchema>;
export type EvidenceKind='fact'|'inference'|'gap';
export type ResearchClaim={id:string;text:string;kind:EvidenceKind;refs:{sourceId:string;quote:string}[];reviewed:boolean};
export type ResearchCase={id:string;name:string;description:string;question:string;scope:string;sources:ResearchSource[];claims:ResearchClaim[];gaps:string[];queries:string[]};
export const sourceKindNames={official:'官方资料',internal:'内部记录 · 教学样例',unverified:'待核验材料',personal:'我的资料'};
export const evidenceKindNames={fact:'资料事实',inference:'分析推断',gap:'待补信息'};
export function safeResearchUrl(value?:string){try{const u=new URL(value||'');return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:undefined}catch{return undefined}}
const claim=(id:string,text:string,kind:EvidenceKind,sourceId:string,quote:string):ResearchClaim=>({id,text,kind,refs:[{sourceId,quote}],reviewed:false});
export const researchCases:ResearchCase[]=[{
 id:'pilot',name:'试点可以推广了吗？',description:'用内部资料做判断，识别数字与结论之间的缺口。',question:'采购单据 AI 试点是否已达到推广条件？下一步还需要补哪些证据？',scope:'只依据提供的试点材料；区分本批样本、完整观察周期与正式推广条件。',
 sources:[
  {id:'S1',title:'试点计划 · 第 2 周',kind:'internal',date:'教学案例 · 第 2 周',text:'推广评审需在连续 4 周观察完成后进行。目前只完成第 2 周。第 3、4 周的稳定性与异常记录尚未提交。'},
  {id:'S2',title:'采购单据样本复核记录',kind:'internal',date:'教学案例 · 第 2 周',text:'本批教学样本共 200 张采购单据，其中 12 张需要人工修正。未记录人工与 AI 辅助流程的处理耗时，未给出字段级错误数及抽样方法。'},
  {id:'S3',title:'试点周会记录',kind:'internal',date:'教学案例 · 第 2 周',text:'推广预算尚未批准，接口验收时间待定。业务负责人要求在观察期结束后，补充异常闭环记录与处理耗时对照，再评审是否扩大范围。'},
  {id:'S4',title:'未经核验的宣传摘录',kind:'unverified',date:'发布日期未提供',text:'用了 AI 后，所有企业的单据处理时间都能节约 90%，可以立即全面推广。该材料没有提供样本范围、对照基线、测试方法或原始测量记录。'},
 ],
 claims:[claim('C1','观察周期尚未结束，目前不足以通过计划中的推广评审。','inference','S1','推广评审需在连续 4 周观察完成后进行。目前只完成第 2 周。'),claim('C2','本批样本需人工修正比例为 12 ÷ 200 = 6%；这不等同于模型准确率，也不能证明节省了多少时间。','inference','S2','本批教学样本共 200 张采购单据，其中 12 张需要人工修正。'),claim('C3','推广预算和接口验收仍未确定。','fact','S3','推广预算尚未批准，接口验收时间待定。')],
 gaps:['补充第 3、4 周的稳定性和异常记录','用相同任务口径补齐人工 / AI 辅助耗时对照','取得预算批准及接口验收记录'],
 queries:['采购单据 AI 试点 观察周期 推广评审 条件','人工修正比例 处理耗时 对照 样本口径','接口验收 预算批准 异常闭环'],
},{
 id:'tools',name:'选一个 AI 搜索工具',description:'从官方说明出发，区分联网找资料和围绕资料提问。',question:'公开网络调研和已有资料问答分别应该怎样选 AI 搜索工具？',scope:'比较使用方式与引用能力；不使用未经验证的市场份额、效果排名或节省比例。',
 sources:[
  {id:'S1',title:'秘塔 AI 搜索 · 开发者说明摘要',kind:'official',date:'核查于 2026-09-22',url:'https://apps.apple.com/cn/app/秘塔ai搜索/id6478196963',text:'开发者说明介绍了带引用源的结构化搜索回答，以及学术、文库等搜索范围。说明还列出了搜索结果复制与导出能力。这些是产品功能说明，不能直接证明企业试用效果。'},
  {id:'S2',title:'Perplexity · 官方帮助摘要',kind:'official',date:'核查于 2026-09-22',url:'https://www.perplexity.ai/help-center/en/articles/10352155-what-is-perplexity',text:'官方帮助介绍：用户提出问题后，Perplexity 搜索网络并整理回答，提供引用和原始来源链接，便于回到原文核对。资料没有提供与其他工具使用同一口径的效果测试。'},
  {id:'S3',title:'NotebookLM / Gemini Notebook · 官方帮助摘要',kind:'official',date:'核查于 2026-09-22',url:'https://support.google.com/gemininotebook/answer/16164461?hl=en',text:'Google 官方帮助介绍了上传资料、根据所选来源提问以及带行内引用的回答。当前官方名称为 Gemini Notebook。使用工作账号时需要确认组织管理员是否开放权限；资料没有提供的信息可能无法回答。'},
  {id:'S4',title:'没有统计口径的工具排名',kind:'unverified',date:'作者与日期未提供',text:'某榜单宣称工具甲占据 70% 市场，而且比其他工具好用 3 倍。榜单未提供市场定义、样本范围、统计周期、来源链接或测评方法。'},
 ],
 claims:[claim('C1','需要寻找公开网络资料时，可把秘塔列入候选，并核对它引用的原文。','inference','S1','开发者说明介绍了带引用源的结构化搜索回答，以及学术、文库等搜索范围。'),claim('C2','Perplexity 官方说明提供网络搜索与原文引用能力；有引用仍需检查它是否支持对应结论。','fact','S2','官方帮助介绍：用户提出问题后，Perplexity 搜索网络并整理回答，提供引用和原始来源链接，便于回到原文核对。'),claim('C3','围绕已有文件研究时，可将 NotebookLM / Gemini Notebook 列入候选，并检查回答中的引用与资料范围。','inference','S3','Google 官方帮助介绍了上传资料、根据所选来源提问以及带行内引用的回答。')],
 gaps:['用同一份问题集和评分口径进行试用','核对组织账号、资料权限及当前可用条件','如需市场份额，另找有统计周期、样本与方法的原始报告'],
 queries:['秘塔 AI 搜索 引用 来源 文库 官方说明','Perplexity cited sources official help','NotebookLM sources citations 官方 帮助'],
}];

export function searchResearchSources(sources:ResearchSource[],query:string,kind='all'){
 const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
 return sources.filter(s=>kind==='all'||s.kind===kind).map(source=>({source,score:terms.reduce((n,t)=>n+(source.title.toLowerCase().includes(t)?3:0)+(source.text.toLowerCase().includes(t)?1:0),0)})).filter(row=>!terms.length||row.score>0).sort((a,b)=>b.score-a.score).map(row=>row.source);
}
export function supportedClaims(claims:ResearchClaim[],sources:ResearchSource[]){
 return claims.filter(c=>!!c.text.trim()&&!(c.kind==='fact'&&c.refs.some(r=>sources.find(s=>s.id===r.sourceId)?.kind==='unverified'))&&(c.kind==='gap'||c.refs.length>0)&&c.refs.every(ref=>sources.some(s=>s.id===ref.sourceId&&s.text.includes(ref.quote)&&!!ref.quote)));
}
const resultSchema=z.object({claims:z.array(z.object({text:z.string().trim().min(1).max(500),kind:z.enum(['fact','inference','gap']),refs:z.array(z.object({sourceId:z.string(),quote:z.string().min(1).max(600)}).strict()).max(6)}).strict()).min(1).max(8),gaps:z.array(z.string().min(1).max(200)).max(8)}).strict();
export function parseResearchAnswer(text:string,sources:ResearchSource[]){
 try{
  const result=resultSchema.safeParse(JSON.parse(text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'')));if(!result.success)return null;
  const claims=result.data.claims.map((c,i)=>({...c,id:`AI${i+1}`,reviewed:false}));
  // Reject the complete response if one citation is invented or its quote isn't in the supplied source.
  if(claims.some(c=>c.refs.some(r=>!sources.some(s=>s.id===r.sourceId&&s.text.includes(r.quote)))||(c.kind!=='gap'&&!c.refs.length)))return null;
  if(claims.some(c=>c.kind==='fact'&&c.refs.some(r=>sources.find(s=>s.id===r.sourceId)?.kind==='unverified')))return null;
  return {claims,gaps:result.data.gaps};
 }catch{return null}
}
export function researchPrompt(question:string,scope:string){return `研究问题：${question}\n范围：${scope}\n请先找第一方资料，再检查事件与发布日期、样本、统计口径。每项结论给出来源编号和支持它的原句。区分资料事实、分析推断和待补信息；相互矛盾的来源分别保留，不投票或平均处理。没有可靠数字就说明缺失，不编造市场份额或效果。最后输出结论、证据、待补材料和下一步。`}
export function researchMarkdown(question:string,scope:string,claims:ResearchClaim[],sources:ResearchSource[],gaps:string[]){
 const active=supportedClaims(claims,sources);
 return `# 研究简报\n\n## 研究问题\n${question}\n\n范围：${scope}\n\n## 结论与证据\n${active.length?active.map(c=>`- **${evidenceKindNames[c.kind]} · ${c.reviewed?'已人工核对':'待人工核对'}**：${c.text}\n${c.refs.map(r=>`  - [${r.sourceId}] 原句：${r.quote}`).join('\n')}`).join('\n\n'):'暂无可追溯结论。'}\n\n## 待补信息\n${gaps.map(g=>'- '+g).join('\n')||'请逐条检查是否仍有资料缺口。'}\n\n## 来源清单\n${sources.map(s=>`- [${s.id}] ${s.title}｜${sourceKindNames[s.kind]}｜${s.date||'日期待补'}${safeResearchUrl(s.url)?'\n  '+safeResearchUrl(s.url):''}\n  摘录：${s.text}`).join('\n\n')}\n\n说明：本站材料检索与资料整理不等于实时联网搜索。教学样例不代表真实企业数据。`;
}
