import {navigationItems} from './navigation';

export type AssistantDestination={id:string;title:string;href:string;description:string;aliases:string[]};
const aliases:Record<string,string[]>={
 home:['首页','主页','学习启航','总览'],roadmap:['学习路线','学习计划','12周路线'],glossary:['术语词典','概念词典','词典'],
 tools:['AI工具','办公工具','工具体验','AI办公工具'],coding:['编程实训','AI编程','代码实训','ERP'],learn:['课堂','课程'],
 agents:['智能体','工坊','agent','多agent','多智能体','Dify','MCP','工作流'],models:['模型','大模型实验室'],
 industry:['云应用','供应链场景','供应链'],products:['产品体验','供应链产品','供应链'],ontology:['3D实验','三维实验','知识图谱','3D','供应链'],
 work:['办公提效'],business:['供应链实战','供应链'],library:['知识库','资源中心'],guides:['指南'],resources:['资料库','资料'],
 projects:['行业研究','产品专栏','案例库','宝信专栏'],community:['交流','作品'],
};
const extra:AssistantDestination[]=[
 ['lesson-prompt','提示词工程','/learn?lesson=prompt','互动课堂 · 明确任务、规则与输出',['提示词','prompt']],
 ['lesson-context','上下文工程','/learn?lesson=context','互动课堂 · 组装正确资料',['上下文','context']],
 ['lesson-pm','AI 项目管理','/learn?lesson=pm','互动课堂 · 从业务问题到试点',['项目管理']],
 ['lesson-dify','Dify 基础','/learn?lesson=dify','互动课堂 · Workflow 与 Chatflow',['Dify','Dify课堂']],
 ['lesson-rag','检索与条件分支','/learn?lesson=rag','互动课堂 · 检索、路由与工具',['RAG','知识检索','条件分支']],
 ['lesson-deployment','部署与集成','/learn?lesson=deployment','互动课堂 · 发布与系统集成',['部署','集成']],
 ['lesson-evaluation','评测与验收','/learn?lesson=evaluation','互动课堂 · 用证据评价结果',['评测','验收']],
 ['lesson-product','AI 产品设计','/learn?lesson=product','互动课堂 · 任务与失败体验',['产品设计']],
 ['tool-meetings','会议与移动办公','/tools?category=meetings','AI 办公工具 · 转写与会议纪要',['会议','会议工作台','转写','会议纪要']],
 ['tool-spreadsheets','表格与数据分析','/tools?category=spreadsheets','AI 办公工具 · 清洗、透视与图表',['表格','数据分析','表格工作台','Excel','WPS']],
 ['tool-presentations','PPT 与汇报','/tools?category=presentations','AI 办公工具 · 演示文稿工作台',['PPT','幻灯片','PPT工作台']],
 ['tool-writing','写作与知识整理','/tools?category=writing','AI 办公工具 · 内容编写与整理',['写作','写作工作台']],
 ['tool-images','图片与视觉创作','/tools?category=images','AI 办公工具 · 配图与视觉设计',['图片','图片创作','图片工作台']],
 ['tool-video','视频与内容制作','/tools?category=video','AI 办公工具 · 剪辑与字幕',['视频','视频剪辑','视频工作台']],
 ['tool-research','搜索与研究','/tools?category=research','AI 办公工具 · 来源核验与简报',['搜索','搜索研究','AI搜索','研究工作台']],
 ['tool-automation','桌面与流程自动化','/tools?category=automation','AI 办公工具 · 自动化任务',['自动化','桌面自动化']],
 ['lab-erp','ERP 供货与履约','/ontology?case=erp','供应链 3D 实验 · 订单、库存与交付',['ERP','ERP实验','ERP3D']],
 ['lab-mes','MES 车间实验','/ontology?case=mes','供应链 3D 实验 · 停机与工单改派',['MES','MES实验','车间实验']],
 ['lab-tms','TMS 配送实验','/ontology?case=tms','供应链 3D 实验 · 路线与运力',['TMS','TMS实验','配送实验']],
 ['lab-wms','WMS 仓库实验','/ontology?case=wms','供应链 3D 实验 · 波次与库位',['WMS','WMS实验','仓库实验']],
].map(([id,title,href,description,aliases])=>({id,title,href,description,aliases} as AssistantDestination));
export const assistantDestinations:AssistantDestination[]=[
 ...navigationItems.map(item=>({id:item.id,title:item.label,href:item.href,description:'站内学习页面',aliases:aliases[item.id]||[]})),...extra,
];
export const assistantDestination=(id:string)=>assistantDestinations.find(item=>item.id===id);
const normal=(value:string)=>value.toLowerCase().replace(/[\s·×、，,。！？?!「」“”"'《》：:（）()\-]/g,'');
function matchDestinations(target:string,pool:AssistantDestination[]){
 const query=normal(target);
 const scored=pool.map(item=>{
  const terms=[item.title,...item.aliases].map(normal);
  const exact=terms.some(term=>term===query);
  const contains=terms.filter(term=>term.length>=2&&query.includes(term));
  return {item,score:exact?1000:contains.length?Math.max(...contains.map(term=>term.length)):0};
 }).filter(result=>result.score>0);
 const maximum=Math.max(0,...scored.map(result=>result.score));
 return scored.filter(result=>result.score===maximum).map(result=>result.item);
}
export type AssistantNavigationResult={kind:'open';destination:AssistantDestination}|{kind:'choose';options:AssistantDestination[]}|{kind:'missing'}|{kind:'cancel'};

/** User text can select only registered local destinations. Model replies never execute navigation. */
export function resolveAssistantNavigation(question:string,pendingIds:string[]=[]):AssistantNavigationResult|null{
 const pending=pendingIds.map(assistantDestination).filter((item):item is AssistantDestination=>!!item);
 const text=question.trim();
 if(pending.length){
  if(/^(?:取消|算了|先不(?:用|去|打开)?|不用了|不跳转|cancel)[吧了。！!]?$/i.test(text))return {kind:'cancel'};
  const ordinal=text.match(/^(?:打开|选|选择|我要|就要|去|确认)?\s*第?([一二三四五六七八九十]|\d{1,2})(?:个|项|条)?(?:吧|✅|。|！|!)?$/);
  if(ordinal){const index=/^\d+$/.test(ordinal[1])?+ordinal[1]-1:'一二三四五六七八九十'.indexOf(ordinal[1]);return pending[index]?{kind:'open',destination:pending[index]}:{kind:'choose',options:pending}}
  const choice=matchDestinations(text.replace(/^(?:确认|选择|选|就要)\s*/,''),pending);
  if(choice.length===1&&normal(text).length<normal(choice[0].title).length+8&&!/什么|如何|怎么|介绍|解释|区别|不|别/.test(text))return {kind:'open',destination:choice[0]};
  if(/^(?:确认|好的?|是的?|✅|打开吧)[。！!]?$/i.test(text))return {kind:'choose',options:pending};
 }
 // Asking how navigation works, a quotation, a negation or a hypothetical is not a command.
 if(/不要|不用|别(?:帮我)?(?:打开|跳转|进入)|不(?:要|用|想)?(?:打开|跳转|进入)|(?:如何|怎么|怎样)\s*(?:才能|可以|帮我)?\s*(?:打开|跳转|进入)|^(?:解释|介绍|翻译|假如|如果)/.test(text))return null;
 const verb=/(?:打开|跳转(?:到)?|带我(?:去|到)|前往|进入|转到|切换到|返回(?:到)?|回到|(?:我想|我要|帮我)去|^去|\bopen\b|\bgo to\b)\s*/i.exec(text);
 if(!verb)return null;
 const target=text.slice(verb.index+verb[0].length).replace(/^(?:一下|一个|那个|这个|本站的?|网站的?)\s*/,'').replace(/(?:这个|那个|的)?(?:页面|板块|部分)?(?:看看|看一下)?[吧吗呢呀啊。！？?!✅\s]*$/,'').trim();
 if(!target||/https?:|javascript:|data:|\/\/|\\/.test(target))return {kind:'missing'};
 const direct=assistantDestinations.find(item=>item.href===target);
 if(direct)return {kind:'open',destination:direct};
 const parts=target.split(/或者|还是|以及|和|、|与(?=视频|PPT)|\bor\b|\band\b/i);
 const matches=[...new Map(parts.flatMap(part=>matchDestinations(part,assistantDestinations)).map(item=>[item.id,item])).values()];
 return matches.length===1?{kind:'open',destination:matches[0]}:matches.length?{kind:'choose',options:matches.slice(0,8)}:{kind:'missing'};
}
