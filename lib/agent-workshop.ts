import {z} from 'zod';

export const nodeKinds=['start','supervisor','agent','mcp','knowledge','aggregate','skill','condition','approval','plugin','output'] as const;
export type NodeKind=typeof nodeKinds[number];
export const systems=['ERP','MES','TMS'] as const;
export type System=typeof systems[number];
export const nodeCatalog:Record<NodeKind,{label:string;group:string;description:string}>={
 start:{label:'任务输入',group:'基础',description:'把订单号和用户目标作为本次流程的输入。'},
 supervisor:{label:'调度 Agent',group:'智能体',description:'将任务分给子 Agent；选择串行或并行，限制同时执行的分支数。'},
 agent:{label:'子 Agent',group:'智能体',description:'承担明确分工，只获得上游交给它的上下文，并调用一个系统工具。'},
 mcp:{label:'MCP 连接',group:'工具与知识',description:'发现服务能力、列出工具、按参数调用。MCP 是连接协议，不会自动获得系统权限。'},
 knowledge:{label:'知识检索',group:'工具与知识',description:'取出选定的履约规则，作为后续判断的依据。'},
 aggregate:{label:'结果汇总',group:'逻辑',description:'等待上游分支结束，合并证据；缺失的数据仍标记为未知。'},
 skill:{label:'Skills 技能',group:'工具与知识',description:'加载可复用的履约检查步骤。技能包含操作方法，工具负责取得数据。'},
 condition:{label:'条件分支',group:'逻辑',description:'按预计延误天数和证据完整性，走常规或复核出口。'},
 approval:{label:'人工复核',group:'逻辑',description:'暂停流程，等待人确认建议或退回。此演示不写入业务系统。'},
 plugin:{label:'插件',group:'工具与知识',description:'提供可启停的报告导出能力。插件是一种扩展包装，不等同于 MCP 协议。'},
 output:{label:'交付结果',group:'基础',description:'输出有来源的履约建议；可选简报或结构化 JSON。'},
};
const configSchema=z.object({
 label:z.string().max(60),kind:z.enum(nodeKinds),system:z.enum(systems).default('ERP'),
 role:z.string().max(240).default('核对订单履约事实，不推测缺失信息。'),
 mode:z.enum(['parallel','sequential']).default('parallel'),parallel:z.number().int().min(1).max(3).default(3),
 connected:z.boolean().default(true),plugin:z.boolean().default(true),permission:z.enum(['read','none']).default('read'),
 fallback:z.enum(['handoff','stop']).default('handoff'),skill:z.enum(['delivery-check','evidence-check']).default('delivery-check'),
 buffer:z.number().min(0).max(5).default(0),threshold:z.number().min(0).max(5).default(0),
 policy:z.enum(['standard','conservative']).default('standard'),format:z.enum(['brief','json']).default('brief'),
});
export type NodeConfig=z.infer<typeof configSchema>;
export const graphSchema=z.object({version:z.literal(1),nodes:z.array(z.object({id:z.string().regex(/^[\w-]{1,60}$/),position:z.object({x:z.number().finite().min(-20000).max(20000),y:z.number().finite().min(-20000).max(20000)}),data:configSchema})).min(2).max(30),edges:z.array(z.object({id:z.string().regex(/^[\w-]{1,100}$/),source:z.string().max(60),target:z.string().max(60),sourceHandle:z.enum(['out','normal','review']).default('out')})).max(60)});
export type WorkshopGraph=z.infer<typeof graphSchema>;
export type WorkshopNode=WorkshopGraph['nodes'][number];
export type WorkshopEdge=WorkshopGraph['edges'][number];
export function newNode(kind:NodeKind,id:string,x=40,y=40):WorkshopNode{return{id,position:{x,y},data:configSchema.parse({label:nodeCatalog[kind].label,kind})}}
export function exampleGraph(challenge=false):WorkshopGraph{
 const specs:[string,NodeKind,number,number,Partial<NodeConfig>?][]=[
  ['start','start',0,210],['dispatch','supervisor',250,210],
  ['erp','agent',510,0,{label:'订单核对 Agent',system:'ERP',role:'核对订单数量、现货和客户要求的交期。'}],
  ['mes','agent',510,210,{label:'生产跟进 Agent',system:'MES',role:'查明欠产数量与预计完工时间。'}],
  ['tms','agent',510,420,{label:'运输协调 Agent',system:'TMS',role:'核对运输时长；工具离线时移交人工。',connected:!challenge}],
  ['merge','aggregate',780,210],['skill','skill',1040,210,{label:'履约检查 Skill'}],
  ['condition','condition',1300,210,{threshold:challenge?5:0}],
  ['approval','approval',1560,420],['output','output',1820,210],
 ];
 const links:[string,string,WorkshopEdge['sourceHandle']?][]=[['start','dispatch'],['dispatch','erp'],['dispatch','mes'],['dispatch','tms'],['erp','merge'],['mes','merge'],['tms','merge'],['merge','skill'],['skill','condition'],['condition','approval','review'],['condition','output','normal'],['approval','output']];
 return{version:1,nodes:specs.map(([id,kind,x,y,config])=>{const n=newNode(kind,id,x,y);return{...n,data:{...n.data,...config}}}),edges:links.map(([source,target,sourceHandle='out'],i)=>({id:`edge-${i}`,source,target,sourceHandle}))};
}
export const scenarios={
 normal:{label:'正常履约',order:'SO-260901',quantity:100,stock:100,productionDays:0,transitDays:2,dueDays:5,offline:false,description:'现货充足，运输需 2 天，客户要求 5 天内到货。'},
 delay:{label:'交期异常',order:'SO-260902',quantity:100,stock:20,productionDays:5,transitDays:3,dueDays:6,offline:false,description:'缺货 80 件，生产需 5 天，运输需 3 天，承诺交期为 6 天。'},
 outage:{label:'TMS 断连',order:'SO-260903',quantity:100,stock:100,productionDays:0,transitDays:2,dueDays:5,offline:true,description:'订单与生产信息可查，但运输系统不可用，不能假定运输正常。'},
} as const;
export type ScenarioId=keyof typeof scenarios;
export type Evidence={system:System;tool:string;reference:string;facts:Record<string,number|string>};
export type FlowData={evidence:Partial<Record<System,Evidence>>;warnings:string[];skills:string[];lineage:string[];estimatedDays?:number;lateDays?:number;review?:boolean;decision?:'confirmed'|'rejected';policy?:string;buffer?:number;attachment?:boolean;order?:string;capacity?:number};
export type TraceStep={nodeId:string;label:string;kind:NodeKind;state:'running'|'success'|'warning'|'waiting'|'skipped'|'error';wave:number;detail:string;input?:unknown;output?:unknown;protocol?:unknown[]};
export type RunResult={status:'complete'|'error';steps:TraceStep[];data:FlowData;text:string;errors:string[];waves:number};
export type RunEvent={type:'wave';ids:string[];wave:number}|{type:'step';step:TraceStep};
const emptyData=():FlowData=>({evidence:{},warnings:[],skills:[],lineage:[]});
const unique=<T,>(items:T[])=>Array.from(new Set(items));
function combine(items:FlowData[]):FlowData{
 const data=emptyData();for(const value of items){Object.assign(data,value,{evidence:{...data.evidence,...value.evidence},warnings:unique([...data.warnings,...value.warnings]),skills:unique([...data.skills,...value.skills]),lineage:unique([...data.lineage,...value.lineage])})}return data;
}
export function graphProblems(graph:WorkshopGraph):string[]{
 const errors:string[]=[],ids=new Set(graph.nodes.map(n=>n.id));
 if(ids.size!==graph.nodes.length)errors.push('节点编号重复。');
 if(new Set(graph.edges.map(e=>e.id)).size!==graph.edges.length)errors.push('连线编号重复。');
 const start=graph.nodes.filter(n=>n.data.kind==='start'),outputs=graph.nodes.filter(n=>n.data.kind==='output');
 if(start.length!==1)errors.push('保留一个任务输入节点。');if(!outputs.length)errors.push('请添加交付结果节点。');
 for(const edge of graph.edges){const source=graph.nodes.find(n=>n.id===edge.source),target=graph.nodes.find(n=>n.id===edge.target);if(!source||!target){errors.push('存在未连接到节点的线。');continue}
  if(source.data.kind==='output'||target.data.kind==='start')errors.push('输入只能作为起点，结果只能作为终点。');
  if(source.data.kind==='condition'?!['normal','review'].includes(edge.sourceHandle):edge.sourceHandle!=='out')errors.push('连线出口与节点不匹配，请重新连接。');
 }
 const seen=new Set<string>();let progress=true;while(progress){progress=false;for(const n of graph.nodes){if(!seen.has(n.id)&&graph.edges.filter(e=>e.target===n.id).every(e=>seen.has(e.source))){seen.add(n.id);progress=true}}}
 if(seen.size!==ids.size)errors.push('出现循环连线。本练习使用有向无环流程，请去掉回路。');
 if(start.length===1){const reachable=new Set([start[0].id]);for(let i=0;i<graph.nodes.length;i++)for(const e of graph.edges)if(reachable.has(e.source))reachable.add(e.target);for(const n of graph.nodes)if(!reachable.has(n.id))errors.push(`“${n.data.label}”尚未接入任务输入。`)}
 const reachesOutput=new Set(outputs.map(n=>n.id));for(let i=0;i<graph.nodes.length;i++)for(const e of graph.edges)if(reachesOutput.has(e.target))reachesOutput.add(e.source);
 for(const n of graph.nodes){if(!reachesOutput.has(n.id))errors.push(`“${n.data.label}”之后没有交付结果。`);if(n.data.kind==='condition')for(const port of ['normal','review'])if(!graph.edges.some(e=>e.source===n.id&&e.sourceHandle===port))errors.push(`“${n.data.label}”缺少${port==='normal'?'常规':'复核'}出口。`)}
 return unique(errors);
}
const toolNames:Record<System,string>={ERP:'get_order',MES:'get_production',TMS:'get_shipment'};
function callSystem(config:NodeConfig,scenario:ScenarioId):{evidence?:Evidence;warning?:string;protocol:unknown[]}{
 const sample=scenarios[scenario],system=config.system,tool=toolNames[system];
 // Simplified protocol transcript for teaching. No request leaves the browser.
 const protocol:unknown[]=[{method:'server/discover',server:`demo-${system.toLowerCase()}`,result:{capabilities:{tools:{}},description:'协议发现的简化展示'}}];
 if(!config.plugin)return{warning:`${system} 连接插件未启用`,protocol:[]};
 if(!config.connected||(sample.offline&&system==='TMS'))return{warning:`${system} 连接不可用，数据未知`,protocol:[{method:'server/discover',error:{code:'DEMO_OFFLINE',message:'模拟连接失败'}}]};
 protocol.push({method:'tools/list',result:{tools:[{name:tool,description:`只读查询 ${system}`,inputSchema:{type:'object',properties:{order_id:{type:'string'}},required:['order_id']}}]}});
 if(config.permission==='none')return{warning:`${system} 查询未获授权`,protocol:[...protocol,{method:'tools/call',params:{name:tool,arguments:{order_id:sample.order}},error:{code:'DEMO_FORBIDDEN',message:'缺少只读权限'}}]};
 const facts:Evidence['facts']=system==='ERP'?{quantity:sample.quantity,stock:sample.stock,dueDays:sample.dueDays}:system==='MES'?{productionDays:sample.productionDays,remaining:Math.max(0,sample.quantity-sample.stock)}:{transitDays:sample.transitDays};
 const evidence:Evidence={system,tool,reference:`${system}/${sample.order}`,facts};
 protocol.push({method:'tools/call',params:{name:tool,arguments:{order_id:sample.order}},result:{content:[{type:'text',text:JSON.stringify(evidence)}]}});
 return{evidence,protocol};
}
function report(data:FlowData,format:NodeConfig['format']):string{
 const missing=systems.filter(s=>!data.evidence[s]);
 const status=missing.length?`证据不完整：${missing.join('、')} 待核实`:data.review?'需要复核':'常规履约建议';
 if(format==='json')return JSON.stringify({order:data.order,status,estimatedDays:data.estimatedDays??null,lateDays:data.lateDays??null,decision:data.decision??'未人工处理',evidence:data.evidence,warnings:data.warnings},null,2);
 return [`${data.order||'订单'} · ${status}`,data.estimatedDays===undefined?'到货时间：未知，请补齐来源。':`预计 ${data.estimatedDays} 天到货；较承诺交期${(data.lateDays??0)>0?`晚 ${data.lateDays} 天`:'未延误'}。`,data.decision==='confirmed'?'人工已确认建议；未向业务系统提交操作。':data.decision==='rejected'?'人工已退回，需补充资料或调整方案。':data.review?'复核尚未完成，请勿据此承诺交期。':'可进入常规履约跟进；这是模拟建议。',...data.warnings.map(w=>`待处理：${w}`),`依据：${Object.values(data.evidence).map(e=>e.reference).join('、')||'无'}`,data.attachment?'报告插件：已附上履约简报。':''].filter(Boolean).join('\n');
}
export function* executeWorkflow(graph:WorkshopGraph,scenario:ScenarioId):Generator<RunEvent,RunResult,boolean|undefined>{
 const errors=graphProblems(graph),steps:TraceStep[]=[],outputs=new Map<string,FlowData>(),done=new Set<string>(),active=new Set<string>();let wave=0,text='';
 if(errors.length)return{status:'error',steps,data:emptyData(),text:'',errors,waves:0};
 const outputStep=(step:TraceStep)=>{steps.push(step);return{type:'step' as const,step}};
 while(done.size<graph.nodes.length){
  const ready=graph.nodes.filter(n=>!done.has(n.id)&&graph.edges.filter(e=>e.target===n.id).every(e=>done.has(e.source)));
  if(!ready.length)return{status:'error',steps,data:emptyData(),text,errors:['流程无法继续，请检查连线。'],waves:wave};
  const runnable:WorkshopNode[]=[];
  for(const n of ready){const incoming=graph.edges.filter(e=>e.target===n.id);if(n.data.kind!=='start'&&!incoming.some(e=>active.has(e.id))){done.add(n.id);yield outputStep({nodeId:n.id,label:n.data.label,kind:n.data.kind,state:'skipped',wave,detail:'本次未进入此分支。'})}else runnable.push(n)}
  const capacities=runnable.map(n=>combine(graph.edges.filter(e=>e.target===n.id&&active.has(e.id)).map(e=>outputs.get(e.source)!).filter(Boolean)).capacity??1);
  const capacity=Math.max(1,Math.min(...capacities));
  for(let offset=0;offset<runnable.length;offset+=capacity){const batch=runnable.slice(offset,offset+capacity);wave++;yield{type:'wave',ids:batch.map(n=>n.id),wave};
   for(const node of batch){const c=node.data,incoming=graph.edges.filter(e=>e.target===node.id&&active.has(e.id)),data=combine(incoming.map(e=>outputs.get(e.source)!).filter(Boolean));data.lineage=unique([...data.lineage,node.id]);
    const input={order:data.order,sources:Object.keys(data.evidence),from:incoming.map(e=>e.source)};let detail='',state:TraceStep['state']='success',protocol:unknown[]|undefined;
    if(c.kind==='start'){data.order=scenarios[scenario].order;detail=`读取 ${data.order}，目标：核查订单能否按期到货。`}
    if(c.kind==='supervisor'){data.capacity=c.mode==='parallel'?c.parallel:1;detail=`${c.mode==='parallel'?'并行':'串行'}分派 ${graph.edges.filter(e=>e.source===node.id).length} 个分支；最多 ${data.capacity} 个同时执行。`}
    if(c.kind==='agent'||c.kind==='mcp'){
     if(!data.order)return{status:'error',steps,data,text,errors:['工具调用缺少上游订单号。'],waves:wave};
     const response=callSystem(c,scenario);protocol=response.protocol;
     if(response.evidence){data.evidence[c.system]=response.evidence;detail=`${c.kind==='agent'?c.role+' ':''}已取得 ${c.system} 只读证据。`}
     else{data.warnings.push(response.warning!);state=c.fallback==='stop'?'error':'warning';detail=`${response.warning}。${c.fallback==='stop'?'停止运行。':'保留未知状态，移交后续复核。'}`;
      if(c.fallback==='stop'){yield outputStep({nodeId:node.id,label:c.label,kind:c.kind,state,wave,detail,input,protocol});return{status:'error',steps,data,text:'',errors:[response.warning!],waves:wave}}
     }
    }
    if(c.kind==='knowledge'){data.policy=c.policy;detail=c.policy==='conservative'?'检索到规则：在预计运输时间外保留 1 天缓冲。':'检索到规则：按生产完成时间与运输时长估算到货；缺失来源须复核。'}
    if(c.kind==='aggregate')detail=`合并 ${Object.keys(data.evidence).length} 个系统的证据；${systems.filter(s=>!data.evidence[s]).length} 个来源待补齐。`;
    if(c.kind==='skill'){
     data.skills=unique([...data.skills,c.skill]);
     if(c.skill==='delivery-check'){
      const {ERP, MES, TMS}=data.evidence;data.buffer=c.buffer+(data.policy==='conservative'?1:0);
      if(ERP&&MES&&TMS){const wait=Number(ERP.facts.stock)>=Number(ERP.facts.quantity)?0:Number(MES.facts.productionDays);data.estimatedDays=wait+Number(TMS.facts.transitDays)+data.buffer;data.lateDays=Math.max(0,data.estimatedDays-Number(ERP.facts.dueDays));}
      detail=data.estimatedDays===undefined?'加载履约检查步骤 → 检查来源 → 证据不全，暂不估算。':`加载履约检查步骤 → 核对库存 → 生产与运输测算 → 预计 ${data.estimatedDays} 天，延误 ${data.lateDays} 天。`;
     }else{const missing=systems.filter(s=>!data.evidence[s]);if(missing.length)data.warnings.push(`证据检查：缺少 ${missing.join('、')}`);detail=`加载证据检查步骤；${missing.length?`${missing.length} 个来源缺失`:'三个系统来源齐全'}。`}
    }
    if(c.kind==='condition'){data.review=systems.some(s=>!data.evidence[s])||data.lateDays===undefined||data.lateDays>c.threshold;detail=data.review?'进入「复核」分支。':'进入「常规」分支。'}
    if(c.kind==='approval'){
     const decision=yield outputStep({nodeId:node.id,label:c.label,kind:c.kind,state:'waiting',wave,detail:'请核对下方证据，再确认建议或退回。',input,output:structuredClone(data)});
     data.decision=decision?'confirmed':'rejected';detail=decision?'人工确认建议；未执行业务系统写入。':'人工退回，结果保留待补充状态。';
    }
    if(c.kind==='plugin'){data.attachment=c.plugin;detail=c.plugin?'报告插件已启用：将随最终结果附上简报。':'报告插件未启用，继续运行。'}
    if(c.kind==='output'){text=report(data,c.format);detail='已生成履约建议与证据引用。'}
    outputs.set(node.id,data);done.add(node.id);
    for(const edge of graph.edges.filter(e=>e.source===node.id))if(c.kind!=='condition'||edge.sourceHandle===(data.review?'review':'normal'))active.add(edge.id);
    yield outputStep({nodeId:node.id,label:c.label,kind:c.kind,state,wave,detail,input,output:structuredClone(data),protocol});
   }
  }
 }
 const final=combine(graph.nodes.filter(n=>n.data.kind==='output'&&outputs.has(n.id)).map(n=>outputs.get(n.id)!));
 return{status:text?'complete':'error',steps,data:final,text,errors:text?[]:['本次没有到达结果节点。'],waves:wave};
}
export function runAutomatically(graph:WorkshopGraph,scenario:ScenarioId):RunResult{const generator=executeWorkflow(graph,scenario);let next=generator.next();while(!next.done)next=generator.next(false);return next.value;}
export type CheckResult={id:string;label:string;passed:boolean;detail:string};
export function assessWorkshop(graph:WorkshopGraph):CheckResult[]{
 const problems=graphProblems(graph);if(problems.length)return[{id:'graph',label:'流程可以运行',passed:false,detail:problems.join(' ')}];
 const result=(['normal','delay','outage'] as const).map(id=>({id,run:runAutomatically(graph,id)}));
 const normal=result[0].run,delay=result[1].run,outage=result[2].run;
 const ran=(run:RunResult,kind:NodeKind)=>run.steps.some(s=>s.kind===kind&&s.state==='success');
 return[
  {id:'team',label:'明确分工与技能复用',passed:ran(normal,'supervisor')&&normal.steps.filter(s=>s.kind==='agent'&&s.state==='success').length>=3&&normal.data.skills.includes('delivery-check'),detail:'正常样例需实际执行调度、三个子 Agent 和履约检查 Skill。'},
  {id:'normal',label:'正常订单走常规分支',passed:normal.status==='complete'&&systems.every(s=>normal.data.evidence[s])&&normal.data.estimatedDays===2&&normal.data.review===false&&!ran(normal,'approval'),detail:'三个系统证据齐全，预计 2 天到货，无需人工复核。'},
  {id:'delay',label:'延误订单进入人工复核',passed:delay.status==='complete'&&delay.data.lateDays===2&&delay.data.review===true&&ran(delay,'approval')&&delay.data.decision==='rejected',detail:'预计 8 天到货、延误 2 天；须暂停复核，并保留退回结果。'},
  {id:'outage',label:'系统断连不编造结论',passed:outage.status==='complete'&&!outage.data.evidence.TMS&&outage.data.estimatedDays===undefined&&outage.data.review===true&&ran(outage,'approval')&&outage.data.warnings.length>0,detail:'TMS 离线时保留未知，带着可用证据进入人工处理。'},
 ];
}
export function graphSignature(graph:WorkshopGraph){return JSON.stringify({nodes:graph.nodes.map(n=>({id:n.id,data:n.data})).sort((a,b)=>a.id.localeCompare(b.id)),edges:[...graph.edges].sort((a,b)=>a.id.localeCompare(b.id))});}
